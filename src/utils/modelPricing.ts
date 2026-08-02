// Faz 4.2 maliyet tahmini. Sonnet 4.5 fiyatı Faz 4.3'te ölçülen gerçek değer
// (ROADMAP.md Faz 4.3, 2026-07-16 Uliana Pehlivan test hesabı). Cache çarpanları
// Anthropic'in standart ephemeral prompt caching oranları (write ≈1,25×, read ≈0,1×
// taban input fiyatı).
type PricingPerMTok = {
  input: number;
  output: number;
  cacheWriteMultiplier: number;
  cacheReadMultiplier: number;
};

const PRICING: Record<string, PricingPerMTok> = {
  'gemini-2.5-flash-lite': { input: 0.075, output: 0.3, cacheWriteMultiplier: 0, cacheReadMultiplier: 0 },
};

export type UsageTokens = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
};

/**
 * Estimated USD cost for a usage_events row. Returns null for unknown models
 * rather than silently reporting a wrong number — the admin dashboard should
 * flag this as "no estimate" instead of guessing.
 */
export function estimateCostUsd(model: string, usage: UsageTokens): number | null {
  const pricing = PRICING[model];
  if (!pricing) return null;

  const noCacheInputTokens = Math.max(usage.inputTokens - usage.cacheReadTokens - usage.cacheWriteTokens, 0);
  const cost =
    (noCacheInputTokens / 1_000_000) * pricing.input +
    (usage.cacheWriteTokens / 1_000_000) * pricing.input * pricing.cacheWriteMultiplier +
    (usage.cacheReadTokens / 1_000_000) * pricing.input * pricing.cacheReadMultiplier +
    (usage.outputTokens / 1_000_000) * pricing.output;

  return cost;
}
