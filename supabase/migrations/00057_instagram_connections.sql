-- 00057_instagram_connections.sql

create table public.instagram_connections (
    id uuid primary key default uuid_generate_v4(),
    business_id uuid references public.businesses(id) on delete cascade not null unique,
    instagram_user_id text not null,
    instagram_username text,
    page_id text not null,
    access_token text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.instagram_connections enable row level security;

create policy "Owners can view and manage their instagram connection" on public.instagram_connections for all using (
    auth.uid() in (select owner_id from public.businesses where id = public.instagram_connections.business_id)
);

-- Trigger to update 'updated_at'
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

create trigger set_instagram_connections_updated_at
before update on public.instagram_connections
for each row
execute function public.handle_updated_at();
