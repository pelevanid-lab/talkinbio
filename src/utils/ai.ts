import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';

export function getModel(modelName: string = process.env.AI_MODEL || 'claude-3-5-sonnet-20240620') {
  if (modelName.startsWith('gemini')) {
    return google(modelName);
  }
  return anthropic(modelName);
}
