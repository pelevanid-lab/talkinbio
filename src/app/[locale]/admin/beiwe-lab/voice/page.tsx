import { requireAdmin } from '@/utils/adminAuth';
import AdminLayout from '@/components/AdminLayout';
import BeiweLabTabs from '@/components/beiwe-lab/BeiweLabTabs';
import BeiweVoiceClient from '@/components/beiwe-lab/BeiweVoiceClient';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { CHARACTERS } from '@/config/characters';
import { TWIN_CHARACTER_ID, TWIN_VERIFIED_SCORE } from '@/config/beiweLab';

// Beiwe Lab / Voice — "referans → kalıcı klon kimliği → doğrulanmış ses" katmanı.
//
// MiniMax (`fal-ai/minimax/voice-clone` + `speech-02-hd`) kullanıyor — F5-TTS'in aksine
// kalıcı bir `custom_voice_id` üretiyor ve Türkçe'yi doğru okuyor (bkz. `src/config/beiweLab.ts`
// VOICE_MODEL_NOTE). Twin'deki LoRA'nın karşılığı olarak sayfa üç aşamalı.
export default async function BeiweVoicePage() {
  await requireAdmin();

  const characterId = TWIN_CHARACTER_ID;

  const { data: profile } = await supabaseAdmin
    .from('character_profiles')
    .select('voice_url, voice_status, minimax_voice_id, minimax_voice_status')
    .eq('id', characterId)
    .maybeSingle();

  // Görsel twin doğrulandı mı? Sayfayı kilitlemiyor, yalnızca sıra hatırlatması için.
  const { data: verifiedShots } = await supabaseAdmin
    .from('character_shots')
    .select('id')
    .eq('character_id', characterId)
    .gte('similarity_score', TWIN_VERIFIED_SCORE)
    .neq('model', 'user-upload')
    .limit(1);

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Beiwe Voice</h1>
        <p className="text-sm text-slate-500 mt-1">
          Bir ses kaydını onaylanmış bir ses klonuna çeviren üretim hattı.
        </p>
      </div>
      <BeiweLabTabs />
      <BeiweVoiceClient
        characterId={characterId}
        characterName={CHARACTERS[characterId].name}
        initialVoiceUrl={profile?.voice_url ?? null}
        initialVoiceStatus={profile?.voice_status ?? 'none'}
        initialMinimaxVoiceId={profile?.minimax_voice_id ?? null}
        initialMinimaxVoiceStatus={profile?.minimax_voice_status ?? 'none'}
        twinVerified={(verifiedShots?.length ?? 0) > 0}
      />
    </AdminLayout>
  );
}
