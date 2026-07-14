// Central place describing which block types matter for the "ready to publish" checklist.
// Phase 2 (richer block types) should only need to add entries here, not touch checklist logic.

export const REQUIRED_TYPES = ['about', 'services'] as const;
export const RECOMMENDED_TYPES = ['hours', 'faq', 'links', 'gallery', 'testimonials'] as const;

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

export function isRequiredSatisfied(blocks: Block[], hasContactValue: boolean): boolean {
  const hasAboutOrServices = REQUIRED_TYPES.some((type) =>
    blocks.some((b) => b.type === type && hasRealContent(b))
  );
  return hasAboutOrServices && hasContactValue;
}
