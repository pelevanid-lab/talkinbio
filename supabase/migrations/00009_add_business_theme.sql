-- Replaces the 11-fixed-archetype system with an AI-generated per-business theme
-- (custom hex color palette + Google Font pair), while keeping every other part of the
-- block/tool architecture (Faz 1-3) unchanged. archetype_id is left in place, unused,
-- for backward compatibility; new businesses use `theme` with DEFAULT_THEME as fallback.
alter table public.businesses add column if not exists theme jsonb;

-- Persists the setup-agent conversation so returning to the "Kurulum Ajanı" tab (or
-- reloading the page) doesn't lose context — mirrors the conversations/messages pattern
-- already used for the customer-facing chat in src/app/api/chat/route.ts.
create table if not exists public.setup_messages (
    id uuid primary key default uuid_generate_v4(),
    business_id uuid references public.businesses(id) on delete cascade not null,
    role text not null, -- 'user' or 'assistant'
    content text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.setup_messages enable row level security;

-- Only the owner (via the dashboard, using their authenticated session) should read this;
-- the API route itself uses the service role key and bypasses RLS to write.
create policy "Owners can view their own setup messages" on public.setup_messages for select using (
    auth.uid() in (select owner_id from public.businesses where id = public.setup_messages.business_id)
);
