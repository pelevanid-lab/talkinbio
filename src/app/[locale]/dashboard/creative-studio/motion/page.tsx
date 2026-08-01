import { getTranslations } from 'next-intl/server';
import DashboardShell from '@/components/dashboard/DashboardShell';
import BeiweMotionClient from '@/components/beiwe-lab/BeiweMotionClient';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { requireBusinessOwner } from '@/utils/businessAuth';
import { getBusinessCastRoster, getOrCreateBusinessTwin } from '@/utils/creativeStudioScope';
import type { CharacterShot } from '@/config/characters';
import type { CharacterClip } from '@/config/clips';

// admin/beiwe-lab/motion/page.tsx'in müşteri karşılığı — "Yardımcı Oyuncu" kimlik modu
// artık işletmenin kendi Cast'ini listeliyor (bkz. getBusinessCastRoster).
export default async function CreativeStudioMotionPage() {
  const business = await requireBusinessOwner();
  const t = await getTranslations('BeiweLab');
  const characterId = await getOrCreateBusinessTwin(business.id);
  const roster = await getBusinessCastRoster(business);
  const castCharacters = roster.filter((r) => r.id !== characterId);

  const [{ data: shots }, { data: clips }] = await Promise.all([
    supabaseAdmin
      .from('character_shots')
      .select('*')
      .eq('character_id', characterId)
      .order('created_at', { ascending: false })
      .limit(200),
    supabaseAdmin
      .from('character_clips')
      .select('*')
      .eq('character_id', characterId)
      .eq('room', 'action')
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  return (
    <DashboardShell business={business} active="creative-studio">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-['Inter']">
        <div className="mb-6">
          <h1 className="text-xl font-[800] tracking-[-0.02em] text-[#14231F]">{t('motionTitle')}</h1>
          <p className="text-sm text-[#4B5A55]">{t('motionDesc')}</p>
        </div>
        <BeiweMotionClient
          characterId={characterId}
          initialShots={(shots || []) as CharacterShot[]}
          initialClips={(clips || []) as CharacterClip[]}
          castCharacters={castCharacters}
          hideCost
        />
      </main>
    </DashboardShell>
  );
}
