-- Kurulum sihirbazının tamamlanıp tamamlanmadığını takip eden bayrak.
-- Mevcut hesaplar (canlı sayfalar dahil) direkt true olarak işaretlenir;
-- sihirbazı görmezler. Yeni hesaplar false ile başlar, sihirbazı tamamlayınca
-- true olur.
-- NOT: blocks tablosuna dokunulmaz — snapshot/canlı sayfa koruması bozulmaz.

alter table public.businesses
  add column if not exists setup_completed boolean not null default false;

-- Mevcut tüm hesapları tamamlanmış say (bunları sihirbaz ekranına düşürme)
update public.businesses set setup_completed = true;
