import { requireAdmin } from '@/utils/adminAuth';
import AdminLayout from '@/components/AdminLayout';
import BeiweLabTabs from '@/components/beiwe-lab/BeiweLabTabs';
import BeiwePostClient from '@/components/beiwe-lab/BeiwePostClient';
import { supabaseAdmin } from '@/utils/supabase/admin';
import type { CharacterShot } from '@/config/characters';
import type { CharacterClip } from '@/config/clips';
import type { StudioAsset } from '@/config/studio';
import { TWIN_CHARACTER_ID } from '@/config/beiweLab';
import { getAllBeiweLabCharacterIds } from '@/utils/beiweLabScope';

// Beiwe Lab / Post — "herhangi bir görsel → marka şablonlu gönderi" katmanı.
//
// Diğer katmanlardan farkı: burada AI üretimi YOK. Girdi çoğunlukla bir ekran kaydı
// karesi ya da ekran görüntüsü; iş, onu tutarlı bir şablona oturtmak. 2026-07-29
// incelemesinde ElevenLabs ızgarasının çoğunun ekran kaydı olduğu görüldü — bir
// hesabı "marka" yapan şey üretilen video değil, her karoya vuran aynı şablon.
//
// Görsel kaynağı üç yerden gelebiliyor: cihazdan yükleme (sunucuya hiç gitmiyor —
// object URL ile tarayıcıda kalıyor), Twin/Yardımcı Oyuncular kare galerisi VEYA
// Beiwe Podcast/Motion'da üretilen videolar (bkz. getAllBeiweLabCharacterIds — Post
// bilerek TEK karaktere kilitli değil, tüm oyuncu kadrosu galeride görünür).
export default async function BeiwePostPage() {
  await requireAdmin();

  const characterIds = await getAllBeiweLabCharacterIds();

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
    // "Arka planı kaldır" ve "Stüdyo kütüphanesine kaydet" sonuçları buraya (character_studio_assets)
    // yazılıyor — TWIN_CHARACTER_ID'ye kilitli, Post'un kendi kaydettiği tek havuz bu.
    supabaseAdmin
      .from('character_studio_assets')
      .select('*')
      .eq('character_id', TWIN_CHARACTER_ID)
      .eq('kind', 'image')
      .order('created_at', { ascending: false })
      .limit(60),
  ]);

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Beiwe Post</h1>
        <p className="text-sm text-slate-500 mt-1">
          Ekran kaydını, kareyi ya da düz metni marka şablonlu gönderiye çeviren katman.
        </p>
      </div>
      <BeiweLabTabs />
      <BeiwePostClient
        shots={(shots || []) as CharacterShot[]}
        clips={(clips || []) as CharacterClip[]}
        assets={(assets || []) as StudioAsset[]}
        characterId={TWIN_CHARACTER_ID}
      />
    </AdminLayout>
  );
}
