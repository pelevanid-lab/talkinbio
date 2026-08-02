import type { PageActionBlockTarget } from '@/utils/pageActionTargets';
import { formatSauleCueMarker, type SauleCueKey } from './core';

export type PageRouteMatch = {
  blockId: string;
  itemId?: string;
  text: string;
  cueKey?: SauleCueKey;
};

const ACTION_MARKER_START = '§§ACTION§§';
const ACTION_MARKER_END = '§§/ACTION§§';

const STOP_WORDS = new Set([
  'bir',
  'bu',
  'su',
  'şu',
  've',
  'ile',
  'icin',
  'için',
  'mi',
  'mu',
  'ne',
  'neler',
  'nasil',
  'nasıl',
  'hakkinda',
  'hakkında',
  'var',
  'mı',
  'the',
  'and',
  'for',
  'what',
  'how',
  'about',
  'есть',
  'как',
  'что',
]);

const TYPE_KEYWORDS: Record<string, string[]> = {
  about: ['hakkinda', 'hakkımızda', 'kimdir', 'nedir', 'about', 'о нас'],
  services: [
    'hizmet',
    'hizmetler',
    'neler yapabilir',
    'neler yapabiliyor',
    'ne yapiyor',
    'ne yapabiliyor',
    'yapabilir',
    'yapabiliyor',
    'danismanlik',
    'service',
    'services',
    'услуг',
  ],
  pricing: ['fiyat', 'ucret', 'ücret', 'paket', 'kac para', 'ne kadar', 'price', 'pricing', 'стоимост', 'цена'],
  extra_services: ['ek hizmet', 'paket', 'fiyat', 'ucret', 'service', 'pricing'],
  faq: ['soru', 'sss', 'faq', 'вопрос'],
  gallery: ['galeri', 'portfolyo', 'ornek', 'örnek', 'calisma', 'çalışma', 'gallery', 'portfolio', 'пример'],
  testimonials: ['yorum', 'referans', 'musteri', 'müşteri', 'testimonial', 'review', 'отзыв'],
  links: ['link', 'baglanti', 'bağlantı', 'site'],
  contact: ['iletisim', 'iletişim', 'ulasirim', 'ulaşırım', 'ulasabilir', 'ulaşabilir', 'whatsapp', 'telefon', 'mail', 'email', 'instagram', 'telegram', 'contact', 'reach', 'связ'],
};

const CONTACT_CHANNEL_KEYWORDS: Record<string, string[]> = {
  whatsapp: ['whatsapp', 'telefon', 'phone'],
  email: ['mail', 'email', 'e posta', 'eposta'],
  instagram: ['instagram', 'ig'],
  telegram: ['telegram'],
};

function normalize(value: string): string {
  return value
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{Letter}\p{Number}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(value: string): string[] {
  return normalize(value)
    .split(' ')
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function overlapScore(queryTokens: string[], labelTokens: string[]): number {
  if (labelTokens.length === 0) return 0;
  const querySet = new Set(queryTokens);
  return labelTokens.reduce((score, token) => score + (querySet.has(token) ? 1 : 0), 0);
}

function requestedContactChannels(query: string): string[] {
  return Object.entries(CONTACT_CHANNEL_KEYWORDS)
    .filter(([, keywords]) => keywords.some((keyword) => query.includes(normalize(keyword))))
    .map(([channel]) => channel);
}

function contactItemMatchesRequestedChannel(item: { itemId: string; label: string }, channels: string[]): boolean {
  if (channels.length === 0) return true;
  const itemText = normalize(`${item.itemId} ${item.label}`);
  return channels.some((channel) => itemText.includes(channel));
}

function localizedCue(locale: string | null | undefined): string {
  if (locale === 'en') return 'Opening the right place here.';
  if (locale === 'ru') return 'Открываю нужное место здесь.';
  return 'İlgili yeri açıyorum.';
}

function localizedMissingContactCue(locale: string | null | undefined, requestedChannel: string, availableLabel: string): string {
  if (locale === 'en') {
    return `I couldn't find ${requestedChannel} on this page. You can reach them here instead: ${availableLabel}.`;
  }
  if (locale === 'ru') {
    return `This page does not list ${requestedChannel}. You can use this contact instead: ${availableLabel}.`;
  }
  return `Bu sayfada ${requestedChannel} bilgisi yok. Bunun yerine buradan ulasabilirsiniz: ${availableLabel}.`;
}

function isNavigationQuestion(query: string): boolean {
  const normalizedQuery = normalize(query);
  return [
    'goster',
    'göster',
    'ac',
    'aç',
    'bak',
    'incele',
    'neler',
    'nasil',
    'nasıl',
    'ne yap',
    'hakkinda',
    'hakkında',
    'fiyat',
    'ucret',
    'ücret',
    'randevu',
    'iletisim',
    'iletişim',
    'ulas',
    'ulaş',
    'whatsapp',
    'telefon',
    'mail',
    'show',
    'open',
    'pricing',
    'contact',
    'about',
    'services',
  ].some((keyword) => normalizedQuery.includes(normalize(keyword)));
}

export function formatPageAction(match: PageRouteMatch): string {
  const payload = JSON.stringify({
    type: 'open_block',
    blockId: match.blockId,
    ...(match.itemId ? { itemId: match.itemId } : {}),
  });
  const cueKey = match.cueKey || (match.itemId ? 'showing_item' : match.blockId === '__contact__' ? 'showing_contact' : 'opening_section');
  return `${formatSauleCueMarker(cueKey)}${ACTION_MARKER_START}${payload}${ACTION_MARKER_END}${match.text}`;
}

export function findPageRouteMatch(
  targets: PageActionBlockTarget[],
  userMessage: string,
  locale: string | null | undefined
): PageRouteMatch | null {
  if (!isNavigationQuestion(userMessage)) return null;

  const query = normalize(userMessage);
  const queryTokens = tokens(userMessage);
  const requestedChannels = requestedContactChannels(query);
  const contactTarget = targets.find((target) => target.type === 'contact');
  if (requestedChannels.length > 0 && contactTarget?.items?.length) {
    const requestedContactItem = contactTarget.items.find((item) => contactItemMatchesRequestedChannel(item, requestedChannels));
    if (!requestedContactItem) {
      const fallbackItem = contactTarget.items[0];
      return {
        blockId: contactTarget.blockId,
        itemId: fallbackItem.itemId,
        text: localizedMissingContactCue(locale, requestedChannels[0], fallbackItem.label),
        cueKey: 'showing_contact',
      };
    }
  }
  let bestScore = 0;
  let bestBlockId: string | null = null;
  let bestItemId: string | undefined;

  const consider = (candidate: { score: number; blockId: string; itemId?: string }) => {
    if (candidate.score < 2) return;
    if (!bestBlockId || candidate.score > bestScore) {
      bestScore = candidate.score;
      bestBlockId = candidate.blockId;
      bestItemId = candidate.itemId;
    }
  };

  for (const target of targets) {
    const label = normalize(target.label);
    const typeKeywords = TYPE_KEYWORDS[target.type] || [];
    const keywordHit = typeKeywords.some((keyword) => query.includes(normalize(keyword)));
    const labelHit = label.length > 2 && query.includes(label);
    const labelScore = overlapScore(queryTokens, tokens(target.label));

    if (target.type !== 'contact' || requestedChannels.length === 0) {
      consider({
        blockId: target.blockId,
        score: (labelHit ? 4 : 0) + (keywordHit ? 3 : 0) + labelScore,
      });
    }

    for (const item of target.items) {
      if (target.type === 'contact' && !contactItemMatchesRequestedChannel(item, requestedChannels)) continue;
      const itemLabel = normalize(item.label);
      const itemLabelHit = itemLabel.length > 2 && query.includes(itemLabel);
      const itemScore = overlapScore(queryTokens, tokens(item.label));
      consider({
        blockId: target.blockId,
        itemId: item.itemId,
        score: (itemLabelHit ? 5 : 0) + itemScore + (keywordHit && target.type === 'contact' ? 3 : 0),
      });
    }
  }

  if (!bestBlockId) return null;
  return {
    blockId: bestBlockId,
    itemId: bestItemId,
    text: localizedCue(locale),
    cueKey: bestBlockId === '__contact__' ? 'showing_contact' : bestItemId ? 'showing_item' : 'opening_section',
  };
}
