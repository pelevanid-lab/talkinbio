import DashboardShell from '@/components/dashboard/DashboardShell';
import BeiweVoiceClient from '@/components/beiwe-lab/BeiweVoiceClient';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { requireBusinessOwner } from '@/utils/businessAuth';
import { getOrCreateBusinessTwin } from '@/utils/creativeStudioScope';
import { TWIN_VERIFIED_SCORE } from '@/config/beiweLab';

// admin/beiwe-lab/voice/[characterId]/page.tsx'in müşteri karşılığı — Cast henüz
// business-scoped olmadığı için (bkz. task "Move Cast to Creative Studio") burada
// yalnızca işletmenin kendi Twin'i var, CastRoomTabs anahtarı yok.
export default async function CreativeStudioVoicePage() {
  const business = await requireBusinessOwner();
  const characterId = await getOrCreateBusinessTwin(business.id);

  const { data: profile } = await supabaseAdmin
    .from('character_profiles')
    .select('voice_url, voice_status, minimax_voice_id, minimax_voice_status')
    .eq('id', characterId)
    .maybeSingle();

  const { data: verifiedShots } = await supabaseAdmin
    .from('character_shots')
    .select('id')
    .eq('character_id', characterId)
    .gte('similarity_score', TWIN_VERIFIED_SCORE)
    .neq('model', 'user-upload')
    .limit(1);
  const twinVerified = (verifiedShots?.length ?? 0) > 0;

  return (
    <DashboardShell business={business} active="creative-studio">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-['Inter']">
        <div className="mb-6">
          <h1 className="text-xl font-[800] tracking-[-0.02em] text-[#14231F]">Ses Klonu</h1>
          <p className="text-sm text-[#4B5A55]">Bir ses kaydını onaylanmış bir ses klonuna çeviren üretim hattı.</p>
        </div>
        <BeiweVoiceClient
          characterId={characterId}
          characterName={business.name}
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
