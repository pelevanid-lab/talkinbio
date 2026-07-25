import { LOCALE_KEYS, type LocaleKey } from '@/config/localeTitles';

// Shared core for "same content, other languages" synchronisation, used by BOTH the Beiwe
// `syncBlockLanguages` tool (server, agent-driven) and the /api/content/translate endpoint
// (server, editor-driven). Kept dependency-free (only the locale key list) so it can also be
// imported into the client editor for the "which locales changed?" diff.
//
// The golden rule here is that a sync NEVER touches non-text fields: an item's price, image URL,
// author name, working-hours schedule, layoutVariant, background image — all of that is preserved
// verbatim. We only ever write localized text into the requested target locales, matching list
// items by their position (index). That is why this is a structural merge in code and not a
// "model reproduces the whole block" call: the model only supplies translated strings.

// Block types that carry per-locale text worth syncing. `links` is intentionally absent — its
// items are just {label, url}, neither of which is a translatable per-locale field.
export type SyncableBlockType = 'about' | 'custom' | 'services' | 'extra_services' | 'gallery' | 'testimonials' | 'faq' | 'hours';

export const SYNCABLE_TYPES: SyncableBlockType[] = ['about', 'custom', 'services', 'extra_services', 'gallery', 'testimonials', 'faq', 'hours'];

export function isSyncableType(type: unknown): type is SyncableBlockType {
  return typeof type === 'string' && (SYNCABLE_TYPES as string[]).includes(type);
}

// The translatable text of a single list item, as a flat per-locale bag. Only the fields relevant
// to the block type are ever populated (services→title/description, gallery→caption,
// testimonials→quote/role, faq→question/answer).
export type ItemLocaleText = {
  title?: string;
  description?: string;
  caption?: string;
  quote?: string;
  role?: string;
  question?: string;
  answer?: string;
};

// The translatable text of a whole block, for ONE locale.
export type BlockLocaleText = {
  title?: string;            // section title (all types)
  text?: string;             // body text (about/custom only)
  items?: ItemLocaleText[];  // list items, index-matched to content.items
};

type AnyContent = Record<string, unknown> & { items?: unknown[] };

const ITEM_TYPES: SyncableBlockType[] = ['services', 'extra_services', 'gallery', 'testimonials', 'faq'];

function asObject(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? { ...(v as Record<string, unknown>) } : {};
}

function extractItem(type: SyncableBlockType, item: Record<string, unknown>, loc: LocaleKey): ItemLocaleText {
  switch (type) {
    case 'services':
    case 'extra_services': {
      const l = asObject(item[loc]);
      return { title: l.title as string | undefined, description: l.description as string | undefined };
    }
    case 'gallery':
      return { caption: asObject(item.caption)[loc] as string | undefined };
    case 'testimonials':
      return { quote: asObject(item.quote)[loc] as string | undefined, role: asObject(item.role)[loc] as string | undefined };
    case 'faq':
      return { question: asObject(item.question)[loc] as string | undefined, answer: asObject(item.answer)[loc] as string | undefined };
    default:
      return {};
  }
}

/**
 * Pulls the translatable text of `content` for a single locale into a flat, comparable shape.
 * Used to (a) build the translation prompt from the source locale and (b) diff two contents in the
 * editor to detect which locales the owner actually changed.
 */
export function extractLocaleText(type: SyncableBlockType, content: unknown, loc: LocaleKey): BlockLocaleText {
  const c = asObject(content) as AnyContent;
  const out: BlockLocaleText = {};

  const title = asObject(c[loc]).title;
  if (typeof title === 'string') out.title = title;

  if (type === 'about' || type === 'custom') {
    const text = asObject(c[loc]).text;
    if (typeof text === 'string') out.text = text;
  }

  if (ITEM_TYPES.includes(type)) {
    const items = Array.isArray(c.items) ? c.items : [];
    out.items = items.map((it) => extractItem(type, asObject(it), loc));
  }

  return out;
}

function mergeItem(type: SyncableBlockType, item: Record<string, unknown>, loc: LocaleKey, payload: ItemLocaleText): void {
  switch (type) {
    case 'services':
    case 'extra_services': {
      const l = asObject(item[loc]);
      if (payload.title !== undefined) l.title = payload.title;
      if (payload.description !== undefined) l.description = payload.description;
      item[loc] = l;
      break;
    }
    case 'gallery': {
      if (payload.caption !== undefined) {
        const cap = asObject(item.caption);
        cap[loc] = payload.caption;
        item.caption = cap;
      }
      break;
    }
    case 'testimonials': {
      if (payload.quote !== undefined) {
        const q = asObject(item.quote); q[loc] = payload.quote; item.quote = q;
      }
      if (payload.role !== undefined) {
        const r = asObject(item.role); r[loc] = payload.role; item.role = r;
      }
      break;
    }
    case 'faq': {
      if (payload.question !== undefined) {
        const q = asObject(item.question); q[loc] = payload.question; item.question = q;
      }
      if (payload.answer !== undefined) {
        const a = asObject(item.answer); a[loc] = payload.answer; item.answer = a;
      }
      break;
    }
  }
}

/**
 * Returns a NEW content object with the given per-locale translations written in place. Non-text
 * fields (price, image URLs, author, schedule, layoutVariant, …) and any locale not present in
 * `translationsByLocale` are left exactly as they were. List items are matched by index; a
 * translation for an index that no longer exists is simply ignored.
 */
export function mergeLocaleTranslations(
  type: SyncableBlockType,
  content: unknown,
  translationsByLocale: Partial<Record<LocaleKey, BlockLocaleText>>,
): AnyContent {
  // Plain-JSON deep clone: block content is always JSON, and this drops any stray `undefined`.
  const next = JSON.parse(JSON.stringify(asObject(content))) as AnyContent;

  for (const loc of LOCALE_KEYS) {
    const payload = translationsByLocale[loc];
    if (!payload) continue;

    if (payload.title !== undefined) {
      next[loc] = { ...asObject(next[loc]), title: payload.title };
    }
    if ((type === 'about' || type === 'custom') && payload.text !== undefined) {
      next[loc] = { ...asObject(next[loc]), text: payload.text };
    }
    if (payload.items && Array.isArray(next.items)) {
      payload.items.forEach((ip, i) => {
        const target = next.items?.[i];
        if (target && typeof target === 'object') {
          mergeItem(type, target as Record<string, unknown>, loc, ip);
        }
      });
    }
  }

  return next;
}

const LOCALE_LABELS: Record<LocaleKey, string> = { tr: 'Türkçe', en: 'İngilizce (English)', ru: 'Rusça (Русский)' };

/**
 * Builds the single-shot translation prompt: given the source locale's extracted text, ask the
 * model to return the SAME structure translated into each target locale, keyed by locale code.
 * The output contract mirrors BlockLocaleText so mergeLocaleTranslations can consume it directly.
 */
export function buildTranslatePrompt({
  type, sourceLocale, targetLocales, source,
}: {
  type: SyncableBlockType;
  sourceLocale: LocaleKey;
  targetLocales: LocaleKey[];
  source: BlockLocaleText;
}): { system: string; prompt: string } {
  const targetList = targetLocales.map((l) => `"${l}" (${LOCALE_LABELS[l]})`).join(', ');

  const system = `Sen bir profesyonel çevirmensin. Sana bir web profili bölümünün ${LOCALE_LABELS[sourceLocale]} dilindeki metinleri JSON olarak veriliyor. Görevin bu metinleri şu hedef dillere çevirmek: ${targetList}.

Kurallar:
- Anlamı ve tonu koru; birebir kelime çevirisi değil, o dilde doğal okunan bir çeviri yap.
- Marka adları, kişi isimleri, ölçü/fiyat birimleri ve URL'leri OLDUĞU GİBİ bırak.
- Kaynak JSON'daki alan yapısını AYNEN koru: "title", "text" ve "items" dizisini, dizideki eleman SAYISINI ve SIRASINI değiştirme. Her item için yalnızca kaynakta dolu olan alanları çevir.
- Kaynakta olmayan bir alan uydurma; boş/olmayan alanları çıktına ekleme.

SADECE aşağıdaki şemaya uyan geçerli bir JSON nesnesi döndür, başka hiçbir açıklama veya metin ekleme. Üst seviye anahtarlar hedef dil kodlarıdır:
{${targetLocales.map((l) => `"${l}": { /* kaynakla aynı şekil */ }`).join(', ')}}`;

  const prompt = `Bölüm tipi: ${type}
Kaynak dil: ${sourceLocale}
Çevrilecek kaynak metinler (JSON):
${JSON.stringify(source)}`;

  return { system, prompt };
}
