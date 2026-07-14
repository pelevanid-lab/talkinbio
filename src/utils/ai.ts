import { fallback } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';

export function getModel() {
  const primaryModelName = process.env.AI_MODEL || 'claude-3-5-sonnet-20240620';
  
  // Create primary model instance
  const primaryModel = primaryModelName.startsWith('gemini') 
    ? google(primaryModelName) 
    : anthropic(primaryModelName);
    
  // Define a backup model (opposite of primary)
  const backupModel = primaryModelName.startsWith('gemini')
    ? anthropic('claude-3-5-sonnet-20240620')
    : google('gemini-1.5-pro');

  // Return a fallback chain: Try primary first, if it fails, automatically try the backup
  return fallback([primaryModel, backupModel]);
}
