import { describe, expect, it } from 'vitest';
import { getInteractiveEntryOptions, resolveInteractiveEntryTargets, resolvePublicPageType } from './interactiveEntry';

const block = (id: string, type: string, order: number, title = id) => ({
  id,
  type,
  order,
  is_visible: true,
  content: type === 'about' || type === 'custom'
    ? { tr: { title, text: `${title} içeriği` } }
    : { tr: { title }, items: [{ tr: { title: `${title} öğesi` } }] },
});

describe('interactive entry settings', () => {
  it('keeps existing profiles on hybrid mode unless another valid mode is selected', () => {
    expect(resolvePublicPageType(undefined)).toBe('hybrid');
    expect(resolvePublicPageType('hybrid')).toBe('hybrid');
    expect(resolvePublicPageType('classic')).toBe('classic');
    expect(resolvePublicPageType('conversion')).toBe('conversion');
    expect(resolvePublicPageType('unknown')).toBe('hybrid');
  });

  it('uses wizard order without requiring service-specific block types', () => {
    const blocks = [
      block('bio', 'about', 0),
      block('music', 'links', 1),
      block('videos', 'gallery', 2),
      block('story', 'custom', 3),
    ];

    expect(resolveInteractiveEntryTargets(blocks)).toEqual({
      heroBlockId: 'bio',
      discoverBlockIds: ['music', 'videos', 'story'],
    });
  });

  it('keeps valid configured choices and fills deleted or duplicate choices safely', () => {
    const blocks = [
      block('about', 'about', 0),
      block('catalog', 'services', 1),
      block('proof', 'testimonials', 2),
      block('faq', 'faq', 3),
    ];

    expect(resolveInteractiveEntryTargets(blocks, {
      heroTarget: { blockId: 'deleted' },
      discoverTargets: [
        { blockId: 'proof' },
        { blockId: 'proof' },
        { blockId: 'deleted' },
      ],
    })).toEqual({
      heroBlockId: 'about',
      discoverBlockIds: ['proof', 'catalog', 'about'],
    });
  });

  it('lists every visible content block with a locale fallback', () => {
    const blocks = [
      block('one', 'custom', 2, 'Türkçe başlık'),
      { ...block('hidden', 'custom', 1), is_visible: false },
      { id: 'system', type: 'settings', content: { tr: { text: 'ayar' } } },
    ];

    expect(getInteractiveEntryOptions(blocks, 'en')).toEqual([
      { blockId: 'one', label: 'Türkçe başlık', type: 'custom' },
    ]);
  });
});
