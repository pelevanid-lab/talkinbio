-- Saule knowledge base: owner-authored notes the assistant should follow (Faz 1.4)
create table public.saule_knowledge (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references public.businesses(id) on delete cascade not null,
  title text,
  content text not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table public.saule_knowledge enable row level security;
-- No public/anon policy: chat route reads via service role, owner manages via authenticated client.
create policy "Owners can manage their business knowledge" on public.saule_knowledge for all using (
  auth.uid() in (select owner_id from public.businesses where id = public.saule_knowledge.business_id)
);
