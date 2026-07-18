import type { SupabaseClient } from '@supabase/supabase-js';

// Faz 4.3 kredi modeli: framework-agnostik (Faz 2 taşınabilirlik kuralına uygun).
// Sayılar env değişkeniyle elle ince ayar yapılabilir (AI_MODEL_BEIWE deseniyle
// aynı mantık) — gerçek maliyet Faz 4.2'nin usage_events verisiyle değiştikçe
// kod değişikliği gerekmeden kalibre edilebilsin diye.
export const SAULE_CREDIT_COST = Number(process.env.CREDIT_COST_SAULE) || 1;
export const BEIWE_UPDATE_CREDIT_COST = Number(process.env.CREDIT_COST_BEIWE_UPDATE) || 6;
export const BEIWE_INSTALL_CREDIT_COST = Number(process.env.CREDIT_COST_BEIWE_INSTALL) || 10;

/**
 * O turda çağrılan Beiwe araç sayısına göre kredi maliyeti: tek alan
 * güncellemesi (1 araç) vs. çoklu/bulk kurulum (2+ araç). Değişiklik
 * yoksa (0 araç, salt sohbet) ücretsiz.
 */
export function beiweCreditCost(toolCallCount: number): number {
  if (toolCallCount <= 0) return 0;
  return toolCallCount === 1 ? BEIWE_UPDATE_CREDIT_COST : BEIWE_INSTALL_CREDIT_COST;
}

export function hasCredits(business: { credit_balance: number }): boolean {
  return business.credit_balance > 0;
}

/**
 * Atomik kredi düşümü (Postgres RPC — Supabase JS aritmetik update
 * desteklemiyor). Hiçbir zaman fırlatmaz: bir loglama hatası kullanıcıya
 * giden cevabı bozmamalı (recordUsageEvent ile aynı felsefe).
 */
export async function deductCredits(supabaseAdmin: SupabaseClient, businessId: string, amount: number): Promise<void> {
  if (amount <= 0) return;
  try {
    const { error } = await supabaseAdmin.rpc('deduct_credits', { p_business_id: businessId, p_amount: amount });
    if (error) throw error;
  } catch (err) {
    console.error('[deductCredits] failed', { businessId, amount, err });
  }
}

const CREDITS_EXHAUSTED_MESSAGES: Record<'tr' | 'en' | 'ru', string> = {
  tr: 'Bu işletmenin kredisi bu ay için tükendi. Sohbet kapanmıyor — isim ve iletişim bilginizi bırakırsanız işletme sahibi size ulaşacak.',
  en: "This business's credits for this period are used up. The chat isn't closing — leave your name and contact info and the business owner will reach out.",
  ru: 'Кредиты этого бизнеса на этот период закончились. Чат не закрывается — оставьте своё имя и контакт, и владелец бизнеса свяжется с вами.',
};

/**
 * JSON-encoded payload (AgentTurnError.message olarak fırlatılır, ai SDK'nın
 * DefaultChatTransport'u bunu response body olarak client'a taşır) —
 * ChatWidget bunu diğer düz-metin hatalarından ayırt edip LLM'siz
 * mesaj-bırakma formuna geçmek için parse eder.
 */
export function creditsExhaustedPayload(locale: string | null, directLinks: string[] = []): string {
  const localeKey = (locale === 'en' || locale === 'ru' ? locale : 'tr') as 'tr' | 'en' | 'ru';
  return JSON.stringify({
    code: 'credits_exhausted',
    message: CREDITS_EXHAUSTED_MESSAGES[localeKey],
    directLinks,
  });
}
