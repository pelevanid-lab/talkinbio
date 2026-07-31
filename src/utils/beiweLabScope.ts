// Beiwe Lab — Post/Studio galerilerinin karakter kapsamını genişleten paylaşılan yardımcı.
//
// Post ve Studio sayfaları başlangıçta yalnızca TWIN_CHARACTER_ID'ye (`enes2`) kilitliydi —
// Yardımcı Oyuncular'da (Saule, Beiwe, admin panelinden eklenen sanal karakterler) üretilen
// fotoğraflar ve Beiwe Motion'da bu karakterler için üretilen videolar galerilerde hiç
// görünmüyordu, çünkü `character_shots`/`character_clips` sorguları tek bir `character_id`ye
// eşitlik (`eq`) kuruyordu. Bu dosya "ilgili TÜM karakter kimlikleri" listesini kurup
// `.in('character_id', ids)` ile sorgulanabilir hale getiriyor — `motion/page.tsx`'teki
// cast listesi kurma mantığıyla AYNI (bkz. o dosyadaki castRows sorgusu), tekrar yazılmasın
// diye buraya taşındı.

import { supabaseAdmin } from '@/utils/supabase/admin';
import { CAST_CHARACTER_IDS, TWIN_CHARACTER_ID } from '@/config/beiweLab';

/** Twin + koddaki sabit cast (saule/beiwe) + admin panelinden eklenen dinamik cast profilleri. */
export async function getAllBeiweLabCharacterIds(): Promise<string[]> {
  const { data: castRows } = await supabaseAdmin
    .from('character_profiles')
    .select('id')
    .eq('is_cast', true);

  return [TWIN_CHARACTER_ID, ...CAST_CHARACTER_IDS, ...(castRows || []).map((row) => row.id as string)];
}
