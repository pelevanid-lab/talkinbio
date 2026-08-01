import DashboardShell from '@/components/dashboard/DashboardShell';
import BeiwePostClient from '@/components/beiwe-lab/BeiwePostClient';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { requireBusinessOwner } from '@/utils/businessAuth';
import { getBusinessCharacterIds, getOrCreateBusinessTwin } from '@/utils/creativeStudioScope';
import type { CharacterShot } from '@/config/characters';
import type { CharacterClip } from '@/config/clips';
import type { StudioAsset } from '@/config/studio';

// admin/beiwe-lab/post/page.tsx'in müşteri karşılığı — admin sürümüyle aynı: Twin +
// işletmenin kendi Cast'inin TÜM kadrosu tek galeride (bkz. getBusinessCharacterIds,
// admin'deki getAllBeiweLabCharacterIds'in business-scoped karşılığı). Yeni kayıtlar
// (asset yükleme vb.) yine yalnız Twin'in kapsamında kalıyor — admin'le aynı desen.
export default async function CreativeStudioPostPage() {
  const business = await requireBusinessOwner();
  const characterId = await getOrCreateBusinessTwin(business.id);
  const characterIds = await getBusinessCharacterIds(business.id, business.name);

  const [{ data: shots }, { data: clips }, { data: assets }] = await Promise.all([
    supabaseAdmin
      .from('character_shots')
      .select('*')
      .in('character_id', characterIds)
      .order('created_at', { ascending: false })
      .limit(120),
    supabaseAdmin
      .from('character_clips')
      .select('*')
      .in('character_id', characterIds)
      .order('created_at', { ascending: false })
      .limit(60),
    supabaseAdmin
      .from('character_studio_assets')
      .select('*')
      .eq('character_id', characterId)
      .eq('kind', 'image')
      .order('created_at', { ascending: false })
      .limit(60),
  ]);

  return (
    <DashboardShell business={business} active="creative-studio">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-['Inter']">
        <div className="mb-6">
          <h1 className="text-xl font-[800] tracking-[-0.02em] text-[#14231F]">Marka Gönderisi</h1>
          <p className="text-sm text-[#4B5A55]">Ekran kaydını, kareyi ya da düz metni marka şablonlu gönderiye çeviren katman.</p>
        </div>
        <BeiwePostClient
          shots={(shots || []) as CharacterShot[]}
          clips={(clips || []) as CharacterClip[]}
          assets={(assets || []) as StudioAsset[]}
          characterId={characterId}
          hideCost
        />
      </main>
    </DashboardShell>
  );
}
