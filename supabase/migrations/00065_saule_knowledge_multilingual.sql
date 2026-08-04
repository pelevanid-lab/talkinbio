-- Migration to support multilingual knowledge base entries
ALTER TABLE public.saule_knowledge ADD COLUMN IF NOT EXISTS localized_data jsonb;
