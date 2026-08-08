import { getTranslations } from 'next-intl/server';
import DashboardShell from '@/components/dashboard/DashboardShell';
import StudioHubTabs from '@/components/studio-hub/StudioHubTabs';
import BeiwePostClient, { type PostGalleryEdit } from '@/components/beiwe-lab/BeiwePostClient';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { requireBusinessOwner } from '@/utils/businessAuth';
import { getBusinessCharacterIds, getOrCreateBusinessTwin } from '@/utils/creativeStudioScope';
import type { CharacterShot } from '@/config/characters';
import type { CharacterClip } from '@/config/clips';
import { parseStudioTimeline, type StudioAsset } from '@/config/studio';

/** Üret'in galerisine "Düzenle'den" kategorisi olarak taşınacak bitmiş export'lar +
 *  redub'lar — bkz. `PostGalleryEdit` (BeiwePostClient.tsx), "önceki üretimi son haline
 *  getirme". İstemciye güvenilmiyor kuralı burada da geçerli: `timeline` ham JSONB,
 *  `parseStudioTimeline` ile doğrulanmadan `dubs`'a erişilmiyor. */
function buildGalleryEdits(
  projects: { id: string; name: string; timeline: unknown; output_url: string | null; thumbnail_url: string | null }[],
): PostGalleryEdit[] {
  const edits: PostGalleryEdit[] = [];
  for (const p of projects) {
    if (p.output_url) {
      edits.push({
        id: `${p.id}-export`,
        url: p.output_url,
        label: p.name,
        kind: 'export',
        thumbnailUrl: p.thumbnail_url ?? undefined,
      });
    }
    const timeline = parseStudioTimeline(p.timeline);
    for (const dub of timeline?.dubs ?? []) {
      edits.push({ id: dub.id, url: dub.videoUrl, label: p.name, kind: 'dub', locale: dub.locale });
    }
  }
  return edits.slice(0, 60);
}

// Üret — `creative-studio/page.tsx`'in (Post) veri çekimi birebir mirror edilir. Motion/
// Podcast/Twin/Cast'ten sıfırdan üretim burada YOK (kurucu kararı) — Üret, elindeki
// malzemeyi (Düzenle'den çıkan klip/görsel) yayına hazır son hâle paketlemekle sınırlı.
// Format/dil varyantı türetme, foto upscale, "önceki üretimi son haline getirme" galerisi
// bir sonraki kat (plan dosyası, "bu pasa dahil olmayanlar").
export default async function StudioUretPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const business = await requireBusinessOwner(locale);
  const t = await getTranslations('StudioHub');
  const characterId = await getOrCreateBusinessTwin(business.id);
  const characterIds = await getBusinessCharacterIds(business.id, business.name);

  const [{ data: shots }, { data: clips }, { data: assets }, { data: projects }] = await Promise.all([
    supabaseAdmin
      .from('character_shots')
      .select('*')
      .in('character_id', characterIds)
      .order('created_at', { ascending: false })
      .limit(120),
    supabaseAdmin
      .from('character_clips')
      .select('*')
      .in('character_id', characterIds)
      .order('created_at', { ascending: false })
      .limit(60),
    supabaseAdmin
      .from('character_studio_assets')
      .select('*')
      .eq('character_id', characterId)
      .eq('kind', 'image')
      .order('created_at', { ascending: false })
      .limit(60),
    supabaseAdmin
      .from('character_studio_projects')
      .select('id, name, timeline, output_url, thumbnail_url')
      .in('character_id', characterIds)
      .order('updated_at', { ascending: false })
      .limit(40),
  ]);

  const edits = buildGalleryEdits(projects || []);

  return (
    <DashboardShell business={business} active="studio">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-['Inter']">
        <StudioHubTabs />
        <div className="mb-6">
          <h1 className="text-xl font-[800] tracking-[-0.02em] text-[#14231F]">{t('uretPageTitle')}</h1>
          <p className="text-sm text-[#4B5A55]">{t('uretPageDesc')}</p>
        </div>
        <BeiwePostClient
          shots={(shots || []) as CharacterShot[]}
          clips={(clips || []) as CharacterClip[]}
          assets={(assets || []) as StudioAsset[]}
          edits={edits}
          characterId={characterId}
          hideCost
        />
      </main>
    </DashboardShell>
  );
}
