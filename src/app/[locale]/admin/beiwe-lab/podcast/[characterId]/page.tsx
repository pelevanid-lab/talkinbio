import { notFound } from 'next/navigation';
import { requireAdmin } from '@/utils/adminAuth';
import AdminLayout from '@/components/AdminLayout';
import BeiweLabTabs from '@/components/beiwe-lab/BeiweLabTabs';
import CastRoomTabs, { type CastCharacterSummary } from '@/components/beiwe-lab/CastRoomTabs';
import BeiwePodcastClient from '@/components/beiwe-lab/BeiwePodcastClient';
import { supabaseAdmin } from '@/utils/supabase/admin';
import {
  CHARACTERS,
  DEFAULT_CAST_WARDROBE_PROMPT,
  SHARED_SCENE_PRESETS,
  isCharacterId,
  type CharacterDefinition,
  type CharacterMotion,
  type CharacterShot,
} from '@/config/characters';
import { CAST_CHARACTER_IDS, TWIN_CHARACTER_ID } from '@/config/beiweLab';
import type { CharacterClip } from '@/config/clips';

const PODCAST_BASE_PATH = '/admin/beiwe-lab/podcast';

/**
 * Beiwe Podcast — artık yalnızca Twin (enes2) değil, Yardımcı Oyuncular'ın (Saule, Beiwe,
 * admin panelinden eklenen sanal karakterler) sahneleri de burada konuşan videoya
 * çevrilebiliyor. `BeiwePodcastClient` zaten characterId'ye göre parametrikti — eksik olan
 * tek şey karakter seçimiydi (bkz. Beiwe Voice'ta aynı desen).
 */
export default async function BeiwePodcastPage({ params }: { params: Promise<{ characterId: string }> }) {
  await requireAdmin();

  const { characterId } = await params;

  const { data: castRows } = await supabaseAdmin
    .from('character_profiles')
    .select('id, name, role, reference_image_url')
    .eq('is_cast', true)
    .is('business_id', null)
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

  const dynamicRow = dynamicCharacters.find((r) => r.id === characterId);

  const [{ data: profile }, { data: shots }, { data: clips }, { data: motions }] = await Promise.all([
    supabaseAdmin
      .from('character_profiles')
      .select('identity_prompt, reference_image_url, minimax_voice_id, minimax_voice_status')
      .eq('id', characterId)
      .maybeSingle(),
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
      .eq('room', 'podcast')
      .order('created_at', { ascending: false })
      .limit(100),
    supabaseAdmin
      .from('character_motions')
      .select('*')
      .eq('character_id', characterId)
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  // Statik karakterler (`CHARACTERS`) VEYA Yardımcı Oyuncular'da eklenmiş sanal
  // karakterler (`character_profiles.is_cast`) — bkz. cast/[characterId]/page.tsx'teki
  // aynı ayrım.
  let character: CharacterDefinition;
  if (isCharacterId(characterId)) {
    character = { ...CHARACTERS[characterId] };
    if (profile?.identity_prompt) character.identityPrompt = profile.identity_prompt;
    if (profile?.reference_image_url) character.referenceFile = profile.reference_image_url;
  } else {
    character = {
      id: characterId as CharacterDefinition['id'],
      name: dynamicRow?.name || characterId,
      role: dynamicRow?.role || 'Yardımcı oyuncu — sanal karakter',
      summary: '',
      accentColor: '#334155',
      identityPrompt: profile?.identity_prompt || undefined,
      referenceFile: profile?.reference_image_url || dynamicRow?.reference_image_url || undefined,
      wardrobePrompt: DEFAULT_CAST_WARDROBE_PROMPT,
      scenePresets: SHARED_SCENE_PRESETS,
    };
  }

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Beiwe Podcast</h1>
        <p className="text-sm text-slate-500 mt-1">
          Beğenilen sahneleri konuşan videoya çeviren üretim hattı.
        </p>
      </div>
      <BeiweLabTabs />
      <CastRoomTabs characters={roster} basePath={PODCAST_BASE_PATH} showAdd={false} />
      <BeiwePodcastClient
        characterId={characterId}
        character={character}
        hasIdentity={Boolean(character.identityPrompt)}
        initialShots={(shots || []) as CharacterShot[]}
        initialClips={(clips || []) as CharacterClip[]}
        initialMotions={(motions || []) as CharacterMotion[]}
        minimaxVoiceId={profile?.minimax_voice_id ?? null}
        minimaxVoiceStatus={profile?.minimax_voice_status ?? 'none'}
      />
    </AdminLayout>
  );
}
