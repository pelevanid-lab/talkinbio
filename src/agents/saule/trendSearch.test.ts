import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('ai', () => ({
  generateText: vi.fn(async (opts: unknown) => ({ text: 'mocked grounded result', usage: { inputTokens: 10, outputTokens: 5 }, __opts: opts })),
  stepCountIs: vi.fn((n: number) => ({ __stepCountIs: n })),
}));

vi.mock('@ai-sdk/anthropic', () => {
  const anthropic = vi.fn((m: string) => ({ provider: 'anthropic', modelName: m })) as unknown as {
    (m: string): unknown;
    tools: { webSearch_20250305: ReturnType<typeof vi.fn> };
  };
  anthropic.tools = { webSearch_20250305: vi.fn((args: unknown) => ({ __tool: 'web_search', args })) };
  return { anthropic };
});

describe('generateGroundedIdeas', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.AI_MODEL_PLANLA_TREND;
    delete process.env.AI_MODEL_SAULE;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('throws a clear setup error when no Claude model is configured', async () => {
    const { generateGroundedIdeas } = await import('./trendSearch');
    await expect(generateGroundedIdeas({ system: 's', prompt: 'p' })).rejects.toThrow(/Claude modeli gerekiyor/);
  });

  it('throws when the configured model is Gemini (web search is Anthropic-only)', async () => {
    process.env.AI_MODEL_SAULE = 'gemini-2.5-flash';
    const { generateGroundedIdeas } = await import('./trendSearch');
    await expect(generateGroundedIdeas({ system: 's', prompt: 'p' })).rejects.toThrow(/Claude modeli gerekiyor/);
  });

  it('prefers AI_MODEL_PLANLA_TREND over AI_MODEL_SAULE and wires the web search tool', async () => {
    process.env.AI_MODEL_SAULE = 'claude-saule-fallback';
    process.env.AI_MODEL_PLANLA_TREND = 'claude-trend-specific';
    const { generateGroundedIdeas } = await import('./trendSearch');
    const { generateText } = await import('ai');
    const { anthropic } = await import('@ai-sdk/anthropic');

    const result = await generateGroundedIdeas({ system: 'sys', prompt: 'prompt' });

    expect(result.text).toBe('mocked grounded result');
    expect(result.model).toBe('claude-trend-specific');
    expect(anthropic).toHaveBeenCalledWith('claude-trend-specific');
    expect((anthropic as unknown as { tools: { webSearch_20250305: ReturnType<typeof vi.fn> } }).tools.webSearch_20250305).toHaveBeenCalledWith({ maxUses: 3 });
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({ system: 'sys', prompt: 'prompt' }),
    );
  });
});
