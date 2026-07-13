-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Businesses table
create table public.businesses (
    id uuid primary key default uuid_generate_v4(),
    owner_id uuid references auth.users(id) on delete cascade,
    username text unique not null,
    name text not null,
    category text,
    contact_method text,
    contact_value text,
    primary_language text default 'tr',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Blocks table
create table public.blocks (
    id uuid primary key default uuid_generate_v4(),
    business_id uuid references public.businesses(id) on delete cascade not null,
    type text not null, -- 'services', 'pricing', 'hours', 'faq', 'custom'
    title text,
    content jsonb default '{}'::jsonb,
    "order" integer default 0,
    is_visible boolean default true
);

-- Media table
create table public.media (
    id uuid primary key default uuid_generate_v4(),
    business_id uuid references public.businesses(id) on delete cascade not null,
    block_id uuid references public.blocks(id) on delete set null,
    type text not null, -- 'image' or 'video'
    url text not null,
    "order" integer default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Conversations table
create table public.conversations (
    id uuid primary key default uuid_generate_v4(),
    business_id uuid references public.businesses(id) on delete cascade not null,
    visitor_session_id text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Messages table
create table public.messages (
    id uuid primary key default uuid_generate_v4(),
    conversation_id uuid references public.conversations(id) on delete cascade not null,
    role text not null, -- 'user' or 'assistant'
    content text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Leads table
create table public.leads (
    id uuid primary key default uuid_generate_v4(),
    business_id uuid references public.businesses(id) on delete cascade not null,
    conversation_id uuid references public.conversations(id) on delete cascade not null,
    name text not null,
    contact text not null,
    summary text not null,
    status text default 'new', -- 'new', 'seen', 'closed'
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Row Level Security (RLS) Policies

-- 1. Businesses
alter table public.businesses enable row level security;
create policy "Public can view businesses" on public.businesses for select using (true);
create policy "Owners can insert their business" on public.businesses for insert with check (auth.uid() = owner_id);
create policy "Owners can update their business" on public.businesses for update using (auth.uid() = owner_id);
create policy "Owners can delete their business" on public.businesses for delete using (auth.uid() = owner_id);

-- 2. Blocks
alter table public.blocks enable row level security;
create policy "Public can view blocks" on public.blocks for select using (true);
create policy "Owners can manage blocks" on public.blocks for all using (
    auth.uid() in (select owner_id from public.businesses where id = public.blocks.business_id)
);

-- 3. Media
alter table public.media enable row level security;
create policy "Public can view media" on public.media for select using (true);
create policy "Owners can manage media" on public.media for all using (
    auth.uid() in (select owner_id from public.businesses where id = public.media.business_id)
);

-- 4. Conversations
alter table public.conversations enable row level security;
-- Service role bypasses RLS, so API routes can always select/insert/update. Anon has NO access.
create policy "Owners can view their business conversations" on public.conversations for select using (
    auth.uid() in (select owner_id from public.businesses where id = public.conversations.business_id)
);

-- 5. Messages
alter table public.messages enable row level security;
create policy "Owners can view their business messages" on public.messages for select using (
    auth.uid() in (select owner_id from public.businesses where id = (select business_id from public.conversations where id = public.messages.conversation_id))
);

-- 6. Leads
alter table public.leads enable row level security;
create policy "Owners can view and manage their business leads" on public.leads for all using (
    auth.uid() in (select owner_id from public.businesses where id = public.leads.business_id)
);
