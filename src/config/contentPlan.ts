// Planla v2 — içerik stratejisi asistanı (Stüdyo hub, 4. kat). Bu dosya BİLEREK
// `config/studio.ts` ile aynı disiplinde: sunucu-özel importu YOK (hem sunucuda route
// doğrulaması hem tarayıcıda `PlanlaClient` içinde okunuyor), savunmacı parse
// (`parseStudioTimeline` deseniyle AYNI — eksik/bozuk veri güvenli varsayılana düşer,
// asla patlamaz).

export type ContentPillar = {
  id: string;
  label: string;
  description: string;
};

export const MAX_PILLARS = 8;
export const MAX_PILLAR_LABEL_LENGTH = 40;
export const MAX_PILLAR_DESCRIPTION_LENGTH = 160;

function isFiniteString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

function parsePillar(value: unknown): ContentPillar | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (!isFiniteString(v.label, MAX_PILLAR_LABEL_LENGTH)) return null;
  return {
    id: typeof v.id === 'string' && v.id.trim() ? v.id : crypto.randomUUID(),
    label: v.label as string,
    description: typeof v.description === 'string' ? v.description.slice(0, MAX_PILLAR_DESCRIPTION_LENGTH) : '',
  };
}

/** `businesses.content_pillars` JSONB'ini doğrular — istemciye güvenilmiyor kuralı
 *  burada da geçerli, sunucu route'u ham JSON'u doğrudan DB'ye yazmadan önce bundan geçirir. */
export function parseContentPillars(value: unknown): ContentPillar[] {
  if (!Array.isArray(value)) return [];
  return (value.map(parsePillar).filter(Boolean) as ContentPillar[]).slice(0, MAX_PILLARS);
}

export type ContentPlanStatus = 'idea' | 'ready' | 'posted' | 'skipped';
export const CONTENT_PLAN_STATUSES: ContentPlanStatus[] = ['idea', 'ready', 'posted', 'skipped'];
export function isContentPlanStatus(value: unknown): value is ContentPlanStatus {
  return typeof value === 'string' && (CONTENT_PLAN_STATUSES as string[]).includes(value);
}

export type ContentPlanFormat = 'instagram_post' | 'instagram_story' | 'whatsapp_status';
export const CONTENT_PLAN_FORMATS: ContentPlanFormat[] = ['instagram_post', 'instagram_story', 'whatsapp_status'];
export function isContentPlanFormat(value: unknown): value is ContentPlanFormat {
  return typeof value === 'string' && (CONTENT_PLAN_FORMATS as string[]).includes(value);
}

/** "Metne dönüştür" (`/api/studio/planla/ideas/[id]/expand`) çıktısı —
 *  `ContentClient.tsx`'teki yerel `GeneratedResult` ile YAPISAL olarak aynı, ayrı
 *  tutuluyor (o dosyaya dokunulmuyor, [[canli-sayfalara-dokunma]] temkinliliği). */
export type ContentCaptionResult = Record<'tr' | 'en' | 'ru', { caption: string; hashtags?: string[] }>;

/** `content_plan_items` satırının uygulama tarafındaki karşılığı. */
export type ContentPlanItem = {
  id: string;
  business_id: string;
  pillar_id: string | null;
  status: ContentPlanStatus;
  title: string;
  brief: string | null;
  format: ContentPlanFormat;
  source: 'ai' | 'manual';
  trend_note: string | null;
  generated_caption: ContentCaptionResult | null;
  created_at: string;
  updated_at: string;
};

/**
 * `/api/studio/planla/ideas/generate` maliyetleri — TAHMİN, `STUDIO_DUB_COST_USD_PER_MINUTE`
 * ile AYNI dürüstlük ilkesi: gerçek faturayla doğrulanmadı.
 */
export const PLANLA_PILLAR_SUGGEST_COST_USD = 0.01;
/** Aramasız — yalnızca işletme profili + sütunlardan N fikir, tek LLM çağrısı. */
export const PLANLA_IDEA_GENERATE_COST_USD = 0.02;
/**
 * Trend aramalı — Anthropic web search'ün kendi fiyatlandırması (yaklaşık $10/1000
 * arama, yani arama başı ~$0.01) + daha uzun bağlam/çıktı token'ı üstüne eklenir.
 * `maxUses: 3` (bkz. `trendSearch.ts`) ile üst sınır ~$0.03 arama + token — TAHMİN.
 */
export const PLANLA_IDEA_GENERATE_GROUNDED_COST_USD = 0.08;
