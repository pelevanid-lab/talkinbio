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
 * Twin route'larının ortak dual-mode auth kapısı: paylaşımlı admin şifresi VEYA işletme
 * sahibi oturumu (yalnız kendi karakterine).
 *
 * KREDİ KURALI (2026-08-08, kurucu kararı — önceki davranışı değiştiriyor): admin çerezi
 * artık "kredi düşmez" anlamına GELMİYOR eğer erişilen karakter bir işletmeye aitse.
 * Eskiden admin çerezi her zaman önce kontrol edilip `mode:'admin'` (ücretsiz) dönüyordu —
 * bu, aynı tarayıcıda admin paneline de giriş yapmış bir işletme sahibinin KENDİ hesabındaki
 * işlemlerinin sessizce ücretsiz geçmesine yol açıyordu (bkz. proje geçmişi, 2026-08-08
 * bulunan hata). Şimdi öncelik SAHİPLİĞE göre: `characterId` bir işletmeye aitse (`business_id`
 * dolu) kredi HER ZAMAN o işletmeden düşer — admin çerezi yalnızca "business oturumu yoksa
 * destek amaçlı erişime izin ver" işlevi görür, ücretsizlik sağlamaz. Admin çerezi yalnızca
 * hiçbir işletmeye ait OLMAYAN karakterlerde (statik saule/beiwe/enes, admin'in kendi
 * `business_id`'siz cast karakterleri) gerçekten ücretsiz erişim sağlar. `characterId` hiç
 * yoksa (ör. scene-ref — henüz bir karaktere bağlanmamış genel bir yükleme) eski davranış
 * korunur — sahiplenilecek bir karakter olmadığı için ücretlendirme sorusu yok.
 */
export async function authorizeCharacterRequest(characterId?: string): Promise<CharacterAuthResult | null> {
  const cookieStore = await cookies();
  const hasAdminCookie = cookieStore.get('admin_session')?.value === process.env.ADMIN_PASSWORD;

  if (characterId) {
    const { data: profile } = await supabaseAdmin
      .from('character_profiles')
      .select('business_id')
      .eq('id', characterId)
      .maybeSingle();

    if (profile?.business_id) {
      const business = await getBusinessFromRequest();
      if (business && business.id === profile.business_id) {
        return { mode: 'business', business };
      }
      // Business oturumu yok/eşleşmiyor — admin çerezi destek amaçlı erişime izin verir
      // AMA yine de bu işletmeden ücretlendirilir (mode:'admin' DEĞİL, mode:'business').
      if (hasAdminCookie) {
        const { data: owningBusiness } = await supabaseAdmin
          .from('businesses')
          .select('*')
          .eq('id', profile.business_id)
          .single();
        if (owningBusiness) return { mode: 'business', business: owningBusiness as Business };
      }
      return null;
    }

    // business_id yok — statik/admin karakteri, yalnızca admin çerezi erişebilir (ücretsiz).
    return hasAdminCookie ? { mode: 'admin' } : null;
  }

  if (hasAdminCookie) {
    return { mode: 'admin' };
  }
  const business = await getBusinessFromRequest();
  return business ? { mode: 'business', business } : null;
}
