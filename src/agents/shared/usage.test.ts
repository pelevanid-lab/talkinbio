/* eslint-disable @typescript-eslint/no-explicit-any -- test doubles for the Supabase query builder are intentionally loose */
import { describe, it, expect, vi } from 'vitest';
import { recordUsageEvent } from './usage';

function createFakeSupabase(opts: { shouldThrow?: boolean } = {}) {
  const insert = vi.fn((_row: Record<string, unknown>) => {
    if (opts.shouldThrow) return Promise.reject(new Error('insert failed'));
    return Promise.resolve({ data: null, error: null });
  });
  const from = vi.fn((_table: string) => ({ insert }));
  return { from, insert } as any;
}

describe('recordUsageEvent', () => {
  it('inserts a usage_events row with token fields extracted from usage', async () => {
    const supabaseAdmin = createFakeSupabase();

    await recordUsageEvent(supabaseAdmin, {
      businessId: 'biz-1',
      agent: 'saule',
      channel: 'web',
      model: 'claude-sonnet-4-5-20250929',
      usage: {
        inputTokens: 8139,
        outputTokens: 136,
        inputTokenDetails: { cacheReadTokens: 7000, cacheWriteTokens: 500 },
      },
    });

    expect(supabaseAdmin.from).toHaveBeenCalledWith('usage_events');
    expect(supabaseAdmin.insert).toHaveBeenCalledWith({
      business_id: 'biz-1',
      agent: 'saule',
      channel: 'web',
      model: 'claude-sonnet-4-5-20250929',
      input_tokens: 8139,
      output_tokens: 136,
      cache_read_tokens: 7000,
      cache_write_tokens: 500,
    });
  });

  it('defaults missing token fields to 0 (e.g. generateOnce usage has no cache details)', async () => {
    const supabaseAdmin = createFakeSupabase();

    await recordUsageEvent(supabaseAdmin, {
      businessId: 'biz-1',
      agent: 'analysis',
      channel: 'cron',
      model: 'claude-sonnet-4-5-20250929',
      usage: { inputTokens: 120, outputTokens: 40 },
    });

    expect(supabaseAdmin.insert).toHaveBeenCalledWith(
      expect.objectContaining({ cache_read_tokens: 0, cache_write_tokens: 0 })
    );
  });

  it('never throws when the insert fails — must not break the user-facing turn', async () => {
    const supabaseAdmin = createFakeSupabase({ shouldThrow: true });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      recordUsageEvent(supabaseAdmin, {
        businessId: 'biz-1',
        agent: 'beiwe',
        channel: 'web',
        model: 'claude-sonnet-4-5-20250929',
        usage: { inputTokens: 1, outputTokens: 1 },
      })
    ).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
