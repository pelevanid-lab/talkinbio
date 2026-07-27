-- Faz S.6 — Karakter Odası'nın 3. katmanı: Post-prodüksiyon stüdyosu.
--
-- Motion videosunu (character_motions) alıp aralara görsel/metin/müzik ekleyerek
-- yayına hazır formatlar üretir. Render tamamen tarayıcıda (Canvas + MediaRecorder)
-- yapılır — bu tablolar sadece proje durumunu ve yüklenen medya kütüphanesini tutar,
-- render sonucunun kendisini değil (o, admin'in bilgisayarına iner).

-- PC'den yüklenen görsel/video/ses kütüphanesi (cutaway, overlay, müzik kaynakları).
create table if not exists public.character_studio_assets (
    id uuid primary key default gen_random_uuid(),
    character_id text not null check (character_id in ('saule', 'beiwe', 'enes')),
    kind text not null check (kind in ('image', 'video', 'audio')),
    url text not null,
    file_name text not null,
    created_at timestamptz not null default now()
);

create index if not exists character_studio_assets_char_created_idx
    on public.character_studio_assets (character_id, created_at desc);

-- Bir Motion videosu üzerine kurulan düzenleme projesi. `timeline` jsonb tutuluyor
-- (character_shots.overlay ile aynı kalıp) ki düzenleme şeması evrilirken migration
-- gerekmesin — sunucu tarafı doğrulama src/config/studio.ts'te yaşıyor, DB şeması değil.
create table if not exists public.character_studio_projects (
    id uuid primary key default gen_random_uuid(),
    character_id text not null check (character_id in ('saule', 'beiwe', 'enes')),
    motion_id uuid references public.character_motions(id) on delete set null,
    name text not null default 'Adsız proje',
    timeline jsonb not null,
    output_url text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists character_studio_projects_char_updated_idx
    on public.character_studio_projects (character_id, updated_at desc);

-- Bilerek politikasız RLS: Sadece admin servis rolüyle erişilecek (character_shots ile aynı duruş)
alter table public.character_studio_assets enable row level security;
alter table public.character_studio_projects enable row level security;
