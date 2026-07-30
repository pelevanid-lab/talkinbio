import { notFound } from 'next/navigation';
import { requireAdmin } from '@/utils/adminAuth';
import AdminLayout from '@/components/AdminLayout';
import BeiweLabTabs from '@/components/beiwe-lab/BeiweLabTabs';
import CharacterRoomTabs from '@/components/CharacterRoomTabs';
import CharacterRoomClient from '@/components/CharacterRoomClient';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { CHARACTERS, type CharacterShot } from '@/config/characters';
import { CAST_CHARACTER_IDS } from '@/config/beiweLab';
import type { CharacterClip } from '@/config/clips';

type CastCharacterId = (typeof CAST_CHARACTER_IDS)[number];

function isCastCharacterId(value: unknown): value is CastCharacterId {
  return typeof value === 'string' && (CAST_CHARACTER_IDS as readonly string[]).includes(value);
}

// Beiwe Lab / Yardımcı Oyuncular — eski Karakter Odası'nın (bkz. admin/characters)
// Saule + Beiwe kısmının Lab'a taşınmış hali. Enes/Enes2 burada yok, onlar kurucunun
// kendi twin'i — Beiwe Twin sayfasında ele alınıyor (bkz. CAST_CHARACTER_IDS).
export default async function BeiweLabCastPage({ params }: { params: Promise<{ characterId: string }> }) {
  await requireAdmin();

  const { characterId } = await params;
  if (!isCastCharacterId(characterId)) notFound();

  let character = { ...CHARACTERS[characterId] };

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

  return (
    <AdminLayout>
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Yardımcı Oyuncular</h1>
      <BeiweLabTabs />
      <CharacterRoomTabs ids={CAST_CHARACTER_IDS} basePath="/admin/beiwe-lab/cast" />
      <CharacterRoomClient
        character={character}
        initialShots={(shots || []) as CharacterShot[]}
        initialClips={(clips || []) as CharacterClip[]}
      />
    </AdminLayout>
  );
}
