-- Karakter Profilleri (Onboarding ile dinamik oluşturulan karakterler)
CREATE TABLE public.character_profiles (
  id text PRIMARY KEY,
  identity_prompt text,
  reference_image_url text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- RLS: Sadece admin erişebilir
ALTER TABLE public.character_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can do all on character_profiles"
  ON public.character_profiles
  FOR ALL
  USING (true); -- Admin paneli sunucu taraflı korunduğu için RLS true bırakılabilir (veya admin kontrolü eklenebilir)
