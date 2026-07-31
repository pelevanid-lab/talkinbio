import { requireAdmin } from '@/utils/adminAuth';
import AdminLayout from '@/components/AdminLayout';
import BeiweLabTabs from '@/components/beiwe-lab/BeiweLabTabs';
import BeiweStudioClient from '@/components/beiwe-lab/BeiweStudioClient';
import { supabaseAdmin } from '@/utils/supabase/admin';
import type { CharacterClip } from '@/config/clips';
import { TWIN_CHARACTER_ID } from '@/config/beiweLab';
import { getAllBeiweLabCharacterIds } from '@/utils/beiweLabScope';

// Beiwe Lab / Studio — Karakter Odası'ndaki "Post Production & Metin Ekleme" adımının
// (bkz. eski `CharacterRoomClient.tsx`, `StudioSection`) Beiwe Lab'a taşınmış hâli.
// Farkı yok — aynı `StudioSection` bileşeni, ortak klip havuzunun (Podcast + Action +
// harici yüklemeler, `room` filtresi YOK) tamamı üzerinde çalışıyor.
//
// Klip havuzu TEK bir karaktere (`characterId`, proje kaydetme/yeni asset yükleme kapsamı
// olarak kalıyor) değil, TÜM oyuncu kadrosuna (Twin + Yardımcı Oyuncular) göre çekiliyor —
// bkz. `getAllBeiweLabCharacterIds` yorumu: Saule/Beiwe/eklenen sanal karakterler için
// Motion/Podcast'te üretilen videolar da burada görünmeli, yalnızca Twin'inkiler değil.
export default async function BeiweStudioPage() {
  await requireAdmin();

  const characterId = TWIN_CHARACTER_ID;
  const characterIds = await getAllBeiweLabCharacterIds();

  const { data: clips } = await supabaseAdmin
    .from('character_clips')
    .select('*')
    .in('character_id', characterIds)
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Beiwe Studio</h1>
        <p className="text-sm text-slate-500 mt-1">
          Podcast/Action klipleri (+ harici yüklemeler) üstünde cutaway, overlay ve müzik
          ekleyip formatlı export üreten post-prodüksiyon katmanı.
        </p>
      </div>
      <BeiweLabTabs />
      <BeiweStudioClient characterId={characterId} initialClips={(clips || []) as CharacterClip[]} />
    </AdminLayout>
  );
}
