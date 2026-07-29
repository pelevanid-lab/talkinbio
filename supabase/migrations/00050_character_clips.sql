-- Faz S.7 — Ortak klip havuzu. Podcast Room (performans aktarımı) ve gelecekteki
-- Action Room'un çıktısını, ayrıca dışarıdan yüklenen videoları TEK yerde toplar.
-- Post-Prodüksiyon Stüdyosu artık `character_motions` değil bu tabloyu okuyor.
--
-- `character_motions` SİLİNMİYOR — geçmiş veri için canlı kalıyor, yeni yazma olmayacak.
-- Aşağıda AYNI id'lerle bu tabloya kopyalanıyor ki `character_studio_projects.motion_id`
-- referansları kırılmasın.

create table if not exists public.character_clips (
    id uuid primary key default gen_random_uuid(),
    character_id text not null,
    room text not null check (room in ('podcast', 'action', 'external')),
    source text not null check (source in ('generated', 'uploaded')),
    model text,                -- fal model kimliği; upload'larda null
    video_url text not null,
    audio_url text,            -- eşlik eden anlatım sesi (ör. wan-motion'ın sessiz çıktısına
                                -- karşılık, senkron kalan orijinal sürücü video)
    source_image_url text,     -- kullanılan kanon kare, varsa
    label text,                -- kullanıcı etiketi, özellikle upload'lar için
    created_at timestamptz not null default now()
);

create index if not exists character_clips_char_created_idx
    on public.character_clips (character_id, created_at desc);

-- Bilerek politikasız RLS: character_motions/character_studio_* ile aynı duruş,
-- sadece admin servis rolüyle erişilecek.
alter table public.character_clips enable row level security;

-- Geriye dönük veri: AYNI id ile kopyala (id korunuyor ki aşağıdaki FK yeniden
-- hedefleme sonrası mevcut character_studio_projects.motion_id değerleri geçerli kalsın).
insert into public.character_clips (id, character_id, room, source, model, video_url, audio_url, source_image_url, created_at)
select id, character_id, 'podcast', 'generated', model, video_url, audio_url, source_image_url, created_at
from public.character_motions
on conflict (id) do nothing;

-- character_studio_projects.motion_id artık character_clips'i referans ediyor.
-- Kolon adı BİLEREK "motion_id" olarak kalıyor (TS tarafında da) — kod dondurma
-- döneminde gereksiz rename riski almamak için bilinçli tercih; sadece FK hedefi
-- değişiyor. Var olan kısıtın gerçek adını TAHMİN ETMİYORUZ (Postgres'in otomatik
-- adlandırdığı, migration 00043'te açıkça adlandırılmamıştı) — pg_constraint'ten
-- dinamik olarak buluyoruz.
do $$
declare
  fk_name text;
begin
  select conname into fk_name
  from pg_constraint
  where conrelid = 'public.character_studio_projects'::regclass
    and contype = 'f'
    and confrelid = 'public.character_motions'::regclass;

  if fk_name is not null then
    execute format('alter table public.character_studio_projects drop constraint %I', fk_name);
  end if;
end $$;

alter table public.character_studio_projects
  add constraint character_studio_projects_motion_id_fkey
  foreign key (motion_id) references public.character_clips(id) on delete set null;
