-- Beiwe içgörüleri: haftalık konuşma madenciliği cron'unun (Faz 3.1) yazdığı
-- AI-üretimi öneriler. Editördeki mevcut "Beiwe Önerileri" paneli bunları
-- rule-based önerilerle aynı listede gösterir.
create table public.beiwe_insights (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references public.businesses(id) on delete cascade not null,
  type text not null, -- 'faq-suggestion' | 'content-gap' | 'trend'
  payload jsonb not null,
  status text default 'new', -- 'new' | 'actioned' | 'dismissed'
  created_at timestamptz default now()
);

alter table public.beiwe_insights enable row level security;
-- Cron rotası service role ile yazar (RLS'i bypass eder) — ayrı insert policy gerekmez.
create policy "Owners can view and manage their business insights" on public.beiwe_insights for all using (
  auth.uid() in (select owner_id from public.businesses where id = public.beiwe_insights.business_id)
);
