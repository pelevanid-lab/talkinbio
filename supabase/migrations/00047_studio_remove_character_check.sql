-- Phase 1 Fix: character_studio_assets ve character_studio_projects tablolarındaki
-- eski check constraint'leri kaldır. Artık 'enes2' ve gelecekteki dinamik
-- karakterler de bu tablolara yazabilsin.

ALTER TABLE public.character_studio_assets
  DROP CONSTRAINT IF EXISTS character_studio_assets_character_id_check;

ALTER TABLE public.character_studio_projects
  DROP CONSTRAINT IF EXISTS character_studio_projects_character_id_check;
