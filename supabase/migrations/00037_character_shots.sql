-- Faz S.4 — Karakter Odası: Saule ve Beiwe'nin sosyal medya görsellerinin üretim geçmişi.
-- Tutarlılığın mekanizması burada yaşıyor: `is_canon` işaretli kareler, sonraki
-- üretimlerde kanonik avatarın yanına ek referans olarak gönderilir (referans bütçesi
-- toplam 6 ile sınırlı — fal, bunun üzerinde kimlik sadakatinin düştüğünü belirtiyor).
create table if not exists public.character_shots (
    id uuid primary key default gen_random_uuid(),
    character_id text not null check (character_id in ('saule', 'beiwe')),
    image_url text not null,
    prompt text not null,               -- fal'a giden nihai İngilizce prompt
    user_intent text,                   -- kullanıcının yazdığı Türkçe sahne tarifi
    preset_id text,
    model text not null,
    seed bigint,
    reference_urls text[] not null default '{}',
    aspect_ratio text,
    overlay jsonb,                      -- metin/slogan katmanı ayarları (tr/en/ru)
    is_canon boolean not null default false,
    created_at timestamptz not null default now()
);

create index if not exists character_shots_char_created_idx
    on public.character_shots (character_id, created_at desc);

-- Bilerek politikasız RLS: bu tabloya yalnızca admin route'ları, servis rolüyle
-- (supabaseAdmin, RLS baypas) erişir — api/admin/businesses/[id]/grant-plan ile aynı
-- güvenlik duruşu. Anon/authenticated anahtarla hiçbir satır görünmez.
alter table public.character_shots enable row level security;
