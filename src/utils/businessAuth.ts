import { redirect } from '@/i18n/routing';
import { createClient as createServerClient } from '@/utils/supabase/server';

export type Business = {
  id: string;
  owner_id: string;
  name: string;
  username: string;
  credit_balance: number;
  [key: string]: unknown;
};

/**
 * Sayfalarda kullanılır — `dashboard/leads/page.tsx` ve kardeşlerindeki tekrar eden
 * "getUser + businesses sorgusu + redirect" bloğunun tek kaynağı. requireAdmin()'in
 * (src/utils/adminAuth.ts) business-owner karşılığı: paylaşımlı admin şifresi yerine
 * Supabase oturumu + `businesses.owner_id` eşleşmesi.
 *
 * `locale` zorunlu — next-intl'in `redirect()`'i (bkz. i18n/routing.ts) `next/navigation`'ın
 * aksine locale prefix'ini korur; onsuz /en veya /ru'da gezinen bir kullanıcı sessizce
 * varsayılan `tr`'ye düşer (bkz. dashboard 404 teşhisi — Ağustos 2026).
 */
export async function requireBusinessOwner(locale: string): Promise<Business> {
  const supabase = await createServerClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData?.user) {
    redirect({ href: '/login', locale });
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', userData!.user!.id)
    .single();

  if (!business) {
    redirect({ href: '/onboarding', locale });
  }

  return business as Business;
}

/**
 * API route'larda kullanılır — `redirect()` route handler'da çalışmaz, bu yüzden
 * `requireBusinessOwner()`'ın aksine business bulunamazsa `null` döner; çağıran route
 * kendi 401/404 JSON yanıtını basar.
 */
export async function getBusinessFromRequest(): Promise<Business | null> {
  const supabase = await createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return null;

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', userData.user.id)
    .single();

  return (business as Business) ?? null;
}
