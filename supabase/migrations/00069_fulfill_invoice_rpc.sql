-- Stabilizasyon: Shopier webhook'u iki ayrı race condition taşıyordu —
-- (a) invoice.status select-then-update ile kontrol ediliyordu (aynı anda gelen
-- iki webhook teslimatı ikisi de "henüz success değil" görebilirdi),
-- (b) credit_balance elle select+update ile artırılıyordu (atomik değildi).
-- add_credits() RPC'si (bkz. 00033_business_credits.sql) tam da bunun için
-- yazılmıştı ama webhook route'u hiç çağırmıyordu. Bu fonksiyon her iki adımı
-- tek bir DB transaction'ında birleştirir: invoice zaten işlenmişse false döner
-- (route sessizce 200 döner), değilse status'u işaretler ve krediyi tek seferde
-- ekler.
create or replace function public.fulfill_invoice(p_invoice_id uuid, p_business_id uuid, p_credits integer, p_shopier_order_id text)
returns boolean language plpgsql as $$
declare
  v_updated int;
begin
  update public.business_invoices set status = 'success', shopier_order_id = p_shopier_order_id
  where id = p_invoice_id and status <> 'success';
  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    return false; -- zaten işlenmiş (idempotent no-op)
  end if;

  update public.businesses set credit_balance = credit_balance + p_credits
  where id = p_business_id;

  return true;
end;
$$;
