-- Tracks whether the business has edits (manual or via the setup agent) made since the owner
-- last confirmed publish, so the dashboard can prompt them to re-confirm instead of leaving them
-- unsure whether their latest change actually reached the live page.
alter table public.businesses add column if not exists needs_republish boolean default false;
