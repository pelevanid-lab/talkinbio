import { createHash } from 'crypto';
import { getLocalizedValue } from '@/config/blockTypes';

export type SemanticEntry = {
  id: string; // Unique hash or combined id
  businessId: string;
  locale: 'tr' | 'en' | 'ru';
  sourceType: 'block' | 'block_item' | 'faq' | 'contact' | 'knowledge';
  sourceId: string;
  sourceItemId?: string;
  intent?: 'learn' | 'book' | 'buy' | 'contact' | 'ask_price' | 'ask_information' | 'view_work' | 'faq';
  searchText: string;
  answer?: string;
  action: {
    type: string;
    blockId?: string;
    itemId?: string;
  };
  behavior?: 'always_available' | 'answer_when_asked' | 'routing_only';
  embedding?: number[];
  search_text_hash?: string;
};

export function computeHash(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

// System templates to enrich the semantic context based on component type and locale
const INTENT_DESCRIPTIONS: Record<string, Record<'tr' | 'en' | 'ru', string>> = {
  about: {
    tr: 'hakkında, özgeçmiş, kimdir, hikaye, biyografi, vizyon, misyon ve detaylı bilgi edinmek',
    en: 'about, biography, background, story, vision, mission, who is, who are, and more details',
    ru: 'обо мне, о нас, биография, история, видение, миссия, кто это, подробная информация'
  },
  services: {
    tr: 'hizmet detayları, seanslar, masaj yaptırmak, terapi almak, uygulama, bakım ve profesyonel hizmetler',
    en: 'service details, sessions, getting massage, therapies, treatments, professional services',
    ru: 'детали услуг, сеансы, массаж, терапия, процедуры, профессиональные услуги'
  },
  hours: {
    tr: 'çalışma saatleri, ne zaman açık, kapalı saatler, açılış kapanış zamanı, mesai saatleri',
    en: 'working hours, opening hours, schedule, closing time, when open, when closed',
    ru: 'часы работы, время работы, когда открыто, график, расписание, когда закрыто'
  },
  gallery: {
    tr: 'galeri, çalışmalar, portfolyo, fotoğraflar, resimler, görsel referanslar ve tasarımlar',
    en: 'gallery, portfolio, photos, pictures, work examples, visual references, designs',
    ru: 'галерея, портфолио, фотографии, работы, примеры работ, визуальные примеры'
  },
  testimonials: {
    tr: 'müşteri yorumları, danışan geri bildirimleri, referanslar, değerlendirmeler, tavsiyeler',
    en: 'customer reviews, client testimonials, feedback, references, ratings, recommendations',
    ru: 'отзывы клиентов, отзывы, обратная связь, рекомендации, оценки'
  },
  faq: {
    tr: 'sıkça sorulan sorular, sss, merak edilen konular, genel sorular ve cevapları',
    en: 'frequently asked questions, faq, general questions and answers, help guide',
    ru: 'часто задаваемые вопросы, чаво, общие вопросы и ответы, справочник'
  },
  appointments: {
    tr: 'randevu almak, rezervasyon yapmak, tarih ve saat seçmek, seans randevusu oluşturmak',
    en: 'book an appointment, make a reservation, choose a date and time, scheduler',
    ru: 'записаться на сеанс, забронировать время, выбрать дату и время, запись'
  }
};

/**
 * Compiles a localized search text and returns a full SemanticEntry for a given element.
 * Restricts indexing of internal_only records and keeps answer text brief in searchText to prevent noise.
 */
export function compileSemanticEntry(params: {
  businessId: string;
  locale: 'tr' | 'en' | 'ru';
  sourceType: 'block' | 'block_item' | 'faq' | 'contact' | 'knowledge';
  sourceId: string;
  sourceItemId?: string;
  title: string;
  question?: string;
  description?: string;
  triggers?: string[];
  answer?: string;
  action: { type: string; blockId?: string; itemId?: string };
  behavior?: 'always_available' | 'answer_when_asked' | 'routing_only' | 'internal_only';
  blockType?: string;
}): SemanticEntry | null {
  const {
    businessId,
    locale,
    sourceType,
    sourceId,
    sourceItemId,
    title,
    question,
    description,
    triggers = [],
    answer,
    action,
    behavior = 'always_available',
    blockType
  } = params;

  // 1. Skip completely if behavior is internal_only — should NEVER go into public semantic index
  if (behavior === 'internal_only') {
    return null;
  }

  // 2. Build descriptive retrieval text (SearchText)
  const parts: string[] = [];

  // Add primary labels
  if (title) parts.push(title);
  if (question) parts.push(question);
  if (description) parts.push(description);

  // Add triggers / alternative questions
  if (triggers && triggers.length > 0) {
    parts.push(triggers.join(', '));
  }

  // Add contextual template based on block type
  const activeType = blockType || action.blockId || '';
  if (activeType && INTENT_DESCRIPTIONS[activeType]?.[locale]) {
    parts.push(INTENT_DESCRIPTIONS[activeType][locale]);
  }

  // Add intent hints
  let intent: SemanticEntry['intent'] = 'ask_information';
  const textLower = `${title} ${question || ''} ${description || ''} ${triggers.join(' ')}`.toLowerCase();

  // Map intents deterministically based on metadata and terminology
  if (activeType === 'appointments' || textLower.includes('randevu') || textLower.includes('rezervasyon') || textLower.includes('seans')) {
    intent = 'book';
  } else if (textLower.includes('egitim') || textLower.includes('kurs') || textLower.includes('ogren') || textLower.includes('ders')) {
    intent = 'learn';
  } else if (activeType === 'pricing' || textLower.includes('fiyat') || textLower.includes('ucret') || textLower.includes('odeme') || textLower.includes('paket')) {
    intent = 'ask_price';
  } else if (sourceType === 'contact' || activeType === 'contact' || textLower.includes('iletisim') || textLower.includes('whatsapp') || textLower.includes('telefon') || textLower.includes('eposta')) {
    intent = 'contact';
  } else if (textLower.includes('satin al') || textLower.includes('siparis') || textLower.includes('odeme yap')) {
    intent = 'buy';
  } else if (sourceType === 'faq' || activeType === 'faq') {
    intent = 'faq';
  } else if (activeType === 'gallery') {
    intent = 'view_work';
  }

  // Answer should not be fully added if it is long, to prevent fuzzy matching dilution.
  // Add a very small contextual summary if present.
  if (answer && answer.trim()) {
    const cleanAnswer = answer.replace(/<[^>]*>/g, '').trim();
    if (cleanAnswer.length > 0) {
      parts.push(cleanAnswer.substring(0, 80));
    }
  }

  const searchText = parts
    .filter(Boolean)
    .join('. ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!searchText) return null;

  const entryId = `${sourceType}:${sourceId}${sourceItemId ? `:${sourceItemId}` : ''}:${locale}`;

  return {
    id: entryId,
    businessId,
    locale,
    sourceType,
    sourceId,
    sourceItemId,
    intent,
    searchText,
    answer,
    action,
    behavior,
    search_text_hash: computeHash(searchText)
  };
}

/**
 * Compiles all active published elements of a page into SemanticEntry records.
 */
export function compilePageSemanticEntries(business: any, blocks: any[], knowledge: any[]): SemanticEntry[] {
  const entries: SemanticEntry[] = [];
  const activeLocales = business.active_locales || ['tr'];

  for (const locale of activeLocales as ('tr' | 'en' | 'ru')[]) {
    // 1. Process standard blocks
    for (const block of blocks) {
      if (!block.is_visible) continue;
      if (block.type === 'settings' || block.type === 'published_snapshot' || block.type === 'published_semantic_index') continue;

      // Block content is locale-nested as content[locale].title / content[locale].intro (or
      // .text for about/contact/custom) — NOT content.title[locale]. getLocalizedValue handles
      // both shapes (plus flat-string legacy data), so reuse it here instead of guessing the
      // nesting by hand, which previously read the wrong key and silently produced an empty
      // blockTitle/description for every block (see block_item fix below for the same class of bug).
      const blockTitle = getLocalizedValue(block.content, locale, 'title') || block.title || '';
      const blockDescription =
        getLocalizedValue(block.content, locale, 'intro') ||
        getLocalizedValue(block.content, locale, 'text') ||
        getLocalizedValue(block.content, locale, 'description') ||
        '';

      // Block-level entry (General navigation fallback)
      const blockEntry = compileSemanticEntry({
        businessId: business.id,
        locale,
        sourceType: 'block',
        sourceId: block.id,
        title: blockTitle,
        description: blockDescription,
        action: { type: 'open_block', blockId: block.type },
        blockType: block.type
      });
      if (blockEntry) entries.push(blockEntry);

      // 2. Process sub-items of block (e.g. Services, FAQ items)
      if (block.type === 'faq' && block.content?.items) {
        for (const item of block.content.items) {
          const q = getLocalizedValue(item, locale, 'question');
          const a = getLocalizedValue(item, locale, 'answer');
          const faqEntry = compileSemanticEntry({
            businessId: business.id,
            locale,
            sourceType: 'faq',
            sourceId: block.id,
            sourceItemId: item.id || q,
            title: q,
            question: q,
            answer: a,
            action: { type: 'open_block', blockId: 'faq', itemId: item.id },
            blockType: 'faq'
          });
          if (faqEntry) entries.push(faqEntry);
        }
      }

      // 'extra_services' is a repeatable sibling of 'services' with the identical items shape
      // (item[locale].title / item[locale].description — see BlockEditorModal's shared editor
      // case for both types). It was previously skipped entirely here, so any business with a
      // second services-like block (e.g. "Eğitim" in one, "Danışmanlık" in another) never had
      // that second block's individual items indexed — only the generic block-level entry above.
      if ((block.type === 'services' || block.type === 'extra_services') && block.content?.items) {
        for (const item of block.content.items) {
          const t = getLocalizedValue(item, locale, 'title');
          const d = getLocalizedValue(item, locale, 'description');
          // Items with no real title/description for this locale (e.g. a placeholder row
          // the owner added but only filled in for a different language) would otherwise
          // still get indexed on the generic INTENT_DESCRIPTIONS boilerplate alone —
          // producing several near-identical, content-free entries that outscore genuinely
          // useful ones on lexical/semantic similarity to the boilerplate text and crowd
          // them out of the RAG top-K in semantic-query/route.ts. Skip them; the parent
          // block-level entry already covers this block for retrieval.
          if (!t.trim() && !d.trim()) continue;
          const servEntry = compileSemanticEntry({
            businessId: business.id,
            locale,
            sourceType: 'block_item',
            sourceId: block.id,
            sourceItemId: item.id || t,
            title: t,
            description: d,
            action: { type: 'open_block', blockId: block.type, itemId: item.id },
            blockType: block.type
          });
          if (servEntry) entries.push(servEntry);
        }
      }
    }

    // 3. Process custom Knowledge Base notes (Hidden Q&A)
    for (const entry of knowledge) {
      if (!entry.is_active) continue;
      if (entry.behavior === 'internal_only') continue;

      const locData = entry.localized_data?.[locale] || entry.localized_data?.tr;
      const t = locData?.title || entry.title || '';
      const c = locData?.content || entry.content || '';

      const knowEntry = compileSemanticEntry({
        businessId: business.id,
        locale,
        sourceType: 'knowledge',
        sourceId: entry.id,
        title: t,
        question: t,
        answer: c,
        action: { type: 'render_answer' },
        behavior: entry.behavior || 'always_available'
      });
      if (knowEntry) entries.push(knowEntry);
    }

    // 4. Process Canonical Contacts
    const contactMethods = (business.contact_method || '').split(',').filter(Boolean);
    let contactValues: Record<string, string> = {};
    try {
      contactValues = business.contact_value ? JSON.parse(business.contact_value) : {};
    } catch {
      contactValues = {};
    }

    for (const method of contactMethods) {
      const val = contactValues[method]?.trim();
      if (!val) continue;

      const contactEntry = compileSemanticEntry({
        businessId: business.id,
        locale,
        sourceType: 'contact',
        sourceId: 'canonical_contact',
        sourceItemId: method,
        title: `İletişim ${method}`,
        description: `Bize ulaşmak için ${method} kanalı: ${val}`,
        action: { type: 'open_block', blockId: '__contact__', itemId: method },
        blockType: 'contact'
      });
      if (contactEntry) entries.push(contactEntry);
    }
  }

  return entries;
}
