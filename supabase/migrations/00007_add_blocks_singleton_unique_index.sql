-- The setup-agent tools (updateAbout, addServices, addGallery, addTestimonials, addHours, addFAQ, addLinks)
-- have always upserted with `onConflict: 'business_id,type'`, but no matching unique constraint ever
-- existed on public.blocks. This makes every one of those upserts fail with:
--   "there is no unique or exclusion constraint matching the ON CONFLICT specification"
-- silently, on every single call, in both chat and bulk mode. This index is the fix.
--
-- Scoped to the "singleton per business" block types only (about/services/etc: the app always treats
-- these as one row per business). 'custom' and 'contact' are intentionally excluded because manual mode
-- allows creating multiple of those freely; 'settings' already manages its own singleton logic in app code.
create unique index if not exists blocks_business_id_type_singleton_key
  on public.blocks (business_id, type)
  where type in ('about', 'services', 'pricing', 'hours', 'faq', 'links', 'gallery', 'testimonials');
