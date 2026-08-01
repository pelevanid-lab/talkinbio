import DashboardShell from '@/components/dashboard/DashboardShell';
import BeiweStudioClient from '@/components/beiwe-lab/BeiweStudioClient';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { requireBusinessOwner } from '@/utils/businessAuth';
import { getOrCreateBusinessTwin } from '@/utils/creativeStudioScope';
import type { CharacterClip } from '@/config/clips';

// admin/beiwe-lab/studio/page.tsx'in müşteri karşılığı — admin sürümü Twin + Cast'in
// TÜM kadrosunun klip havuzunu gösteriyor; Cast henüz business-scoped olmadığı için
// müşteri sürümü yalnız kendi Twin'inin klip havuzunu gösterir.
export default async function CreativeStudioStudioPage() {
  const business = await requireBusinessOwner();
  const characterId = await getOrCreateBusinessTwin(business.id);

  const { data: clips } = await supabaseAdmin
    .from('character_clips')
    .select('*')
    .eq('character_id', characterId)
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <DashboardShell business={business} active="creative-studio">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-['Inter']">
        <div className="mb-6">
          <h1 className="text-xl font-[800] tracking-[-0.02em] text-[#14231F]">Post-Prodüksiyon</h1>
          <p className="text-sm text-[#4B5A55]">Video kliplerin üstüne cutaway, overlay ve müzik ekleyip formatlı export üreten katman.</p>
        </div>
        <BeiweStudioClient characterId={characterId} initialClips={(clips || []) as CharacterClip[]} />
      </main>
    </DashboardShell>
  );
}
