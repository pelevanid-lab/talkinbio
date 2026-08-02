// Saule mode configuration - unified agent with pluggable modes
export type SauleMode = 'studio' | 'assistant' | 'insights';

export interface SauleModeConfig {
  mode: SauleMode;
  creditCost: number;
  modelId?: string;
  tools: string[];
  description: string;
}

export const SAULE_MODE_CONFIGS: Record<SauleMode, SauleModeConfig> = {
  studio: {
    mode: 'studio',
    creditCost: 6, // SAULE_STUDIO_UPDATE_CREDIT_COST
    description: 'Page setup, content generation, page editing',
    tools: [
      'setTheme',
      'updateAbout',
      'addServices',
      'addGallery',
      'addTestimonials',
      'addHours',
      'addFAQ',
      'addLinks',
      'addSection',
      'updateContact',
      'syncBlockLanguages',
    ],
  },
  assistant: {
    mode: 'assistant',
    creditCost: 1, // SAULE_CREDIT_COST
    description: 'Visitor Q&A, lead capture, page navigation',
    tools: ['captureLeadTool', 'captureAccessRequestTool', 'findPageRoute'],
  },
  insights: {
    mode: 'insights',
    creditCost: 2,
    description: 'Conversation analysis, recommendations',
    tools: ['analyzeConversations', 'generateInsights'],
  },
};

export function getModeConfig(mode: SauleMode): SauleModeConfig {
  return SAULE_MODE_CONFIGS[mode] ?? SAULE_MODE_CONFIGS.assistant;
}
