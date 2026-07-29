-- character_motions'a hangi girdiyle üretildiğini ayırt eden alan.
--
-- Aynı tablo/route (api/admin/characters/[characterId]/motion) hem "metni seslendirip
-- videoya çevir" hem "yüklenen sesi doğrudan videoya çevir" akışlarını besliyor
-- (MotionSection.tsx'in text/audio sekmeleri, şimdi Beiwe Podcast'in de kullandığı).
-- Galeri bu ikisini ayrı etiketleyebilsin diye kaynağı burada saklıyoruz.
--
-- NULL bırakılabilir: eski satırlar (input_mode yazılmadan önce üretilenler) etiketsiz
-- kalır, eski oda (Karakter Odası → Motion) bu alanı hiç yazmıyor ve yazmak zorunda değil.

ALTER TABLE public.character_motions
  ADD COLUMN IF NOT EXISTS input_mode text;
