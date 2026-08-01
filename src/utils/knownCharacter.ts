import { supabaseAdmin } from '@/utils/supabase/admin';
import { isCharacterId } from '@/config/characters';

/**
 * Bir characterId, koddaki `CHARACTERS` sabitinde (Saule/Beiwe/Enes/Enes2) mi, Yardımcı
 * Oyuncular'da admin panelinden eklenmiş sanal bir karakter mi (`character_profiles.is_cast`)
 * yoksa bir işletmenin kendi Creative Studio Twin'i mi (`character_profiles.business_id`) —
 * üçü de "bilinen" sayılır. API route'ların `isCharacterId` tek başına kullandığı eski
 * guard'ı, dinamik karakterleri reddediyordu (bkz. generate/voice/minimax-voice route'ları).
 */
export async function isKnownCharacterId(characterId: string): Promise<boolean> {
  if (isCharacterId(characterId)) return true;

  const { data } = await supabaseAdmin
    .from('character_profiles')
    .select('id')
    .eq('id', characterId)
    .or('is_cast.eq.true,business_id.not.is.null')
    .maybeSingle();

  return !!data;
}
