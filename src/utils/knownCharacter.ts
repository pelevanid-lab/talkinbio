import { supabaseAdmin } from '@/utils/supabase/admin';
import { isCharacterId } from '@/config/characters';

/**
 * Bir characterId, koddaki `CHARACTERS` sabitinde (Saule/Beiwe/Enes/Enes2) mi yoksa
 * Yardımcı Oyuncular'da admin panelinden eklenmiş sanal bir karakter mi (bkz.
 * `character_profiles.is_cast`) — ikisi de "bilinen" sayılır. API route'ların
 * `isCharacterId` tek başına kullandığı eski guard'ı, dinamik karakterleri
 * reddediyordu (bkz. generate/voice/minimax-voice route'ları).
 */
export async function isKnownCharacterId(characterId: string): Promise<boolean> {
  if (isCharacterId(characterId)) return true;

  const { data } = await supabaseAdmin
    .from('character_profiles')
    .select('id')
    .eq('id', characterId)
    .eq('is_cast', true)
    .maybeSingle();

  return !!data;
}
