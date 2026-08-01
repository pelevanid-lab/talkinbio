/* eslint-disable @typescript-eslint/no-explicit-any -- test doubles for the Supabase query builder are intentionally loose */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// A minimal fake Supabase query builder: each call to .from(table) returns a fresh
// chainable stub whose terminal methods resolve with data configured per table.
function createFakeSupabase(overrides: Record<string, unknown> = {}) {
  const defaults: Record<string, unknown> = {
    businesses: { id: 'biz-1', name: 'Test İşletmesi', category: 'consultant', contact_method: 'whatsapp', contact_value: '{}', saule_settings: {}, credit_balance: 100 },
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
      in: vi.fn(() => chain),
      gte: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      insert: vi.fn(() => chain),
      update: vi.fn(() => chain),
      upsert: vi.fn(() => chain),
      maybeSingle: vi.fn(async () => ({ data: table === 'conversations' ? value : null, error: null })),
      single: vi.fn(async () => ({ data: value, error: null })),
      then: (resolve: (v: { data: unknown; count: number; error: null }) => void) =>
        resolve({ data: Array.isArray(value) ? value : [], count: (overrides as any).__counts?.[table] ?? 0, error: null }),
    };
    return chain;
  });

  const rpc = vi.fn(async () => ({ error: null }));

  return { from, rpc } as any;
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

  it('opens a visible page section without calling the LLM when the visitor asks for it', async () => {
    const { runSauleTurn } = await import('./run');
    const { streamText } = await import('ai');
    const supabaseAdmin = createFakeSupabase({
      blocks: [
        {
          id: 'services-block',
          type: 'services',
          is_visible: true,
          content: {
            tr: { title: 'Neler Yapabilir' },
            items: [{ id: 'consulting', tr: { title: 'Online Danışmanlık', description: 'Görüşme akışı' } }],
          },
        },
      ],
    });

    const result = await runSauleTurn({
      supabaseAdmin,
      businessId: 'biz-1',
      channel: 'web',
      conversationKey: 'visitor-abc',
      userMessage: 'Online danışmanlık nasıl işliyor?',
      locale: 'tr',
      newConversation: false,
      isPreview: false,
    });

    await expect(result.text).resolves.toBe(
      '§§ACTION§§{"type":"open_block","blockId":"services-block","itemId":"consulting"}§§/ACTION§§İlgili yeri açıyorum.'
    );
    expect(streamText).not.toHaveBeenCalled();
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

    const fakeUsage = { inputTokens: 100, outputTokens: 20 };
    const fakeModel = { provider: 'anthropic', modelId: 'claude-sonnet-4-5-20250929' };

    await result.opts.onFinish({ text: 'Bilgilerinizi kaydettim, teşekkürler!', toolCalls: [], usage: fakeUsage, model: fakeModel });
    expect(warnSpy).toHaveBeenCalledWith(
      '[runSauleTurn] possible unconfirmed capture: model claimed success without calling a tool',
      expect.objectContaining({ businessId: 'biz-1' })
    );

    warnSpy.mockClear();
    await result.opts.onFinish({ text: 'Bilgilerinizi kaydettim!', toolCalls: [{ toolName: 'capture_lead' }], usage: fakeUsage, model: fakeModel });
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

  it('throws a 429 AgentTurnError when the business daily message cap is exceeded (Faz 4.1)', async () => {
    const { runSauleTurn } = await import('./run');
    const { AgentTurnError } = await import('@/agents/shared/errors');
    const { BUSINESS_DAILY_MESSAGE_CAP } = await import('@/agents/shared/limits');
    const supabaseAdmin = createFakeSupabase({ __counts: { messages: BUSINESS_DAILY_MESSAGE_CAP } });

    expect.assertions(2);
    try {
      await runSauleTurn({
        supabaseAdmin,
        businessId: 'biz-1',
        channel: 'web',
        conversationKey: 'visitor-abc',
        userMessage: 'merhaba',
        locale: 'tr',
        newConversation: false,
        isPreview: false,
      });
    } catch (error) {
      expect(error).toBeInstanceOf(AgentTurnError);
      expect((error as InstanceType<typeof AgentTurnError>).status).toBe(429);
    }
  });

  it('throws a 402 AgentTurnError with a credits_exhausted JSON payload when the business has no credits (Faz 4.3)', async () => {
    const { runSauleTurn } = await import('./run');
    const { AgentTurnError } = await import('@/agents/shared/errors');
    const inactiveConversation = { id: 'old-conv-1', last_message_at: '2000-01-01T00:00:00.000Z', created_at: '2000-01-01T00:00:00.000Z' };
    const supabaseAdmin = createFakeSupabase({
      businesses: { id: 'biz-1', name: 'Test İşletmesi', contact_value: '{}', saule_settings: {}, credit_balance: 0 },
      conversations: inactiveConversation,
    });

    expect.assertions(3);
    try {
      await runSauleTurn({
        supabaseAdmin,
        businessId: 'biz-1',
        channel: 'web',
        conversationKey: 'visitor-abc',
        userMessage: 'merhaba',
        locale: 'tr',
        newConversation: false,
        isPreview: false,
      });
    } catch (error) {
      expect(error).toBeInstanceOf(AgentTurnError);
      const agentError = error as InstanceType<typeof AgentTurnError>;
      expect(agentError.status).toBe(402);
      expect(JSON.parse(agentError.message).code).toBe('credits_exhausted');
    }
  });

  it('deducts a credit via the deduct_credits RPC after a successful Saule turn (Faz 4.3)', async () => {
    const { runSauleTurn } = await import('./run');
    const { SAULE_CREDIT_COST } = await import('@/agents/shared/credits');
    const inactiveConversation = { id: 'old-conv-1', last_message_at: '2000-01-01T00:00:00.000Z', created_at: '2000-01-01T00:00:00.000Z' };
    const supabaseAdmin = createFakeSupabase({ conversations: inactiveConversation });

    const result = (await runSauleTurn({
      supabaseAdmin,
      businessId: 'biz-1',
      channel: 'web',
      conversationKey: 'visitor-abc',
      userMessage: 'merhaba',
      locale: 'tr',
      newConversation: false,
      isPreview: false,
    })) as any;

    await result.opts.onFinish({
      text: 'Merhaba!',
      toolCalls: [],
      usage: { inputTokens: 10, outputTokens: 5 },
      model: { provider: 'anthropic', modelId: 'claude-sonnet-4-5-20250929' },
    });

    expect(supabaseAdmin.rpc).toHaveBeenCalledWith('deduct_credits', { p_business_id: 'biz-1', p_amount: SAULE_CREDIT_COST });
  });

  it('skips abuse limits entirely for editor preview conversations (Faz 4.1)', async () => {
    const { runSauleTurn } = await import('./run');
    const { BUSINESS_DAILY_MESSAGE_CAP } = await import('@/agents/shared/limits');
    const supabaseAdmin = createFakeSupabase({ __counts: { messages: BUSINESS_DAILY_MESSAGE_CAP } });

    const result = await runSauleTurn({
      supabaseAdmin,
      businessId: 'biz-1',
      channel: 'web',
      conversationKey: 'preview:biz-1',
      userMessage: 'merhaba',
      locale: 'tr',
      newConversation: false,
      isPreview: true,
    });

    expect(result).toBeDefined();
  });
});
