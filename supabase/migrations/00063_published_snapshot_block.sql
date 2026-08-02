-- Faz 5: draft/published ayrımı.
-- Yayınlanan sürüm, kullanıcının düzenlediği canlı bloklardan ayrı olarak görünmeyen
-- `published_snapshot` bloğunda saklanır. Böylece editör draft'ı değiştirirken ziyaretçi
-- son onaylanmış sürümü görür.

delete from public.blocks old_snapshot
using public.blocks newer_snapshot
where old_snapshot.business_id = newer_snapshot.business_id
  and old_snapshot.type = 'published_snapshot'
  and newer_snapshot.type = 'published_snapshot'
  and old_snapshot.ctid < newer_snapshot.ctid;

drop index if exists public.blocks_business_id_type_singleton_key;

create unique index if not exists blocks_business_id_type_singleton_key
  on public.blocks (business_id, type)
  where type in (
    'about',
    'services',
    'pricing',
    'hours',
    'faq',
    'links',
    'gallery',
    'testimonials',
    'settings',
    'published_snapshot'
  );

insert into public.blocks (business_id, type, title, content, "order", is_visible)
select
  businesses.id,
  'published_snapshot',
  'Published Snapshot',
  jsonb_build_object(
    'version', 1,
    'publishedAt', timezone('utc'::text, now()),
    'business', jsonb_build_object(
      'name', businesses.name,
      'category', businesses.category,
      'contact_method', businesses.contact_method,
      'contact_value', businesses.contact_value,
      'page_title', businesses.page_title,
      'tagline', businesses.tagline,
      'theme', businesses.theme,
      'saule_settings', businesses.saule_settings,
      'active_locales', businesses.active_locales,
      'archetype_id', businesses.archetype_id
    ),
    'blocks', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', blocks.id,
            'business_id', blocks.business_id,
            'type', blocks.type,
            'title', blocks.title,
            'content', blocks.content,
            'order', blocks."order",
            'is_visible', blocks.is_visible
          )
          order by blocks."order" asc
        )
        from public.blocks
        where blocks.business_id = businesses.id
          and blocks.type <> 'published_snapshot'
      ),
      '[]'::jsonb
    )
  ),
  10000,
  false
from public.businesses
where businesses.is_published = true
  and not exists (
    select 1
    from public.blocks existing_snapshot
    where existing_snapshot.business_id = businesses.id
      and existing_snapshot.type = 'published_snapshot'
  );

drop policy if exists "Public can view blocks" on public.blocks;
drop policy if exists "Public can view settings blocks" on public.blocks;

create policy "Public can view published snapshots" on public.blocks
  for select using (
    type = 'published_snapshot'
    and exists (
      select 1
      from public.businesses
      where businesses.id = blocks.business_id
        and businesses.is_published = true
    )
  );
