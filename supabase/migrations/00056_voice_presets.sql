-- Beiwe Voice — Yardımcı Oyuncular için "hazır referans ses" kütüphanesi.
--
-- Sanal/kurgusal karakterlerin (Saule, Beiwe, admin panelinden eklenen destek
-- karakterleri) gerçek bir kişisi yok, o yüzden yükleyecekleri bir referans kaydı da
-- yok. Bunun yerine admin bir kere 5-6 hazır ses kaydı yükler, karakter oluşturulurken
-- (veya Beiwe Voice'ta) beğenilen biri seçilir ve o karakterin referansı olur — MiniMax
-- klonlama zinciri (Aşama 2/3) buradan sonra aynen işler.
CREATE TABLE public.voice_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  audio_url text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.voice_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can do all on voice_presets"
  ON public.voice_presets
  FOR ALL
  USING (true);
