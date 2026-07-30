-- Beiwe Lab / Yardımcı Oyuncular — admin panelinden eklenen sanal (kurgusal) destek
-- karakterleri. Bunlar Saule/Beiwe gibi gerçek bir yüze kilitlenmiyor: sadece isim +
-- Türkçe tarif ile bir kez avatar üretilir, sonra her sahne o avatar referans alınarak
-- üretilir. `is_cast` bu satırların admin panelindeki "Yardımcı Oyuncular" sekme
-- şeridinde listelenmesi gerektiğini işaretler (saule/beiwe koddaki CHARACTERS'ta
-- sabit olduğu için bu bayrağa ihtiyaç duymaz).
ALTER TABLE public.character_profiles
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS role text,
  ADD COLUMN IF NOT EXISTS is_cast boolean NOT NULL DEFAULT false;
