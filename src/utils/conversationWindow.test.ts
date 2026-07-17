import { describe, it, expect } from 'vitest';
import { isConversationActive, CONVERSATION_ACTIVE_WINDOW_MS } from './conversationWindow';

describe('isConversationActive', () => {
  it('is active when the last message was just now', () => {
    const now = new Date().toISOString();
    expect(isConversationActive(now, now)).toBe(true);
  });

  it('is inactive once the last message is older than the window', () => {
    const stale = new Date(Date.now() - CONVERSATION_ACTIVE_WINDOW_MS - 1000).toISOString();
    expect(isConversationActive(stale, stale)).toBe(false);
  });

  it('is active just inside the window boundary', () => {
    const almostStale = new Date(Date.now() - CONVERSATION_ACTIVE_WINDOW_MS + 60_000).toISOString();
    expect(isConversationActive(almostStale, almostStale)).toBe(true);
  });

  it('falls back to createdAt when lastMessageAt is null', () => {
    const createdAt = new Date().toISOString();
    expect(isConversationActive(null, createdAt)).toBe(true);
  });

  it('falls back to createdAt when lastMessageAt is undefined', () => {
    const createdAt = new Date(Date.now() - CONVERSATION_ACTIVE_WINDOW_MS - 1000).toISOString();
    expect(isConversationActive(undefined, createdAt)).toBe(false);
  });
});
