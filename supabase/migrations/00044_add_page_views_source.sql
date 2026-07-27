-- Add source tracking for analytics
ALTER TABLE public.page_views ADD COLUMN IF NOT EXISTS source text DEFAULT 'direct';
