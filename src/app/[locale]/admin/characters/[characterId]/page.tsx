import { notFound } from 'next/navigation';
import { requireAdmin } from '@/utils/adminAuth';
import AdminLayout from '@/components/AdminLayout';
import CharacterRoomTabs from '@/components/CharacterRoomTabs';
import CharacterRoomClient from '@/components/CharacterRoomClient';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { CHARACTERS, isCharacterId, type CharacterShot } from '@/config/characters';
import type { CharacterClip } from '@/config/clips';

export default async function CharacterRoomPage({ params }: { params: Promise<{ characterId: string }> }) {
  await requireAdmin();

  const { characterId } = await params;
  if (!isCharacterId(characterId)) notFound();

  let character = { ...CHARACTERS[characterId] };

  // Veritabanından dinamik veriyi (identity_prompt, vb.) çek
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
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Karakter Odası</h1>
      <CharacterRoomTabs />
      <CharacterRoomClient
        character={character}
        initialShots={(shots || []) as CharacterShot[]}
        initialClips={(clips || []) as CharacterClip[]}
      />
    </AdminLayout>
  );
}
