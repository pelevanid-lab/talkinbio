import { getTranslations } from 'next-intl/server';
import DashboardShell from '@/components/dashboard/DashboardShell';
import StudioHubTabs from '@/components/studio-hub/StudioHubTabs';
import DuzenlePanels from '@/components/studio-hub/DuzenlePanels';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { requireBusinessOwner } from '@/utils/businessAuth';
import { getBusinessCharacterIds, getOrCreateBusinessTwin } from '@/utils/creativeStudioScope';
import { TWIN_VERIFIED_SCORE } from '@/config/beiweLab';
import type { CharacterClip } from '@/config/clips';

// Düzenle = Ses Klonu (`creative-studio/voice/[characterId]/page.tsx`'in veri çekimi) +
// Video Düzenleme (`creative-studio/studio/page.tsx`'in veri çekimi), tek sayfada
// `DuzenlePanels` pill-switcher'ı arkasında. v1 SINIRI (bilerek): yalnızca işletmenin
// Twin'i — Cast (Yardımcı Oyuncular) arasında geçiş yok, `CastRoomTabs` burada YOK,
// çünkü Cast/Motion/Podcast/Twin üretimi bu hub'ın kapsamı dışında (kurucu kararı).
// Ses klonu hâlâ MEVCUT MiniMax akışı — ElevenLabs geçişi ayrı bir spike (plan dosyası).
export default async function StudioDuzenlePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const business = await requireBusinessOwner(locale);
  const t = await getTranslations('StudioHub');

  const twinId = await getOrCreateBusinessTwin(business.id);
  const characterIds = await getBusinessCharacterIds(business.id, business.name);

  const [{ data: clips }, { data: profile }, { data: verifiedShots }] = await Promise.all([
    supabaseAdmin
      .from('character_clips')
      .select('*')
      .in('character_id', characterIds)
      .order('created_at', { ascending: false })
      .limit(100),
    supabaseAdmin
      .from('character_profiles')
      .select('voice_url, voice_status, minimax_voice_id, minimax_voice_status')
      .eq('id', twinId)
      .maybeSingle(),
    supabaseAdmin
      .from('character_shots')
      .select('id')
      .eq('character_id', twinId)
      .gte('similarity_score', TWIN_VERIFIED_SCORE)
      .neq('model', 'user-upload')
      .limit(1),
  ]);

  return (
    <DashboardShell business={business} active="studio">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-['Inter']">
        <StudioHubTabs />
        <div className="mb-6">
          <h1 className="text-xl font-[800] tracking-[-0.02em] text-[#14231F]">{t('duzenlePageTitle')}</h1>
          <p className="text-sm text-[#4B5A55]">{t('duzenlePageDesc')}</p>
        </div>
        <DuzenlePanels
          voice={{
            characterId: twinId,
            characterName: business.name,
            initialVoiceUrl: profile?.voice_url ?? null,
            initialVoiceStatus: profile?.voice_status ?? 'none',
            initialMinimaxVoiceId: profile?.minimax_voice_id ?? null,
            initialMinimaxVoiceStatus: profile?.minimax_voice_status ?? 'none',
            twinVerified: (verifiedShots?.length ?? 0) > 0,
          }}
          studio={{ characterId: twinId, initialClips: (clips || []) as CharacterClip[] }}
        />
      </main>
    </DashboardShell>
  );
}
