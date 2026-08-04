export type QueryIntent = 'book' | 'learn' | 'buy' | 'contact' | 'ask_price' | 'unknown';

export interface ExplicitContactInfo {
  isContactQuery: boolean;
  isExplicitChannel: boolean;
  channel?: 'whatsapp' | 'phone' | 'email' | 'instagram' | 'telegram';
  isGenericRequest: boolean;
}

const NORMALIZER_MAP: Record<string, string> = {
  'ç': 'c', 'ş': 's', 'ı': 'i', 'ğ': 'g', 'ü': 'u', 'ö': 'o',
  'Ç': 'c', 'Ş': 's', 'İ': 'i', 'Ğ': 'g', 'Ü': 'u', 'Ö': 'o',
  'â': 'a', 'î': 'i', 'û': 'u', 'ё': 'е', 'Ё': 'е'
};

export function normalizeString(text: string): string {
  if (!text) return '';
  let normalized = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    normalized += NORMALIZER_MAP[char] || char;
  }
  
  const base = normalized
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, ' ') // Strip punctuation
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();

  // Split and apply robust word replacements for common phonetic/typo variations
  const words = base.split(/\s+/);
  const mapped = words.map(w => {
    if (w === 'erkeklee' || w === 'erkekle') return 'erkekler';
    if (w === 'mesaj' || w === 'mesaji' || w === 'mesajı') return 'masaj';
    if (w === 'bayanlar' || w === 'bayanlara' || w === 'kadinla' || w === 'kadinlara') return 'kadin';
    
    // Turkish stem / singular mapping for common keywords to maximize exact overlap
    if (w === 'egitimler' || w === 'egitimi' || w === 'egitimin' || w === 'egitime' || w === 'egitimiyle' || w === 'egitimb') return 'egitim';
    if (w === 'kurslar' || w === 'kursu' || w === 'kursun' || w === 'kursa' || w === 'kursula') return 'kurs';
    if (w === 'masajlar' || w === 'masaji' || w === 'masajin' || w === 'masaja' || w === 'masajiyla') return 'masaj';
    if (w === 'adresler' || w === 'adresi' || w === 'adresin' || w === 'adrese' || w === 'adresiyle') return 'adres';
    if (w === 'fiyatlar' || w === 'fiyati' || w === 'fiyatin' || w === 'fiyata') return 'fiyat';
    if (w === 'ucretler' || w === 'ucreti' || w === 'ucretin' || w === 'ucrete') return 'ucret';
    if (w === 'paketler' || w === 'paketi' || w === 'paketin' || w === 'pakete') return 'paket';
    if (w === 'seanslar' || w === 'seansi' || w === 'seansin' || w === 'seansa') return 'seans';
    if (w === 'tarihler' || w === 'tarihi' || w === 'tarihin' || w === 'tarihe') return 'tarih';
    if (w === 'teknikler' || w === 'teknigi' || w === 'teknigin' || w === 'teknige') return 'teknik';
    if (w === 'konumlar' || w === 'konumu' || w === 'konumun' || w === 'konuma') return 'konum';

    return w;
  });

  return mapped.join(' ').replace(/\s+/g, ' ').trim();
}

const DICTIONARIES = {
  tr: {
    book: ['randevu', 'rezervasyon', 'seans', 'takvim', 'tarih', 'saat', 'seans almak', 'yer ayırt', 'yer ayirt', 'randevu olustur', 'rezervasyon yap', 'masaj yaptir', 'terapi al'],
    learn: ['egitim', 'kurs', 'ogren', 'ders', 'teknik', 'akademi', 'masaj yapmayi', 'ogrenmek istiy', 'kursa katil', 'egitim format'],
    buy: ['satin al', 'siparis', 'odeme yap', 'almak istiyorum', 'sepete ekle', 'urun al', 'satın al'],
    ask_price: ['fiyat', 'ucret', 'ne kadar', 'kac para', 'tutar', 'kac tl', 'kac usd', 'kac eur', 'fiyati nedir'],
    contact: ['iletisim', 'ulas', 'yaz', 'adres', 'konum', 'nerede', 'irtibat', 'yol tarifi', 'harita', 'sosyal medya'],
    // Explicit channels
    whatsapp: ['whatsapp', 'wp', 'vatsap', 'vatap'],
    phone: ['telefon', 'tel', 'numara', 'numarasi', 'cep'],
    email: ['e-posta', 'eposta', 'e posta', 'email', 'mail'],
    instagram: ['instagram', 'ig', 'insta'],
    telegram: ['telegram', 'tg']
  },
  en: {
    book: ['book', 'appointment', 'reserve', 'reservation', 'schedule', 'calendar', 'sessions', 'slot', 'booking'],
    learn: ['learn', 'course', 'study', 'training', 'lesson', 'academy', 'class', 'techniques', 'school'],
    buy: ['buy', 'order', 'purchase', 'shop', 'pay', 'checkout', 'add to cart'],
    ask_price: ['price', 'cost', 'fee', 'how much', 'rates', 'pricing'],
    contact: ['contact', 'reach', 'phone', 'write', 'call', 'address', 'location', 'where', 'map', 'directions', 'socials'],
    // Explicit channels
    whatsapp: ['whatsapp', 'wp', 'watsap'],
    phone: ['phone', 'telephone', 'tel', 'number', 'mobile', 'call me'],
    email: ['e-mail', 'email', 'mail'],
    instagram: ['instagram', 'ig', 'insta'],
    telegram: ['telegram', 'tg']
  },
  ru: {
    book: ['записаться', 'забронировать', 'сеанс', 'время', 'дата', 'календарь', 'запись', 'прием', 'бронь'],
    learn: ['обучение', 'курс', 'учиться', 'урок', 'техника', 'школа', 'научиться', 'уроки', 'лекция'],
    buy: ['купить', 'заказать', 'покупка', 'оплатить', 'заказ', 'корзина'],
    ask_price: ['цена', 'стоимость', 'плата', 'сколько стоит', 'прайс', 'тариф'],
    contact: ['контакты', 'телефон', 'почта', 'адрес', 'написать', 'связаться', 'где находится', 'карта', 'локация', 'соцсети'],
    // Explicit channels
    whatsapp: ['whatsapp', 'ватсап', 'вацап'],
    phone: ['телефон', 'тел', 'номер', 'мобильный', 'позвонить'],
    email: ['почта', 'емейл', 'имейл'],
    instagram: ['инстаграм', 'инста'],
    telegram: ['телеграм', 'тг']
  }
};

/**
 * Checks if the normalized query matches explicit contact rules.
 * This is prioritized as Layer 1 and completely short-circuits any AI matching.
 */
export function checkExplicitContact(query: string, locale: 'tr' | 'en' | 'ru'): ExplicitContactInfo {
  const norm = normalizeString(query);
  const dict = DICTIONARIES[locale] || DICTIONARIES.tr;

  // 1. Check explicit channels
  let matchedChannel: ExplicitContactInfo['channel'] = undefined;
  if (dict.whatsapp.some((k) => norm.includes(k))) matchedChannel = 'whatsapp';
  else if (dict.phone.some((k) => norm.includes(k))) matchedChannel = 'phone';
  else if (dict.email.some((k) => norm.includes(k))) matchedChannel = 'email';
  else if (dict.instagram.some((k) => norm.includes(k))) matchedChannel = 'instagram';
  else if (dict.telegram.some((k) => norm.includes(k))) matchedChannel = 'telegram';

  if (matchedChannel) {
    return {
      isContactQuery: true,
      isExplicitChannel: true,
      channel: matchedChannel,
      isGenericRequest: false
    };
  }

  // 2. Check generic contact
  const isGeneric = dict.contact.some((k) => norm.includes(k));
  if (isGeneric) {
    return {
      isContactQuery: true,
      isExplicitChannel: false,
      isGenericRequest: true
    };
  }

  return {
    isContactQuery: false,
    isExplicitChannel: false,
    isGenericRequest: false
  };
}

/**
 * Classifies query intent based on predefined locale-specific dictionary structures.
 */
export function classifyIntent(query: string, locale: 'tr' | 'en' | 'ru'): QueryIntent {
  const norm = normalizeString(query);
  const dict = DICTIONARIES[locale] || DICTIONARIES.tr;

  // Prioritize critical commercial intents
  if (dict.book.some((k) => norm.includes(k))) return 'book';
  if (dict.learn.some((k) => norm.includes(k))) return 'learn';
  if (dict.buy.some((k) => norm.includes(k))) return 'buy';
  if (dict.ask_price.some((k) => norm.includes(k))) return 'ask_price';
  if (dict.contact.some((k) => norm.includes(k))) return 'contact';

  return 'unknown';
}
