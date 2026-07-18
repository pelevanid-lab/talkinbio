import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';

const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';

const TASK_ENV_KEYS = {
  beiwe: 'AI_MODEL_BEIWE',
  saule: 'AI_MODEL_SAULE',
  analysis: 'AI_MODEL_ANALYSIS',
} as const;

export type AgentTask = keyof typeof TASK_ENV_KEYS;

function resolveModelName(task: AgentTask): string {
  return process.env[TASK_ENV_KEYS[task]] || process.env.AI_MODEL || DEFAULT_MODEL;
}

export function getModel(task: AgentTask) {
  const modelName = resolveModelName(task);

  if (modelName.startsWith('gemini')) {
    return google(modelName);
  }
  return anthropic(modelName);
}

// Faz 4.2 kullanım ölçümü: usage_events'e yazılacak model adını, ayrı bir
// model çözümlemesi tekrarlamadan almak için (generateOnce cron call site'ları).
export function getModelName(task: AgentTask): string {
  return resolveModelName(task);
}
