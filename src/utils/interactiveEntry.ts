import { hasRealContent } from '@/config/blockTypes';
import { blockTargetLabel } from '@/utils/pageActionTargets';

export type PublicPageType = 'classic' | 'hybrid' | 'conversion';

export type ConversionFlowQuestion = {
  id: string;
  label: string;
  answer: string;
  next?: ConversionFlowQuestion[];
};

export type ConversionFlowSettings = {
  nodes?: Record<string, {
    locales?: Partial<Record<'tr' | 'en' | 'ru', { questions?: ConversionFlowQuestion[] }>>;
    questions?: ConversionFlowQuestion[];
  }>;
};

export function resolvePublicPageType(value: unknown): PublicPageType {
  return value === 'classic' || value === 'conversion' ? value : 'hybrid';
}

export type InteractiveEntryTarget = {
  blockId: string;
  itemId?: string | null;
};

export type InteractiveEntrySettings = {
  heroTarget?: InteractiveEntryTarget | null;
  discoverTargets?: InteractiveEntryTarget[];
};

export type InteractiveEntryOption = {
  blockId: string;
  label: string;
  type: string;
};

type InteractiveBlock = {
  id: string;
  type: string;
  order?: number | null;
  is_visible?: boolean | null;
  content?: Record<string, unknown>;
};

function isInteractiveBlock(value: unknown): value is InteractiveBlock {
  if (!value || typeof value !== 'object') return false;
  const block = value as Partial<InteractiveBlock>;
  return typeof block.id === 'string' && typeof block.type === 'string';
}

function isSelectableBlock(block: InteractiveBlock): boolean {
  return Boolean(
    block?.id &&
    block.type !== 'settings' &&
    block.type !== 'published_snapshot' &&
    block.type !== 'contact' &&
    block.is_visible !== false &&
    hasRealContent(block)
  );
}

function localizedBlockLabel(block: InteractiveBlock, locale: string): string {
  const locales = [locale, 'tr', 'en', 'ru'];
  for (const candidate of locales) {
    const localized = block.content?.[candidate];
    const label = localized && typeof localized === 'object'
      ? (localized as Record<string, unknown>).title
      : null;
    if (typeof label === 'string' && label.trim()) return label.trim();
  }
  return blockTargetLabel(block, locale);
}

export function getInteractiveEntryOptions(blocks: unknown[], locale: string): InteractiveEntryOption[] {
  return (blocks || [])
    .filter(isInteractiveBlock)
    .filter(isSelectableBlock)
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((block) => ({
      blockId: block.id,
      label: localizedBlockLabel(block, locale),
      type: block.type,
    }));
}

export function resolveInteractiveEntryTargets(
  blocks: unknown[],
  settings?: InteractiveEntrySettings | null,
  limit = 3
): { heroBlockId: string | null; discoverBlockIds: string[] } {
  const selectable = (blocks || []).filter(isInteractiveBlock).filter(isSelectableBlock);
  const selectableIds = new Set(selectable.map((block) => block.id));
  const configuredHeroId = settings?.heroTarget?.blockId;
  const heroBlockId = configuredHeroId && selectableIds.has(configuredHeroId)
    ? configuredHeroId
    : selectable.find((block) => block.type === 'about')?.id || selectable[0]?.id || null;

  const discoverBlockIds: string[] = [];
  const add = (blockId: string | null | undefined) => {
    if (!blockId || !selectableIds.has(blockId) || discoverBlockIds.includes(blockId)) return;
    discoverBlockIds.push(blockId);
  };

  for (const target of settings?.discoverTargets || []) add(target?.blockId);

  // Only backfill with fallback picks when the owner hasn't deliberately configured fewer
  // slots than `limit`. A saved list shorter than `limit` (e.g. just one entry) means the
  // owner chose to show fewer options and that choice should stick. A saved list at (or
  // trying to reach) `limit` that resolved to fewer valid entries — duplicates or a since
  // deleted block — still gets repaired via the fallback loops below, and pages that have
  // never been configured (`discoverTargets` unset) get sensible defaults.
  const configuredCount = settings?.discoverTargets?.length ?? 0;
  if (configuredCount >= limit || !Array.isArray(settings?.discoverTargets)) {
    // Respect the wizard's block order. Introductory and answer-only sections are fallback choices,
    // not hard-coded requirements, so this works for services, products, musicians and future sectors.
    for (const block of selectable) {
      if (block.type === 'about' || block.type === 'faq') continue;
      add(block.id);
      if (discoverBlockIds.length >= limit) break;
    }
    for (const block of selectable) {
      add(block.id);
      if (discoverBlockIds.length >= limit) break;
    }
  }

  return { heroBlockId, discoverBlockIds: discoverBlockIds.slice(0, limit) };
}
