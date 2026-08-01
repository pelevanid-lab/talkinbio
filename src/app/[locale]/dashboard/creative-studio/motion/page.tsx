import DashboardShell from '@/components/dashboard/DashboardShell';
import BeiweMotionClient from '@/components/beiwe-lab/BeiweMotionClient';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { requireBusinessOwner } from '@/utils/businessAuth';
import { getOrCreateBusinessTwin } from '@/utils/creativeStudioScope';
import type { CharacterShot } from '@/config/characters';
import type { CharacterClip } from '@/config/clips';

// admin/beiwe-lab/motion/page.tsx'in müşteri karşılığı — Cast henüz business-scoped
// olmadığı için müşteri sürümünde "Yardımcı Oyuncu" kimlik modu boş bir listeyle gelir
// (jenerik ve Twin modları çalışır).
export default async function CreativeStudioMotionPage() {
  const business = await requireBusinessOwner();
  const characterId = await getOrCreateBusinessTwin(business.id);

  const [{ data: shots }, { data: clips }] = await Promise.all([
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
      .eq('room', 'action')
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  return (
    <DashboardShell business={business} active="creative-studio">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-['Inter']">
        <div className="mb-6">
          <h1 className="text-xl font-[800] tracking-[-0.02em] text-[#14231F]">Motion</h1>
          <p className="text-sm text-[#4B5A55]">AI aktör, anime, çizgi film, cinematic, fantastic ve trend videoları — sesle ilişkilendirilmeyen, boydan görüntünün öne çıktığı üretim hattı.</p>
        </div>
        <BeiweMotionClient
          characterId={characterId}
          initialShots={(shots || []) as CharacterShot[]}
          initialClips={(clips || []) as CharacterClip[]}
          castCharacters={[]}
          hideCost
        />
      </main>
    </DashboardShell>
  );
}
