import { getTranslations } from 'next-intl/server';
import DashboardShell from '@/components/dashboard/DashboardShell';
import BeiwePostClient from '@/components/beiwe-lab/BeiwePostClient';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { requireBusinessOwner } from '@/utils/businessAuth';
import { getBusinessCharacterIds, getOrCreateBusinessTwin } from '@/utils/creativeStudioScope';
import type { CharacterShot } from '@/config/characters';
import type { CharacterClip } from '@/config/clips';
import type { StudioAsset } from '@/config/studio';

export default async function CreativeStudioPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const business = await requireBusinessOwner(locale);
  const t = await getTranslations('BeiweLab');
  const characterId = await getOrCreateBusinessTwin(business.id);
  const characterIds = await getBusinessCharacterIds(business.id, business.name);

  const [{ data: shots }, { data: clips }, { data: assets }] = await Promise.all([
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
  ]);

  return (
    <DashboardShell business={business} active="creative-studio">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-['Inter']">
        <div className="mb-6">
          <h1 className="text-xl font-[800] tracking-[-0.02em] text-[#14231F]">{t('postTitle')}</h1>
          <p className="text-sm text-[#4B5A55]">{t('postDesc')}</p>
        </div>
        <BeiwePostClient
          shots={(shots || []) as CharacterShot[]}
          clips={(clips || []) as CharacterClip[]}
          assets={(assets || []) as StudioAsset[]}
          characterId={characterId}
          hideCost
        />
      </main>
    </DashboardShell>
  );
}
