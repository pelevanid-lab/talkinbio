-- Faz 4.4.x: hesap içi "Faturalandırma & Kullanım" sayfası (/dashboard/billing) — kredi bakiyesine
-- tıklamak artık oturum dışına, herkese açık /pricing'e değil, oturum içi bir sayfaya götürüyor.

-- usage_events zaten token/model kaydediyordu ama gerçek kredi maliyetini değil — bu sayfa
-- işletme sahibine gerçek bir "işlem geçmişi" göstermek için o an düşülen kredi miktarını da
-- satır satır saklıyor (deductCredits ile aynı çağrı noktasında yazılır, bkz. usage.ts).
alter table public.usage_events add column if not exists credits_charged integer not null default 0;

-- Oturum içi (giriş yapmış) talep formu artık hangi işletmenin talep ettiğini doğrudan taşıyabiliyor —
-- admin artık e-posta eşleştirmesine güvenmek zorunda değil. Nullable: /pricing'in oturumsuz
-- formu (potansiyel/henüz hesabı olmayan müşteriler) hâlâ business_id olmadan gönderebiliyor.
alter table public.pricing_inquiries add column if not exists business_id uuid references public.businesses(id) on delete set null;
