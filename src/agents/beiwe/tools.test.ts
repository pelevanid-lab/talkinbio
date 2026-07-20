import { describe, it, expect } from 'vitest';
import { resolveSectionTitles, type SectionTitles } from './tools';
import { LOCALE_TITLES } from '@/config/localeTitles';

const DEFAULTS: SectionTitles = {
  tr: LOCALE_TITLES.tr.about,
  en: LOCALE_TITLES.en.about,
  ru: LOCALE_TITLES.ru.about,
};

describe('resolveSectionTitles', () => {
  it('boş bir blokta parametre verilmezse her dil kendi varsayılanını alır', () => {
    expect(resolveSectionTitles(undefined, DEFAULTS, undefined, undefined)).toEqual({
      tr: 'Hakkımda',
      en: 'About',
      ru: 'Обо мне',
    });
  });

  it('sectionTitle her dil için kendi çevirisini uygular — tek kelime tüm dillere damgalanmaz', () => {
    const titles = resolveSectionTitles(
      { tr: { title: 'Hakkımda' } },
      DEFAULTS,
      { tr: 'Merhaba', en: 'Hello', ru: 'Привет' },
      undefined,
    );
    expect(titles).toEqual({ tr: 'Merhaba', en: 'Hello', ru: 'Привет' });
  });

  it('parametre verilmezse mevcut başlıklar DİL BAZINDA korunur (elle yapılan düzeltmeler dahil)', () => {
    const existing = {
      tr: { title: 'Hakkımda' },
      en: { title: 'My Story' }, // editörden elle girilmiş özel EN başlığı
      ru: { title: 'Обо мне' },
    };
    expect(resolveSectionTitles(existing, DEFAULTS, undefined, undefined)).toEqual({
      tr: 'Hakkımda',
      en: 'My Story',
      ru: 'Обо мне',
    });
  });

  it('eski tek-kelime özel başlık artık diğer dillere geri kopyalanmaz', () => {
    // Eski hatalı davranış: tr'deki "О мне" tüm dillere yeniden damgalanıyordu.
    const existing = { tr: { title: 'О мне' }, en: {}, ru: {} };
    expect(resolveSectionTitles(existing, DEFAULTS, undefined, undefined)).toEqual({
      tr: 'О мне', // dokunulmadı — reset istenmedi
      en: 'About',
      ru: 'Обо мне',
    });
  });

  it('resetSectionTitle özel başlıkları silip her dili kendi varsayılanına döndürür', () => {
    const existing = { tr: { title: 'О мне' }, en: { title: 'О мне' }, ru: { title: 'О мне' } };
    expect(resolveSectionTitles(existing, DEFAULTS, undefined, true)).toEqual({
      tr: 'Hakkımda',
      en: 'About',
      ru: 'Обо мне',
    });
  });

  it('reset, aynı çağrıda verilen sectionTitle karşısında da önceliklidir', () => {
    expect(
      resolveSectionTitles(undefined, DEFAULTS, { tr: 'X', en: 'X', ru: 'X' }, true),
    ).toEqual(DEFAULTS);
  });

  it('sectionTitle içinde boş bırakılan dil o dilin varsayılanına düşer', () => {
    expect(
      resolveSectionTitles(undefined, DEFAULTS, { tr: 'Merhaba', en: '  ', ru: 'Привет' }, undefined),
    ).toEqual({ tr: 'Merhaba', en: 'About', ru: 'Привет' });
  });
});
