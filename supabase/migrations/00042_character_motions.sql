-- Faz S.5 — Motion (Video) geçmişi.
create table if not exists public.character_motions (
    id uuid primary key default gen_random_uuid(),
    character_id text not null check (character_id in ('saule', 'beiwe', 'enes')),
    source_image_url text not null,
    audio_url text not null,
    video_url text not null,
    model text not null,
    created_at timestamptz not null default now()
);

create index if not exists character_motions_char_created_idx
    on public.character_motions (character_id, created_at desc);

-- Bilerek politikasız RLS: Sadece admin servis rolüyle erişilecek (character_shots ile aynı duruş)
alter table public.character_motions enable row level security;
