import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isAuthorizedCronRequest } from './cronAuth';

describe('isAuthorizedCronRequest', () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = 'test-secret';
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  it('accepts a request with the correct bearer token', () => {
    const request = new Request('https://example.com/api/cron/x', {
      headers: { authorization: 'Bearer test-secret' },
    });
    expect(isAuthorizedCronRequest(request)).toBe(true);
  });

  it('rejects a request with a wrong or missing token', () => {
    const wrongToken = new Request('https://example.com/api/cron/x', {
      headers: { authorization: 'Bearer nope' },
    });
    const noHeader = new Request('https://example.com/api/cron/x');
    expect(isAuthorizedCronRequest(wrongToken)).toBe(false);
    expect(isAuthorizedCronRequest(noHeader)).toBe(false);
  });

  it('rejects every request when CRON_SECRET is not configured', () => {
    delete process.env.CRON_SECRET;
    const request = new Request('https://example.com/api/cron/x', {
      headers: { authorization: 'Bearer test-secret' },
    });
    expect(isAuthorizedCronRequest(request)).toBe(false);
  });
});
