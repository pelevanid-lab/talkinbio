-- Kategori tabanlı kurulum sihirbazı: seçilen kategori ID'sini sakla.
-- Bu alan mevcut code'da (onboarding/page.tsx) kullanılıyor —
-- 'hizmet' | 'icerik-ureticisi' | 'muzisyen' | 'urun'
-- Mevcut hesaplar NULL kalır (sihirbazdan geçmediler).
-- NOT: blocks tablosuna dokunulmaz.

alter table public.businesses
  add column if not exists category_id text;
