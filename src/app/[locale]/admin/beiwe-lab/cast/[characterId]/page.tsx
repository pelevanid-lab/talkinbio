import { notFound } from 'next/navigation';
import { requireAdmin } from '@/utils/adminAuth';
import AdminLayout from '@/components/AdminLayout';
import BeiweLabTabs from '@/components/beiwe-lab/BeiweLabTabs';
import CastRoomTabs, { type CastCharacterSummary } from '@/components/beiwe-lab/CastRoomTabs';
import CharacterRoomClient from '@/components/CharacterRoomClient';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { CHARACTERS, DEFAULT_CAST_WARDROBE_PROMPT, SHARED_SCENE_PRESETS, type CharacterDefinition, type CharacterShot } from '@/config/characters';
import { CAST_CHARACTER_IDS } from '@/config/beiweLab';
import type { CharacterClip } from '@/config/clips';

type CastCharacterId = (typeof CAST_CHARACTER_IDS)[number];

function isStaticCastId(value: string): value is CastCharacterId {
  return (CAST_CHARACTER_IDS as readonly string[]).includes(value);
}

// Beiwe Lab / Yardımcı Oyuncular — eski Karakter Odası'nın (bkz. admin/characters)
// Saule + Beiwe kısmının Lab'a taşınmış hali, artı admin panelinden serbestçe eklenen
// sanal/kurgusal destek karakterleri (bkz. api/admin/beiwe-lab/cast). Enes/Enes2 burada
// yok, onlar kurucunun kendi twin'i — Beiwe Twin sayfasında ele alınıyor.
export default async function BeiweLabCastPage({ params }: { params: Promise<{ characterId: string }> }) {
  await requireAdmin();

  const { characterId } = await params;

  const { data: castRows } = await supabaseAdmin
    .from('character_profiles')
    .select('id, name, role, identity_prompt, reference_image_url, voice_url')
    .eq('is_cast', true)
    .order('created_at', { ascending: true });

  const dynamicCharacters = castRows || [];
  const dynamicRow = dynamicCharacters.find((r) => r.id === characterId);

  if (!isStaticCastId(characterId) && !dynamicRow) notFound();

  let character: CharacterDefinition;

  if (isStaticCastId(characterId)) {
    character = { ...CHARACTERS[characterId] };

    const { data: profile } = await supabaseAdmin
      .from('character_profiles')
      .select('*')
      .eq('id', characterId)
      .single();

    if (profile) {
      if (profile.identity_prompt) character.identityPrompt = profile.identity_prompt;
      if (profile.reference_image_url) character.referenceFile = profile.reference_image_url;
      if (profile.voice_url) character.voiceUrl = profile.voice_url;
    }
  } else {
    character = {
      id: characterId as CharacterDefinition['id'],
      name: dynamicRow!.name || characterId,
      role: dynamicRow!.role || 'Yardımcı oyuncu — sanal karakter',
      summary: '',
      accentColor: '#334155',
      identityPrompt: dynamicRow!.identity_prompt || undefined,
      referenceFile: dynamicRow!.reference_image_url || undefined,
      voiceUrl: dynamicRow!.voice_url || undefined,
      wardrobePrompt: DEFAULT_CAST_WARDROBE_PROMPT,
      scenePresets: SHARED_SCENE_PRESETS,
    };
  }

  const { data: shots } = await supabaseAdmin
    .from('character_shots')
    .select('*')
    .eq('character_id', characterId)
    .order('created_at', { ascending: false })
    .limit(120);

  const { data: clips } = await supabaseAdmin
    .from('character_clips')
    .select('*')
    .eq('character_id', characterId)
    .order('created_at', { ascending: false })
    .limit(100);

  const tabCharacters: CastCharacterSummary[] = [
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

  return (
    <AdminLayout>
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Yardımcı Oyuncular</h1>
      <BeiweLabTabs />
      <CastRoomTabs characters={tabCharacters} />
      <CharacterRoomClient
        character={character}
        initialShots={(shots || []) as CharacterShot[]}
        initialClips={(clips || []) as CharacterClip[]}
        mode="cast"
      />
    </AdminLayout>
  );
}
