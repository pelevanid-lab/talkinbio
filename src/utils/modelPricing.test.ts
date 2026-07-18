import { describe, it, expect } from 'vitest';
import { estimateCostUsd } from './modelPricing';

describe('estimateCostUsd', () => {
  it('matches the real-measured Saule chat cost from Faz 4.3 (8.139 input + 136 output, no cache)', () => {
    const cost = estimateCostUsd('claude-sonnet-4-5-20250929', {
      inputTokens: 8139,
      outputTokens: 136,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    });
    expect(cost).not.toBeNull();
    expect(cost!).toBeCloseTo(0.0264, 3);
  });

  it('discounts cached input tokens relative to non-cached ones', () => {
    const noCacheCost = estimateCostUsd('claude-sonnet-4-5-20250929', {
      inputTokens: 10000,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    })!;
    const cachedCost = estimateCostUsd('claude-sonnet-4-5-20250929', {
      inputTokens: 10000,
      outputTokens: 0,
      cacheReadTokens: 10000,
      cacheWriteTokens: 0,
    })!;
    expect(cachedCost).toBeLessThan(noCacheCost);
  });

  it('returns null for an unknown model instead of guessing', () => {
    const cost = estimateCostUsd('gemini-2.5-flash', {
      inputTokens: 1000,
      outputTokens: 100,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    });
    expect(cost).toBeNull();
  });
});
