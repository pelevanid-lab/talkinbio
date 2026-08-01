import { getLocalizedValue, hasRealContentForLocale, isItemVisibleInLocale } from '@/config/blockTypes';

export type PageActionItemTarget = {
  itemId: string;
  label: string;
};

export type PageActionBlockTarget = {
  blockId: string;
  label: string;
  type: string;
  items: PageActionItemTarget[];
};

export function stableItemId(item: any, index: number): string {
  const raw = item?.id || item?.itemId || item?.slug || item?.key;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  return `item-${index + 1}`;
}

export function blockTargetLabel(block: any, locale: string): string {
  return block?.content?.[locale]?.title || block?.content?.title || block?.title || block?.type || 'section';
}

export function itemTargetLabel(item: any, locale: string): string {
  return (
    getLocalizedValue(item, locale, 'title') ||
    getLocalizedValue(item, locale, 'question') ||
    getLocalizedValue(item, locale, 'label') ||
    getLocalizedValue(item, locale, 'caption') ||
    getLocalizedValue(item, locale, 'quote') ||
    item?.author ||
    item?.url ||
    ''
  );
}

export function getPageActionTargets(blocks: any[], locale: string): PageActionBlockTarget[] {
  return (blocks || [])
    .filter((block) => block?.type !== 'settings' && block?.type !== 'contact' && block?.is_visible !== false && hasRealContentForLocale(block, locale))
    .map((block) => {
      const items = Array.isArray(block?.content?.items)
        ? block.content.items
            .map((item: any, index: number) => ({ item, index }))
            .filter(({ item }: { item: any }) => isItemVisibleInLocale(item, locale))
            .map(({ item, index }: { item: any; index: number }) => ({
              itemId: stableItemId(item, index),
              label: itemTargetLabel(item, locale),
            }))
            .filter((item: PageActionItemTarget) => item.label.trim())
        : [];

      return {
        blockId: block.id,
        label: blockTargetLabel(block, locale),
        type: block.type,
        items,
      };
    });
}

export function getContactPageActionTarget(contactMethod: string | null | undefined, contactValue: string | null | undefined, locale: string): PageActionBlockTarget | null {
  let values: Record<string, string> = {};
  try {
    values = contactValue ? JSON.parse(contactValue) : {};
  } catch {
    values = {};
  }

  const methods = (contactMethod || '').split(',').filter((method) => values[method]?.trim());
  if (methods.length === 0) return null;

  const labels: Record<string, string> = { tr: 'İletişim', en: 'Contact', ru: 'Контакт' };
  return {
    blockId: '__contact__',
    label: labels[locale] || labels.tr,
    type: 'contact',
    items: methods.map((method) => ({
      itemId: method,
      label: `${method} ${values[method]}`,
    })),
  };
}

export function withContactPageActionTarget(
  targets: PageActionBlockTarget[],
  contactMethod: string | null | undefined,
  contactValue: string | null | undefined,
  locale: string
): PageActionBlockTarget[] {
  const contactTarget = getContactPageActionTarget(contactMethod, contactValue, locale);
  return contactTarget ? [...targets, contactTarget] : targets;
}
