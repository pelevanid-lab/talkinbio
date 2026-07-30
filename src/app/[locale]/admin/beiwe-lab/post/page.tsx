import { requireAdmin } from '@/utils/adminAuth';
import AdminLayout from '@/components/AdminLayout';
import BeiweLabTabs from '@/components/beiwe-lab/BeiweLabTabs';
import BeiwePostClient from '@/components/beiwe-lab/BeiwePostClient';
import { supabaseAdmin } from '@/utils/supabase/admin';
import type { CharacterShot } from '@/config/characters';
import { TWIN_CHARACTER_ID } from '@/config/beiweLab';

// Beiwe Lab / Post — "herhangi bir görsel → marka şablonlu gönderi" katmanı.
//
// Diğer katmanlardan farkı: burada AI üretimi YOK. Girdi çoğunlukla bir ekran kaydı
// karesi ya da ekran görüntüsü; iş, onu tutarlı bir şablona oturtmak. 2026-07-29
// incelemesinde ElevenLabs ızgarasının çoğunun ekran kaydı olduğu görüldü — bir
// hesabı "marka" yapan şey üretilen video değil, her karoya vuran aynı şablon.
//
// Görsel kaynağı iki yerden gelebiliyor: cihazdan yükleme (asıl yol, sunucuya hiç
// gitmiyor — object URL ile tarayıcıda kalıyor) veya mevcut kare galerisi.
export default async function BeiwePostPage() {
  await requireAdmin();

  const { data: shots } = await supabaseAdmin
    .from('character_shots')
    .select('*')
    .eq('character_id', TWIN_CHARACTER_ID)
    .order('created_at', { ascending: false })
    .limit(60);

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Beiwe Post</h1>
        <p className="text-sm text-slate-500 mt-1">
          Ekran kaydını, kareyi ya da düz metni marka şablonlu gönderiye çeviren katman.
        </p>
      </div>
      <BeiweLabTabs />
      <BeiwePostClient shots={(shots || []) as CharacterShot[]} characterId={TWIN_CHARACTER_ID} />
    </AdminLayout>
  );
}
