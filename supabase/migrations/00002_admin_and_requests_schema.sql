-- Onboarding Requests Table
create table public.onboarding_requests (
    id uuid primary key default uuid_generate_v4(),
    email text not null,
    username text not null,
    name text not null,
    category text,
    contacts jsonb default '{}'::jsonb,
    status text default 'pending', -- 'pending', 'approved', 'rejected'
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Subscriptions Table (Placeholder)
create table public.subscriptions (
    id uuid primary key default uuid_generate_v4(),
    business_id uuid references public.businesses(id) on delete cascade not null,
    plan text not null default 'free',
    status text default 'active',
    expires_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.onboarding_requests enable row level security;
alter table public.subscriptions enable row level security;

-- Since the Admin Panel and the public request form will use API routes
-- with the Supabase Service Role (admin) key, we DO NOT need to add
-- any public or authenticated policies. This ensures maximum security,
-- as client-side JS cannot read or modify these tables at all.
