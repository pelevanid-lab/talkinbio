-- MiniMax ses klonlama alanları (Beiwe Voice).
--
-- F5-TTS'in aksine burada kalıcı bir kimlik var: `minimax_voice_id`, fal'ın
-- `fal-ai/minimax/voice-clone` uç noktasından dönen `custom_voice_id`. Sonraki
-- üretimler ses dosyasını değil bu kimliği kullanıyor.
--
-- minimax_voice_status : 'none'|'active'|'expired'|'failed'
--   'active'  : klon var ve en az bir kez gerçek TTS çağrısında kullanıldı (kalıcı)
--   'expired' : bir TTS çağrısı "geçersiz voice_id" hatası verdi — muhtemelen 7 gün
--               kullanılmadığı için fal/MiniMax tarafında silinmiş, yeniden klonlanmalı
--   'failed'  : klonlama isteğinin kendisi başarısız oldu
--
-- minimax_cloned_at    : klonlama isteğinin başarıyla tamamlandığı an
-- minimax_last_used_at : bu kimlikle son başarılı TTS üretiminin ani — 7 günlük
--                        silinme riskini yerelden takip etmek için (fal bunun için
--                        ayrı bir durum sorgu uç noktası sunmuyor)

ALTER TABLE public.character_profiles
  ADD COLUMN IF NOT EXISTS minimax_voice_id text,
  ADD COLUMN IF NOT EXISTS minimax_voice_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS minimax_cloned_at timestamptz,
  ADD COLUMN IF NOT EXISTS minimax_last_used_at timestamptz;
