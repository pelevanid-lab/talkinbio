import type { SupabaseClient } from '@supabase/supabase-js';

// Faz 4.2 kullanım ölçümü: framework-agnostik (Faz 2 taşınabilirlik kuralına uygun).

export type UsageAgent = 'saule' | 'beiwe' | 'analysis';

export type UsageLike = {
  inputTokens?: number;
  outputTokens?: number;
  inputTokenDetails?: {
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
  };
};

export type RecordUsageEventParams = {
  businessId: string;
  agent: UsageAgent;
  channel: string;
  model: string;
  usage: UsageLike;
  creditsCharged?: number;
};

/**
 * Persists a usage_events row for cost/model calibration reporting (admin
 * analytics, Faz 4.3 credit multiplier tuning) and for the owner-facing
 * /dashboard/billing usage history (credits_charged, Faz 4.4.x). Never
 * throws — a logging failure must not break the user-facing turn it's
 * attached to.
 */
export async function recordUsageEvent(supabaseAdmin: SupabaseClient, params: RecordUsageEventParams): Promise<void> {
  const { businessId, agent, channel, model, usage, creditsCharged } = params;
  try {
    await supabaseAdmin.from('usage_events').insert({
      business_id: businessId,
      agent,
      channel,
      model,
      input_tokens: usage.inputTokens || 0,
      output_tokens: usage.outputTokens || 0,
      cache_read_tokens: usage.inputTokenDetails?.cacheReadTokens || 0,
      cache_write_tokens: usage.inputTokenDetails?.cacheWriteTokens || 0,
      credits_charged: creditsCharged || 0,
    });
  } catch (err) {
    console.error('[recordUsageEvent] failed to persist usage event', { businessId, agent, channel, model, err });
  }
}
