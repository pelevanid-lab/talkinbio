import { requireAdmin } from '@/utils/adminAuth';
import AdminLayout from '@/components/AdminLayout';
import BeiweLabTabs from '@/components/beiwe-lab/BeiweLabTabs';
import BeiwePodcastClient from '@/components/beiwe-lab/BeiwePodcastClient';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { CHARACTERS, type CharacterMotion, type CharacterShot } from '@/config/characters';
import type { CharacterClip } from '@/config/clips';
import { TWIN_CHARACTER_ID } from '@/config/beiweLab';

// Beiwe Lab / Podcast — "beğenilen sahne → video" katmanı.
//
// Video üretimi 3 yola ayrılıyor: video-to-video (wan-motion, mevcut PodcastRoom
// bileşeni), text-to-video ve voice-to-video (ikisi de OmniHuman/Kling, mevcut
// /motion route'u). Bu üç mekanizma zaten çalışıyordu (eski Karakter Odası'nda) —
// burada yeni olan, Beiwe Twin'in kareleri ve Beiwe Voice'un MiniMax klonuyla
// yeniden kablolanmaları.
export default async function BeiwePodcastPage() {
  await requireAdmin();

  const characterId = TWIN_CHARACTER_ID;

  const [{ data: profile }, { data: shots }, { data: clips }, { data: motions }] = await Promise.all([
    supabaseAdmin
      .from('character_profiles')
      .select('identity_prompt, minimax_voice_id, minimax_voice_status')
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

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Beiwe Podcast</h1>
        <p className="text-sm text-slate-500 mt-1">
          Beğenilen sahneleri konuşan videoya çeviren üretim hattı.
        </p>
      </div>
      <BeiweLabTabs />
      <BeiwePodcastClient
        characterId={characterId}
        character={CHARACTERS[characterId]}
        hasIdentity={Boolean(profile?.identity_prompt)}
        initialShots={(shots || []) as CharacterShot[]}
        initialClips={(clips || []) as CharacterClip[]}
        initialMotions={(motions || []) as CharacterMotion[]}
        minimaxVoiceId={profile?.minimax_voice_id ?? null}
        minimaxVoiceStatus={profile?.minimax_voice_status ?? 'none'}
      />
    </AdminLayout>
  );
}
