-- Stüdyo projesine kapak/thumbnail karesi — `output_url` (export sonucu video) ile AYNI
-- desen: kapak da tarayıcıda (canvas snapshot) üretilip mevcut `studio-asset` upload
-- akışıyla yüklenir, buraya PATCH edilir. Ayrı bir tablo/upload endpoint'i GEREKMİYOR.
alter table public.character_studio_projects
    add column if not exists thumbnail_url text;
