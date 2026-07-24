-- Linktree-style profile header: adds a short, per-locale tagline shown under the
-- business name in the new ProfileHeader. Avatar is NOT a new column — it is derived
-- from the existing "about" block's photo (see src/utils/avatarFromBlocks.ts). The
-- light/dark mode choice lives inside the existing businesses.theme jsonb (theme.mode),
-- so no separate column is needed for it either.
alter table public.businesses add column if not exists tagline jsonb default '{}'::jsonb;
