CREATE TABLE IF NOT EXISTS public.saule_voice_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  kind text NOT NULL DEFAULT 'standard' CHECK (kind IN ('standard', 'premium', 'custom')),
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.saule_voice_cues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.saule_voice_packages(id) ON DELETE CASCADE,
  cue_key text NOT NULL,
  locale text NOT NULL CHECK (locale IN ('tr', 'en', 'ru')),
  variant_label text NOT NULL DEFAULT 'v1',
  audio_url text NOT NULL,
  storage_path text,
  status text NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected')),
  qc jsonb NOT NULL DEFAULT '{}'::jsonb,
  approved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS saule_voice_cues_package_idx
  ON public.saule_voice_cues(package_id, locale, cue_key, status);

CREATE UNIQUE INDEX IF NOT EXISTS saule_voice_cues_one_approved_idx
  ON public.saule_voice_cues(package_id, locale, cue_key)
  WHERE status = 'approved';

ALTER TABLE public.saule_voice_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saule_voice_cues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can do all on saule_voice_packages"
  ON public.saule_voice_packages
  FOR ALL
  USING (true);

CREATE POLICY "Admin can do all on saule_voice_cues"
  ON public.saule_voice_cues
  FOR ALL
  USING (true);

INSERT INTO public.saule_voice_packages (slug, label, kind, version, status)
VALUES ('standard', 'Standart Saule Cue Paketi', 'standard', 1, 'draft')
ON CONFLICT (slug) DO NOTHING;
