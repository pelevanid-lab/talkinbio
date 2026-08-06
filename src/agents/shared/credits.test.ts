/* eslint-disable @typescript-eslint/no-explicit-any -- test doubles for the Supabase query builder are intentionally loose */
import { describe, it, expect, vi } from 'vitest';
import {
  hasCredits,
  deductCredits,
  creditsExhaustedPayload,
  SAULE_CREDIT_COST,
  SAULE_STUDIO_UPDATE_CREDIT_COST,
} from './credits';

describe('constants', () => {
  it('default to the calibrated values (update >= 60, per user correction 2026-07-18)', () => {
    expect(SAULE_CREDIT_COST).toBe(1);
    expect(SAULE_STUDIO_UPDATE_CREDIT_COST).toBe(60);
  });
});

describe('hasCredits', () => {
  it('is true for a positive balance and false at/below zero', () => {
    expect(hasCredits({ credit_balance: 1 })).toBe(true);
    expect(hasCredits({ credit_balance: 0 })).toBe(false);
    expect(hasCredits({ credit_balance: -5 })).toBe(false);
  });
});

describe('deductCredits', () => {
  it('calls the deduct_credits RPC with the given amount', async () => {
    const rpc = vi.fn(async () => ({ error: null }));
    const supabaseAdmin = { rpc } as any;

    await deductCredits(supabaseAdmin, 'biz-1', 6);

    expect(rpc).toHaveBeenCalledWith('deduct_credits', { p_business_id: 'biz-1', p_amount: 6 });
  });

  it('skips the RPC call for a zero/negative amount', async () => {
    const rpc = vi.fn(async () => ({ error: null }));
    const supabaseAdmin = { rpc } as any;

    await deductCredits(supabaseAdmin, 'biz-1', 0);

    expect(rpc).not.toHaveBeenCalled();
  });

  it('never throws when the RPC fails', async () => {
    const rpc = vi.fn(async () => ({ error: new Error('rpc failed') }));
    const supabaseAdmin = { rpc } as any;
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(deductCredits(supabaseAdmin, 'biz-1', 1)).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe('creditsExhaustedPayload', () => {
  it('returns a JSON payload with code=credits_exhausted', () => {
    const payload = JSON.parse(creditsExhaustedPayload('tr', ['WhatsApp: https://wa.me/123']));
    expect(payload.code).toBe('credits_exhausted');
    expect(payload.directLinks).toEqual(['WhatsApp: https://wa.me/123']);
    expect(typeof payload.message).toBe('string');
  });

  it('falls back to Turkish for an unknown/null locale', () => {
    const payload = JSON.parse(creditsExhaustedPayload(null));
    const trPayload = JSON.parse(creditsExhaustedPayload('tr'));
    expect(payload.message).toBe(trPayload.message);
  });
});
