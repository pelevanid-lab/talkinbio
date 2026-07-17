-- Faz 2.5: Faz 7 (dil genişlemesi) altyapısı — her işletme en fazla 3 aktif dil seçebilir.
-- Mevcut işletmeler için varsayılan üç dil (tr/en/ru) — geriye dönük davranış değişmez.
alter table businesses add column active_locales text[] default array['tr','en','ru'];
