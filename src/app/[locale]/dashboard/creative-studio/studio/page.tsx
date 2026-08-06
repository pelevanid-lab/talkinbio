import { getTranslations } from 'next-intl/server';
import DashboardShell from '@/components/dashboard/DashboardShell';
import BeiweStudioClient from '@/components/beiwe-lab/BeiweStudioClient';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { requireBusinessOwner } from '@/utils/businessAuth';
import { getBusinessCharacterIds, getOrCreateBusinessTwin } from '@/utils/creativeStudioScope';
import type { CharacterClip } from '@/config/clips';

// admin/beiwe-lab/studio/page.tsx'in müşteri karşılığı — admin sürümüyle aynı: Twin +
// işletmenin kendi Cast'inin TÜM kadrosunun klip havuzu (bkz. getBusinessCharacterIds).
export default async function CreativeStudioStudioPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const business = await requireBusinessOwner(locale);
  const t = await getTranslations('BeiweLab');
  const characterId = await getOrCreateBusinessTwin(business.id);
  const characterIds = await getBusinessCharacterIds(business.id, business.name);

  const { data: clips } = await supabaseAdmin
    .from('character_clips')
    .select('*')
    .in('character_id', characterIds)
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <DashboardShell business={business} active="creative-studio">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-['Inter']">
        <div className="mb-6">
          <h1 className="text-xl font-[800] tracking-[-0.02em] text-[#14231F]">{t('studioTitle')}</h1>
          <p className="text-sm text-[#4B5A55]">{t('studioDesc')}</p>
        </div>
        <BeiweStudioClient characterId={characterId} initialClips={(clips || []) as CharacterClip[]} />
      </main>
    </DashboardShell>
  );
}
