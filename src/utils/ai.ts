import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';

export function getModel(modelName: string = process.env.AI_MODEL || 'claude-sonnet-4-5-20250929') {
  // Harcoded alias mapping for user's requested friendly name
  if (modelName === 'claude-sonnet-5') {
    modelName = 'claude-sonnet-4-5-20250929';
  }

  if (modelName.startsWith('gemini')) {
    return google(modelName);
  }
  return anthropic(modelName);
}
