create table if not exists public.setup_sessions (
    id text primary key,
    business_id uuid references public.businesses(id) on delete cascade not null,
    title text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.setup_sessions enable row level security;
create policy "Owners can view their own setup sessions" on public.setup_sessions for all using (
    auth.uid() in (select owner_id from public.businesses where id = public.setup_sessions.business_id)
);

alter table public.setup_messages add column if not exists session_id text references public.setup_sessions(id) on delete cascade;

-- Migrate existing messages to a default "İlk Sohbet" session per business
do $$
declare
    b record;
    sess_id text;
begin
    for b in select distinct business_id from public.setup_messages where session_id is null loop
        sess_id := gen_random_uuid()::text;
        insert into public.setup_sessions (id, business_id, title) values (sess_id, b.business_id, 'İlk Sohbet');
        update public.setup_messages set session_id = sess_id where business_id = b.business_id and session_id is null;
    end loop;
end $$;
