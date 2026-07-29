import { requireAdmin } from '@/utils/adminAuth';
import AdminLayout from '@/components/AdminLayout';
import BeiweLabTabs from '@/components/beiwe-lab/BeiweLabTabs';
import BeiweMotionClient from '@/components/beiwe-lab/BeiweMotionClient';
import { supabaseAdmin } from '@/utils/supabase/admin';
import type { CharacterShot } from '@/config/characters';
import type { CharacterClip } from '@/config/clips';
import { TWIN_CHARACTER_ID } from '@/config/beiweLab';

// Beiwe Lab / Motion — "Action Room". AI aktör / anime / çizgi film / cinematic /
// fantastic / trend videoları. Podcast'in aksine kimlik zorunlu değil (Twin ya da
// jenerik/rastgele karakter) ve çıktı sesle ilişkilendirilmiyor. `character_clips`
// şemasındaki 'action' odası bunun için zaten ayrılmıştı (bkz. 00050_character_clips.sql)
// — yalnızca üretici tarafı eksikti.
export default async function BeiweMotionPage() {
  await requireAdmin();

  const characterId = TWIN_CHARACTER_ID;

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
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Beiwe Motion</h1>
        <p className="text-sm text-slate-500 mt-1">
          AI aktör, anime, çizgi film, cinematic, fantastic ve trend videoları — sesle
          ilişkilendirilmeyen, boydan görüntünün öne çıktığı üretim hattı.
        </p>
      </div>
      <BeiweLabTabs />
      <BeiweMotionClient
        characterId={characterId}
        initialShots={(shots || []) as CharacterShot[]}
        initialClips={(clips || []) as CharacterClip[]}
      />
    </AdminLayout>
  );
}
