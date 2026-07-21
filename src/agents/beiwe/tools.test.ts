import { describe, it, expect } from 'vitest';
import { resolveSectionTitles, addSectionTool, type SectionTitles } from './tools';
import { LOCALE_TITLES } from '@/config/localeTitles';

type FakeBlock = { id: string; type: string; order: number };

// Mimics only the chain shapes addSectionTool actually calls: select().eq().not(),
// update().eq(), and insert().
function fakeSupabase(existingBlocks: FakeBlock[]) {
  const updates: { id: string; order: number }[] = [];
  const inserted: Record<string, unknown>[] = [];
  return {
    client: {
      from: () => ({
        select: () => ({
          eq: () => ({
            not: () => Promise.resolve({ data: existingBlocks }),
          }),
        }),
        update: (patch: { order: number }) => ({
          eq: (_col: string, id: string) => {
            updates.push({ id, order: patch.order });
            return Promise.resolve({ error: null });
          },
        }),
        insert: (row: Record<string, unknown>) => {
          inserted.push(row);
          return Promise.resolve({ error: null });
        },
      }),
      // Cast away the real SupabaseClient type — the tool only ever calls .from(...) on it.
    } as unknown as import('@supabase/supabase-js').SupabaseClient,
    updates,
    inserted,
  };
}

const SECTION_ARGS = {
  title: { tr: 'Sertifikalar', en: 'Certifications', ru: 'Сертификаты' },
  tr: { text: 'tr metin' },
  en: { text: 'en text' },
  ru: { text: 'ru текст' },
};

describe('addSectionTool', () => {
  it('inserting after a block with a direct successor keeps order as a whole integer (no fractional averaging)', async () => {
    const existingBlocks: FakeBlock[] = [
      { id: 'about-id', type: 'about', order: 1 },
      { id: 'services-id', type: 'services', order: 2 },
      { id: 'links-id', type: 'links', order: 4 },
    ];
    const { client, updates, inserted } = fakeSupabase(existingBlocks);
    const result = await addSectionTool({ supabase: client, businessId: 'biz-1', locale: 'tr' })
      .execute({ ...SECTION_ARGS, insertAfterType: 'about' }, { toolCallId: 't1', messages: [] });

    expect(result).not.toMatch(/^Error:/);
    expect(inserted).toHaveLength(1);
    expect(Number.isInteger(inserted[0].order)).toBe(true);
    expect(inserted[0].order).toBe(2);
    // services and links both sit at/after the insertion point and must be bumped, not fractioned.
    expect(updates).toEqual(
      expect.arrayContaining([
        { id: 'services-id', order: 3 },
        { id: 'links-id', order: 5 },
      ]),
    );
  });

  it('inserting after the last block appends without needing to shift anything', async () => {
    const existingBlocks: FakeBlock[] = [{ id: 'about-id', type: 'about', order: 1 }];
    const { client, updates, inserted } = fakeSupabase(existingBlocks);
    await addSectionTool({ supabase: client, businessId: 'biz-1', locale: 'tr' })
      .execute({ ...SECTION_ARGS, insertAfterType: 'about' }, { toolCallId: 't2', messages: [] });

    expect(updates).toEqual([]);
    expect(inserted[0].order).toBe(2);
  });
});

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
