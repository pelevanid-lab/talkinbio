/* eslint-disable @typescript-eslint/no-explicit-any -- test doubles for the Supabase query builder are intentionally loose */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// A minimal fake Supabase query builder: each call to .from(table) returns a fresh
// chainable stub whose terminal methods resolve with data configured per table.
function createFakeSupabase(overrides: Record<string, unknown> = {}) {
  const defaults: Record<string, unknown> = {
    businesses: { id: 'biz-1', name: 'Test İşletmesi', category: 'consultant', contact_method: 'whatsapp', contact_value: '{}', saule_settings: {} },
    blocks: [],
    saule_knowledge: [],
    conversations: { id: 'conv-1', last_message_at: null, created_at: new Date().toISOString() },
    messages: [],
    leads: {},
    ...overrides,
  };

  const from = vi.fn((table: string) => {
    const value = defaults[table];
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      insert: vi.fn(() => chain),
      update: vi.fn(() => chain),
      upsert: vi.fn(() => chain),
      maybeSingle: vi.fn(async () => ({ data: table === 'conversations' ? value : null, error: null })),
      single: vi.fn(async () => ({ data: value, error: null })),
      then: (resolve: (v: { data: unknown; count: number; error: null }) => void) =>
        resolve({ data: Array.isArray(value) ? value : [], count: 0, error: null }),
    };
    return chain;
  });

  return { from } as any;
}

vi.mock('ai', () => ({
  streamText: vi.fn((opts: any) => ({ __fakeStream: true, opts })),
  tool: (def: any) => def,
  isStepCount: (n: number) => ({ __stepCount: n }),
}));

vi.mock('@ai-sdk/anthropic', () => ({ anthropic: vi.fn((m: string) => ({ provider: 'anthropic', modelName: m })) }));
vi.mock('@ai-sdk/google', () => ({ google: vi.fn((m: string) => ({ provider: 'google', modelName: m })) }));

describe('runSauleTurn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('can be invoked from a plain test harness (no Next.js request/cookies context)', async () => {
    const { runSauleTurn } = await import('./run');
    const supabaseAdmin = createFakeSupabase();

    const result = await runSauleTurn({
      supabaseAdmin,
      businessId: 'biz-1',
      channel: 'web',
      conversationKey: 'visitor-abc',
      userMessage: 'Merhaba, fiyat bilgisi alabilir miyim?',
      locale: 'tr',
      newConversation: false,
      isPreview: false,
    });

    expect(result).toBeDefined();
    const systemMessage = (result as any).opts.messages[0];
    expect(systemMessage.role).toBe('system');
    expect(systemMessage.content).toContain('Test İşletmesi');
    expect(systemMessage.providerOptions.anthropic.cacheControl).toEqual({ type: 'ephemeral' });
    expect(supabaseAdmin.from).toHaveBeenCalledWith('businesses');
    expect(supabaseAdmin.from).toHaveBeenCalledWith('conversations');
    expect(supabaseAdmin.from).toHaveBeenCalledWith('messages');
  });

  it('warns when the model claims success without calling the capture tool (caught in production, 2026-07-18)', async () => {
    const { runSauleTurn } = await import('./run');
    const supabaseAdmin = createFakeSupabase();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = (await runSauleTurn({
      supabaseAdmin,
      businessId: 'biz-1',
      channel: 'web',
      conversationKey: 'visitor-abc',
      userMessage: 'Adım Test, e-postam test@example.com',
      locale: 'tr',
      newConversation: false,
      isPreview: false,
    })) as any;

    await result.opts.onFinish({ text: 'Bilgilerinizi kaydettim, teşekkürler!', toolCalls: [] });
    expect(warnSpy).toHaveBeenCalledWith(
      '[runSauleTurn] possible unconfirmed capture: model claimed success without calling a tool',
      expect.objectContaining({ businessId: 'biz-1' })
    );

    warnSpy.mockClear();
    await result.opts.onFinish({ text: 'Bilgilerinizi kaydettim!', toolCalls: [{ toolName: 'capture_lead' }] });
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('throws a 404 AgentTurnError when the business does not exist', async () => {
    const { runSauleTurn } = await import('./run');
    const { AgentTurnError } = await import('@/agents/shared/errors');
    const supabaseAdmin = createFakeSupabase({ businesses: null });

    await expect(
      runSauleTurn({
        supabaseAdmin,
        businessId: 'missing',
        channel: 'web',
        conversationKey: 'visitor-abc',
        userMessage: 'merhaba',
        locale: 'tr',
        newConversation: false,
        isPreview: false,
      })
    ).rejects.toThrow(AgentTurnError);
  });
});
