import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';

const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';

const TASK_ENV_KEYS = {
  beiwe: 'AI_MODEL_BEIWE',
  saule: 'AI_MODEL_SAULE',
  analysis: 'AI_MODEL_ANALYSIS',
} as const;

export type AgentTask = keyof typeof TASK_ENV_KEYS;

export function getModel(task: AgentTask) {
  const modelName = process.env[TASK_ENV_KEYS[task]] || process.env.AI_MODEL || DEFAULT_MODEL;

  if (modelName.startsWith('gemini')) {
    return google(modelName);
  }
  return anthropic(modelName);
}
