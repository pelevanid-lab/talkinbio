import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import DashboardShell from '@/components/dashboard/DashboardShell';
import CastRoomTabs from '@/components/beiwe-lab/CastRoomTabs';
import BeiweVoiceClient from '@/components/beiwe-lab/BeiweVoiceClient';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { requireBusinessOwner } from '@/utils/businessAuth';
import { getBusinessCastRoster, getOrCreateBusinessTwin } from '@/utils/creativeStudioScope';
import { TWIN_VERIFIED_SCORE } from '@/config/beiweLab';

const VOICE_BASE_PATH = '/dashboard/creative-studio/voice';

// admin/beiwe-lab/voice/[characterId]/page.tsx'in müşteri karşılığı — Twin + işletmenin
// kendi Yardımcı Oyuncular'ı (bkz. getBusinessCastRoster) arasında CastRoomTabs ile geçiş.
export default async function CreativeStudioVoicePage({ params }: { params: Promise<{ characterId: string }> }) {
  const business = await requireBusinessOwner();
  const t = await getTranslations('BeiweLab');
  const { characterId } = await params;

  const twinId = await getOrCreateBusinessTwin(business.id);
  const roster = await getBusinessCastRoster(business);

  // Bu karakter gerçekten bu işletmenin mi — değilse (başka işletmenin id'si, yazım
  // hatası vb.) sessizce kendi Twin'ine geri dön.
  const active = roster.find((r) => r.id === characterId);
  if (!active) redirect(`${VOICE_BASE_PATH}/${twinId}`);

  const { data: profile } = await supabaseAdmin
    .from('character_profiles')
    .select('voice_url, voice_status, minimax_voice_id, minimax_voice_status')
    .eq('id', characterId)
    .maybeSingle();

  const isTwin = characterId === twinId;

  // Yalnızca Twin gerçek bir kişi — Yardımcı Oyuncular'ın kendi referans kaydı olamaz,
  // admin/beiwe-lab/voice ile aynı ayrım (bkz. oradaki yorum).
  let twinVerified = true;
  if (isTwin) {
    const { data: verifiedShots } = await supabaseAdmin
      .from('character_shots')
      .select('id')
      .eq('character_id', characterId)
      .gte('similarity_score', TWIN_VERIFIED_SCORE)
      .neq('model', 'user-upload')
      .limit(1);
    twinVerified = (verifiedShots?.length ?? 0) > 0;
  }

  return (
    <DashboardShell business={business} active="creative-studio">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-['Inter']">
        <div className="mb-6">
          <h1 className="text-xl font-[800] tracking-[-0.02em] text-[#14231F]">{t('voiceTitle')}</h1>
          <p className="text-sm text-[#4B5A55]">{t('voiceDesc')}</p>
        </div>
        <CastRoomTabs characters={roster} basePath={VOICE_BASE_PATH} showAdd={false} />
        <BeiweVoiceClient
          characterId={characterId}
          characterName={active.name}
          initialVoiceUrl={profile?.voice_url ?? null}
          initialVoiceStatus={profile?.voice_status ?? 'none'}
          initialMinimaxVoiceId={profile?.minimax_voice_id ?? null}
          initialMinimaxVoiceStatus={profile?.minimax_voice_status ?? 'none'}
          twinVerified={twinVerified}
          hideCost
        />
      </main>
    </DashboardShell>
  );
}
