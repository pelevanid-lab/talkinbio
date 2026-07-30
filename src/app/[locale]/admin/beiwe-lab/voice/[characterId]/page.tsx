import { notFound } from 'next/navigation';
import { requireAdmin } from '@/utils/adminAuth';
import AdminLayout from '@/components/AdminLayout';
import BeiweLabTabs from '@/components/beiwe-lab/BeiweLabTabs';
import CastRoomTabs, { type CastCharacterSummary } from '@/components/beiwe-lab/CastRoomTabs';
import BeiweVoiceClient from '@/components/beiwe-lab/BeiweVoiceClient';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { CHARACTERS } from '@/config/characters';
import { CAST_CHARACTER_IDS, TWIN_CHARACTER_ID, TWIN_VERIFIED_SCORE } from '@/config/beiweLab';

const VOICE_BASE_PATH = '/admin/beiwe-lab/voice';

/**
 * Beiwe Voice — artık yalnızca Twin (enes2) değil, Yardımcı Oyuncular'ın (Saule, Beiwe,
 * admin panelinden eklenen sanal karakterler) sesi de burada klonlanabiliyor. `BeiweVoiceClient`
 * zaten characterId'ye göre parametrikti (bkz. `character_profiles.voice_url` vb. — herhangi
 * bir id'yi kabul ediyor), eksik olan tek şey karakter seçimiydi.
 */
export default async function BeiweVoicePage({ params }: { params: Promise<{ characterId: string }> }) {
  await requireAdmin();

  const { characterId } = await params;

  const { data: castRows } = await supabaseAdmin
    .from('character_profiles')
    .select('id, name, role, reference_image_url')
    .eq('is_cast', true)
    .order('created_at', { ascending: true });

  const dynamicCharacters = castRows || [];

  const roster: CastCharacterSummary[] = [
    {
      id: TWIN_CHARACTER_ID,
      name: CHARACTERS[TWIN_CHARACTER_ID].name,
      role: CHARACTERS[TWIN_CHARACTER_ID].role,
      avatarUrl: undefined,
    },
    ...CAST_CHARACTER_IDS.map((id) => ({
      id,
      name: CHARACTERS[id].name,
      role: CHARACTERS[id].role,
      avatarUrl: CHARACTERS[id].referenceFile
        ? (CHARACTERS[id].referenceFile!.startsWith('http') ? CHARACTERS[id].referenceFile! : `/${CHARACTERS[id].referenceFile}`)
        : undefined,
    })),
    ...dynamicCharacters.map((row) => ({
      id: row.id,
      name: row.name || row.id,
      role: row.role || 'Yardımcı oyuncu',
      avatarUrl: row.reference_image_url || undefined,
    })),
  ];

  const active = roster.find((r) => r.id === characterId);
  if (!active) notFound();

  const { data: profile } = await supabaseAdmin
    .from('character_profiles')
    .select('voice_url, voice_status, minimax_voice_id, minimax_voice_status')
    .eq('id', characterId)
    .maybeSingle();

  const isTwin = characterId === TWIN_CHARACTER_ID;

  // Yalnızca Twin gerçek bir kişi — yardımcı oyuncuların (Saule/Beiwe/sanal karakterler)
  // kendi referans kaydı olamaz, o yüzden onlara hazır ses kütüphanesi sunuluyor. `undefined`
  // (Twin) ile `[]` (henüz hiç preset yüklenmemiş yardımcı oyuncu) bilerek ayrı tutuluyor —
  // ilki picker'ı hiç göstermez, ikincisi boş galeri + "ekle" formunu gösterir.
  let voicePresets: { id: string; label: string; audioUrl: string }[] | undefined;
  if (!isTwin) {
    const { data: presetRows } = await supabaseAdmin
      .from('voice_presets')
      .select('id, label, audio_url')
      .order('created_at', { ascending: true });
    voicePresets = (presetRows || []).map((p) => ({ id: p.id, label: p.label, audioUrl: p.audio_url }));
  }

  // Yalnızca Twin için görsel doğrulama uyarısı anlamlı — Saule/Beiwe/sanal karakterlerde
  // benzerlik puanlaması yok (bkz. CharacterRoomClient mode="cast"), yani her zaman "hazır".
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
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Beiwe Voice</h1>
        <p className="text-sm text-slate-500 mt-1">
          Bir ses kaydını onaylanmış bir ses klonuna çeviren üretim hattı.
        </p>
      </div>
      <BeiweLabTabs />
      <CastRoomTabs characters={roster} basePath={VOICE_BASE_PATH} showAdd={false} />
      <BeiweVoiceClient
        characterId={characterId}
        characterName={active.name}
        initialVoiceUrl={profile?.voice_url ?? null}
        initialVoiceStatus={profile?.voice_status ?? 'none'}
        initialMinimaxVoiceId={profile?.minimax_voice_id ?? null}
        initialMinimaxVoiceStatus={profile?.minimax_voice_status ?? 'none'}
        twinVerified={twinVerified}
        voicePresets={voicePresets}
      />
    </AdminLayout>
  );
}
