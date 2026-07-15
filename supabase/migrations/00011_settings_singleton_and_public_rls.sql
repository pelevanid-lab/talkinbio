-- The layoutMode toggle in EditorClient used to find-then-insert/update the `settings` block
-- by hand instead of upserting, so a fast double-click (no existing row yet) created a brand new
-- row on every click instead of updating one. This left duplicate `settings` rows for at least one
-- business (cleaned up manually before this migration). Fold `settings` into the existing
-- singleton unique index so the app can upsert it the same way it already does for
-- about/services/etc, making duplicates impossible going forward.
drop index if exists public.blocks_business_id_type_singleton_key;
create unique index if not exists blocks_business_id_type_singleton_key
  on public.blocks (business_id, type)
  where type in ('about', 'services', 'pricing', 'hours', 'faq', 'links', 'gallery', 'testimonials', 'settings');

-- The `settings` block stores page-level config (e.g. layoutMode) and is always saved with
-- is_visible: false so it never renders as a content section. But the public-facing "Public can
-- view blocks" read policy only ever intended is_visible to gate *content* sections from visitors
-- — it wasn't meant to hide settings from the query that decides HOW to render the page. Add an
-- explicit, additive policy so anonymous visitors can read settings rows regardless of is_visible
-- (permissive policies OR together, so this only adds access, it doesn't take any away).
create policy "Public can view settings blocks" on public.blocks for select using (type = 'settings');
