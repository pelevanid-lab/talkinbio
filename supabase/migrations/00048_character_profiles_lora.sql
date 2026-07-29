-- Phase 2: character_profiles tablosuna LoRA eğitim alanlarını ekle.
-- lora_url          : fal.ai'ın eğitim sonunda döndürdüğü .safetensors URL'i
-- lora_trigger_word : "enes2person" gibi — prompt'a eklenir
-- lora_request_id   : fal queue request_id — polling için
-- lora_status       : 'none' | 'queued' | 'training' | 'ready' | 'failed'

ALTER TABLE public.character_profiles
  ADD COLUMN IF NOT EXISTS lora_url text,
  ADD COLUMN IF NOT EXISTS lora_trigger_word text,
  ADD COLUMN IF NOT EXISTS lora_request_id text,
  ADD COLUMN IF NOT EXISTS lora_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS lora_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS lora_completed_at timestamptz;

-- character_shots tablosuna similarity_score kolonu yoksa ekle
-- (shotId PATCH route'u bunu zaten kullanıyor; DB'de olması garanti değil)
ALTER TABLE public.character_shots
  ADD COLUMN IF NOT EXISTS similarity_score integer;
