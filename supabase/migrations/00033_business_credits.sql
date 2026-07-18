-- Faz 4.3 kredi modeli: hot-path sayaç businesses üzerinde (her Saule/Beiwe
-- turunda okunuyor/düşülüyor), plan kaydı mevcut subscriptions tablosunda tutulur.
alter table public.businesses add column if not exists credit_balance integer not null default 0;

create or replace function public.deduct_credits(p_business_id uuid, p_amount integer)
returns void language sql as $$
  update public.businesses set credit_balance = greatest(credit_balance - p_amount, 0)
  where id = p_business_id;
$$;

create or replace function public.add_credits(p_business_id uuid, p_amount integer)
returns void language sql as $$
  update public.businesses set credit_balance = credit_balance + p_amount
  where id = p_business_id;
$$;

-- Kullanıcı notu (2026-07-18): kredi düşümü devreye girer girmez iki hesap
-- fiilen sınırsız olmalı (kurucu/demo hesabı + Uliana Pehlivan test hesabı).
update public.businesses set credit_balance = 1000000000
where owner_id in (
  select id from auth.users where email in ('enespehlivan@live.com', 'pehlivanuliana@gmail.com')
);
