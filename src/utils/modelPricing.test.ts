import { describe, it, expect } from 'vitest';
import { estimateCostUsd } from './modelPricing';

describe('estimateCostUsd', () => {
  it('resolves cost from PRICING table when model is known', () => {
    const cost = estimateCostUsd('gemini-2.5-flash-lite', {
      inputTokens: 10000,
      outputTokens: 1000,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    });
    expect(cost).not.toBeNull();
    // Input: 10000 / 1M * 0.075 = 0.00075
    // Output: 1000 / 1M * 0.3 = 0.0003
    // Total: 0.00105
    expect(cost!).toBeCloseTo(0.00105, 5);
  });

  it('returns null for unknown models to avoid silent wrong estimates', () => {
    const cost = estimateCostUsd('some-unknown-model', {
      inputTokens: 10000,
      outputTokens: 1000,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    });
    expect(cost).toBeNull();
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
