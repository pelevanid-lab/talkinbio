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
    .upsert({ id: characterId, business_id: businessId }, { onConflict: 'id', ignoreDuplicates: true });

  if (error) throw new Error(`character_profiles upsert failed: ${error.message} (hint: ${error.hint ?? 'none'}, code: ${error.code})`);


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

export type CastCharacterSummary = { id: string; name: string; role: string; avatarUrl?: string };

/**
 * İşletmenin tüm oyuncu kadrosu — Twin (her zaman ilk sırada) + kendi oluşturduğu
 * Yardımcı Oyuncular (`character_profiles.is_cast`). Voice/Podcast sayfalarındaki
 * karakter değiştirme şeridi (admin'deki `CastRoomTabs` ile aynı desen) için.
 */
export async function getBusinessCastRoster(business: { id: string; name: string }): Promise<CastCharacterSummary[]> {
  const twinId = await getOrCreateBusinessTwin(business.id);

  const { data: rows } = await supabaseAdmin
    .from('character_profiles')
    .select('id, name, role, reference_image_url')
    .eq('business_id', business.id)
    .order('created_at', { ascending: true });

  const all = rows || [];
  const twinRow = all.find((r) => r.id === twinId);
  const castRows = all.filter((r) => r.id !== twinId);

  return [
    { id: twinId, name: business.name, role: 'Dijital İkiz', avatarUrl: twinRow?.reference_image_url || undefined },
    ...castRows.map((r) => ({
      id: r.id,
      name: r.name || r.id,
      role: r.role || 'Yardımcı oyuncu',
      avatarUrl: r.reference_image_url || undefined,
    })),
  ];
}

/** Twin + Cast'in TAMAMININ id listesi — Post/Studio galerilerinin `.in(...)` sorgusu için
 * (admin'deki `getAllBeiweLabCharacterIds`in business-scoped karşılığı). */
export async function getBusinessCharacterIds(businessId: string, businessName: string): Promise<string[]> {
  const roster = await getBusinessCastRoster({ id: businessId, name: businessName });
  return roster.map((r) => r.id);
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
