/* eslint-disable @typescript-eslint/no-explicit-any -- test doubles for the Supabase query builder are intentionally loose */
import { describe, it, expect } from 'vitest';
import {
  checkShortTermFlood,
  checkSessionOpenRateLimit,
  checkBusinessDailyCap,
  getAbuseLimitMessage,
} from './rateLimit';
import { SHORT_TERM_FLOOD_LIMIT, SESSION_OPEN_RATE_LIMIT, BUSINESS_DAILY_MESSAGE_CAP } from './limits';

// A fake Supabase client that resolves each successive `.from()` chain from a
// queue of canned results, in call order — mirrors the exact sequence each
// checker function issues its queries in.
function createFakeSupabase(results: Array<{ data?: unknown; count?: number }>) {
  const queue = [...results];
  const from = () => {
    const chain: any = {
      select: () => chain,
      eq: () => chain,
      in: () => chain,
      gte: () => chain,
      then: (resolve: (v: { data: unknown; count: number; error: null }) => void) => {
        const next = queue.shift() || { data: [], count: 0 };
        return resolve({ data: next.data ?? [], count: next.count ?? 0, error: null });
      },
    };
    return chain;
  };
  return { from } as any;
}

describe('checkShortTermFlood', () => {
  it('allows when no prior conversations exist', async () => {
    const supabaseAdmin = createFakeSupabase([{ data: [] }]);
    await expect(checkShortTermFlood(supabaseAdmin, 'biz-1', 'visitor-1')).resolves.toBe(true);
  });

  it('allows when recent user-message count is under the limit', async () => {
    const supabaseAdmin = createFakeSupabase([
      { data: [{ id: 'conv-1' }] },
      { count: SHORT_TERM_FLOOD_LIMIT - 1 },
    ]);
    await expect(checkShortTermFlood(supabaseAdmin, 'biz-1', 'visitor-1')).resolves.toBe(true);
  });

  it('blocks when recent user-message count reaches the limit', async () => {
    const supabaseAdmin = createFakeSupabase([
      { data: [{ id: 'conv-1' }] },
      { count: SHORT_TERM_FLOOD_LIMIT },
    ]);
    await expect(checkShortTermFlood(supabaseAdmin, 'biz-1', 'visitor-1')).resolves.toBe(false);
  });
});

describe('checkSessionOpenRateLimit', () => {
  it('allows under the hourly new-conversation limit', async () => {
    const supabaseAdmin = createFakeSupabase([{ count: SESSION_OPEN_RATE_LIMIT - 1 }]);
    await expect(checkSessionOpenRateLimit(supabaseAdmin, 'biz-1', 'visitor-1')).resolves.toBe(true);
  });

  it('blocks at the hourly new-conversation limit', async () => {
    const supabaseAdmin = createFakeSupabase([{ count: SESSION_OPEN_RATE_LIMIT }]);
    await expect(checkSessionOpenRateLimit(supabaseAdmin, 'biz-1', 'visitor-1')).resolves.toBe(false);
  });
});

describe('checkBusinessDailyCap', () => {
  it('allows under the daily message cap', async () => {
    const supabaseAdmin = createFakeSupabase([{ count: BUSINESS_DAILY_MESSAGE_CAP - 1 }]);
    await expect(checkBusinessDailyCap(supabaseAdmin, 'biz-1')).resolves.toBe(true);
  });

  it('blocks at the daily message cap', async () => {
    const supabaseAdmin = createFakeSupabase([{ count: BUSINESS_DAILY_MESSAGE_CAP }]);
    await expect(checkBusinessDailyCap(supabaseAdmin, 'biz-1')).resolves.toBe(false);
  });
});

describe('getAbuseLimitMessage', () => {
  it('falls back to Turkish for an unknown/null locale', () => {
    expect(getAbuseLimitMessage('flood', null)).toContain('mesaj gönderildi');
  });

  it('returns the English variant', () => {
    expect(getAbuseLimitMessage('session-open', 'en')).toContain('Too many new chats');
  });

  it('appends handoff links only for the daily-cap reason', () => {
    const withLinks = getAbuseLimitMessage('daily-cap', 'tr', ['WhatsApp: https://wa.me/123']);
    expect(withLinks).toContain('https://wa.me/123');

    const floodWithLinks = getAbuseLimitMessage('flood', 'tr', ['WhatsApp: https://wa.me/123']);
    expect(floodWithLinks).not.toContain('https://wa.me/123');
  });
});
