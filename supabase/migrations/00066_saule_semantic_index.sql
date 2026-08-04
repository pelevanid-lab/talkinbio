-- Migration to create the semantic routing indexing table for AI-free deterministic Q&A matching
CREATE TABLE IF NOT EXISTS public.saule_semantic_index (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  publish_version text NOT NULL DEFAULT 'draft',
  locale text NOT NULL,
  entry_id text NOT NULL,
  source_type text NOT NULL,
  source_id text NOT NULL,
  source_item_id text,
  intent text,
  search_text_hash text NOT NULL,
  search_text text NOT NULL,
  answer text,
  action jsonb NOT NULL,
  behavior text,
  embedding jsonb NOT NULL, -- Simple, portable, and ultra-fast 1024 float array
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Enable RLS and add basic security
ALTER TABLE public.saule_semantic_index ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage their business semantic index" ON public.saule_semantic_index
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = saule_semantic_index.business_id
        AND businesses.owner_id = auth.uid()
    )
  );

CREATE POLICY "Public can read published semantic indexes" ON public.saule_semantic_index
  FOR SELECT TO anon, authenticated USING (
    publish_version <> 'draft' AND EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = saule_semantic_index.business_id
        AND businesses.is_published = true
    )
  );

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_saule_semantic_index_business_version ON public.saule_semantic_index (business_id, publish_version);
