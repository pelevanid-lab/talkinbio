create table if not exists public.website_project_requests (
  id uuid primary key default uuid_generate_v4(),
  first_name text not null,
  last_name text not null,
  phone text,
  email text not null,
  website text,
  social_media text,
  primary_choice text not null,
  secondary_choice text not null,
  question text not null,
  answer text not null,
  source text not null default 'homepage_mobile',
  locale text,
  status text not null default 'new' check (status in ('new', 'contacted', 'archived')),
  created_at timestamptz not null default now()
);

alter table public.website_project_requests enable row level security;

-- Public submissions are written through a server-only route using the service role.
-- No browser-facing select, insert, update or delete policies are granted.
