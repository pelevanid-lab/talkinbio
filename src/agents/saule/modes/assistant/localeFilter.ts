// Faz 2.3 bağlam diyeti: bloklar üç dilde (tr/en/ru) saklanıyor ama Saule'nin tek seferde
// ihtiyacı olan sadece ziyaretçinin dili. Bir nesnenin tr/en/ru alt-alanlarını (ör.
// { tr: {...}, en: {...}, ru: {...}, mediaUrl, items }) tek dile indirger, diğer
// (dile bağlı olmayan) alanları olduğu gibi korur. Üç dilin hepsi yoksa (ör. opsiyonel
// caption) dokunmadan bırakır — kayıp riski token tasarrufundan daha önemli.
const LOCALES = ['tr', 'en', 'ru'] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function pickLocale(value: unknown, locale: string): unknown {
  if (Array.isArray(value)) return value.map((v) => pickLocale(v, locale));
  if (!isPlainObject(value)) return value;

  const hasAllLocales = LOCALES.every((l) => l in value);
  const result: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(value)) {
    if (LOCALES.includes(key as (typeof LOCALES)[number]) && hasAllLocales) continue;
    result[key] = pickLocale(val, locale);
  }

  if (hasAllLocales) {
    const chosen = value[locale] ?? value.tr;
    const chosenFiltered = pickLocale(chosen, locale);
    if (isPlainObject(chosenFiltered)) {
      Object.assign(result, chosenFiltered);
    } else {
      return chosenFiltered;
    }
  }

  return result;
}

export function filterBlocksToLocale<T extends { content: unknown }>(blocks: T[], locale: string): T[] {
  return blocks.map((b) => ({ ...b, content: pickLocale(b.content, locale) }));
}
