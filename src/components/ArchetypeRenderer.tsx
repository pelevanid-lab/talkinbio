'use client';

import { DEFAULT_THEME, Theme, resolveAccentFill, resolveThemeColors } from '@/config/archetypes';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Mail, MessageCircle, Link as LinkIcon, AtSign, ChevronLeft, ChevronRight, Ellipsis, Loader2, Menu, Send, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import { useLocale } from 'next-intl';
import { renderColoredSegments, toColorMarkdown, colorLinkComponents, stripColorSyntax, styleUrlTransform } from '@/utils/coloredText';
import { defaultTitleFor, getHoursLabels, type DayKey } from '@/config/localeTitles';
import { isVideoUrl } from '@/utils/mediaType';
import { iconForLinkUrl } from '@/utils/linkIcon';
import { hasRealContentForLocale, isItemVisibleInLocale, getLocalizedValue } from '@/config/blockTypes';
import { SauleIcon } from './AgentIcons';
import { stableItemId } from '@/utils/pageActionTargets';
import { supabaseThumbnailUrl } from '@/utils/imageTransform';
import { useOptionalPublicPageRuntime } from './PublicPageRuntime';
import LanguageSwitcher from './LanguageSwitcher';
import { resolveInteractiveEntryTargets, type ConversionFlowSettings, type InteractiveEntrySettings, type PublicPageType } from '@/utils/interactiveEntry';
import { resolveShortcuts, type Shortcut } from '@/utils/shortcuts';

type RenderCtx = {
  locale: string;
  radiusClass: string;
  headingFont: string;
  theme: Theme;
  // true when theme.layoutStyle === 'card-heavy' — consumed by renderers whose default look
  // (about-standard, contact/custom text) has no card chrome of its own. Renderers that already
  // wrap their items in cards/chips (services, gallery, testimonials, hours, faq, links) ignore it.
  cardWrap: boolean;
  // Click handler for "Order Now" buttons (see buildOrderNowHandler), or null when the
  // configured behavior has no usable target — renderServices hides the button in that case.
  onOrderNowClick: ((message: string) => void) | null;
  businessName: string;
  // business.category_id (config/wizardCategories.ts) — drives the "Order Now" button's wording
  // (orderNowLabel). null/undefined falls back to the neutral default label.
  categoryId?: string | null;
  activeItemId?: string | null;
  // Sıfır sürtünmeli niyet takibi (bkz. PublicPageRuntime.recordEngagementClick) — sayfa
  // sahibi kendi önizlemesindeyken veya PublicPageRuntimeProvider yokken (editör mockup'ı)
  // no-op'a düşer.
  onEngagementClick: (eventType: 'contact_click' | 'order_click', channel?: string | null) => void;
};

// Static Tailwind class lookups (never string-interpolated — Tailwind needs literal class names to compile them).
const SECTION_GAP_CLASS: Record<string, string> = {
  compact: 'gap-6',
  spacious: 'gap-16',
  'card-heavy': 'gap-8',
  flat: 'gap-10',
};

// Each block type is rendered by a small, self-contained function registered below.
// New block types should only need to add a function + a registry entry here —
// an unregistered type logs a dev warning instead of silently disappearing (see BLOCK_RENDERERS usage below).
const CONTACT_METHOD_LABELS: Record<string, Record<string, string>> = {
  whatsapp: { tr: 'Telefon & WhatsApp', en: 'Phone & WhatsApp', ru: 'Телефон и WhatsApp' },
  instagram: { tr: 'Instagram', en: 'Instagram', ru: 'Instagram' },
  email: { tr: 'E-posta', en: 'Email', ru: 'Email' },
  telegram: { tr: 'Telegram', en: 'Telegram', ru: 'Telegram' },
};

// "Order Now" button next to a service's price (renderServices) — label and the message it
// hands to Saule when the configured behavior is 'saule' (see buildOrderNowHandler below).
// Wording follows the business's wizard category (config/wizardCategories.ts) rather than one
// fixed label for everyone — "Sipariş Ver" (Order Now) reads like an e-commerce checkout and
// felt wrong on an appointment-based services page (masaj/diyetisyen/kuaför, category 'hizmet').
// Falls back to a neutral label for categories with no specific mapping.
const ORDER_NOW_LABEL_BY_CATEGORY: Record<string, Record<string, string>> = {
  hizmet: { tr: 'Randevu Al', en: 'Book Now', ru: 'Записаться' },
  urun: { tr: 'Sipariş Ver', en: 'Order Now', ru: 'Заказать' },
};
const ORDER_NOW_LABEL_DEFAULT: Record<string, string> = { tr: 'Bilgi Al', en: 'Get Info', ru: 'Узнать больше' };
function orderNowLabel(categoryId: string | null | undefined, locale: string): string {
  const map = (categoryId && ORDER_NOW_LABEL_BY_CATEGORY[categoryId]) || ORDER_NOW_LABEL_DEFAULT;
  return map[locale] || map.tr;
}
function orderNowMessage(itemTitle: string, locale: string): string {
  if (locale === 'en') return `I'd like to order: ${itemTitle}`;
  if (locale === 'ru') return `Я хочу заказать: ${itemTitle}`;
  return `${itemTitle} hizmetini sipariş etmek istiyorum`;
}

// Falls back to the locale's fixed section label (shared with Beiwe's tools and the editor
// modal) for rows saved before per-locale titles were stored in content, or after a locale's
// title was cleared in the editor to reset it.
function blockTitleOf(block: any, locale: string) {
  return block.content?.[locale]?.title || defaultTitleFor(block.type, locale) || block.title || block.type;
}

// Optional short paragraph shown between a block's title and its item list — currently used by
// services/extra_services to let an owner explain the category (e.g. "Masaj" with sub-services
// listed as items below it) before the list starts. Per-locale like title; empty means no render.
function blockIntroOf(block: any, locale: string): string {
  return block.content?.[locale]?.intro || '';
}

function blockEyebrow(block: any, locale: string): string {
  const labels: Record<string, Record<string, string>> = {
    about: { tr: 'Tanıtım', en: 'Intro', ru: 'Обзор' },
    services: { tr: 'Hizmet', en: 'Service', ru: 'Услуги' },
    extra_services: { tr: 'Hizmet', en: 'Service', ru: 'Услуги' },
    pricing: { tr: 'Paket', en: 'Offer', ru: 'Пакет' },
    hours: { tr: 'Saatler', en: 'Hours', ru: 'Часы' },
    faq: { tr: 'Yanıt', en: 'Answer', ru: 'Ответ' },
    gallery: { tr: 'Görsel', en: 'Visual', ru: 'Визуал' },
    testimonials: { tr: 'Referans', en: 'Proof', ru: 'Отзывы' },
    links: { tr: 'Bağlantı', en: 'Link', ru: 'Ссылка' },
    contact: { tr: 'İletişim', en: 'Contact', ru: 'Контакт' },
    custom: { tr: 'Sayfa', en: 'Page', ru: 'Страница' },
  };
  return labels[block.type]?.[locale] || block.type;
}

function blockPreviewMedia(block: any): string | null {
  if (block.content?.mediaUrl) return block.content.mediaUrl;
  if (block.content?.backgroundImage) return block.content.backgroundImage;
  if (!Array.isArray(block.content?.items)) return null;
  const mediaItem = block.content.items.find((item: any) => item?.mediaUrl || (block.type === 'gallery' && item?.url));
  return mediaItem?.mediaUrl || mediaItem?.url || null;
}

type EntryAction = {
  blockId: string;
  itemId?: string | null;
  label: string;
  eyebrow: string;
  mediaUrl?: string | null;
};

type EntryStage = 'discover' | 'profile' | 'book' | 'ask';
type EntryChatMessage = { role: 'user' | 'assistant'; content: string };
type ConversionQuestion = {
  id: string;
  label: string;
  answer: string;
  next?: ConversionQuestion[];
};
type ConversionAnswerState = {
  question: ConversionQuestion;
  previous: ConversionAnswerState | null;
};

function conversionAnswerDepth(state: ConversionAnswerState | null): number {
  let depth = 0;
  let current = state;
  while (current) {
    depth += 1;
    current = current.previous;
  }
  return depth;
}

const ENTRY_COPY: Record<string, Record<string, string>> = {
  openProfile: { tr: 'Profili A\u00e7', en: 'Open Profile', ru: '\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043f\u0440\u043e\u0444\u0438\u043b\u044c' },
  choosePath: { tr: 'Ke\u015ffet.', en: 'Discover.', ru: '\u0418\u0441\u0441\u043b\u0435\u0434\u0443\u0439\u0442\u0435.' },
  bookNow: { tr: 'Randevu Al.', en: 'Book Now.', ru: '\u0417\u0430\u043f\u0438\u0441\u0430\u0442\u044c\u0441\u044f.' },
  askQuestions: { tr: 'Sorular\u0131n\u0131z\u0131 Sorabilirsiniz', en: 'You Can Ask Your Questions', ru: '\u0412\u044b \u043c\u043e\u0436\u0435\u0442\u0435 \u0437\u0430\u0434\u0430\u0442\u044c \u0441\u0432\u043e\u0438 \u0432\u043e\u043f\u0440\u043e\u0441\u044b' },
  questionPlaceholder: { tr: 'Sorunuzu yaz\u0131n...', en: 'Write your question...', ru: '\u041d\u0430\u043f\u0438\u0448\u0438\u0442\u0435 \u0441\u0432\u043e\u0439 \u0432\u043e\u043f\u0440\u043e\u0441...' },
  questionError: { tr: '\u015eu anda yan\u0131t veremiyorum. L\u00fctfen tekrar deneyin.', en: 'I cannot answer right now. Please try again.', ru: '\u0421\u0435\u0439\u0447\u0430\u0441 \u044f \u043d\u0435 \u043c\u043e\u0433\u0443 \u043e\u0442\u0432\u0435\u0442\u0438\u0442\u044c. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0435 \u0440\u0430\u0437.' },
  interactive: { tr: '', en: '', ru: '' },
  otherPaths: { tr: 'Ba\u015fka bir yol se\u00e7', en: 'Choose another path', ru: '\u0412\u044b\u0431\u0440\u0430\u0442\u044c \u0434\u0440\u0443\u0433\u043e\u0439 \u043f\u0443\u0442\u044c' },
};

function entryCopy(key: keyof typeof ENTRY_COPY, locale: string): string {
  return ENTRY_COPY[key]?.[locale] || ENTRY_COPY[key]?.en || '';
}

function compactText(value: string, maxLength = 340): string {
  const text = value.replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  const slice = text.slice(0, maxLength);
  const lastSpace = slice.lastIndexOf(' ');
  return `${slice.slice(0, lastSpace > 220 ? lastSpace : maxLength).trim()}...`;
}

function blockSummaryForQuestion(block: any, locale: string): string {
  const items = getLocalizedItems(block, locale);
  const firstItem = items[0];
  const localized = block.content?.[locale] || block.content || {};
  const text = firstItem?.description || firstItem?.answer || firstItem?.quote || localized.text || localized.description || localized.intro || '';
  return compactText(typeof text === 'string' ? text : '');
}

function isTrainingLikeBlock(block: any, locale: string): boolean {
  const title = stripColorSyntax(blockTitleOf(block, locale)).toLocaleLowerCase('tr-TR');
  return /egitim|e\u011fitim|training|kurs|course|format/.test(title);
}

function savedConversionQuestionsForBlock(
  block: any,
  locale: string,
  conversionFlowSettings?: ConversionFlowSettings | null
): ConversionQuestion[] | null {
  const node = conversionFlowSettings?.nodes?.[block.id];
  const localized = node?.locales?.[locale as 'tr' | 'en' | 'ru']?.questions;
  const fallback = node?.questions;
  const questions = Array.isArray(localized) && localized.length > 0 ? localized : fallback;
  if (!Array.isArray(questions) || questions.length === 0) return null;
  return questions
    .filter((question: any) => question?.id && question?.label && question?.answer)
    .map((question: any) => ({
      id: String(question.id),
      label: String(question.label),
      answer: String(question.answer),
      next: Array.isArray(question.next)
        ? question.next
            .filter((next: any) => next?.id && next?.label && next?.answer)
            .map((next: any) => ({
              id: String(next.id),
              label: String(next.label),
              answer: String(next.answer),
            }))
        : undefined,
    }));
}

function conversionQuestionsForBlock(
  block: any,
  locale: string,
  conversionFlowSettings?: ConversionFlowSettings | null
): ConversionQuestion[] {
  if (block?.type === 'contact' || block?.type === 'faq') return [];
  const savedQuestions = savedConversionQuestionsForBlock(block, locale, conversionFlowSettings);
  if (savedQuestions) return savedQuestions.slice(0, 2).map((question) => ({ ...question, next: question.next?.slice(0, 1) }));

  const title = blockTitleOf(block, locale);
  const summary = blockSummaryForQuestion(block, locale);
  const hasTrainingTone = isTrainingLikeBlock(block, locale);

  if (hasTrainingTone) {
    if (locale === 'en') {
      return [
        {
          id: 'training-suitability',
          label: 'Is this training right for me?',
          answer: 'This training can be adapted for both beginners and experienced professionals. The most important distinction is your goal: personal learning, professional development, or building a service system.',
          next: [
            { id: 'training-beginner', label: 'Can I join with no experience?', answer: 'Yes. The flow can start from foundational anatomy, touch principles, and safe practice before moving into advanced techniques.' },
            { id: 'training-personal', label: 'Can I learn only for myself?', answer: 'Yes. If your goal is personal use, the focus can stay on practical, safe, repeatable techniques rather than client workflow.' },
            { id: 'training-program', label: 'What is in the program?', answer: summary || 'The program covers face and neck-shoulder massage, drainage, myofascial techniques, buccal massage, anatomy, indications, contraindications, and working ergonomics.' },
          ],
        },
        { id: 'training-duration', label: 'How long does the training take?', answer: 'The exact duration depends on the selected format and your starting level. The best next step is to clarify the goal and choose the right training structure.', next: [
          { id: 'training-format', label: 'Which format fits me?', answer: 'For fast personal learning, a focused individual format works well. For professional use, a broader practical program is more suitable.' },
          { id: 'training-practice', label: 'Is there hands-on practice?', answer: 'Yes. The training is designed around practice, body mechanics, model work, and repeatable technique.' },
          { id: 'training-booking', label: 'How do I book?', answer: 'You can request an appointment from the contact step and share the training goal before scheduling.' },
        ] },
        { id: 'training-booking', label: 'How can I book?', answer: 'You can move to contact and share that you are interested in the training. The conversation should include your level, goal, and preferred date range.', next: [
          { id: 'training-whatsapp', label: 'Can I write on WhatsApp?', answer: 'Yes. WhatsApp is the fastest way to share your goal and ask for suitable dates.' },
          { id: 'training-price', label: 'What is the price?', answer: 'If a price is listed in this profile, use that as the current reference. For custom formats, confirm the final offer during contact.' },
          { id: 'training-before', label: 'What should I say first?', answer: 'Briefly say whether you want the training for yourself or professionally, and whether you have previous experience.' },
        ] },
      ];
    }

    return [
      {
        id: 'training-suitability',
        label: 'Bu e\u011fitim bana uygun mu?',
        answer: 'Bu e\u011fitim hem yeni ba\u015flayanlara hem de deneyimli profesyonellere uyarlanabilir. As\u0131l ayr\u0131m hedefinizde: kendiniz i\u00e7in \u00f6\u011frenmek, profesyonel geli\u015fim veya hizmet sistemi kurmak.',
        next: [
          { id: 'training-beginner', label: 'Hi\u00e7 deneyimim yok, kat\u0131labilir miyim?', answer: 'Evet. Ak\u0131\u015f temel anatomi, g\u00fcvenli dokunu\u015f prensipleri ve pratik uygulamayla ba\u015flat\u0131labilir; sonra ileri tekniklere ge\u00e7ilir.' },
          { id: 'training-personal', label: 'Sadece kendim i\u00e7in \u00f6\u011frenebilir miyim?', answer: 'Evet. Hedef ki\u015fisel kullan\u0131msa odak, dan\u0131\u015fan ak\u0131\u015f\u0131ndan \u00e7ok g\u00fcvenli, pratik ve tekrar edilebilir tekniklerde kalabilir.' },
          { id: 'training-program', label: 'Programda neler var?', answer: summary || 'Programda y\u00fcz ve boyun-omuz masaj\u0131, lenfatik drenaj, miyofasyal teknikler, bukkal masaj, anatomi, endikasyonlar, kontrendikasyonlar ve ergonomi ba\u015fl\u0131klar\u0131 yer al\u0131r.' },
        ],
      },
      {
        id: 'training-duration',
        label: 'E\u011fitim ne kadar s\u00fcr\u00fcyor?',
        answer: 'S\u00fcre se\u00e7ilen formata ve ba\u015flang\u0131\u00e7 seviyenize g\u00f6re netle\u015fir. Do\u011fru format i\u00e7in \u00f6nce hedefinizi ve mevcut deneyiminizi konu\u015fmak gerekir.',
        next: [
          { id: 'training-format', label: 'Hangi format bana uyar?', answer: 'K\u0131sa ve ki\u015fisel bir hedef i\u00e7in bireysel odakl\u0131 format uygundur. Profesyonel kullan\u0131mda daha geni\u015f pratik program daha do\u011fru olur.' },
          { id: 'training-practice', label: 'Uygulama prati\u011fi var m\u0131?', answer: 'Evet. E\u011fitim pratik uygulama, el pozisyonu, model \u00fczerinde \u00e7al\u0131\u015fma ve ergonomi \u00fczerine kurulur.' },
          { id: 'training-booking', label: 'Nas\u0131l randevu alabilirim?', answer: 'Randevu i\u00e7in ileti\u015fim ad\u0131m\u0131na ge\u00e7ip e\u011fitim hedefinizi ve uygun tarih aral\u0131\u011f\u0131n\u0131z\u0131 payla\u015fabilirsiniz.' },
        ],
      },
      {
        id: 'training-booking',
        label: 'Nas\u0131l randevu alabilirim?',
        answer: 'Randevu almak i\u00e7in ileti\u015fim kanal\u0131ndan e\u011fitimle ilgilendi\u011finizi yazman\u0131z yeterli. Seviyeniz, hedefiniz ve uygun tarih aral\u0131\u011f\u0131 birlikte netle\u015ftirilir.',
        next: [
          { id: 'training-whatsapp', label: 'WhatsApp\u2019tan yazabilir miyim?', answer: 'Evet. WhatsApp, hedefinizi anlatmak ve uygun tarihleri konu\u015fmak i\u00e7in en h\u0131zl\u0131 yoldur.' },
          { id: 'training-price', label: '\u00dccreti nereden g\u00f6r\u00fcr\u00fcm?', answer: 'Profilde fiyat g\u00f6steriliyorsa g\u00fcncel referans odur. Ki\u015fiye \u00f6zel formatlarda son teklif ileti\u015fim s\u0131ras\u0131nda netle\u015fir.' },
          { id: 'training-before', label: '\u0130lk mesajda ne yazmal\u0131y\u0131m?', answer: 'E\u011fitimi kendiniz i\u00e7in mi profesyonel olarak m\u0131 istedi\u011finizi ve daha \u00f6nce deneyiminiz olup olmad\u0131\u011f\u0131n\u0131 yazman\u0131z yeterli.' },
        ],
      },
    ];
  }

  if (locale === 'en') {
    return [
      { id: 'what-is-this', label: `What should I know about ${stripColorSyntax(title)}?`, answer: summary || `This section explains ${stripColorSyntax(title)} in the profile context.` },
      { id: 'who-for', label: 'Who is this for?', answer: summary || 'The best fit depends on the visitor goal and the details shared in this profile section.' },
      { id: 'next-step', label: 'What is the next step?', answer: 'If this looks relevant, ask a specific question or continue with the contact step to confirm availability and details.' },
    ];
  }

  return [
    { id: 'what-is-this', label: `${stripColorSyntax(title)} hakk\u0131nda ne bilmeliyim?`, answer: summary || `Bu b\u00f6l\u00fcm ${stripColorSyntax(title)} hakk\u0131ndaki temel bilgileri \u00f6zetler.` },
    { id: 'who-for', label: 'Bu kimler i\u00e7in uygun?', answer: summary || 'Uygunluk, ziyaret\u00e7inin hedefi ve bu b\u00f6l\u00fcmde payla\u015f\u0131lan detaylara g\u00f6re netle\u015fir.' },
    { id: 'next-step', label: 'Sonraki ad\u0131m ne?', answer: 'Bu i\u00e7erik size uygunsa daha spesifik bir soru sorabilir veya uygunluk ve detaylar i\u00e7in ileti\u015fim ad\u0131m\u0131na ge\u00e7ebilirsiniz.' },
  ];
}

function collectEntryActions(visibleBlocks: any[], locale: string, configuredBlockIds: string[] = []): EntryAction[] {
  const out: EntryAction[] = [];
  const pushBlock = (block: any | undefined) => {
    if (!block || block.type === 'contact' || out.some((action) => action.blockId === block.id)) return;
    out.push({
      blockId: block.id,
      itemId: null,
      label: blockTitleOf(block, locale),
      eyebrow: blockEyebrow(block, locale),
      mediaUrl: blockPreviewMedia(block),
    });
  };

  for (const blockId of configuredBlockIds) pushBlock(visibleBlocks.find((block) => block.id === blockId));

  for (const block of visibleBlocks) {
    if (block.type === 'about' || block.type === 'faq' || block.type === 'contact') continue;
    pushBlock(block);
    if (out.length >= 3) return out;
  }

  for (const block of visibleBlocks) {
    pushBlock(block);
    if (out.length >= 3) return out;
  }
  return out;
}

function collectSelectedEntryActions(visibleBlocks: any[], selectedBlock: any, baseActions: EntryAction[], locale: string): EntryAction[] {
  const out: EntryAction[] = [];
  const pushBlock = (block: any | undefined) => {
    if (!block || out.some((action) => action.blockId === block.id)) return;
    out.push({
      blockId: block.id,
      itemId: null,
      label: blockTitleOf(block, locale),
      eyebrow: blockEyebrow(block, locale),
      mediaUrl: blockPreviewMedia(block),
    });
  };

  pushBlock(visibleBlocks.find((block) => block.type === 'contact'));
  pushBlock(visibleBlocks.find((block) => block.type === 'faq'));

  const related = baseActions.find((action) => action.blockId !== selectedBlock.id);
  if (related && !out.some((action) => action.blockId === related.blockId && action.itemId === related.itemId)) {
    out.push(related);
  }

  for (const action of baseActions) {
    if (out.length >= 3) break;
    if (action.blockId === selectedBlock.id) continue;
    if (out.some((item) => item.blockId === action.blockId && item.itemId === action.itemId)) continue;
    out.push(action);
  }

  return out.slice(0, 3);
}

function firstAboutBlock(visibleBlocks: any[]) {
  return visibleBlocks.find((block) => block.type === 'about') || visibleBlocks[0] || null;
}

function actionKey(action: EntryAction) {
  return `${action.blockId}:${action.itemId || ''}`;
}

// Wraps bare content in a surface card when the archetype's layoutStyle calls for it (see RenderCtx.cardWrap).
function withCardWrap(content: React.ReactNode, blockId: string, ctx: RenderCtx) {
  if (!ctx.cardWrap) {
    return <section key={blockId} className="pt-4">{content}</section>;
  }
  return (
    <div key={blockId} className={`border p-6 sm:p-8 ${ctx.radiusClass}`} style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
      {content}
    </div>
  );
}

type BackgroundOverlay = 'dark' | 'light' | 'tint' | 'none';

// Wraps content with an optional background image + overlay (content.backgroundImage / content.backgroundOverlay).
// Falls back to withCardWrap when there's no background image, so callers can use this unconditionally
// regardless of which layoutVariant they ended up rendering.
function withSectionBackground(
  content: React.ReactNode,
  blockId: string,
  ctx: RenderCtx,
  backgroundImage: string | undefined,
  overlay: BackgroundOverlay = 'dark'
) {
  if (!backgroundImage) {
    return withCardWrap(content, blockId, ctx);
  }
  return (
    <div key={blockId} className={`relative overflow-hidden ${ctx.radiusClass} p-6 sm:p-10`}>
      <div className="absolute inset-0 z-0">
        <img src={backgroundImage} alt="" className="w-full h-full object-cover" />
        {overlay === 'dark' && <div className="absolute inset-0 bg-black/60" />}
        {overlay === 'light' && <div className="absolute inset-0 bg-white/70" />}
        {overlay === 'tint' && <div className="absolute inset-0" style={{ backgroundColor: ctx.theme.colors.primary, opacity: 0.55 }} />}
      </div>
      <div className="relative z-10" style={overlay === 'light' ? undefined : { color: '#fff' }}>
        {content}
      </div>
    </div>
  );
}

function renderAbout(block: any, ctx: RenderCtx) {
  const { locale, radiusClass, headingFont } = ctx;
  const blockTitle = blockTitleOf(block, locale);
  const layoutVariant = block.content?.layoutVariant || 'standard';
  const pos = block.content?.mediaPosition || 'middle';
  const aboutText = block.content?.[locale]?.text || block.content?.text || '';
  const mediaUrl = block.content?.mediaUrl;
  // content.items (optional): extra small images for the `image-grid` variant, e.g. [{ url }, { url }, { url }]
  const galleryItems: any[] = block.content?.items || [];

  if (layoutVariant === 'big-statement') {
    return (
      <section key={block.id} className="pt-8 pb-4 text-center max-w-2xl mx-auto">
        <h2 className={`text-5xl sm:text-6xl leading-[1.05] mb-6 font-bold ${headingFont}`} style={{ color: 'var(--text)' }}>
          {renderColoredSegments(blockTitle)}
        </h2>
        <div className="markdown-body opacity-80 text-lg leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkBreaks]} components={colorLinkComponents} urlTransform={styleUrlTransform}>{toColorMarkdown(aboutText)}</ReactMarkdown>
        </div>
      </section>
    );
  }

  if (layoutVariant === 'image-grid') {
    const images = (mediaUrl ? [{ url: mediaUrl }] : []).concat(galleryItems).slice(0, 3);
    return (
      <section key={block.id} className="pt-4">
        <h2 className={`text-3xl mb-6 font-bold ${headingFont}`} style={{ color: 'var(--text)' }}>
          {renderColoredSegments(blockTitle)}
        </h2>
        {images.length > 0 && (
          <div className={`grid ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-3 mb-6`}>
            {images.map((img, idx) => (
              <div
                key={idx}
                className={`overflow-hidden ${radiusClass} ${images.length === 3 && idx === 0 ? 'col-span-2 h-48' : 'h-32'}`}
              >
                <img src={img.url} alt={blockTitle} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}
        <div className="markdown-body opacity-90 text-[15px]">
          <ReactMarkdown remarkPlugins={[remarkBreaks]} components={colorLinkComponents} urlTransform={styleUrlTransform}>{toColorMarkdown(aboutText)}</ReactMarkdown>
        </div>
      </section>
    );
  }

  if (layoutVariant === 'hero-overlay' && mediaUrl) {
    // Fixed height rather than `vh` — this section always renders inside a narrow, already-scrollable
    // column (editor mockup frame or the live page's own scroll area, both with a fixed-height chat
    // dock reserved below), so viewport-height units measure the wrong box and can make the hero
    // balloon far taller than the space actually available.
    return (
      <section key={block.id} className={`relative overflow-hidden ${radiusClass} h-[440px] shadow-xl flex items-end group`}>
        <div className="absolute inset-0 z-0">
          {ctx.businessName?.toLowerCase().includes('talkinbio') ? (
            <div className="w-full h-full flex items-center justify-center bg-slate-900">
              <SauleIcon size={320} className="object-contain" />
            </div>
          ) : isVideoUrl(mediaUrl) ? (
            <video src={mediaUrl} className="w-full h-full object-cover" autoPlay loop muted playsInline />
          ) : (
            <img src={mediaUrl} alt={blockTitle} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
        </div>
        <div className="relative z-10 p-6 sm:p-8 w-full text-white">
          <h2 className={`text-4xl sm:text-5xl mb-4 font-bold ${headingFont}`}>{renderColoredSegments(blockTitle)}</h2>
          <div className="markdown-body opacity-90 text-[15px] sm:text-base text-white/90">
            <ReactMarkdown remarkPlugins={[remarkBreaks]} components={colorLinkComponents} urlTransform={styleUrlTransform}>{toColorMarkdown(aboutText)}</ReactMarkdown>
          </div>
        </div>
      </section>
    );
  }

  if (layoutVariant === 'split-card' && mediaUrl) {
    // Always side-by-side: this renders inside a narrow (max-w-md) column in every real
    // usage (editor mockup + published page), so a `md:` viewport breakpoint never reflects
    // the actual available width — it used to squeeze the image into a sliver whenever the
    // surrounding browser window was wide, regardless of how narrow this column actually was.
    return (
      <section key={block.id} className="pt-4">
        <div className={`flex flex-row overflow-hidden border shadow-md ${radiusClass}`} style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="w-2/5 shrink-0 relative flex items-center justify-center bg-slate-100">
            {ctx.businessName?.toLowerCase().includes('talkinbio') ? (
              <SauleIcon size={160} className="object-contain" />
            ) : isVideoUrl(mediaUrl) ? (
              <video src={mediaUrl} className="w-full h-full object-cover absolute inset-0" autoPlay loop muted playsInline />
            ) : (
              <img src={mediaUrl} alt={blockTitle} className="w-full h-full object-cover absolute inset-0" />
            )}
          </div>
          <div className="w-3/5 p-4 sm:p-6 flex flex-col justify-center">
            <h2 className={`text-xl sm:text-2xl mb-2 font-bold ${headingFont}`} style={{ color: 'var(--text)' }}>
              {renderColoredSegments(blockTitle)}
            </h2>
            <div className="markdown-body opacity-90 text-sm">
              <ReactMarkdown remarkPlugins={[remarkBreaks]} components={colorLinkComponents} urlTransform={styleUrlTransform}>{toColorMarkdown(aboutText)}</ReactMarkdown>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Standard layout
  const isTalkinbio = ctx.businessName?.toLowerCase().includes('talkinbio');
  const MediaElement = mediaUrl || isTalkinbio ? (
    <div className={`overflow-hidden shadow-sm ${radiusClass} ${pos === 'middle' ? 'my-6' : pos === 'top' ? 'mb-6' : 'mt-6'}`}>
      {isTalkinbio ? (
        <SauleIcon size={240} className="w-full max-h-96 object-contain" />
      ) : isVideoUrl(mediaUrl) ? (
        <video src={mediaUrl} className="w-full max-h-96 object-cover" controls />
      ) : (
        <img src={mediaUrl} alt={blockTitle} className="w-full max-h-96 object-cover" />
      )}
    </div>
  ) : null;

  return withSectionBackground(
    <>
      {pos === 'top' && MediaElement}
      <h2 className={`text-3xl mb-6 font-bold ${headingFont}`} style={{ color: 'var(--text)' }}>
        {renderColoredSegments(blockTitle)}
      </h2>
      {pos === 'middle' && MediaElement}
      <div className="markdown-body opacity-90 text-[15px]">
        <ReactMarkdown remarkPlugins={[remarkBreaks]} components={colorLinkComponents} urlTransform={styleUrlTransform}>{toColorMarkdown(aboutText)}</ReactMarkdown>
      </div>
      {pos === 'bottom' && MediaElement}
    </>,
    block.id,
    ctx,
    block.content?.backgroundImage,
    block.content?.backgroundOverlay
  );
}

// Shared by `contact` and `custom` — a simple text section, same content shape/locale reading as `about`'s standard layout.
// `custom` also supports an in-flow mediaUrl/mediaPosition now (BlockEditorModal), same
// before/between/after placement as `about`'s standard layout — it used to only support a
// full-bleed backgroundImage, with no way to put an actual photo next to the text.
function renderTextBlock(block: any, ctx: RenderCtx) {
  const { locale, headingFont, radiusClass } = ctx;
  const blockTitle = blockTitleOf(block, locale);
  const text = block.content?.[locale]?.text || block.content?.text || '';
  if (!text) return null;

  const mediaUrl = block.content?.mediaUrl;
  const pos = block.content?.mediaPosition || 'middle';
  const isTalkinbio = ctx.businessName?.toLowerCase().includes('talkinbio');
  const MediaElement = mediaUrl || isTalkinbio ? (
    <div className={`overflow-hidden shadow-sm ${radiusClass} ${pos === 'middle' ? 'my-6' : pos === 'top' ? 'mb-6' : 'mt-6'}`}>
      {isTalkinbio ? (
        <SauleIcon size={240} className="w-full max-h-96 object-contain" />
      ) : isVideoUrl(mediaUrl) ? (
        <video src={mediaUrl} className="w-full max-h-96 object-cover" controls />
      ) : (
        <img src={mediaUrl} alt={blockTitle} className="w-full max-h-96 object-cover" />
      )}
    </div>
  ) : null;

  return withSectionBackground(
    <>
      {pos === 'top' && MediaElement}
      <h2 className={`text-3xl mb-6 font-bold ${headingFont}`} style={{ color: 'var(--text)' }}>
        {renderColoredSegments(blockTitle)}
      </h2>
      {pos === 'middle' && MediaElement}
      <div className="markdown-body opacity-90 text-[15px]">
        <ReactMarkdown remarkPlugins={[remarkBreaks]} components={colorLinkComponents} urlTransform={styleUrlTransform}>{toColorMarkdown(text)}</ReactMarkdown>
      </div>
      {pos === 'bottom' && MediaElement}
    </>,
    block.id,
    ctx,
    block.content?.backgroundImage,
    block.content?.backgroundOverlay
  );
}

function getLocalizedItems(block: any, locale: string) {
  return (block.content?.items || [])
    .filter((item: any) => isItemVisibleInLocale(item, locale))
    .map((item: any, index: number) => ({
      ...item,
      __tbItemId: stableItemId(item, index),
      title: getLocalizedValue(item, locale, 'title'),
      description: getLocalizedValue(item, locale, 'description'),
      caption: getLocalizedValue(item, locale, 'caption'),
      quote: getLocalizedValue(item, locale, 'quote'),
      role: getLocalizedValue(item, locale, 'role'),
      question: getLocalizedValue(item, locale, 'question'),
      answer: getLocalizedValue(item, locale, 'answer'),
      label: getLocalizedValue(item, locale, 'label'),
      url: getLocalizedValue(item, locale, 'url') // some components look for url, others label, etc.
    }));
}

function itemDataProps(item: any) {
  return { 'data-tb-item-id': item.__tbItemId };
}

function itemFocusClass(item: any, ctx: RenderCtx) {
  return item.__tbItemId && item.__tbItemId === ctx.activeItemId ? 'tb-focused-item' : '';
}

function EntryNavigationMenu({
  blocks,
  locale,
  theme,
  variant,
  onSelect,
}: {
  blocks: any[];
  locale: string;
  theme: Theme;
  variant: 'dots' | 'menu';
  onSelect: (blockId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const c = resolveThemeColors(theme);
  const menuBlocks = blocks.filter((block) => block.type !== 'contact');

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-label={open ? 'Men\u00fcy\u00fc kapat' : 'Men\u00fcy\u00fc a\u00e7'}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`flex h-9 w-9 items-center justify-center rounded-full border shadow-sm backdrop-blur-sm transition hover:brightness-95 ${
          variant === 'dots' ? 'border-white/25 bg-black/18 text-white' : ''
        }`}
        style={variant === 'menu' ? {
          background: c.surface,
          borderColor: c.border,
          color: c.text,
        } : undefined}
      >
        {open ? <X className="h-4.5 w-4.5" /> : variant === 'dots' ? <Ellipsis className="h-5 w-5" /> : <Menu className="h-4.5 w-4.5" />}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-[70] mt-2 flex w-56 max-h-[min(420px,calc(100dvh-120px))] flex-col overflow-y-auto rounded-lg border py-1 shadow-[0_18px_50px_rgba(15,23,42,0.18)]"
          style={{ background: c.surface, borderColor: c.border, color: c.text }}
        >
          <div className="flex justify-center border-b px-4 py-3" style={{ borderColor: c.border }}>
            <LanguageSwitcher compact />
          </div>
          {menuBlocks.map((block) => (
            <button
              key={block.id}
              type="button"
              data-tb-entry-menu-item={block.id}
              onClick={() => {
                setOpen(false);
                onSelect(block.id);
              }}
              className="px-4 py-2.5 text-left text-sm font-medium transition hover:brightness-95"
              style={{ color: c.text }}
            >
              {blockTitleOf(block, locale)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileEntryCard({
  visibleBlocks,
  navigationBlocks,
  businessId,
  businessName,
  description,
  shortcuts,
  locale,
  theme,
  renderBlock,
  openLegacyView,
  interactiveEntrySettings,
  conversionFlowSettings,
  pageType,
}: {
  visibleBlocks: any[];
  navigationBlocks: any[];
  businessId: string;
  businessName: string;
  description?: string;
  shortcuts?: Shortcut[];
  locale: string;
  theme: Theme;
  renderBlock: (block: any, activeItemId?: string | null) => React.ReactNode;
  openLegacyView: (blockId: string) => void;
  interactiveEntrySettings?: InteractiveEntrySettings | null;
  conversionFlowSettings?: ConversionFlowSettings | null;
  pageType: PublicPageType;
}) {
  const isConversion = pageType === 'conversion';
  const MAX_OVERFLOW_WITHOUT_AUTO_HIDE_ACTIONS = 520;
  const [entryBlock, setEntryBlock] = useState<{ blockId: string; itemId?: string | null } | null>(null);
  const [entryStage, setEntryStage] = useState<EntryStage>('discover');
  const [entryScrollActive, setEntryScrollActive] = useState(false);
  const [entryQuestion, setEntryQuestion] = useState('');
  const [entryChatMessages, setEntryChatMessages] = useState<EntryChatMessage[]>([]);
  const [entryChatLoading, setEntryChatLoading] = useState(false);
  const [conversionSceneIndex, setConversionSceneIndex] = useState(0);
  const [conversionAnswer, setConversionAnswer] = useState<ConversionAnswerState | null>(null);
  const entryContentScrollRef = useRef<HTMLDivElement | null>(null);
  const entryActionsRef = useRef<HTMLDivElement | null>(null);
  const entryChatScrollRef = useRef<HTMLDivElement | null>(null);
  const entryScrollStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const entryStickToBottomOnActionsRef = useRef(false);
  const entryLastScrollTopRef = useRef(0);
  const aboutBlock = firstAboutBlock(visibleBlocks);
  const resolvedEntryTargets = resolveInteractiveEntryTargets(visibleBlocks, interactiveEntrySettings);
  const profileTargetBlock = visibleBlocks.find((block) => block.id === resolvedEntryTargets.heroBlockId) || aboutBlock;
  const actions = collectEntryActions(visibleBlocks, locale, resolvedEntryTargets.discoverBlockIds);
  const contactBlock = visibleBlocks.find((block) => block.type === 'contact');
  const contactAction = contactBlock ? {
    blockId: contactBlock.id,
    itemId: null,
    label: blockTitleOf(contactBlock, locale),
    eyebrow: blockEyebrow(contactBlock, locale),
    mediaUrl: blockPreviewMedia(contactBlock),
  } satisfies EntryAction : null;
  const selectedBlock = entryBlock ? visibleBlocks.find((block) => block.id === entryBlock.blockId) : null;
  const selectedBlockId = selectedBlock?.id;
  const conversionScenes: any[] = [];
  const conversionScene: any = null;
  const conversionQuestions = selectedBlock
    ? conversionAnswer?.question.next?.slice(0, 3) || conversionQuestionsForBlock(selectedBlock, locale, conversionFlowSettings)
    : [];
  const showConversionFreeQuestion = conversionAnswerDepth(conversionAnswer) >= 2;
  const showConversionGuidance = isConversion && Boolean(selectedBlock) && entryStage === 'book' && selectedBlock?.type !== 'contact' && selectedBlock?.type !== 'faq';
  const hasSelectedPath = Boolean(selectedBlock && entryStage !== 'discover');
  const renderedActions = entryStage === 'book' && selectedBlock
    ? collectSelectedEntryActions(visibleBlocks, selectedBlock, actions, locale)
    : actions;
  const showEntryActions = !selectedBlock || entryStage === 'profile' || entryStage === 'ask' || (!isConversion && !entryScrollActive);
  const coverImage = (aboutBlock && (blockPreviewMedia(aboutBlock) || aboutBlock.content?.backgroundImage)) || actions.find((a) => a.mediaUrl)?.mediaUrl || null;
  const c = resolveThemeColors(theme);
  const entryShortcuts = (shortcuts || []).slice(0, 4);
  const selectedUsesLightChrome = Boolean(hasSelectedPath && theme.mode !== 'dark');
  const entryChromeStyle = {
    '--tb-entry-selected-scrim': `linear-gradient(to top, color-mix(in srgb, ${c.background} 78%, ${c.text} 22%), color-mix(in srgb, ${c.background} 84%, ${c.text} 16%) 70%, color-mix(in srgb, ${c.background} 84%, transparent))`,
    '--tb-entry-selected-label': c.textMuted,
    '--tb-entry-selected-action-bg': `color-mix(in srgb, ${c.surface} 88%, ${c.background} 12%)`,
    '--tb-entry-selected-action-bg-hover': c.surface,
    '--tb-entry-selected-action-border': `color-mix(in srgb, ${c.border} 74%, ${c.text} 26%)`,
    '--tb-entry-selected-action-border-hover': `color-mix(in srgb, ${c.border} 58%, ${c.text} 42%)`,
    '--tb-entry-selected-action-eyebrow': c.textMuted,
    '--tb-entry-selected-action-text': c.text,
    '--tb-entry-selected-action-icon': c.textMuted,
    '--tb-entry-content-panel-bg': `color-mix(in srgb, ${c.surface} 96%, ${c.background} 4%)`,
    '--tb-entry-content-header-bg': `color-mix(in srgb, ${c.background} 92%, ${c.surface} 8%)`,
    '--tb-entry-content-header-border': c.border,
  } as React.CSSProperties;
  const openEntryInsideCard = (blockId: string, itemId?: string | null, stage: EntryStage = 'discover') => {
    setEntryBlock({ blockId, itemId });
    setEntryStage(stage);
    setEntryScrollActive(false);
    setConversionAnswer(null);
    entryStickToBottomOnActionsRef.current = false;
    entryLastScrollTopRef.current = 0;
  };
  const closeEntryInsideCard = () => {
    setEntryBlock(null);
    setEntryStage('discover');
    setEntryQuestion('');
    setEntryChatMessages([]);
    setConversionAnswer(null);
  };
  const handleEntryAction = (action: EntryAction) => {
    openEntryInsideCard(action.blockId, action.itemId, entryStage === 'discover' ? 'book' : 'ask');
  };
  const handleEntryMenuSelect = (blockId: string) => {
    openLegacyView(blockId);
  };
  const handleConversionQuestion = (question: ConversionQuestion) => {
    setConversionAnswer((current) => ({ question, previous: current }));
    requestAnimationFrame(() => {
      const node = entryContentScrollRef.current;
      const answerNode = node?.querySelector('[data-tb-conversion-answer]');
      if (node && answerNode instanceof HTMLElement) {
        const top = answerNode.offsetTop - 18;
        if (typeof node.scrollTo === 'function') {
          node.scrollTo({ top, behavior: 'smooth' });
        } else {
          node.scrollTop = top;
        }
      }
    });
  };
  const handleEntryBack = () => {
    if (isConversion && conversionAnswer) {
      setConversionAnswer(conversionAnswer.previous);
      return;
    }
    closeEntryInsideCard();
  };

  const submitEntryQuestion = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const question = entryQuestion.trim();
    if (!question || entryChatLoading || !businessId) return;

    setEntryQuestion('');
    setEntryChatMessages((messages) => [...messages, { role: 'user', content: question }]);
    setEntryChatLoading(true);

    try {
      const response = await fetch('/api/chat/semantic-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          locale: locale === 'en' || locale === 'ru' ? locale : 'tr',
          query: question,
          includePageDirections: true,
        }),
      });
      if (!response.ok) throw new Error('Question request failed');

      const data = await response.json();
      const answer = typeof data.text === 'string' && data.text.trim()
        ? data.text.trim()
        : entryCopy('questionError', locale);
      setEntryChatMessages((messages) => [...messages, { role: 'assistant', content: answer }]);

      const targetBlockId = data.matchedBlock?.blockId || data.action?.blockId;
      const targetItemId = data.matchedBlock?.itemId || data.action?.itemId || null;
      if (targetBlockId) {
        const targetBlock = visibleBlocks.find(
          (block) => block.id === targetBlockId || block.type === targetBlockId
        );
        if (targetBlock) {
          setEntryBlock({ blockId: targetBlock.id, itemId: targetItemId });
        }
      }
    } catch (error) {
      console.error('Entry question failed:', error);
      setEntryChatMessages((messages) => [
        ...messages,
        { role: 'assistant', content: entryCopy('questionError', locale) },
      ]);
    } finally {
      setEntryChatLoading(false);
    }
  };

  const handleEntryContentScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const node = event.currentTarget;
    const previousScrollTop = entryLastScrollTopRef.current;
    const scrollDelta = node.scrollTop - previousScrollTop;
    const direction = scrollDelta > 1 ? 'down' : scrollDelta < -1 ? 'up' : null;
    const atTop = node.scrollTop <= 2;
    const atBottom = node.scrollTop + node.clientHeight >= node.scrollHeight - 2;
    const expandedClientHeight = node.clientHeight + (entryActionsRef.current?.offsetHeight || 0);
    const overflowWithActionsHidden = node.scrollHeight - expandedClientHeight;

    entryLastScrollTopRef.current = node.scrollTop;

    // Opening or closing the action area changes the scroll viewport height and
    // can emit a scroll event of its own. Only actual movement should drive the
    // visibility state, otherwise the two layouts can toggle each other.
    if (!direction) return;

    if (entryScrollStopTimer.current) {
      clearTimeout(entryScrollStopTimer.current);
      entryScrollStopTimer.current = null;
    }

    if ((atTop && direction === 'up') || (atBottom && direction === 'down')) {
      entryStickToBottomOnActionsRef.current = atBottom && direction === 'down';
      setEntryScrollActive(false);
      return;
    }

    if (!entryScrollActive && overflowWithActionsHidden <= MAX_OVERFLOW_WITHOUT_AUTO_HIDE_ACTIONS) {
      entryStickToBottomOnActionsRef.current = false;
      setEntryScrollActive(false);
      return;
    }

    entryStickToBottomOnActionsRef.current = false;
    setEntryScrollActive(true);
    entryScrollStopTimer.current = setTimeout(() => {
      entryScrollStopTimer.current = null;
      setEntryScrollActive(false);
    }, 5000);
  };

  useEffect(() => {
    return () => {
      if (entryScrollStopTimer.current) clearTimeout(entryScrollStopTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!selectedBlockId) return;
    setConversionAnswer(null);
    const node = entryContentScrollRef.current;
    if (!node) return;
    node.scrollTop = 0;
    entryLastScrollTopRef.current = 0;
  }, [selectedBlockId, entryBlock?.itemId]);

  useEffect(() => {
    if (!showEntryActions || !entryStickToBottomOnActionsRef.current) return;
    requestAnimationFrame(() => {
      const node = entryContentScrollRef.current;
      if (!node) return;
      node.scrollTop = node.scrollHeight;
      entryStickToBottomOnActionsRef.current = false;
    });
  }, [showEntryActions]);

  useEffect(() => {
    const node = entryChatScrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [entryChatMessages, entryChatLoading]);

  return (
    <section className="flex h-full min-h-full">
      <div
        className="relative flex w-full flex-col justify-between overflow-hidden bg-[#111] text-white shadow-[0_24px_60px_rgba(15,23,42,0.16)] sm:rounded-[34px]"
        style={{
          ...entryChromeStyle,
          borderColor: 'color-mix(in srgb, var(--primary) 32%, transparent)',
        }}
      >
        {coverImage ? (
          isVideoUrl(coverImage) ? (
            <video src={coverImage} className="absolute inset-0 w-full h-full object-cover opacity-75" autoPlay loop muted playsInline />
          ) : (
            <img
              src={supabaseThumbnailUrl(coverImage, { width: 720 }) ?? coverImage}
              alt=""
              loading="eager"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover opacity-75"
            />
          )
        ) : (
          <div className="absolute inset-0" style={{ background: `linear-gradient(145deg, ${c.primary}, #111)` }} />
        )}
        <style>{`
          .tb-entry-scrim-base {
            background: linear-gradient(to bottom, rgba(0, 0, 0, 0.10), rgba(0, 0, 0, 0.14) 50%, rgba(0, 0, 0, 0.30));
          }
          .tb-entry-scrim-curtain {
            background: linear-gradient(to bottom, rgba(0, 0, 0, 0.30), rgba(0, 0, 0, 0.42) 48%, rgba(0, 0, 0, 0.56));
            animation: tbEntryBrighten 1ms step-end 5s forwards;
          }
          .tb-entry-bottom-scrim {
            background: linear-gradient(to top, rgba(0, 0, 0, 0.92), rgba(0, 0, 0, 0.78) 52%, rgba(0, 0, 0, 0));
          }
          .tb-entry-bottom-scrim-light {
            background: var(--tb-entry-selected-scrim);
          }
          .tb-entry-content-panel {
            color: var(--text);
          }
          .tb-entry-content-scroll {
            scrollbar-width: thin;
            scrollbar-color: rgba(20, 35, 31, 0.28) transparent;
          }
          .tb-entry-content-scroll::-webkit-scrollbar {
            width: 4px;
          }
          .tb-entry-content-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
          .tb-entry-content-scroll::-webkit-scrollbar-thumb {
            background: rgba(20, 35, 31, 0.24);
            border-radius: 999px;
          }
          .tb-entry-content-scroll section {
            padding-top: 0;
          }
          .tb-entry-content-scroll h2 {
            margin-bottom: 0.85rem;
            font-size: 1.55rem;
            line-height: 1.08;
          }
          .tb-entry-content-scroll .markdown-body {
            font-size: 0.84rem;
            line-height: 1.55;
          }
          .tb-entry-content-scroll .markdown-body p {
            margin-bottom: 0.75rem;
          }
          @keyframes tbEntryBrighten {
            to { opacity: 0; }
          }
        `}</style>
        <div className="absolute inset-0 tb-entry-scrim-base" />
        <div className="absolute inset-0 tb-entry-scrim-curtain" />
        {showEntryActions && (
          <div className={`absolute inset-x-0 bottom-0 h-[44%] ${selectedUsesLightChrome ? 'tb-entry-bottom-scrim-light' : 'tb-entry-bottom-scrim'}`} />
        )}

        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
          {!selectedBlock && (
            <div className="absolute right-4 top-4 z-30">
              <EntryNavigationMenu
                blocks={visibleBlocks}
                locale={locale}
                theme={theme}
                variant="dots"
                onSelect={handleEntryMenuSelect}
              />
            </div>
          )}

          {selectedBlock ? (
            <div className="tb-entry-content-panel flex min-h-0 flex-1 flex-col overflow-hidden shadow-[0_18px_45px_rgba(0,0,0,0.18)] backdrop-blur-md" style={{ background: 'var(--tb-entry-content-panel-bg)' }}>
              <div className="relative flex h-16 shrink-0 items-center justify-center border-b px-4" style={{ background: 'var(--tb-entry-content-header-bg)', borderColor: 'var(--tb-entry-content-header-border)' }}>
                <button
                  type="button"
                  aria-label="Geri"
                  onClick={handleEntryBack}
                  className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[var(--text)] transition hover:bg-[rgba(20,35,31,0.05)]"
                >
                  <ChevronLeft className="h-4.5 w-4.5" />
                </button>
                <div className="max-w-[58%] truncate text-center text-sm font-semibold tb-heading" style={{ color: 'var(--text)' }}>
                  {renderColoredSegments(businessName)}
                </div>
                <div className="absolute right-3 top-1/2 z-30 -translate-y-1/2">
                  <EntryNavigationMenu
                    blocks={visibleBlocks}
                    locale={locale}
                    theme={theme}
                    variant="menu"
                    onSelect={handleEntryMenuSelect}
                  />
                </div>
              </div>
              {isConversion ? (
                <div ref={entryContentScrollRef} data-tb-conversion-flow className="tb-entry-content-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4">
                  {renderBlock(selectedBlock, entryBlock?.itemId)}

                  {showConversionGuidance && (
                  <div className="mt-7 space-y-4 border-t pt-5" style={{ borderColor: 'var(--border)' }}>
                    {!conversionAnswer ? (
                      <div data-tb-conversion-suggestions className="space-y-2">
                        <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--text-muted)]">
                          {entryCopy('askQuestions', locale)}
                        </div>
                        {conversionQuestions.slice(0, 2).map((question) => (
                          <button
                            key={question.id}
                            type="button"
                            data-tb-conversion-question={question.id}
                            onClick={() => handleConversionQuestion(question)}
                            className="group w-full rounded-full border px-3 py-2.5 text-left transition hover:brightness-95"
                            style={{
                              background: 'var(--tb-entry-selected-action-bg)',
                              borderColor: 'var(--tb-entry-selected-action-border)',
                              color: 'var(--tb-entry-selected-action-text)',
                            }}
                          >
                            <span className="flex items-center justify-between gap-3">
                              <span className="min-w-0">
                                <span className="block text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--tb-entry-selected-action-eyebrow)]">
                                  {locale === 'en' ? 'Question' : locale === 'ru' ? '\u0412\u043e\u043f\u0440\u043e\u0441' : 'Soru'}
                                </span>
                                <span className="block truncate text-sm font-bold">{question.label}</span>
                              </span>
                              <ArrowRight className="h-4 w-4 shrink-0 text-[var(--tb-entry-selected-action-icon)] transition group-hover:translate-x-0.5" />
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div data-tb-conversion-answer className="space-y-4">
                        <article className="rounded-lg border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                          <div className="mb-2 text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--text-muted)]">
                            {locale === 'en' ? 'Answer' : locale === 'ru' ? '\u041e\u0442\u0432\u0435\u0442' : 'Yan\u0131t'}
                          </div>
                          <h3 className="mb-2 text-lg font-bold leading-tight tb-heading" style={{ color: 'var(--text)' }}>
                            {conversionAnswer.question.label}
                          </h3>
                          <p className="whitespace-pre-line text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                            {conversionAnswer.question.answer}
                          </p>
                        </article>

                        <div data-tb-conversion-suggestions className="space-y-2">
                          {conversionQuestions.slice(0, 1).map((question) => (
                            <button
                              key={question.id}
                              type="button"
                              data-tb-conversion-question={question.id}
                              onClick={() => handleConversionQuestion(question)}
                              className="group w-full rounded-full border px-3 py-2.5 text-left transition hover:brightness-95"
                              style={{
                                background: 'var(--tb-entry-selected-action-bg)',
                                borderColor: 'var(--tb-entry-selected-action-border)',
                                color: 'var(--tb-entry-selected-action-text)',
                              }}
                            >
                              <span className="flex items-center justify-between gap-3">
                                <span className="min-w-0">
                                  <span className="block text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--tb-entry-selected-action-eyebrow)]">
                                    {locale === 'en' ? 'Question' : locale === 'ru' ? '\u0412\u043e\u043f\u0440\u043e\u0441' : 'Soru'}
                                  </span>
                                  <span className="block truncate text-sm font-bold">{question.label}</span>
                                </span>
                                <ArrowRight className="h-4 w-4 shrink-0 text-[var(--tb-entry-selected-action-icon)] transition group-hover:translate-x-0.5" />
                              </span>
                            </button>
                          ))}
                          {contactAction && (
                            <button
                              type="button"
                              data-tb-entry-trigger="contact"
                              onClick={() => openEntryInsideCard(contactAction.blockId, contactAction.itemId, 'ask')}
                              className="group w-full rounded-full border px-3 py-2.5 text-left transition hover:brightness-95"
                              style={{
                                background: 'var(--tb-entry-selected-action-bg)',
                                borderColor: 'var(--tb-entry-selected-action-border)',
                                color: 'var(--tb-entry-selected-action-text)',
                              }}
                            >
                              <span className="flex items-center justify-between gap-3">
                                <span className="min-w-0">
                                  <span className="block text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--tb-entry-selected-action-eyebrow)]">{contactAction.eyebrow}</span>
                                  <span className="block truncate text-sm font-bold">{renderColoredSegments(contactAction.label)}</span>
                                </span>
                                <ArrowRight className="h-4 w-4 shrink-0 text-[var(--tb-entry-selected-action-icon)] transition group-hover:translate-x-0.5" />
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {showConversionFreeQuestion && (
                    <div
                      data-tb-entry-chat
                      className="overflow-hidden rounded-[18px] border"
                      style={{
                        background: 'var(--tb-entry-selected-action-bg)',
                        borderColor: 'var(--tb-entry-selected-action-border)',
                        color: 'var(--tb-entry-selected-action-text)',
                      }}
                    >
                      {entryChatMessages.length > 0 && (
                        <div
                          ref={entryChatScrollRef}
                          className="space-y-1.5 overflow-hidden px-3 py-2 text-xs leading-relaxed"
                          style={{ maxHeight: '128px' }}
                        >
                          {entryChatMessages.slice(-2).map((message, index) => (
                            <div
                              key={`${message.role}-${index}`}
                              className={`w-fit max-w-[88%] whitespace-pre-wrap rounded-xl px-2.5 py-1.5 ${
                                message.role === 'user'
                                  ? 'ml-auto bg-[var(--primary)] text-white'
                                  : 'bg-black/[0.045] text-[var(--tb-entry-selected-action-text)]'
                              }`}
                            >
                              {message.content}
                            </div>
                          ))}
                          {entryChatLoading && (
                            <div className="flex items-center gap-1.5 text-[var(--tb-entry-selected-action-eyebrow)]">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              <span>...</span>
                            </div>
                          )}
                        </div>
                      )}
                      <form
                        onSubmit={submitEntryQuestion}
                        className="flex items-center gap-2 border-t px-2 py-2"
                        style={{ borderColor: 'var(--tb-entry-selected-action-border)' }}
                      >
                        <input
                          value={entryQuestion}
                          onChange={(event) => setEntryQuestion(event.target.value)}
                          placeholder={entryCopy('questionPlaceholder', locale)}
                          aria-label={entryCopy('questionPlaceholder', locale)}
                          className="h-9 min-w-0 flex-1 rounded-full border border-black/10 bg-transparent px-3 text-xs outline-none transition placeholder:text-black/38 focus:border-[var(--primary)]"
                        />
                        <button
                          type="submit"
                          aria-label={entryCopy('askQuestions', locale)}
                          disabled={!entryQuestion.trim() || entryChatLoading}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-white transition disabled:opacity-40"
                        >
                          {entryChatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </button>
                      </form>
                    </div>
                    )}
                  </div>
                  )}
                  {conversionScene && (
                    <div className="flex min-h-0 flex-1 flex-col">
                      {conversionScene.mediaUrl && (
                        <div className="mb-4 min-h-0 flex-[1.15] overflow-hidden rounded-lg bg-black/5">
                          {isVideoUrl(conversionScene.mediaUrl) ? (
                            <video src={conversionScene.mediaUrl} className="h-full w-full object-cover" autoPlay loop muted playsInline />
                          ) : (
                            <img
                              src={supabaseThumbnailUrl(conversionScene.mediaUrl, { width: 720 }) ?? conversionScene.mediaUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                      )}
                      <div className="flex min-h-0 flex-1 flex-col justify-center overflow-hidden">
                        <div className="mb-2 text-[9px] font-mono uppercase tracking-[0.16em] text-[var(--text-muted)]">
                          {conversionScene.eyebrow}
                        </div>
                        <h2 className="mb-3 text-[clamp(1.25rem,5cqw,1.75rem)] font-bold leading-tight tb-heading">
                          {renderColoredSegments(conversionScene.title)}
                        </h2>
                        {conversionScene.text && (
                          <div
                            className="overflow-hidden text-[13px] leading-[1.55] text-[var(--text-muted)]"
                            style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 8 }}
                          >
                            <ReactMarkdown remarkPlugins={[remarkBreaks]} components={colorLinkComponents} urlTransform={styleUrlTransform}>
                              {toColorMarkdown(conversionScene.text)}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {!conversionAnswer && conversionScenes.length > 1 && (
                    <div className="mt-3 flex h-9 shrink-0 items-center justify-between border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                      <button
                        type="button"
                        aria-label="Önceki"
                        disabled={conversionSceneIndex === 0}
                        onClick={() => setConversionSceneIndex((index) => Math.max(0, index - 1))}
                        className="flex h-8 w-8 items-center justify-center rounded-full border transition disabled:opacity-25"
                        style={{ borderColor: 'var(--border)' }}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <div className="flex items-center gap-1.5" aria-label={`${conversionSceneIndex + 1} / ${conversionScenes.length}`}>
                        {conversionScenes.map((_, index) => (
                          <button
                            key={index}
                            type="button"
                            aria-label={`${index + 1}. sahne`}
                            onClick={() => setConversionSceneIndex(index)}
                            className={`h-1.5 rounded-full transition-all ${index === conversionSceneIndex ? 'w-5 bg-[var(--primary)]' : 'w-1.5 bg-black/20'}`}
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        aria-label="Sonraki"
                        disabled={conversionSceneIndex >= conversionScenes.length - 1}
                        onClick={() => setConversionSceneIndex((index) => Math.min(conversionScenes.length - 1, index + 1))}
                        className="flex h-8 w-8 items-center justify-center rounded-full border transition disabled:opacity-25"
                        style={{ borderColor: 'var(--border)' }}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div ref={entryContentScrollRef} className="tb-entry-content-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4" onScroll={handleEntryContentScroll}>
                  {renderBlock(selectedBlock, entryBlock?.itemId)}
                </div>
              )}
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col justify-end px-5 pb-1 text-left">
              <button
                type="button"
                data-tb-entry-trigger="profile"
                onClick={() => profileTargetBlock && openEntryInsideCard(profileTargetBlock.id, null, 'profile')}
                className="group max-w-full text-left"
              >
                <span className="block text-[10px] font-mono uppercase tracking-[0.18em] text-white/65 mb-1.5">
                  {entryCopy('openProfile', locale)}
                </span>
                <span className="block text-[26px] leading-[0.95] font-bold tb-heading">{renderColoredSegments(businessName)}</span>
                {description && (
                  <span className="mt-2 block max-w-[92%] text-[12px] font-semibold leading-snug text-white/78">
                    {renderColoredSegments(description)}
                  </span>
                )}
              </button>
              {entryShortcuts.length > 0 && (
                <div className="mt-2 flex max-w-full flex-wrap gap-1.5">
                  {entryShortcuts.map((shortcut, index) => {
                    const Icon = shortcut.kind === 'link' ? iconForLinkUrl(shortcut.url) : LinkIcon;
                    const className = 'inline-flex max-w-[48%] items-center gap-1.5 rounded-full border border-white/18 bg-black/30 px-2.5 py-1.5 text-[11px] font-bold text-white/88 backdrop-blur-sm transition hover:border-white/42 hover:bg-black/45';
                    const content = (
                      <>
                        <Icon className="h-3 w-3 shrink-0 text-white/70" />
                        <span className="truncate">{shortcut.label}</span>
                      </>
                    );
                    if (shortcut.kind === 'link') {
                      return (
                        <a
                          key={`${shortcut.kind}-${shortcut.label}-${index}`}
                          href={shortcut.url}
                          target="_blank"
                          rel="noreferrer"
                          className={className}
                        >
                          {content}
                        </a>
                      );
                    }
                    return (
                      <button
                        key={`${shortcut.kind}-${shortcut.blockId}-${shortcut.label}-${index}`}
                        type="button"
                        onClick={() => openEntryInsideCard(shortcut.blockId, null, 'book')}
                        className={className}
                      >
                        {content}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {showEntryActions && (
        <div ref={entryActionsRef} className="relative z-10 px-4 pt-4 pb-4">
          <div className={`mb-2 flex items-center justify-between gap-3 text-[10px] font-mono uppercase tracking-[0.16em] ${selectedUsesLightChrome ? 'text-[var(--tb-entry-selected-label)]' : 'text-white/62'}`}>
            <span>{entryCopy(showConversionGuidance ? 'askQuestions' : entryStage === 'ask' ? 'askQuestions' : entryStage === 'book' ? 'bookNow' : 'choosePath', locale)}</span>
          </div>
          <div className="space-y-2">
            {showConversionGuidance ? (
              <>
                <div data-tb-conversion-suggestions className="space-y-2">
                  {conversionQuestions.slice(0, 3).map((question) => (
                    <button
                      key={question.id}
                      type="button"
                      data-tb-conversion-question={question.id}
                      onClick={() => handleConversionQuestion(question)}
                      className={`group w-full rounded-full border px-3 py-2.5 text-left backdrop-blur-sm transition ${
                        selectedUsesLightChrome
                          ? 'shadow-[0_10px_28px_rgba(20,35,31,0.10)]'
                          : 'border-white/18 bg-black/42 hover:border-white/45 hover:bg-black/58'
                      }`}
                      style={selectedUsesLightChrome ? {
                        background: 'var(--tb-entry-selected-action-bg)',
                        borderColor: 'var(--tb-entry-selected-action-border)',
                      } : undefined}
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="min-w-0">
                          <span className={`block text-[9px] font-mono uppercase tracking-[0.14em] ${selectedUsesLightChrome ? 'text-[var(--tb-entry-selected-action-eyebrow)]' : 'text-white/45'}`}>
                            {locale === 'en' ? 'Question' : locale === 'ru' ? '\u0412\u043e\u043f\u0440\u043e\u0441' : 'Soru'}
                          </span>
                          <span className={`block truncate text-sm font-bold ${selectedUsesLightChrome ? 'text-[var(--tb-entry-selected-action-text)]' : 'text-white'}`}>{question.label}</span>
                        </span>
                        <ArrowRight className={`w-4 h-4 shrink-0 transition group-hover:translate-x-0.5 ${selectedUsesLightChrome ? 'text-[var(--tb-entry-selected-action-icon)]' : 'text-white/75'}`} />
                      </span>
                    </button>
                  ))}
                </div>

                <div
                  data-tb-entry-chat
                  className="overflow-hidden rounded-[18px] border backdrop-blur-sm"
                  style={{
                    background: selectedUsesLightChrome ? 'var(--tb-entry-selected-action-bg)' : 'rgba(0,0,0,0.42)',
                    borderColor: selectedUsesLightChrome ? 'var(--tb-entry-selected-action-border)' : 'rgba(255,255,255,0.18)',
                    color: selectedUsesLightChrome ? 'var(--tb-entry-selected-action-text)' : '#fff',
                  }}
                >
                  {entryChatMessages.length > 0 && (
                    <div
                      ref={entryChatScrollRef}
                      className="space-y-1.5 overflow-hidden px-3 py-2 text-xs leading-relaxed"
                      style={{ maxHeight: 'min(14dvh, 112px)' }}
                    >
                      {entryChatMessages.slice(-2).map((message, index) => (
                        <div
                          key={`${message.role}-${index}`}
                          className={`w-fit max-w-[88%] whitespace-pre-wrap rounded-xl px-2.5 py-1.5 ${
                            message.role === 'user'
                              ? 'ml-auto bg-[var(--primary)] text-white'
                              : selectedUsesLightChrome
                                ? 'bg-black/[0.045] text-[var(--tb-entry-selected-action-text)]'
                                : 'bg-white/10 text-white'
                          }`}
                        >
                          {message.content}
                        </div>
                      ))}
                      {entryChatLoading && (
                        <div className={`flex items-center gap-1.5 ${selectedUsesLightChrome ? 'text-[var(--tb-entry-selected-action-eyebrow)]' : 'text-white/55'}`}>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>...</span>
                        </div>
                      )}
                    </div>
                  )}
                  <form
                    onSubmit={submitEntryQuestion}
                    className="flex items-center gap-2 border-t px-2 py-2"
                    style={{ borderColor: selectedUsesLightChrome ? 'var(--tb-entry-selected-action-border)' : 'rgba(255,255,255,0.14)' }}
                  >
                    <input
                      value={entryQuestion}
                      onChange={(event) => setEntryQuestion(event.target.value)}
                      placeholder={entryCopy('questionPlaceholder', locale)}
                      aria-label={entryCopy('questionPlaceholder', locale)}
                      className={`h-9 min-w-0 flex-1 rounded-full border bg-transparent px-3 text-xs outline-none transition focus:border-[var(--primary)] ${
                        selectedUsesLightChrome ? 'border-black/10 placeholder:text-black/38' : 'border-white/16 text-white placeholder:text-white/42'
                      }`}
                    />
                    <button
                      type="submit"
                      aria-label={entryCopy('askQuestions', locale)}
                      disabled={!entryQuestion.trim() || entryChatLoading}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-white transition disabled:opacity-40"
                    >
                      {entryChatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </form>
                </div>
              </>
            ) : entryStage === 'ask' ? (
              <>
                <div
                  data-tb-entry-chat
                  className="overflow-hidden rounded-[18px] border backdrop-blur-sm"
                  style={{
                    background: selectedUsesLightChrome ? 'var(--tb-entry-selected-action-bg)' : 'rgba(0,0,0,0.42)',
                    borderColor: selectedUsesLightChrome ? 'var(--tb-entry-selected-action-border)' : 'rgba(255,255,255,0.18)',
                    color: selectedUsesLightChrome ? 'var(--tb-entry-selected-action-text)' : '#fff',
                  }}
                >
                  <div
                    ref={entryChatScrollRef}
                    className={`space-y-1.5 px-3 py-2 text-xs leading-relaxed ${isConversion ? 'overflow-hidden' : 'overflow-y-auto'}`}
                    style={{ minHeight: '72px', maxHeight: 'min(18dvh, 156px)' }}
                  >
                    {entryChatMessages.length === 0 && (
                      <div className={selectedUsesLightChrome ? 'text-[var(--tb-entry-selected-action-eyebrow)]' : 'text-white/48'}>
                        {entryCopy('questionPlaceholder', locale)}
                      </div>
                    )}
                    {(isConversion ? entryChatMessages.slice(-2) : entryChatMessages).map((message, index) => (
                      <div
                        key={`${message.role}-${index}`}
                        className={`w-fit max-w-[88%] whitespace-pre-wrap rounded-xl px-2.5 py-1.5 ${
                          message.role === 'user'
                            ? 'ml-auto bg-[var(--primary)] text-white'
                            : selectedUsesLightChrome
                              ? 'bg-black/[0.045] text-[var(--tb-entry-selected-action-text)]'
                              : 'bg-white/10 text-white'
                        }`}
                      >
                        {message.content}
                      </div>
                    ))}
                    {entryChatLoading && (
                      <div className={`flex items-center gap-1.5 ${selectedUsesLightChrome ? 'text-[var(--tb-entry-selected-action-eyebrow)]' : 'text-white/55'}`}>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>...</span>
                      </div>
                    )}
                  </div>
                  <form
                    onSubmit={submitEntryQuestion}
                    className="flex items-center gap-2 border-t px-2 py-2"
                    style={{ borderColor: selectedUsesLightChrome ? 'var(--tb-entry-selected-action-border)' : 'rgba(255,255,255,0.14)' }}
                  >
                    <input
                      value={entryQuestion}
                      onChange={(event) => setEntryQuestion(event.target.value)}
                      placeholder={entryCopy('questionPlaceholder', locale)}
                      aria-label={entryCopy('questionPlaceholder', locale)}
                      className={`h-9 min-w-0 flex-1 rounded-full border bg-transparent px-3 text-xs outline-none transition focus:border-[var(--primary)] ${
                        selectedUsesLightChrome ? 'border-black/10 placeholder:text-black/38' : 'border-white/16 text-white placeholder:text-white/42'
                      }`}
                    />
                    <button
                      type="submit"
                      aria-label={entryCopy('askQuestions', locale)}
                      disabled={!entryQuestion.trim() || entryChatLoading}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-white transition disabled:opacity-40"
                    >
                      {entryChatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </form>
                </div>

                {contactAction && (
                  <button
                    type="button"
                    data-tb-entry-trigger="contact"
                    onClick={() => openEntryInsideCard(contactAction.blockId, contactAction.itemId, 'ask')}
                    className={`group w-full rounded-full border px-3 py-2.5 text-left backdrop-blur-sm transition ${
                      selectedUsesLightChrome
                        ? 'shadow-[0_10px_28px_rgba(20,35,31,0.10)]'
                        : 'border-white/18 bg-black/42 hover:border-white/45 hover:bg-black/58'
                    }`}
                    style={selectedUsesLightChrome ? {
                      background: 'var(--tb-entry-selected-action-bg)',
                      borderColor: 'var(--tb-entry-selected-action-border)',
                    } : undefined}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="min-w-0">
                        <span className={`block text-[9px] font-mono uppercase tracking-[0.14em] ${selectedUsesLightChrome ? 'text-[var(--tb-entry-selected-action-eyebrow)]' : 'text-white/45'}`}>{contactAction.eyebrow}</span>
                        <span className={`block truncate text-sm font-bold ${selectedUsesLightChrome ? 'text-[var(--tb-entry-selected-action-text)]' : 'text-white'}`}>{renderColoredSegments(contactAction.label)}</span>
                      </span>
                      <ArrowRight className={`h-4 w-4 shrink-0 transition group-hover:translate-x-0.5 ${selectedUsesLightChrome ? 'text-[var(--tb-entry-selected-action-icon)]' : 'text-white/75'}`} />
                    </span>
                  </button>
                )}
              </>
            ) : renderedActions.map((action) => (
              <button
                key={actionKey(action)}
                type="button"
                data-tb-entry-trigger="action"
                onClick={() => handleEntryAction(action)}
                className={`group w-full rounded-full border px-3 py-2.5 text-left backdrop-blur-sm transition ${
                  hasSelectedPath
                    ? selectedUsesLightChrome
                      ? 'shadow-[0_10px_28px_rgba(20,35,31,0.10)]'
                      : 'border-white/18 bg-black/42 hover:border-white/45 hover:bg-black/58'
                    : 'border-white/18 bg-black/42 hover:border-white/45 hover:bg-black/58'
                }`}
                style={selectedUsesLightChrome ? {
                  background: 'var(--tb-entry-selected-action-bg)',
                  borderColor: 'var(--tb-entry-selected-action-border)',
                } : undefined}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className={`block text-[9px] font-mono uppercase tracking-[0.14em] ${selectedUsesLightChrome ? 'text-[var(--tb-entry-selected-action-eyebrow)]' : 'text-white/45'}`}>{action.eyebrow}</span>
                    <span className={`block truncate text-sm font-bold ${selectedUsesLightChrome ? 'text-[var(--tb-entry-selected-action-text)]' : 'text-white'}`}>{renderColoredSegments(action.label)}</span>
                  </span>
                  <ArrowRight className={`w-4 h-4 shrink-0 transition group-hover:translate-x-0.5 ${selectedUsesLightChrome ? 'text-[var(--tb-entry-selected-action-icon)]' : 'text-white/75'}`} />
                </span>
              </button>
            ))}
          </div>
        </div>
        )}
      </div>
    </section>
  );
}

function renderServices(block: any, ctx: RenderCtx) {
  const { locale, radiusClass, headingFont, theme, onOrderNowClick, categoryId } = ctx;
  const blockTitle = blockTitleOf(block, locale);
  const blockIntro = blockIntroOf(block, locale);
  const layoutVariant = block.content?.layoutVariant || 'grid-cards';
  const items: any[] = getLocalizedItems(block, locale);

  const IntroText = blockIntro ? (
    <p className="text-sm mb-6 -mt-4 opacity-80 whitespace-pre-line" style={{ color: 'var(--text-muted)' }}>
      {renderColoredSegments(blockIntro)}
    </p>
  ) : null;

  // Block-level cover photo/video (distinct from each item's own mediaUrl below) — always shown
  // first, before the title, so an owner can lead with e.g. a video of the service in action.
  const coverMedia = block.content?.mediaUrl;
  const CoverMedia = coverMedia ? (
    <div className={`overflow-hidden shadow-sm mb-6 ${radiusClass}`}>
      {isVideoUrl(coverMedia) ? (
        <video src={coverMedia} className="w-full max-h-96 object-cover" controls />
      ) : (
        <img src={coverMedia} alt={blockTitle} className="w-full max-h-96 object-cover" />
      )}
    </div>
  ) : null;

  // Rendered next to a service's price in every layout variant below, when a click behavior is
  // configured and resolvable (see buildOrderNowHandler) — hidden entirely otherwise rather than
  // showing a button that does nothing.
  const OrderButton = ({ title }: { title: string }) =>
    onOrderNowClick ? (
      <button
        type="button"
        onClick={() => onOrderNowClick(orderNowMessage(title, locale))}
        className="text-xs font-semibold px-3 py-1 rounded-full border shrink-0 whitespace-nowrap transition hover:scale-105"
        style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
      >
        {orderNowLabel(categoryId, locale)}
      </button>
    ) : null;

  let inner: React.ReactNode;

  if (layoutVariant === 'numbered-list') {
    inner = (
      <>
        {CoverMedia}
        <h2 className={`text-2xl mb-6 font-bold ${headingFont}`}>{renderColoredSegments(blockTitle)}</h2>
        {IntroText}
        <div className="space-y-6">
          {items.map((item, idx) => {
            const itemLoc = item[locale] || item;
            return (
              <div key={idx} {...itemDataProps(item)} className={`flex items-start gap-4 pb-6 border-b last:border-0 last:pb-0 transition-all ${itemFocusClass(item, ctx)}`} style={{ borderColor: 'var(--border)' }}>
                <span className={`text-4xl leading-none opacity-30 shrink-0 ${headingFont}`} style={{ color: 'var(--primary)' }}>
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div className="flex-1">
                  <div className="flex justify-between items-start gap-4">
                    <h4 className={`font-semibold text-lg ${headingFont}`}>{renderColoredSegments(itemLoc.title || item.title)}</h4>
                    {item.price && (
                      <span className="flex items-center gap-3 shrink-0">
                        <span className="font-mono text-sm" style={{ color: 'var(--text-muted)' }}>{item.price}</span>
                        <OrderButton title={itemLoc.title || item.title} />
                      </span>
                    )}
                  </div>
                  {(itemLoc.description || item.description) && (
                    <p className="text-sm mt-1 opacity-80 whitespace-pre-line" style={{ color: 'var(--text-muted)' }}>{renderColoredSegments(itemLoc.description || item.description)}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  } else if (layoutVariant === 'feature-split') {
    inner = (
      <>
        {CoverMedia}
        <h2 className={`text-2xl mb-6 font-bold ${headingFont}`}>{renderColoredSegments(blockTitle)}</h2>
        {IntroText}
        <div className="flex flex-col gap-8">
          {items.map((item, idx) => {
            const itemLoc = item[locale] || item;
            const reverse = idx % 2 === 1;
            return (
              <div key={idx} {...itemDataProps(item)} className={`flex ${reverse ? 'flex-row-reverse' : 'flex-row'} gap-4 items-center transition-all ${itemFocusClass(item, ctx)}`}>
                {item.mediaUrl && (
                  <div className={`w-2/5 shrink-0 h-32 overflow-hidden ${radiusClass}`}>
                    {isVideoUrl(item.mediaUrl) ? (
                      <video src={item.mediaUrl} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                    ) : (
                      <img src={item.mediaUrl} alt={itemLoc.title || ''} className="w-full h-full object-cover" />
                    )}
                  </div>
                )}
                <div className={item.mediaUrl ? 'w-3/5' : 'w-full'}>
                  <h4 className={`text-xl font-semibold mb-2 ${headingFont}`}>{renderColoredSegments(itemLoc.title || item.title)}</h4>
                  {(itemLoc.description || item.description) && (
                    <p className="text-sm opacity-80 mb-3 whitespace-pre-line" style={{ color: 'var(--text-muted)' }}>{renderColoredSegments(itemLoc.description || item.description)}</p>
                  )}
                  {item.price && (
                    <span className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono px-3 py-1 rounded-full text-sm inline-block" style={{ background: 'var(--primary-fill)', color: '#fff' }}>
                        {item.price}
                      </span>
                      <OrderButton title={itemLoc.title || item.title} />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  } else if (layoutVariant === 'price-table') {
    inner = (
      <>
        {CoverMedia}
        <h2 className={`text-2xl mb-6 font-bold ${headingFont}`}>{renderColoredSegments(blockTitle)}</h2>
        {IntroText}
        <div className="space-y-1">
          {items.map((item, idx) => {
            const itemLoc = item[locale] || item;
            return (
              <div key={idx} {...itemDataProps(item)} className={`flex items-baseline gap-3 py-3 border-b last:border-0 transition-all ${itemFocusClass(item, ctx)}`} style={{ borderColor: 'var(--border)' }}>
                <span className={`font-semibold ${headingFont}`}>{renderColoredSegments(itemLoc.title || item.title)}</span>
                <span className="flex-1 border-b border-dotted opacity-30 translate-y-[-4px]" style={{ borderColor: 'var(--text-muted)' }} />
                {item.price && (
                  <span className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-sm">{item.price}</span>
                    <OrderButton title={itemLoc.title || item.title} />
                  </span>
                )}
                {(itemLoc.description || item.description) && (
                  <span className="w-full basis-full text-sm mt-1 opacity-70 whitespace-pre-line" style={{ color: 'var(--text-muted)' }}>{renderColoredSegments(itemLoc.description || item.description)}</span>
                )}
              </div>
            );
          })}
        </div>
      </>
    );
  } else {
    inner = (
      <>
        {CoverMedia}
        <h2 className={`text-2xl mb-6 font-bold ${headingFont}`}>{renderColoredSegments(blockTitle)}</h2>
        {IntroText}
        <div className={layoutVariant === 'grid-cards' ? "grid grid-cols-1 sm:grid-cols-2 gap-4" : "space-y-4"}>
          {items.map((item: any, idx: number) => {
            const itemLoc = item[locale] || item;
            const pos = item.mediaPosition || 'top';
            
            // "top"/"bottom" is documented (and labeled in the editor) as before/after the text,
            // i.e. vertical stacking — 'list' used to instead render it as a small side-by-side
            // thumbnail (flex-row/flex-row-reverse on wider screens), which silently ignored the
            // picked position and contradicted its own "alt alta" (stacked) design intent.
            // aspect-square (not a fixed h-40 band) — a fixed short height on a full-width card
            // crops a landscape photo down to a thin strip; a square crop, Instagram-style, keeps
            // enough of the actual photo visible regardless of the card's width.
            const MediaEl = item.mediaUrl && theme.mediaProfile !== 'minimal' ? (
              isVideoUrl(item.mediaUrl) ? (
                <video src={item.mediaUrl} className={`object-cover ${radiusClass} w-full aspect-square ${pos === 'bottom' ? 'mt-4' : 'mb-4'}`} autoPlay loop muted playsInline />
              ) : (
                <img src={item.mediaUrl} alt={itemLoc.title || ''} className={`object-cover ${radiusClass} w-full aspect-square ${pos === 'bottom' ? 'mt-4' : 'mb-4'}`} />
              )
            ) : null;

            return (
              <div
                key={idx}
                {...itemDataProps(item)}
                className={`p-5 border transition-transform hover:-translate-y-1 ${radiusClass} flex flex-col ${itemFocusClass(item, ctx)}`}
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
              >
                {pos !== 'bottom' && MediaEl}
                <div className={`flex-1 ${layoutVariant === 'list' ? 'w-full' : 'flex justify-between items-start gap-4 w-full'}`}>
                  <div>
                    <h4 className={`font-semibold text-lg ${headingFont}`}>{renderColoredSegments(itemLoc.title || item.title)}</h4>
                    {(itemLoc.description || item.description) && (
                      <p className="text-sm mt-2 opacity-80 whitespace-pre-line" style={{ color: 'var(--text-muted)' }}>
                        {renderColoredSegments(itemLoc.description || item.description)}
                      </p>
                    )}
                  </div>
                  {item.price && (
                    <div className={`flex items-center gap-3 flex-wrap ${layoutVariant === 'list' ? 'mt-10 sm:mt-0 sm:ml-auto shrink-0' : 'shrink-0'}`}>
                      <span
                        className="font-mono font-medium px-3 py-1 rounded-full text-sm whitespace-nowrap inline-block"
                        style={{ background: 'var(--primary-fill)', color: '#fff' }}
                      >
                        {item.price}
                      </span>
                      <OrderButton title={itemLoc.title || item.title} />
                    </div>
                  )}
                </div>
                {pos === 'bottom' && MediaEl}
              </div>
            );
          })}
        </div>
      </>
    );
  }

  return withSectionBackground(inner, block.id, ctx, block.content?.backgroundImage, block.content?.backgroundOverlay);
}

const DAY_KEYS_BY_JS_INDEX: DayKey[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function renderHours(block: any, ctx: RenderCtx) {
  const { locale, radiusClass, headingFont } = ctx;
  const blockTitle = blockTitleOf(block, locale);
  const layoutVariant = block.content?.layoutVariant || 'table';
  const labels = getHoursLabels(locale);

  if (layoutVariant === 'pill-row') {
    return (
      <section key={block.id}>
        <h2 className={`text-2xl mb-6 font-bold ${headingFont}`}>{renderColoredSegments(blockTitle)}</h2>
        <div className="flex flex-wrap gap-2">
          {DAY_KEYS_BY_JS_INDEX.slice(1).concat(DAY_KEYS_BY_JS_INDEX[0]).map((day) => {
            const data = block.content?.schedule?.[day];
            return (
              <span
                key={day}
                title={data?.isOpen ? `${data.openTime} - ${data.closeTime}` : labels.closed}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border ${data?.isOpen ? '' : 'opacity-50'}`}
                style={{
                  background: data?.isOpen ? 'var(--primary-fill)' : 'var(--surface)',
                  color: data?.isOpen ? '#fff' : 'var(--text-muted)',
                  borderColor: 'var(--border)',
                }}
              >
                {labels.dayAbbr[day] || day}
              </span>
            );
          })}
        </div>
      </section>
    );
  }

  if (layoutVariant === 'compact-badge') {
    const todayKey = DAY_KEYS_BY_JS_INDEX[new Date().getDay()];
    const todayData = block.content?.schedule?.[todayKey];
    return (
      <section key={block.id}>
        <h2 className={`text-2xl mb-6 font-bold ${headingFont}`}>{renderColoredSegments(blockTitle)}</h2>
        <details className={`border ${radiusClass} overflow-hidden`} style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <summary className="cursor-pointer list-none p-4 flex items-center justify-between [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2 text-sm font-medium">
              <span className={`w-2 h-2 rounded-full ${todayData?.isOpen ? 'bg-green-500' : 'bg-red-500'}`} />
              {todayData?.isOpen ? `${labels.todayOpen} · ${todayData.openTime} - ${todayData.closeTime}` : labels.todayClosed}
            </span>
            <span className="text-xs opacity-60">{labels.allHours}</span>
          </summary>
          <div className="px-4 pb-4 pt-3 border-t space-y-2 font-mono text-xs" style={{ borderColor: 'var(--border)' }}>
            {Object.entries(block.content?.schedule || {}).map(([day, data]: [string, any]) => (
              <div key={day} className="flex justify-between">
                <span className="opacity-70">{labels.days[day as DayKey] || day}</span>
                <span>{data.isOpen ? `${data.openTime} - ${data.closeTime}` : labels.closed}</span>
              </div>
            ))}
          </div>
        </details>
      </section>
    );
  }

  return (
    <section key={block.id}>
      <h2 className={`text-2xl mb-6 font-bold ${headingFont}`}>{renderColoredSegments(blockTitle)}</h2>
      <div
        className={`border p-6 ${radiusClass}`}
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="space-y-3 font-mono text-sm">
          {Object.entries(block.content?.schedule || {}).map(([day, data]: [string, any]) => (
            <div key={day} className="flex justify-between border-b pb-3 last:border-0 last:pb-0" style={{ borderColor: 'var(--border)' }}>
              <span className="capitalize" style={{ color: 'var(--text-muted)' }}>{labels.days[day as DayKey] || day}</span>
              <span className={data.isOpen ? 'font-medium' : 'opacity-60'}>
                {data.isOpen ? `${data.openTime} - ${data.closeTime}` : labels.closed}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function renderFAQ(block: any, ctx: RenderCtx) {
  const { locale, radiusClass, headingFont } = ctx;
  const blockTitle = blockTitleOf(block, locale);
  const layoutVariant = block.content?.layoutVariant || 'chips';
  const items = getLocalizedItems(block, locale);

  if (layoutVariant === 'numbered') {
    return (
      <section key={block.id}>
        <h2 className={`text-2xl mb-6 font-bold ${headingFont}`}>{renderColoredSegments(blockTitle)}</h2>
        <div className="space-y-6">
          {items.map((item: any, idx: number) => {
            const question = item.question?.[locale] || item.question;
            const answer = item.answer?.[locale] || item.answer;
            return (
            <div key={idx} {...itemDataProps(item)} className={`flex items-start gap-4 pb-6 border-b last:border-0 last:pb-0 transition-all ${itemFocusClass(item, ctx)}`} style={{ borderColor: 'var(--border)' }}>
              <span className={`text-4xl leading-none opacity-30 shrink-0 ${headingFont}`} style={{ color: 'var(--primary)' }}>
                {String(idx + 1).padStart(2, '0')}
              </span>
              <div>
                <h4 className="font-semibold text-base mb-1">{renderColoredSegments(question)}</h4>
                <p className="text-sm opacity-80 whitespace-pre-line" style={{ color: 'var(--text-muted)' }}>{renderColoredSegments(answer)}</p>
              </div>
            </div>
            );
          })}
        </div>
      </section>
    );
  }

  if (layoutVariant === 'accordion') {
    return (
      <section key={block.id}>
        <h2 className={`text-2xl mb-6 font-bold ${headingFont}`}>{renderColoredSegments(blockTitle)}</h2>
        <div className="space-y-2">
          {items.map((item: any, idx: number) => {
            const question = item.question?.[locale] || item.question;
            const answer = item.answer?.[locale] || item.answer;
            return (
            <details key={idx} {...itemDataProps(item)} className={`border ${radiusClass} overflow-hidden transition-all ${itemFocusClass(item, ctx)}`} style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
              <summary className="cursor-pointer list-none p-4 font-medium text-sm flex justify-between items-center gap-3 [&::-webkit-details-marker]:hidden">
                <span>{renderColoredSegments(question)}</span>
                <span className="opacity-40 shrink-0" style={{ color: 'var(--primary)' }}>+</span>
              </summary>
              <div className="px-4 pb-4 text-sm opacity-80 whitespace-pre-line" style={{ color: 'var(--text-muted)' }}>{renderColoredSegments(answer)}</div>
            </details>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section key={block.id}>
      <h2 className={`text-2xl mb-6 font-bold ${headingFont}`}>{renderColoredSegments(blockTitle)}</h2>
      <div className="flex flex-wrap gap-2">
        {items.map((item: any, idx: number) => {
          const question = item.question?.[locale] || item.question;
          return (
          <button
            key={idx}
            {...itemDataProps(item)}
            onClick={() => window.dispatchEvent(new CustomEvent('sendToChat', { detail: stripColorSyntax(question) }))}
            className={`text-left px-4 py-2 border transition-all hover:scale-105 ${radiusClass} ${itemFocusClass(item, ctx)}`}
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--primary)' }}
          >
            <span className="font-medium text-sm">{renderColoredSegments(question)}</span>
          </button>
          );
        })}
      </div>
    </section>
  );
}

function renderGallery(block: any, ctx: RenderCtx) {
  const { locale, radiusClass, headingFont } = ctx;
  const blockTitle = blockTitleOf(block, locale);
  const layoutVariant = block.content?.layoutVariant || 'grid';
  const items = getLocalizedItems(block, locale);

  if (layoutVariant === 'fullbleed-carousel') {
    return (
      <section key={block.id} className="pt-4">
        <h2 className={`text-2xl mb-6 font-bold ${headingFont}`}>{renderColoredSegments(blockTitle)}</h2>
        <div className="flex overflow-x-auto snap-x gap-0 hide-scrollbar -mx-4" style={{ scrollbarWidth: 'none' }}>
          {items.map((item: any, idx: number) => {
            const caption = item.caption?.[locale] || item.caption;
            return (
              <div key={idx} {...itemDataProps(item)} className={`relative shrink-0 w-[85%] h-72 snap-center group overflow-hidden transition-all ${itemFocusClass(item, ctx)}`}>
                {isVideoUrl(item.url) ? (
                  <video src={item.url} className="w-full h-full object-cover" controls />
                ) : (
                  <img src={item.url} alt={caption || 'Gallery'} className="w-full h-full object-cover" />
                )}
                {caption && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <p className="text-white text-xs font-medium">{renderColoredSegments(caption)}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  if (layoutVariant === 'stacked-fullwidth') {
    return (
      <section key={block.id} className="pt-4">
        <h2 className={`text-2xl mb-6 font-bold ${headingFont}`}>{renderColoredSegments(blockTitle)}</h2>
        <div className="flex flex-col gap-4">
          {items.map((item: any, idx: number) => {
            const caption = item.caption?.[locale] || item.caption;
            return (
              <div key={idx} {...itemDataProps(item)} className={`relative overflow-hidden group h-64 sm:h-80 ${radiusClass} transition-all ${itemFocusClass(item, ctx)}`}>
                {isVideoUrl(item.url) ? (
                  <video src={item.url} className="w-full h-full object-cover" controls />
                ) : (
                  <img src={item.url} alt={caption || 'Gallery'} className="w-full h-full object-cover" />
                )}
                {caption && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                    <p className="text-white text-sm font-medium">{renderColoredSegments(caption)}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  if (layoutVariant === 'masonry') {
    return (
      <section key={block.id} className="pt-4">
        <h2 className={`text-2xl mb-6 font-bold ${headingFont}`}>{renderColoredSegments(blockTitle)}</h2>
        <div className="columns-2 gap-3 space-y-3">
          {items.map((item: any, idx: number) => {
            const caption = item.caption?.[locale] || item.caption;
            return (
              <div key={idx} {...itemDataProps(item)} className={`break-inside-avoid relative group overflow-hidden ${radiusClass} transition-all ${itemFocusClass(item, ctx)}`}>
                {isVideoUrl(item.url) ? (
                  <video src={item.url} className="w-full object-cover" controls />
                ) : (
                  <img src={item.url} alt={caption || 'Gallery'} className="w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                )}
                {caption && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <p className="text-white text-xs font-medium">{renderColoredSegments(caption)}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section key={block.id} className="pt-4">
      <h2 className={`text-2xl mb-6 font-bold ${headingFont}`}>{renderColoredSegments(blockTitle)}</h2>
      <div className="grid grid-cols-2 gap-2 md:gap-4">
        {items.map((item: any, idx: number) => {
          const caption = item.caption;
          return (
            <div key={idx} {...itemDataProps(item)} className={`relative overflow-hidden group ${radiusClass} transition-all ${itemFocusClass(item, ctx)}`}>
              {isVideoUrl(item.url) ? (
                <video src={item.url} className="w-full h-40 md:h-64 object-cover" controls />
              ) : (
                <img src={item.url} alt={caption || 'Gallery'} className="w-full h-40 md:h-64 object-cover transition-transform duration-500 group-hover:scale-105" />
              )}
              {caption && (
                <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <p className="text-white text-xs text-center">{renderColoredSegments(caption)}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function renderTestimonials(block: any, ctx: RenderCtx) {
  const { locale, radiusClass, headingFont } = ctx;
  const blockTitle = blockTitleOf(block, locale);
  const layoutVariant = block.content?.layoutVariant || 'scroll-cards';
  const items: any[] = getLocalizedItems(block, locale);

  let inner: React.ReactNode;

  if (layoutVariant === 'big-quote') {
    inner = (
      <>
        <h2 className={`text-2xl mb-8 font-bold text-center ${headingFont}`}>{renderColoredSegments(blockTitle)}</h2>
        <div className="flex flex-col gap-12">
          {items.map((item, idx) => {
            const quote = item.quote;
            const role = item.role;
            return (
              <div key={idx} {...itemDataProps(item)} className={`text-center max-w-lg mx-auto transition-all ${itemFocusClass(item, ctx)}`}>
                <div className="text-5xl mb-3 opacity-30 font-serif leading-none" style={{ color: 'var(--primary)' }}>"</div>
                <p className={`text-2xl leading-snug italic mb-4 ${headingFont}`}>{renderColoredSegments(quote)}</p>
                <div className="font-semibold text-sm">{item.author}</div>
                {role && <div className="text-xs opacity-70 mt-1" style={{ color: 'var(--text-muted)' }}>{renderColoredSegments(role)}</div>}
              </div>
            );
          })}
        </div>
      </>
    );
  } else if (layoutVariant === 'grid-quotes') {
    inner = (
      <>
        <h2 className={`text-2xl mb-6 font-bold ${headingFont}`}>{renderColoredSegments(blockTitle)}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map((item, idx) => {
            const quote = item.quote;
            const role = item.role;
            return (
              <div key={idx} {...itemDataProps(item)} className={`p-4 border ${radiusClass} transition-all ${itemFocusClass(item, ctx)}`} style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                <p className="text-sm italic mb-3 opacity-90 leading-relaxed">{renderColoredSegments(quote)}</p>
                <div className="font-semibold text-xs">{item.author}</div>
                {role && <div className="text-[11px] opacity-70 mt-0.5" style={{ color: 'var(--text-muted)' }}>{renderColoredSegments(role)}</div>}
              </div>
            );
          })}
        </div>
      </>
    );
  } else {
    inner = (
      <>
        <h2 className={`text-2xl mb-6 font-bold ${headingFont}`}>{renderColoredSegments(blockTitle)}</h2>
        <div className="flex overflow-x-auto gap-4 pb-4 snap-x hide-scrollbar" style={{ scrollbarWidth: 'none' }}>
          {items.map((item: any, idx: number) => {
            const quote = item.quote;
            const role = item.role;
            return (
              <div
                key={idx}
                {...itemDataProps(item)}
                className={`min-w-[85%] md:min-w-[300px] p-6 border snap-center ${radiusClass} transition-all ${itemFocusClass(item, ctx)}`}
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
              >
                <div className="text-[var(--primary)] text-3xl mb-2 opacity-50 leading-none font-serif">"</div>
                <p className="text-[15px] italic mb-4 opacity-90 leading-relaxed">{renderColoredSegments(quote)}</p>
                <div className="font-bold text-sm">{item.author}</div>
                {role && <div className="text-xs mt-1 opacity-70" style={{ color: 'var(--text-muted)' }}>{renderColoredSegments(role)}</div>}
              </div>
            );
          })}
        </div>
      </>
    );
  }

  return withSectionBackground(inner, block.id, ctx, block.content?.backgroundImage, block.content?.backgroundOverlay);
}

function renderLinks(block: any, ctx: RenderCtx) {
  const { locale, radiusClass, headingFont } = ctx;
  const blockTitle = blockTitleOf(block, locale);
  const items: any[] = getLocalizedItems(block, locale);
  if (items.length === 0) return null;
  const layoutVariant = block.content?.layoutVariant || 'stacked';

  if (layoutVariant === 'two-col-grid') {
    return (
      <section key={block.id}>
        <h2 className={`text-2xl mb-6 font-bold ${headingFont}`}>{renderColoredSegments(blockTitle)}</h2>
        <div className="grid grid-cols-2 gap-3">
          {items.map((item: any, idx: number) => (
            <a
              key={idx}
              {...itemDataProps(item)}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`p-4 text-center font-semibold border shadow-sm transition hover:scale-[1.02] ${radiusClass} ${itemFocusClass(item, ctx)}`}
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--primary)' }}
            >
              {renderColoredSegments(item.label)}
            </a>
          ))}
        </div>
      </section>
    );
  }

  if (layoutVariant === 'icon-row') {
    return (
      <section key={block.id}>
        <h2 className={`text-2xl mb-6 font-bold ${headingFont}`}>{renderColoredSegments(blockTitle)}</h2>
        <div className="flex flex-wrap gap-3 justify-center">
          {items.map((item: any, idx: number) => {
            const Icon = iconForLinkUrl(item.url);
            return (
              <a
                key={idx}
                {...itemDataProps(item)}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                title={item.label}
                className={`w-14 h-14 rounded-full border flex items-center justify-center transition hover:scale-110 ${itemFocusClass(item, ctx)}`}
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--primary)' }}
              >
                <Icon className="w-6 h-6" />
              </a>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section key={block.id}>
      <h2 className={`text-2xl mb-6 font-bold ${headingFont}`}>{renderColoredSegments(blockTitle)}</h2>
      <div className="flex flex-col gap-3">
        {items.map((item: any, idx: number) => (
          <a
            key={idx}
            {...itemDataProps(item)}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full p-4 text-center font-semibold border shadow-sm transition hover:scale-[1.02] ${radiusClass} ${itemFocusClass(item, ctx)}`}
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--primary)' }}
          >
            {renderColoredSegments(item.label)}
          </a>
        ))}
      </div>
    </section>
  );
}

function contactHref(method: string, value: string) {
  switch (method) {
    case 'whatsapp': return `https://wa.me/${value.replace(/\D/g, '')}`;
    case 'instagram': return `https://instagram.com/${value.replace(/^@/, '')}`;
    case 'telegram': return `https://t.me/${value.replace(/^@/, '')}`;
    case 'email': return `mailto:${value}`;
    default: return '#';
  }
}

function contactIcon(method: string) {
  switch (method) {
    case 'whatsapp': return MessageCircle;
    case 'instagram': return AtSign;
    case 'email': return Mail;
    default: return LinkIcon;
  }
}

// Resolves what an "Order Now" button does, per business.saule_settings.orderNowBehavior:
// 'saule' (default/unset) opens the chat widget with the visitor's intent as their first
// message (same event the FAQ "chips" variant already dispatches); any other value is a
// contact method key (whatsapp/instagram/telegram/email) and hands off straight to it via the
// same wa.me/ig.me/t.me/mailto links as `contactHref` above. Returns null when the configured
// method has no value filled in (İletişim section) so callers can hide the button instead of
// rendering a dead click target.
function buildOrderNowHandler(
  behavior: string | null | undefined,
  contactValues: Record<string, string>
): ((message: string) => void) | null {
  if (!behavior || behavior === 'saule') {
    return (message: string) => window.dispatchEvent(new CustomEvent('sendToChat', { detail: message }));
  }
  const value = contactValues[behavior];
  if (!value?.trim()) return null;
  const url = contactHref(behavior, value);
  return () => window.open(url, '_blank', 'noopener,noreferrer');
}

// Synthetic block (see `visibleBlocks` below) built from business.contact_method/contact_value —
// not a real `blocks` row, so it reads its data from block.content.method/.value instead of the
// usual per-locale content shape.
function renderContact(block: any, ctx: RenderCtx) {
  const { locale, radiusClass, headingFont, activeItemId, onEngagementClick } = ctx;
  const methodKeys: string[] = (block.content?.method || '').split(',').filter(Boolean);
  let values: Record<string, string> = {};
  try { values = block.content?.value ? JSON.parse(block.content.value) : {}; } catch { values = {}; }
  const items = methodKeys.map((key) => ({ key, value: values[key] })).filter((i) => i.value?.trim());
  if (items.length === 0) return null;

  return (
    <section key={block.id}>
      <h2 className={`text-2xl mb-6 font-bold ${headingFont}`}>{defaultTitleFor('contact', locale)}</h2>
      <div className="flex flex-col gap-3">
        {items.map(({ key, value }) => {
          const Icon = contactIcon(key);
          const isActive = activeItemId === key;
          return (
            <a
              key={key}
              data-tb-item-id={key}
              href={contactHref(key, value)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onEngagementClick('contact_click', key)}
              className={`w-full p-4 flex items-center gap-3 font-semibold border shadow-sm transition hover:scale-[1.02] ${radiusClass} ${
                isActive ? 'ring-2 ring-[var(--coral)] scale-[1.02]' : ''
              }`}
              style={{ 
                backgroundColor: 'var(--surface)', 
                borderColor: isActive ? 'var(--coral)' : 'var(--border)', 
                color: 'var(--primary)' 
              }}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span>{CONTACT_METHOD_LABELS[key]?.[locale] || key}: {value}</span>
            </a>
          );
        })}
      </div>
    </section>
  );
}

const BLOCK_RENDERERS: Record<string, (block: any, ctx: RenderCtx) => React.ReactNode> = {
  about: renderAbout,
  services: renderServices,
  extra_services: renderServices,
  pricing: renderServices,
  hours: renderHours,
  faq: renderFAQ,
  gallery: renderGallery,
  testimonials: renderTestimonials,
  links: renderLinks,
  contact: renderContact,
  custom: renderTextBlock,
};

export default function ArchetypeRenderer({
  blocks,
  theme: themeProp,
  businessName,
  description,
  activeBlockId: controlledActiveBlockId,
  activeItemId,
  activeOpenSequence = 0,
  onActiveBlockChange,
  contactMethod,
  contactValue,
  orderNowBehavior,
  categoryId,
  pageType = 'hybrid',
  interactiveEntrySettings,
  conversionFlowSettings,
}: {
  blocks: any[],
  theme?: Theme | null,
  businessName: string,
  description?: string,
  // Optional controlled active-block state, so a parent header (page title row) can render the
  // "back" control itself instead of it floating inside the scrollable block content. Falls back
  // to internal state when omitted.
  activeBlockId?: string | null,
  activeItemId?: string | null,
  activeOpenSequence?: number,
  onActiveBlockChange?: (id: string | null) => void,
  // business.contact_method / business.contact_value — rendered as a real page section (like any
  // other block) when at least one method has a value, positioned right after services.
  contactMethod?: string | null,
  contactValue?: string | null,
  // business.saule_settings.orderNowBehavior — see buildOrderNowHandler.
  orderNowBehavior?: string | null,
  // business.category_id — see RenderCtx.categoryId / orderNowLabel.
  categoryId?: string | null,
  pageType?: PublicPageType,
  interactiveEntrySettings?: InteractiveEntrySettings | null,
  conversionFlowSettings?: ConversionFlowSettings | null,
}) {
  const [internalActiveBlockId, setInternalActiveBlockId] = useState<string | null>(null);
  const activeBlockId = controlledActiveBlockId !== undefined ? controlledActiveBlockId : internalActiveBlockId;
  const locale = useLocale();
  // useOptionalPublicPageRuntime() editör önizlemesinde (Provider yok) null döner — no-op'a düşer.
  const pageRuntime = useOptionalPublicPageRuntime();
  const openLegacyView = useCallback(
    (blockId: string) => {
      if (pageRuntime?.openBlock(blockId).ok) return;
      if (onActiveBlockChange) onActiveBlockChange(blockId);
      else setInternalActiveBlockId(blockId);
    },
    [onActiveBlockChange, pageRuntime]
  );
  const onEngagementClick = useCallback(
    (eventType: 'contact_click' | 'order_click', channel?: string | null) => {
      pageRuntime?.recordEngagementClick(eventType, channel);
    },
    [pageRuntime]
  );

  // Linktree tiles open the full page (like website mode) scrolled to the tapped section, rather
  // than isolating just that block — so visitors can still scroll up/down to the neighboring
  // sections from there. This ref+effect jumps to the tapped section right after it mounts.
  const activeBlockNodeRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedTargetRef = useRef<string>('');
  useEffect(() => {
    if (!activeBlockId || !activeBlockNodeRef.current) return;
    const targetKey = `${activeBlockId}:${activeItemId || '__block'}:${activeOpenSequence}`;
    if (lastFocusedTargetRef.current === targetKey) return;
    lastFocusedTargetRef.current = targetKey;
    activeBlockNodeRef.current.scrollIntoView({ behavior: activeItemId ? 'auto' : 'smooth', block: 'start' });
    if (!activeItemId) return;
    const node = activeBlockNodeRef.current.querySelector(`[data-tb-item-id="${CSS.escape(activeItemId)}"]`);
    node?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeBlockId, activeItemId, activeOpenSequence]);

  const theme = themeProp || DEFAULT_THEME;
  const isClassicPage = pageType === 'classic';

  const radiusClass = useMemo(() => {
    switch (theme.borderRadius) {
      case 'none': return 'rounded-none';
      case 'sm': return 'rounded-md';
      case 'md': return 'rounded-xl';
      case 'xl': return 'rounded-2xl';
      case 'full': return 'rounded-3xl';
      default: return 'rounded-2xl';
    }
  }, [theme]);

  // `contact` is no longer a real row in `blocks` (edited as business.contact_method/contact_value
  // in the dashboard's fixed "İletişim" section instead) — synthesize a virtual block for it here
  // so it renders as a real page section/tile like everything else, always last. A fixed order
  // (e.g. 2.5, "right after services") used to place it — but custom sections can land on either
  // side of any fixed number, so it drifted into the middle of the page instead of staying at the
  // bottom. Sorting the real blocks first and appending contact after guarantees "always last"
  // regardless of what order values the other blocks end up with.
  // Parsed once and shared by the virtual contact block below and the Order Now click handler.
  const contactValues = useMemo(() => {
    try { return contactValue ? JSON.parse(contactValue) : {}; } catch { return {}; }
  }, [contactValue]);

  const visibleBlocks = useMemo(() => {
    const real = blocks
      .filter(b => b.type !== 'settings' && b.type !== 'contact' && b.is_visible !== false && hasRealContentForLocale(b, locale))
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    
    // Extricate the SSS (faq) block to guarantee it renders at the very bottom of the page
    const faqBlock = real.find(b => b.type === 'faq');
    const otherBlocks = real.filter(b => b.type !== 'faq');
    
    const hasAnyValue = (contactMethod || '').split(',').filter(Boolean).some((k) => contactValues[k]?.trim());
    
    const finalBlocks = [...otherBlocks];
    
    if (hasAnyValue) {
      const contactBlock = { id: '__contact__', type: 'contact', content: { method: contactMethod, value: contactValue } };
      finalBlocks.push(contactBlock);
    }
    
    if (faqBlock) {
      finalBlocks.push(faqBlock);
    }
    
    return finalBlocks;
  }, [blocks, contactMethod, contactValue, contactValues, locale]);

  const navigationBlocks = useMemo(
    () => blocks
      .filter((block) => block.type !== 'settings' && block.type !== 'contact' && block.is_visible !== false && hasRealContentForLocale(block, locale))
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [blocks, locale]
  );
  const shortcuts = useMemo(() => resolveShortcuts(blocks), [blocks]);

  const rawOrderNowClick = useMemo(
    () => buildOrderNowHandler(orderNowBehavior, contactValues),
    [orderNowBehavior, contactValues]
  );
  const onOrderNowClick = useMemo(() => {
    if (!rawOrderNowClick) return null;
    return (message: string) => {
      onEngagementClick('order_click', orderNowBehavior || 'saule');
      rawOrderNowClick(message);
    };
  }, [rawOrderNowClick, onEngagementClick, orderNowBehavior]);

  const styleVars = useMemo(() => {
    const c = resolveThemeColors(theme);
    return {
      '--bg': c.background,
      '--surface': c.surface,
      '--primary': c.primary,
      '--primary-fill': resolveAccentFill(theme),
      '--text': c.text,
      '--text-muted': c.textMuted,
      '--border': c.border,
      '--heading-font': `"${theme.headingFont}", sans-serif`,
      '--body-font': `"${theme.bodyFont}", sans-serif`,
    } as React.CSSProperties;
  }, [theme]);

  // Fixed hook classes (see the <style> block below) — the actual font-family comes from the
  // AI-generated --heading-font/--body-font CSS variables above, not from a Tailwind class,
  // since theme.headingFont/bodyFont are arbitrary Google Font names rather than a fixed set.
  const headingFont = 'tb-heading';
  const bodyFont = 'tb-body';
  const cardWrap = theme.layoutStyle === 'card-heavy';
  const sectionGapClass = SECTION_GAP_CLASS[theme.layoutStyle] || 'gap-10';
  const renderCtx: RenderCtx = { locale, radiusClass, headingFont, theme, cardWrap, onOrderNowClick, businessName, categoryId, activeItemId, onEngagementClick };

  const renderBlock = (block: any, focusedItemId = activeItemId) => {
    const renderFn = BLOCK_RENDERERS[block.type];
    if (!renderFn) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`ArchetypeRenderer: "${block.type}" blok tipi için bir render fonksiyonu kayıtlı değil, gösterilmeyecek.`);
      }
      return null;
    }
    return renderFn(block, { ...renderCtx, activeItemId: focusedItemId });
  };

  return (
    <div
      className={`${activeBlockId || isClassicPage ? 'min-h-full pb-20' : 'h-full min-h-full pb-0'} ${bodyFont}`}
      style={{
        ...styleVars,
        background: 'var(--tb-page-bg, var(--bg))',
        color: 'var(--text)'
      }}
    >
      <style>{`
        .markdown-body p { margin-bottom: 1rem; line-height: 1.6; }
        .markdown-body ul { list-style-type: disc; margin-left: 1.5rem; margin-bottom: 1rem; }
        .markdown-body ol { list-style-type: decimal; margin-left: 1.5rem; margin-bottom: 1rem; }
        .markdown-body strong { font-weight: 700; color: inherit; }
        .markdown-body em { font-style: italic; }
        .markdown-body a { color: inherit; text-decoration: underline; }
        .tb-heading { font-family: var(--heading-font); }
        .tb-body { font-family: var(--body-font); }
        .tb-focused-item {
          outline: 2px solid var(--primary);
          outline-offset: 4px;
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.14);
          transform: translateY(-1px);
        }
        .tb-linktree-tile {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          min-height: 64px;
          box-shadow: 0 16px 36px rgba(15, 23, 42, 0.08);
        }
        .tb-linktree-tile::before {
          content: "";
          position: absolute;
          inset: 0 auto 0 0;
          width: 4px;
          background: var(--primary-fill);
          opacity: 0.9;
        }
        .tb-linktree-tile::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, transparent 38%, color-mix(in srgb, var(--primary) 10%, transparent));
          z-index: -1;
        }
        .tb-active-block {
          position: relative;
          animation: tbSceneIn 520ms ease-out both;
        }
        .tb-active-block::before {
          content: "";
          position: absolute;
          inset: -10px;
          border: 1px solid var(--primary);
          border-radius: 18px;
          pointer-events: none;
          animation: tbSceneFrame 1100ms ease-out both;
        }
        @keyframes tbSceneIn {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes tbSceneFrame {
          0% { opacity: 0; transform: scale(0.98); }
          18% { opacity: 0.38; }
          100% { opacity: 0; transform: scale(1.015); }
        }
      `}</style>

      <div className={activeBlockId || isClassicPage ? 'flex flex-col gap-10' : 'flex h-full flex-col'}>
        {!activeBlockId && !isClassicPage && (
          <ProfileEntryCard
            visibleBlocks={visibleBlocks}
            navigationBlocks={navigationBlocks}
            businessId={pageRuntime?.businessId || ''}
            businessName={businessName}
            description={description}
            shortcuts={shortcuts}
            locale={locale}
            theme={theme}
            renderBlock={renderBlock}
            openLegacyView={openLegacyView}
            pageType={pageType}
            interactiveEntrySettings={interactiveEntrySettings}
            conversionFlowSettings={conversionFlowSettings}
          />
        )}

        {(activeBlockId || isClassicPage) && (
          <div className={`flex flex-col ${sectionGapClass}`}>
            {visibleBlocks.map(block => (
              <div key={block.id === activeBlockId ? `${block.id}:${activeOpenSequence}` : block.id}>
                <div
                  ref={activeBlockId && block.id === activeBlockId ? activeBlockNodeRef : undefined}
                  className={activeBlockId && block.id === activeBlockId ? 'tb-active-block scroll-mt-4' : undefined}
                >
                  {renderBlock(block)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
