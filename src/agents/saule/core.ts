export const SAULE_RUNTIME_VERSION = '2026-08-saule-runtime-v1';

export const SAULE_CUE_KEYS = [
  'welcome',
  'opening_section',
  'showing_item',
  'showing_written_answer',
  'showing_contact',
  'opening_lead_form',
  'information_unavailable',
  'voice_limit_reached',
  'session_limit_reached',
  'thank_you',
] as const;

export type SauleCueKey = (typeof SAULE_CUE_KEYS)[number];
export type SauleHostApplication = 'talkinbio' | 'getsaule';
export const SAULE_CUE_MARKER_PREFIX = '[[SAULE_CUE:';
export const SAULE_CUE_MARKER_SUFFIX = ']]';

export type SauleKnowledgeSource = {
  id?: string;
  title: string | null;
  content: string;
  source: 'page' | 'owner_note' | 'conversation_memory' | 'global_memory';
  visibility: 'runtime' | 'training' | 'analytics';
  locale?: string | null;
};

export type SauleRuntimeBlock = {
  id?: string;
  title: string;
  type: string;
  content: unknown;
  is_visible?: boolean;
};

export type SauleRuntimeBusiness = {
  id: string;
  name: string;
  category: string | null;
  contact_method: string | null;
  contact_value: string | null;
  saule_settings: Record<string, unknown> | null;
};

export type SauleRuntimeProfile = {
  runtimeVersion: string;
  host: SauleHostApplication;
  business: SauleRuntimeBusiness;
  blocks: SauleRuntimeBlock[];
  knowledge: SauleKnowledgeSource[];
  locale: string | null;
};

export type SauleAction =
  | { type: 'open_block'; blockId: string; itemId?: string | null }
  | { type: 'open_lead_form' }
  | { type: 'open_contact'; method?: string | null };

export type SauleTurnContract = {
  text: string;
  action?: SauleAction | null;
  cueKey?: SauleCueKey | null;
};

export function buildSauleRuntimeProfile(params: {
  host?: SauleHostApplication;
  business: SauleRuntimeBusiness;
  blocks: SauleRuntimeBlock[];
  knowledge: Array<{ id?: string; title: string | null; content: string; locale?: string | null }>;
  locale: string | null;
}): SauleRuntimeProfile {
  return {
    runtimeVersion: SAULE_RUNTIME_VERSION,
    host: params.host || 'talkinbio',
    business: params.business,
    blocks: params.blocks,
    knowledge: params.knowledge.map((item) => ({
      id: item.id,
      title: item.title,
      content: item.content,
      locale: item.locale,
      source: 'owner_note',
      visibility: 'runtime',
    })),
    locale: params.locale,
  };
}

export function createSauleStaticTurn(text: string, cueKey?: SauleCueKey, action?: SauleAction): SauleTurnContract {
  return { text, cueKey: cueKey || null, action: action || null };
}

export function isSauleCueKey(value: string): value is SauleCueKey {
  return (SAULE_CUE_KEYS as readonly string[]).includes(value);
}

export function formatSauleCueMarker(cueKey: SauleCueKey): string {
  return `${SAULE_CUE_MARKER_PREFIX}${cueKey}${SAULE_CUE_MARKER_SUFFIX}`;
}

export function parseSauleCueKey(text: string): SauleCueKey | null {
  const start = text.indexOf(SAULE_CUE_MARKER_PREFIX);
  if (start === -1) return null;
  const end = text.indexOf(SAULE_CUE_MARKER_SUFFIX, start + SAULE_CUE_MARKER_PREFIX.length);
  if (end === -1) return null;
  const raw = text.slice(start + SAULE_CUE_MARKER_PREFIX.length, end).trim();
  return isSauleCueKey(raw) ? raw : null;
}

export function stripSauleCueMarkers(text: string): string {
  const pattern = new RegExp(`\\[\\[SAULE_CUE:(${SAULE_CUE_KEYS.join('|')})\\]\\]`, 'g');
  return text.replace(pattern, '');
}
