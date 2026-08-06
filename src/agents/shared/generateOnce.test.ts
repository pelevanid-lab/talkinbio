import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('ai', () => ({
  generateText: vi.fn(async (opts: { model: unknown; system: string; prompt: string }) => ({
    text: 'mocked completion',
    usage: { inputTokens: 120, outputTokens: 40 },
    __opts: opts,
  })),
}));

vi.mock('@ai-sdk/anthropic', () => ({ anthropic: vi.fn((m: string) => ({ provider: 'anthropic', modelName: m })) }));
vi.mock('@ai-sdk/google', () => ({
  google: vi.fn((m: string) => ({ provider: 'google', modelName: m })),
  createGoogleGenerativeAI: vi.fn(() => vi.fn((m: string) => ({ provider: 'google', modelName: m }))),
}));

describe('generateOnce', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves with text and usage from a non-streaming generateText call', async () => {
    const { generateOnce } = await import('./generateOnce');
    const { generateText } = await import('ai');

    const result = await generateOnce({
      task: 'analysis',
      system: 'You summarize weekly conversation trends.',
      prompt: 'Conversations: ...',
    });

    expect(result.text).toBe('mocked completion');
    expect(result.usage).toEqual({ inputTokens: 120, outputTokens: 40 });
    expect(result.model).toBe('gemini-2.5-flash');
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: 'You summarize weekly conversation trends.',
        prompt: 'Conversations: ...',
      })
    );
  });

  it('selects the model via the task-specific env key', async () => {
    process.env.AI_MODEL_ANALYSIS = 'claude-analysis-test';
    const { generateOnce } = await import('./generateOnce');
    const { anthropic } = await import('@ai-sdk/anthropic');

    await generateOnce({ task: 'analysis', system: 's', prompt: 'p' });

    expect(anthropic).toHaveBeenCalledWith('claude-analysis-test');
    delete process.env.AI_MODEL_ANALYSIS;
  });
});
