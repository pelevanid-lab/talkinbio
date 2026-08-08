-- Planla v2 — içerik stratejisi asistanı (Stüdyo hub, 4. kat).
--
-- content_pillars: küçük, sınırlı bir liste (AI ile bir kez önerilir, elle düzenlenir)
-- — theme/saule_settings/tagline (00009/00014/00039) ile AYNI gerekçeyle businesses'a
-- JSONB olarak ekleniyor, ayrı tablo gerekmiyor.
alter table public.businesses add column if not exists content_pillars jsonb default '[]'::jsonb;

-- content_plan_items: AÇIKÇA büyüyen bir liste (character_shots/character_clips/
-- character_studio_projects ile AYNI desen — dedike tablo, politikasız RLS, yalnız
-- servis rolü erişir). Tarih/takvim alanı BİLEREK yok — v1 durum-bazlı bir pano.
create table public.content_plan_items (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references public.businesses(id) on delete cascade,
    pillar_id text,
    status text not null default 'idea' check (status in ('idea', 'ready', 'posted', 'skipped')),
    title text not null,
    brief text,
    format text not null default 'instagram_post' check (format in ('instagram_post', 'instagram_story', 'whatsapp_status')),
    source text not null default 'ai' check (source in ('ai', 'manual')),
    -- Grounded (trend aramalı) üretimde: hangi trend/bağlam esin verdi (kısa not, alıntı değil).
    trend_note text,
    -- "Metne dönüştür" sonucu — {tr:{caption,hashtags}, en:{...}, ru:{...}}, önbelleklenir
    -- ki her ziyaret yeniden üretmesin (bkz. /api/studio/planla/ideas/[id]/expand).
    generated_caption jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index content_plan_items_business_status_idx on public.content_plan_items (business_id, status);

alter table public.content_plan_items enable row level security;
