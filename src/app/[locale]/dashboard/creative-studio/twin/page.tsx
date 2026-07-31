import DashboardShell from '@/components/dashboard/DashboardShell';
import BeiweTwinClient, { type TwinProfile } from '@/components/beiwe-lab/BeiweTwinClient';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { requireBusinessOwner } from '@/utils/businessAuth';
import { getOrCreateBusinessTwin } from '@/utils/creativeStudioScope';
import type { CharacterShot } from '@/config/characters';

// admin/beiwe-lab/twin/page.tsx'in müşteri dashboard'undaki karşılığı — aynı
// BeiweTwinClient'ı kullanır, tek fark: requireAdmin() yerine requireBusinessOwner(),
// sabit TWIN_CHARACTER_ID yerine bu işletmenin kendi (auto-provision edilen) Twin'i,
// ve statik CHARACTERS registry fallback'i yok (business Twin'i orada değil).
export default async function CreativeStudioTwinPage() {
  const business = await requireBusinessOwner();
  const characterId = await getOrCreateBusinessTwin(business.id);

  const { data: profile } = await supabaseAdmin
    .from('character_profiles')
    .select('identity_prompt, reference_image_url, lora_status, lora_url, lora_trigger_word')
    .eq('id', characterId)
    .maybeSingle();

  const { data: shots } = await supabaseAdmin
    .from('character_shots')
    .select('*')
    .eq('character_id', characterId)
    .order('created_at', { ascending: false })
    .limit(120);

  const initialProfile: TwinProfile = {
    identity_prompt: profile?.identity_prompt ?? null,
    reference_image_url: profile?.reference_image_url ?? null,
    lora_status: profile?.lora_status ?? 'none',
    lora_url: profile?.lora_url ?? null,
    lora_trigger_word: profile?.lora_trigger_word ?? null,
  };

  return (
    <DashboardShell business={business} active="creative-studio">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-['Inter']">
        <div className="mb-6">
          <h1 className="text-xl font-[800] tracking-[-0.02em] text-[#14231F]">Dijital İkiz</h1>
          <p className="text-sm text-[#4B5A55]">Bir yüzü doğrulanmış bir AI ikize çeviren üretim hattı.</p>
        </div>
        <BeiweTwinClient
          characterId={characterId}
          characterName={business.name}
          initialProfile={initialProfile}
          initialShots={(shots || []) as CharacterShot[]}
          allowInstagramImport={false}
        />
      </main>
    </DashboardShell>
  );
}
