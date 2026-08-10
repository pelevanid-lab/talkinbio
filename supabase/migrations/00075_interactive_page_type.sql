-- The interactive entry experience completed before page types were introduced is Hybrid mode.
-- Backfill it explicitly so existing accounts retain their current behavior after rollout.
update public.businesses
set saule_settings = coalesce(saule_settings, '{}'::jsonb) || '{"pageType":"hybrid"}'::jsonb
where coalesce(saule_settings->>'pageType', '') = '';
