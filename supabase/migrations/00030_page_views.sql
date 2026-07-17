-- Sayfa görüntülenme sayacı (Faz 3.3 haftalık özet e-postasının ön koşulu).
-- PK (business_id, view_date, visitor_session_id) günlük tekilleştirmeyi garanti eder
-- (aynı ziyaretçi aynı gün tekrar görüntülese sayaç artmaz).
create table public.page_views (
  business_id uuid references public.businesses(id) on delete cascade not null,
  view_date date not null default current_date,
  visitor_session_id text not null,
  created_at timestamptz default now(),
  primary key (business_id, view_date, visitor_session_id)
);

alter table public.page_views enable row level security;
create policy "Owners can view their business page views" on public.page_views for select using (
  auth.uid() in (select owner_id from public.businesses where id = public.page_views.business_id)
);
-- Ziyaretçi tarafı anon client ile yazıyor (herkese açık işletme sayfası) — analytics
-- sayaç olduğu için düşük risk; başka bir işletmenin gerçek verisini ifşa etmiyor.
create policy "Public can record page views" on public.page_views for insert with check (true);
