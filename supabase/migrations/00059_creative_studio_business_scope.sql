-- Creative Studio — çok-kiracılı temel. Beiwe Lab'ın beş tablosu bugüne kadar tek
-- kiracılıydı (character_profiles.business_id yoktu, character_shots/
-- character_studio_assets/character_studio_projects.character_id 'saule'/'beiwe'/'enes'
-- ile HARDCODE edilmişti — bkz. 00037_character_shots.sql, 00043_character_studio.sql).
-- Bu migration SADECE ekliyor: mevcut satırlar business_id NULL kalır, admin paneli
-- (/admin/beiwe-lab, requireAdmin ile korunan) hiçbir değişiklik olmadan çalışmaya
-- devam eder. Yeni business-owned karakterler business_id dolu satırlar olarak eklenir.

alter table public.character_profiles
  add column if not exists business_id uuid references public.businesses(id) on delete cascade;

create index if not exists character_profiles_business_id_idx
  on public.character_profiles (business_id);

alter table public.character_shots
  add column if not exists business_id uuid references public.businesses(id) on delete cascade;

alter table public.character_clips
  add column if not exists business_id uuid references public.businesses(id) on delete cascade;

alter table public.character_studio_assets
  add column if not exists business_id uuid references public.businesses(id) on delete cascade;

alter table public.character_studio_projects
  add column if not exists business_id uuid references public.businesses(id) on delete cascade;

create index if not exists character_shots_business_id_idx on public.character_shots (business_id);
create index if not exists character_clips_business_id_idx on public.character_clips (business_id);
create index if not exists character_studio_assets_business_id_idx on public.character_studio_assets (business_id);
create index if not exists character_studio_projects_business_id_idx on public.character_studio_projects (business_id);

-- character_shots/character_studio_assets/character_studio_projects.character_id
-- hardcoded check(... in ('saule','beiwe'[,'enes'])) taşıyordu — business-owned id'ler
-- (işletmenin kendi uuid'si) bu listede olamayacağı için kısıtı kaldırıp yerine
-- character_profiles(id)'ye FK koyuyoruz (var olan admin satırları zaten orada, kırılmaz).
-- İsimsiz inline check constraint'lerin gerçek adını TAHMİN ETMİYORUZ (00050_character_clips.sql
-- ile aynı temkinli desen) — pg_constraint'ten dinamik buluyoruz.
do $$
declare
  con record;
begin
  for con in
    select conname, conrelid::regclass::text as tbl
    from pg_constraint
    where contype = 'c'
      and conrelid in (
        'public.character_shots'::regclass,
        'public.character_studio_assets'::regclass,
        'public.character_studio_projects'::regclass
      )
      and pg_get_constraintdef(oid) ilike '%character_id%in%'
  loop
    execute format('alter table %s drop constraint %I', con.tbl, con.conname);
  end loop;
end $$;

-- Üretimde character_shots/character_studio_assets/character_studio_projects'te
-- character_profiles'ta HİÇ karşılığı olmayan character_id'ler var (ör. 'saule' — Twin
-- gibi ilk kullanımda upsert edilmemiş, sadece sabit CHARACTERS registry'sinde yaşayan bir
-- statik karakter). FK eklemeden önce bu yetim id'ler için minimal (yalnızca id) profil
-- satırları oluşturuyoruz — aksi halde FK, mevcut veriyi kırar.
insert into public.character_profiles (id)
select distinct character_id from public.character_shots
where character_id is not null
on conflict (id) do nothing;

insert into public.character_profiles (id)
select distinct character_id from public.character_studio_assets
where character_id is not null
on conflict (id) do nothing;

insert into public.character_profiles (id)
select distinct character_id from public.character_studio_projects
where character_id is not null
on conflict (id) do nothing;

-- FK'ler idempotent değil (Postgres'te ADD CONSTRAINT IF NOT EXISTS yok) — script yarıda
-- kesilip yeniden çalıştırılırsa "constraint already exists" ile durmasın diye önce var mı
-- kontrol ediyoruz.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'character_shots_character_id_fkey') then
    alter table public.character_shots
      add constraint character_shots_character_id_fkey
      foreign key (character_id) references public.character_profiles(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'character_studio_assets_character_id_fkey') then
    alter table public.character_studio_assets
      add constraint character_studio_assets_character_id_fkey
      foreign key (character_id) references public.character_profiles(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'character_studio_projects_character_id_fkey') then
    alter table public.character_studio_projects
      add constraint character_studio_projects_character_id_fkey
      foreign key (character_id) references public.character_profiles(id) on delete cascade;
  end if;
end $$;

-- Bu beş tablo bilerek "politikasız, yalnız service-role" kalıyordu (character_shots/
-- character_clips yorumlarına bkz.) — güvenlik sınırı route kodunda (requireAdmin /
-- yeni business-owner kontrolü) yaşıyor, supabaseAdmin RLS'i zaten bypass ediyor.
-- Aşağıdaki SELECT politikaları ek bir savunma katmanı (00009_add_business_theme.sql'deki
-- "auth.uid() in (select owner_id from businesses ...)" kalıbıyla birebir) — RLS'e
-- saygılı bir client'tan sorgulanırsa business sahibi kendi verisini görebilsin diye.
-- drop+create: bu blok bir sorunla yarıda kesilip yeniden çalıştırılırsa "policy already
-- exists" ile durmasın diye (create policy'nin IF NOT EXISTS'i yok).
drop policy if exists "Owners can view their own Creative Studio characters" on public.character_profiles;
create policy "Owners can view their own Creative Studio characters" on public.character_profiles for select using (
  business_id is not null and auth.uid() in (select owner_id from public.businesses where id = public.character_profiles.business_id)
);

drop policy if exists "Owners can view their own Creative Studio shots" on public.character_shots;
create policy "Owners can view their own Creative Studio shots" on public.character_shots for select using (
  business_id is not null and auth.uid() in (select owner_id from public.businesses where id = public.character_shots.business_id)
);

drop policy if exists "Owners can view their own Creative Studio clips" on public.character_clips;
create policy "Owners can view their own Creative Studio clips" on public.character_clips for select using (
  business_id is not null and auth.uid() in (select owner_id from public.businesses where id = public.character_clips.business_id)
);

drop policy if exists "Owners can view their own Creative Studio studio assets" on public.character_studio_assets;
create policy "Owners can view their own Creative Studio studio assets" on public.character_studio_assets for select using (
  business_id is not null and auth.uid() in (select owner_id from public.businesses where id = public.character_studio_assets.business_id)
);

drop policy if exists "Owners can view their own Creative Studio studio projects" on public.character_studio_projects;
create policy "Owners can view their own Creative Studio studio projects" on public.character_studio_projects for select using (
  business_id is not null and auth.uid() in (select owner_id from public.businesses where id = public.character_studio_projects.business_id)
);
