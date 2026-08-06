import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

vi.mock('@ai-sdk/anthropic', () => ({
  anthropic: vi.fn((modelName: string) => ({ provider: 'anthropic', modelName })),
}));
vi.mock('@ai-sdk/google', () => ({
  google: vi.fn((modelName: string) => ({ provider: 'google', modelName })),
  createGoogleGenerativeAI: vi.fn(() => vi.fn((modelName: string) => ({ provider: 'google', modelName }))),
}));

describe('getModel', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.AI_MODEL;
    delete process.env.AI_MODEL_BEIWE;
    delete process.env.AI_MODEL_SAULE;
    delete process.env.AI_MODEL_ANALYSIS;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  type FakeModel = { provider: string; modelName: string };

  it('falls back to the default model when no env vars are set', async () => {
    const { getModel } = await import('./ai');
    const model = getModel('saule') as unknown as FakeModel;
    expect(model.modelName).toBe('gemini-2.5-flash');
    expect(model.provider).toBe('google');
  });

  it('does not use AI_MODEL as a shared fallback', async () => {
    process.env.AI_MODEL = 'claude-shared-test';
    const { getModel } = await import('./ai');
    expect((getModel('beiwe') as unknown as FakeModel).modelName).toBe('gemini-2.5-flash');
    expect((getModel('analysis') as unknown as FakeModel).modelName).toBe('gemini-2.5-flash');
  });

  it('prefers the task-specific env var over the default', async () => {
    process.env.AI_MODEL = 'claude-shared-test';
    process.env.AI_MODEL_BEIWE = 'claude-beiwe-specific';
    const { getModel } = await import('./ai');
    expect((getModel('beiwe') as unknown as FakeModel).modelName).toBe('claude-beiwe-specific');
    expect((getModel('saule') as unknown as FakeModel).modelName).toBe('gemini-2.5-flash');
  });

  it('routes gemini model names to the google provider', async () => {
    process.env.AI_MODEL_ANALYSIS = 'gemini-2.0-flash';
    const { getModel } = await import('./ai');
    const model = getModel('analysis') as unknown as FakeModel;
    expect(model.provider).toBe('google');
    expect(model.modelName).toBe('gemini-2.0-flash');
  });
});
