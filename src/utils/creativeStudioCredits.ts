import { supabaseAdmin } from '@/utils/supabase/admin';
import { deductCredits } from '@/agents/shared/credits';
import { creditsForCost } from '@/config/pricing';

export class InsufficientCreditsError extends Error {
  constructor(public readonly requiredCredits: number, public readonly balance: number) {
    super('INSUFFICIENT_CREDITS');
  }
}

/**
 * Creative Studio üretim eylemleri (Twin sahne üretimi, LoRA eğitimi, vb.) gerçek
 * paraya mal oluyor — sohbet turlarının ucuz, sessizce-devam-eden kredi düşümünden
 * (bkz. src/agents/shared/credits.ts `deductCredits`) farklı olarak burada iki adım
 * ayrı: (1) fal'a gitmeden ÖNCE bakiye yeterli mi kontrol et (yetersizse fal çağrısı
 * hiç yapılmaz), (2) üretim GERÇEKTEN başarılı olduktan SONRA asıl düşümü yap — böylece
 * başarısız bir üretim (fal hatası, upload hatası) işletmeyi ücretlendirmez.
 */
export async function assertSufficientCredits(businessId: string, costUsd: number): Promise<void> {
  const requiredCredits = creditsForCost(costUsd);

  const { data: business, error } = await supabaseAdmin
    .from('businesses')
    .select('credit_balance')
    .eq('id', businessId)
    .single();

  if (error || !business) {
    throw new Error('Business not found for credit charge');
  }

  if (business.credit_balance < requiredCredits) {
    throw new InsufficientCreditsError(requiredCredits, business.credit_balance);
  }
}

/** Başarılı üretimden SONRA çağrılır — asıl düşüm burada gerçekleşir. */
export async function deductForGeneration(businessId: string, costUsd: number): Promise<{ creditsCharged: number }> {
  const requiredCredits = creditsForCost(costUsd);
  await deductCredits(supabaseAdmin, businessId, requiredCredits);
  return { creditsCharged: requiredCredits };
}
