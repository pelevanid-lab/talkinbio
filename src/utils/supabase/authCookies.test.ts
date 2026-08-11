import { describe, expect, it } from 'vitest';
import { hasSupabaseAuthCookie } from './authCookies';

describe('hasSupabaseAuthCookie', () => {
  it('detects normal and chunked Supabase session cookies', () => {
    expect(hasSupabaseAuthCookie([{ name: 'sb-projectref-auth-token' }])).toBe(true);
    expect(hasSupabaseAuthCookie([{ name: 'sb-projectref-auth-token.0' }])).toBe(true);
  });

  it('ignores unrelated cookies', () => {
    expect(hasSupabaseAuthCookie([
      { name: 'visitor_session_id' },
      { name: 'NEXT_LOCALE' },
      { name: 'sb-projectref-code-verifier' },
    ])).toBe(false);
  });
});
