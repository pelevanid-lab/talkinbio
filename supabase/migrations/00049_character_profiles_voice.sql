-- Phase 3: character_profiles tablosuna ses klonlama (voice) alanlarını ekle.
-- voice_url : Kullanıcının yüklediği ve referans olarak kullanılacak ses dosyasının public URL'si
-- voice_status : 'none' | 'ready' (gelecekte eğitim gelirse diye)

ALTER TABLE public.character_profiles
  ADD COLUMN IF NOT EXISTS voice_url text,
  ADD COLUMN IF NOT EXISTS voice_status text NOT NULL DEFAULT 'none';
