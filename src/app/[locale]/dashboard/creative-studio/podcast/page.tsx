import DashboardShell from '@/components/dashboard/DashboardShell';
import BeiwePodcastClient from '@/components/beiwe-lab/BeiwePodcastClient';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { requireBusinessOwner } from '@/utils/businessAuth';
import { getOrCreateBusinessTwin } from '@/utils/creativeStudioScope';
import { DEFAULT_CAST_WARDROBE_PROMPT, SHARED_SCENE_PRESETS, type CharacterDefinition, type CharacterShot, type CharacterMotion } from '@/config/characters';
import type { CharacterClip } from '@/config/clips';

// admin/beiwe-lab/podcast/[characterId]/page.tsx'in müşteri karşılığı — Cast henüz
// business-scoped olmadığı için burada da yalnızca işletmenin kendi Twin'i var.
export default async function CreativeStudioPodcastPage() {
  const business = await requireBusinessOwner();
  const characterId = await getOrCreateBusinessTwin(business.id);

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

  const character: CharacterDefinition = {
    id: characterId as CharacterDefinition['id'],
    name: business.name,
    role: 'İşletme sahibi',
    summary: '',
    accentColor: '#334155',
    identityPrompt: profile?.identity_prompt || undefined,
    referenceFile: profile?.reference_image_url || undefined,
    wardrobePrompt: DEFAULT_CAST_WARDROBE_PROMPT,
    scenePresets: SHARED_SCENE_PRESETS,
  };

  return (
    <DashboardShell business={business} active="creative-studio">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-['Inter']">
        <div className="mb-6">
          <h1 className="text-xl font-[800] tracking-[-0.02em] text-[#14231F]">Video İçerik</h1>
          <p className="text-sm text-[#4B5A55]">Beğenilen sahneleri konuşan videoya çeviren üretim hattı.</p>
        </div>
        <BeiwePodcastClient
          characterId={characterId}
          character={character}
          hasIdentity={Boolean(character.identityPrompt)}
          initialShots={(shots || []) as CharacterShot[]}
          initialClips={(clips || []) as CharacterClip[]}
          initialMotions={(motions || []) as CharacterMotion[]}
          minimaxVoiceId={profile?.minimax_voice_id ?? null}
          minimaxVoiceStatus={profile?.minimax_voice_status ?? 'none'}
          hideCost
        />
      </main>
    </DashboardShell>
  );
}
