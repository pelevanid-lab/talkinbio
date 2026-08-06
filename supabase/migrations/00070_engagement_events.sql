-- Ziyaretçi niyet sinyalleri: WhatsApp/telefon/e-posta/Instagram/Sipariş Ver tıklamaları.
-- Şu ana kadar bu tıklamalar hiçbir yere kaydedilmiyordu — Saule bir soruyu başarıyla
-- cevapladığında ziyaretçi hiç iz bırakmadan gidiyordu (lead formu yalnızca Saule
-- cevap BULAMADIĞINDA açılıyordu). Bu tablo, form doldurulmasa bile "kim, ne zaman,
-- hangi kanaldan ilgi gösterdi" bilgisini tutar — analiz sayfasındaki huniye
-- (görüntülenme → soru sorma → iletişime geçme) girdi sağlar.
create table public.engagement_events (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references public.businesses(id) on delete cascade not null,
  visitor_session_id text not null,
  event_type text not null, -- 'contact_click' | 'order_click'
  channel text, -- 'whatsapp' | 'phone' | 'email' | 'instagram' | 'telegram' | 'saule' | null
  created_at timestamptz default now() not null
);

alter table public.engagement_events enable row level security;

create policy "Owners can view their business engagement events" on public.engagement_events for select using (
  auth.uid() in (select owner_id from public.businesses where id = public.engagement_events.business_id)
);
-- Ziyaretçi tarafı anon client ile yazıyor (herkese açık işletme sayfası) — page_views ile
-- aynı desen: düşük riskli, başka bir işletmenin verisini ifşa etmiyor.
create policy "Public can record engagement events" on public.engagement_events for insert with check (true);

create index engagement_events_business_id_idx on public.engagement_events(business_id, created_at desc);
