import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { getBusinessFromRequest, type Business } from '@/utils/businessAuth';

/**
 * İşletmenin kendi Twin'ini garanti eder — yoksa oluşturur. `character_profiles.id`
 * business'ın kendi uuid'si (text'e cast), `business_id` aynı değer — mevcut admin
 * Twin'inin (`TWIN_CHARACTER_ID = 'enes2'`, src/config/beiweLab.ts) business-scoped
 * karşılığı. `identity_prompt`/`reference_image_url` boş başlar, Twin sayfası doldurur.
 */
export async function getOrCreateBusinessTwin(businessId: string): Promise<string> {
  const characterId = businessId;

  const { data: existing } = await supabaseAdmin
    .from('character_profiles')
    .select('id')
    .eq('id', characterId)
    .maybeSingle();

  if (existing) return characterId;

  const { error } = await supabaseAdmin
    .from('character_profiles')
    .insert({ id: characterId, business_id: businessId });

  if (error) throw error;

  return characterId;
}

/**
 * Bu karakter gerçekten bu işletmenin mi? Route'larda dual-mode auth'un business-owner
 * kolunda kullanılır (bkz. src/utils/businessAuth.ts) — admin'in sabit karakterlerine
 * (business_id NULL) ya da başka bir işletmenin karakterine erişimi engeller.
 */
export async function assertOwnsCharacter(businessId: string, characterId: string): Promise<void> {
  const { data: profile } = await supabaseAdmin
    .from('character_profiles')
    .select('business_id')
    .eq('id', characterId)
    .maybeSingle();

  if (!profile || profile.business_id !== businessId) {
    throw new Error('FORBIDDEN_CHARACTER');
  }
}

export type CharacterAuthResult =
  | { mode: 'admin' }
  | { mode: 'business'; business: Business };

/**
 * Twin route'larının ortak dual-mode auth kapısı: paylaşımlı admin şifresi (mevcut
 * davranış, karakter kısıtı yok — admin her şeye erişir) VEYA işletme sahibi oturumu
 * (yalnız kendi karakterine). `characterId` yoksa (ör. scene-ref — henüz bir karaktere
 * bağlanmamış genel bir yükleme) yalnız "kim istiyor" kontrol edilir, sahiplik atlanır.
 */
export async function authorizeCharacterRequest(characterId?: string): Promise<CharacterAuthResult | null> {
  const cookieStore = await cookies();
  if (cookieStore.get('admin_session')?.value === process.env.ADMIN_PASSWORD) {
    return { mode: 'admin' };
  }

  const business = await getBusinessFromRequest();
  if (!business) return null;

  if (characterId) {
    try {
      await assertOwnsCharacter(business.id, characterId);
    } catch {
      return null;
    }
  }

  return { mode: 'business', business };
}
