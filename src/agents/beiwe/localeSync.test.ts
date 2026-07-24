import { describe, it, expect } from 'vitest';
import {
  extractLocaleText,
  mergeLocaleTranslations,
  buildTranslatePrompt,
  isSyncableType,
  SYNCABLE_TYPES,
} from './localeSync';

describe('isSyncableType', () => {
  it('accepts the syncable types and rejects links / unknown', () => {
    for (const t of SYNCABLE_TYPES) expect(isSyncableType(t)).toBe(true);
    expect(isSyncableType('links')).toBe(false);
    expect(isSyncableType('nope')).toBe(false);
    expect(isSyncableType(undefined)).toBe(false);
  });
});

describe('extractLocaleText', () => {
  it('pulls title + body for about', () => {
    const content = { tr: { title: 'Hakkımda', text: 'Merhaba' }, en: { title: 'About', text: 'Hi' } };
    expect(extractLocaleText('about', content, 'ru')).toEqual({});
    expect(extractLocaleText('about', content, 'tr')).toEqual({ title: 'Hakkımda', text: 'Merhaba' });
  });

  it('pulls per-item title/description for services', () => {
    const content = {
      items: [
        { ru: { title: 'Стрижка', description: 'Быстро' }, price: '500' },
        { ru: { title: 'Маникюр' } },
      ],
    };
    expect(extractLocaleText('services', content, 'ru')).toEqual({
      items: [{ title: 'Стрижка', description: 'Быстро' }, { title: 'Маникюр', description: undefined }],
    });
  });

  it('pulls nested caption/quote/answer for gallery/testimonials/faq', () => {
    expect(extractLocaleText('gallery', { items: [{ url: 'x', caption: { ru: 'Фото' } }] }, 'ru'))
      .toEqual({ items: [{ caption: 'Фото' }] });
    expect(extractLocaleText('testimonials', { items: [{ author: 'A', quote: { ru: 'Класс' }, role: { ru: 'Клиент' } }] }, 'ru'))
      .toEqual({ items: [{ quote: 'Класс', role: 'Клиент' }] });
    expect(extractLocaleText('faq', { items: [{ question: { ru: 'Как?' }, answer: { ru: 'Так' } }] }, 'ru'))
      .toEqual({ items: [{ question: 'Как?', answer: 'Так' }] });
  });
});

describe('mergeLocaleTranslations', () => {
  it('writes target locales without touching the source locale', () => {
    const content = { ru: { title: 'Обо мне', text: 'Привет' } };
    const merged = mergeLocaleTranslations('about', content, {
      tr: { title: 'Hakkımda', text: 'Merhaba' },
      en: { title: 'About', text: 'Hi' },
    });
    expect(merged.ru).toEqual({ title: 'Обо мне', text: 'Привет' });
    expect(merged.tr).toEqual({ title: 'Hakkımda', text: 'Merhaba' });
    expect(merged.en).toEqual({ title: 'About', text: 'Hi' });
  });

  it('preserves non-text item fields (price, mediaUrl) and item order for services', () => {
    const content = {
      ru: { title: 'Услуги' },
      items: [
        { ru: { title: 'Стрижка', description: 'Быстро' }, price: '500', mediaUrl: 'https://img/1' },
        { ru: { title: 'Маникюр' }, price: '300' },
      ],
      layoutVariant: 'price-table',
    };
    const merged = mergeLocaleTranslations('services', content, {
      en: { items: [{ title: 'Haircut', description: 'Fast' }, { title: 'Manicure' }] },
    });
    expect(merged.items?.[0]).toMatchObject({ price: '500', mediaUrl: 'https://img/1', ru: { title: 'Стрижка' }, en: { title: 'Haircut', description: 'Fast' } });
    expect(merged.items?.[1]).toMatchObject({ price: '300', en: { title: 'Manicure' } });
    expect(merged.layoutVariant).toBe('price-table');
  });

  it('merges nested caption/quote/answer without clobbering the source locale', () => {
    const gallery = mergeLocaleTranslations('gallery', { items: [{ url: 'x', caption: { ru: 'Фото' } }] }, {
      tr: { items: [{ caption: 'Fotoğraf' }] },
    });
    expect(gallery.items?.[0]).toEqual({ url: 'x', caption: { ru: 'Фото', tr: 'Fotoğraf' } });

    const faq = mergeLocaleTranslations('faq', { items: [{ question: { ru: 'Как?' }, answer: { ru: 'Так' } }] }, {
      en: { items: [{ question: 'How?', answer: 'Like this' }] },
    });
    expect(faq.items?.[0]).toEqual({ question: { ru: 'Как?', en: 'How?' }, answer: { ru: 'Так', en: 'Like this' } });
  });

  it('ignores translations for an item index that no longer exists', () => {
    const merged = mergeLocaleTranslations('services', { items: [{ ru: { title: 'A' } }] }, {
      en: { items: [{ title: 'A-en' }, { title: 'ghost' }] },
    });
    expect(merged.items).toHaveLength(1);
    expect(merged.items?.[0]).toMatchObject({ en: { title: 'A-en' } });
  });

  it('does not mutate the input content', () => {
    const content = { ru: { title: 'Обо мне' } };
    const snapshot = JSON.parse(JSON.stringify(content));
    mergeLocaleTranslations('about', content, { tr: { title: 'Hakkımda' } });
    expect(content).toEqual(snapshot);
  });
});

describe('buildTranslatePrompt', () => {
  it('lists the target locales and embeds the source JSON', () => {
    const { system, prompt } = buildTranslatePrompt({
      type: 'about',
      sourceLocale: 'ru',
      targetLocales: ['tr', 'en'],
      source: { title: 'Обо мне', text: 'Привет' },
    });
    expect(system).toContain('"tr"');
    expect(system).toContain('"en"');
    expect(prompt).toContain('Привет');
    expect(prompt).toContain('about');
  });
});
