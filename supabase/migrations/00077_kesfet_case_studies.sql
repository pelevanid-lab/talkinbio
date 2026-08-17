-- Interactive case studies generated on /kesfet/[slug] pages (currently only arama-ve-kesif).
-- A visitor types a search query, we run it through the SIGNAL model and turn the breakdown
-- into a short illustrative narrative. Saved rows populate the "Hazır vaka analizlerini incele"
-- gallery inside the category's Vaka Çalışması card.
create table if not exists public.kesfet_case_studies (
  id uuid primary key default uuid_generate_v4(),
  category_slug text not null,
  query text not null,
  title text not null,
  narrative text not null,
  signal jsonb not null,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists kesfet_case_studies_category_slug_idx
  on public.kesfet_case_studies (category_slug, created_at desc);

alter table public.kesfet_case_studies enable row level security;

-- Anyone can read visible case studies (the gallery is public, unauthenticated).
create policy "Public can view visible kesfet case studies" on public.kesfet_case_studies for select using (
  is_visible = true
);

-- Writes only happen through a server route using the service role (same pattern as
-- website_project_requests) — no public insert/update/delete policy. Hiding a bad entry is a
-- direct is_visible=false update in the table editor until a moderation UI exists.
