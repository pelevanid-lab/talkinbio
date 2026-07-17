import { describe, it, expect } from 'vitest';
import { pickLocale, filterBlocksToLocale } from './localeFilter';

describe('pickLocale', () => {
  it('collapses a tr/en/ru group into the chosen locale, keeping sibling fields', () => {
    const content = {
      tr: { text: 'Merhaba', title: 'Hakkımda' },
      en: { text: 'Hello', title: 'About' },
      ru: { text: 'Привет', title: 'Обо мне' },
      mediaUrl: 'https://example.com/a.jpg',
      layoutVariant: 'standard',
    };
    expect(pickLocale(content, 'en')).toEqual({
      text: 'Hello',
      title: 'About',
      mediaUrl: 'https://example.com/a.jpg',
      layoutVariant: 'standard',
    });
  });

  it('falls back to tr when the requested locale is missing', () => {
    const content = { tr: { text: 'Merhaba' }, en: { text: 'Hello' }, ru: { text: 'Привет' } };
    expect(pickLocale(content, 'fr')).toEqual({ text: 'Merhaba' });
  });

  it('recurses into arrays of locale-grouped items', () => {
    const content = {
      items: [
        { tr: { title: 'Saç Kesimi' }, en: { title: 'Haircut' }, ru: { title: 'Стрижка' }, price: '100' },
      ],
    };
    expect(pickLocale(content, 'tr')).toEqual({ items: [{ title: 'Saç Kesimi', price: '100' }] });
  });

  it('leaves a partial locale group (not all three present) untouched', () => {
    const caption = { tr: 'başlık', en: 'title' };
    expect(pickLocale(caption, 'tr')).toEqual({ tr: 'başlık', en: 'title' });
  });
});

describe('filterBlocksToLocale', () => {
  it('applies pickLocale to every block content', () => {
    const blocks = [
      { type: 'about', content: { tr: { text: 'a' }, en: { text: 'b' }, ru: { text: 'c' } } },
    ];
    expect(filterBlocksToLocale(blocks, 'en')).toEqual([{ type: 'about', content: { text: 'b' } }]);
  });
});
