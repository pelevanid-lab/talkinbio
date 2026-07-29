import { requireAdmin } from '@/utils/adminAuth';
import AdminLayout from '@/components/AdminLayout';
import BeiweLabTabs from '@/components/beiwe-lab/BeiweLabTabs';
import BeiweTwinClient, { type TwinProfile } from '@/components/beiwe-lab/BeiweTwinClient';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { CHARACTERS, type CharacterShot } from '@/config/characters';
import { TWIN_CHARACTER_ID } from '@/config/beiweLab';

// Beiwe Lab / Twin — Karakter Odası'ndaki "yüzü tanıt → twin üret → puanla → LoRA"
// zincirinin kendi sayfası. Sahne/içerik üretimi bilerek dışarıda: bu sayfanın tek
// sorusu "bu yüz kişiye benziyor mu?".
export default async function BeiweTwinPage() {
  await requireAdmin();

  const characterId = TWIN_CHARACTER_ID;

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
    identity_prompt: profile?.identity_prompt ?? CHARACTERS[characterId].identityPrompt ?? null,
    reference_image_url: profile?.reference_image_url ?? null,
    lora_status: profile?.lora_status ?? 'none',
    lora_url: profile?.lora_url ?? null,
    lora_trigger_word: profile?.lora_trigger_word ?? null,
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Beiwe Twin</h1>
        <p className="text-sm text-slate-500 mt-1">
          Bir yüzü doğrulanmış bir AI twin&apos;e çeviren üretim hattı.
        </p>
      </div>
      <BeiweLabTabs />
      <BeiweTwinClient
        characterId={characterId}
        characterName={CHARACTERS[characterId].name}
        initialProfile={initialProfile}
        initialShots={(shots || []) as CharacterShot[]}
      />
    </AdminLayout>
  );
}
