-- Faz 4.3: /pricing sayfasındaki "iletişime geç" formu (gerçek checkout değil —
-- ödeme sağlayıcı Faz H.1'i bekliyor). Admin manuel arayıp planı/kredisi elle atar.
create table public.pricing_inquiries (
  id uuid primary key default uuid_generate_v4(),
  email text not null,
  phone text not null,
  plan_interest text,   -- 'starter' | 'pro' | 'business' | null (genel soru)
  message text,
  status text default 'new',  -- 'new' | 'contacted'
  created_at timestamptz default now()
);

alter table public.pricing_inquiries enable row level security;
create policy "Public can submit pricing inquiries" on public.pricing_inquiries for insert with check (true);
-- select/update yok: admin route'ları service role ile okur/günceller.
