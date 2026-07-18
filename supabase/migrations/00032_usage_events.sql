-- Faz 4.2 kullanım ölçümü: model-bazlı fiyat farkını görünür kılmak ve Faz 4.3'ün
-- kredi çarpanı kalibrasyonunu üretimde sürekli doğrulamak için token/maliyet kaydı.
create table public.usage_events (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references public.businesses(id) on delete cascade not null,
  agent text not null,              -- 'saule' | 'beiwe' | 'analysis'
  channel text not null default 'web',
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cache_read_tokens integer not null default 0,
  cache_write_tokens integer not null default 0,
  created_at timestamptz default now()
);
create index on public.usage_events(business_id, created_at);

alter table public.usage_events enable row level security;
-- Cron/route'lar service role ile yazar (RLS bypass) — ayrı insert policy gerekmez.
create policy "Owners can view their business usage" on public.usage_events for select using (
  auth.uid() in (select owner_id from public.businesses where id = public.usage_events.business_id)
);
