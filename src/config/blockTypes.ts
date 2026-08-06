// Central place describing which block types matter for the "ready to publish" checklist.
// Phase 2 (richer block types) should only need to add entries here, not touch checklist logic.

export const REQUIRED_TYPES = ['about', 'services'] as const;
export const RECOMMENDED_TYPES = ['hours', 'faq', 'links', 'gallery', 'testimonials'] as const;

// Kategoriye göre "yayına hazır" kuralı — Faz 2 wizard kategorileriyle birebir eşleşir
// (bkz. src/config/wizardCategories.ts: hizmet/icerik-ureticisi/muzisyen/urun). Örn. bir
// müzisyenin wizard'ında hiç 'services' adımı yok ve 'about' atlanabilir — eski sabit
// REQUIRED_TYPES=['about','services'] kuralında bu kategori hiç yayınlanamayabiliyordu.
// Bilinmeyen/eksik category_id için DEFAULT_PUBLISH_RULE'a düşülür — bu da eski sabit
// REQUIRED_TYPES/RECOMMENDED_TYPES davranışının birebir aynısı, mevcut hesapları bozmaz.
export type PublishRule = {
  contentTypes: readonly string[];   // bunlardan en az biri gerçek içerik taşımalı
  recommendedTypes: readonly string[];
  requireContact: boolean;
};

const DEFAULT_PUBLISH_RULE: PublishRule = {
  contentTypes: REQUIRED_TYPES,
  recommendedTypes: RECOMMENDED_TYPES,
  requireContact: true,
};

export const PUBLISH_RULES: Record<string, PublishRule> = {
  hizmet: {
    contentTypes: ['about', 'services'],
    recommendedTypes: ['pricing', 'testimonials', 'faq'],
    requireContact: true,
  },
  'icerik-ureticisi': {
    contentTypes: ['gallery', 'links'],
    recommendedTypes: ['testimonials'],
    requireContact: true,
  },
  muzisyen: {
    contentTypes: ['links', 'gallery', 'about', 'custom'],
    recommendedTypes: ['services'],
    requireContact: true,
  },
  urun: {
    contentTypes: ['services', 'links'],
    recommendedTypes: ['pricing', 'gallery', 'faq'],
    requireContact: false,
  },
};

export function getPublishRule(categoryId?: string | null): PublishRule {
  return (categoryId && PUBLISH_RULES[categoryId]) || DEFAULT_PUBLISH_RULE;
}

type Block = { type: string; content?: any };

// Reads real content regardless of which locale it was entered in.
// Content for text blocks (about/contact/custom) is stored per-locale: content.tr.text / content.en.text / content.ru.text.
// Content for list blocks (services/faq/links/gallery/testimonials) is stored as content.items.
// Content for hours is stored as content.schedule (a day -> {isOpen, openTime, closeTime} map).
export function hasRealContent(block: Block | undefined): boolean {
  if (!block?.content) return false;
  const c = block.content;

  const localizedText = c.tr?.text || c.en?.text || c.ru?.text || (typeof c.text === 'string' ? c.text : '');
  if (localizedText && localizedText.trim().length > 5) return true;

  if (Array.isArray(c.items) && c.items.length > 0) return true;

  if (c.schedule && typeof c.schedule === 'object' && Object.keys(c.schedule).length > 0) return true;

  return false;
}

export function getLocalizedValue(item: any, locale: string, field: string): string {
  if (!item) return '';
  
  // Case 1: item[locale] exists as an object, e.g. item.tr.title (used by services)
  if (item[locale] && typeof item[locale] === 'object' && item[locale][field] !== undefined) {
    return item[locale][field] || '';
  }
  
  // Case 2: item[field] is an object containing locale keys, e.g. item.question.tr (used by faq, testimonials, gallery)
  if (item[field] && typeof item[field] === 'object') {
    if (item[field][locale] !== undefined) {
      return item[field][locale] || '';
    }
  }

  // Case 3: item[field] is a flat string, e.g. item.author or item.url
  return typeof item[field] === 'string' ? item[field] : '';
}

export function isItemVisibleInLocale(item: any, locale: string): boolean {
  const checkStrs = [
    getLocalizedValue(item, locale, 'title'),
    getLocalizedValue(item, locale, 'description'),
    getLocalizedValue(item, locale, 'caption'),
    getLocalizedValue(item, locale, 'quote'),
    getLocalizedValue(item, locale, 'question'),
    getLocalizedValue(item, locale, 'answer'),
    getLocalizedValue(item, locale, 'label'),
    getLocalizedValue(item, locale, 'url')
  ];
  return checkStrs.some(s => typeof s === 'string' && s.trim().length > 0);
}

export function hasRealContentForLocale(block: Block | undefined, locale: string): boolean {
  if (!block?.content) return false;
  const c = block.content;

  if (block.type === 'about' || block.type === 'contact' || block.type === 'custom') {
    const localizedText = c[locale]?.text || (typeof c.text === 'string' ? c.text : '');
    return localizedText.trim().length > 0;
  }

  if (Array.isArray(c.items) && c.items.length > 0) {
    return c.items.some((item: any) => isItemVisibleInLocale(item, locale));
  }

  if (c.schedule && typeof c.schedule === 'object' && Object.keys(c.schedule).length > 0) {
    return true;
  }

  return false;
}

export function isRequiredSatisfied(blocks: Block[], hasContactValue: boolean, categoryId?: string | null): boolean {
  const rule = getPublishRule(categoryId);
  const hasRequiredContent = rule.contentTypes.some((type) =>
    blocks.some((b) => b.type === type && hasRealContent(b))
  );
  return hasRequiredContent && (!rule.requireContact || hasContactValue);
}
