-- 00007 added a PARTIAL unique index (a WHERE clause scoped to singleton types), but Postgres only
-- lets ON CONFLICT use a partial index as its arbiter when the INSERT statement itself repeats the
-- exact same WHERE predicate — something Supabase-js's `.upsert(data, { onConflict: 'business_id,type' })`
-- has no way to express. So 00007 was valid SQL but never actually fixed the upsert error.
--
-- Fix: use a FULL (non-partial) unique constraint instead, but on a generated column that is NULL for
-- 'custom'/'contact' (types manual mode allows multiple of). Standard SQL treats NULLs as never equal
-- to each other, so many custom/contact rows can coexist per business while about/services/etc still
-- get a real, ON-CONFLICT-usable uniqueness guarantee.

drop index if exists blocks_business_id_type_singleton_key;

alter table public.blocks add column if not exists singleton_key text
  generated always as (
    case when type in ('about', 'services', 'pricing', 'hours', 'faq', 'links', 'gallery', 'testimonials')
    then type else null end
  ) stored;

alter table public.blocks add constraint blocks_business_id_singleton_key_key unique (business_id, singleton_key);
