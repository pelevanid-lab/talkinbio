// Default (fixed) section titles per locale for the built-in block types.
// Shared by the Beiwe tools (server), the block editor modal and the public renderer (client),
// so a title reset in any of them lands on the exact same strings.

export type LocaleKey = 'tr' | 'en' | 'ru';
export const LOCALE_KEYS: LocaleKey[] = ['tr', 'en', 'ru'];

export const LOCALE_TITLES: Record<LocaleKey, Record<string, string>> = {
  tr: { about: 'Hakkımda', services: 'Hizmetler', links: 'Bağlantılar', hours: 'Çalışma Saatleri', faq: 'Sıkça Sorulan Sorular', contact: 'İletişim' },
  en: { about: 'About', services: 'Services', links: 'Links', hours: 'Working Hours', faq: 'FAQ', contact: 'Contact' },
  ru: { about: 'Обо мне', services: 'Услуги', links: 'Ссылки', hours: 'Часы работы', faq: 'Частые вопросы', contact: 'Контакты' },
};

export function getLocaleTitles(locale: string): Record<string, string> {
  return LOCALE_TITLES[locale as LocaleKey] || LOCALE_TITLES.tr;
}

export function defaultTitleFor(type: string | undefined, locale: string): string {
  return (type && getLocaleTitles(locale)[type]) || '';
}

// Fixed labels for the "hours" block's day names and open/closed status — same reasoning as
// LOCALE_TITLES above: this is public-page chrome (rendered by ArchetypeRenderer for real
// visitors), not editable content, so it needs a per-locale lookup rather than next-intl's
// useTranslations (renderHours is a plain function, not a component, and doesn't have hooks).
export type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

type HoursLabels = {
  days: Record<DayKey, string>;
  dayAbbr: Record<DayKey, string>;
  closed: string;
  todayOpen: string; // e.g. "Today Open"
  todayClosed: string;
  allHours: string;
};

export const HOURS_LABELS: Record<LocaleKey, HoursLabels> = {
  tr: {
    days: { monday: 'Pazartesi', tuesday: 'Salı', wednesday: 'Çarşamba', thursday: 'Perşembe', friday: 'Cuma', saturday: 'Cumartesi', sunday: 'Pazar' },
    dayAbbr: { monday: 'Pzt', tuesday: 'Sal', wednesday: 'Çar', thursday: 'Per', friday: 'Cum', saturday: 'Cts', sunday: 'Paz' },
    closed: 'Kapalı',
    todayOpen: 'Bugün Açık',
    todayClosed: 'Bugün Kapalı',
    allHours: 'Tüm saatler',
  },
  en: {
    days: { monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday' },
    dayAbbr: { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' },
    closed: 'Closed',
    todayOpen: 'Open Today',
    todayClosed: 'Closed Today',
    allHours: 'All hours',
  },
  ru: {
    days: { monday: 'Понедельник', tuesday: 'Вторник', wednesday: 'Среда', thursday: 'Четверг', friday: 'Пятница', saturday: 'Суббота', sunday: 'Воскресенье' },
    dayAbbr: { monday: 'Пн', tuesday: 'Вт', wednesday: 'Ср', thursday: 'Чт', friday: 'Пт', saturday: 'Сб', sunday: 'Вс' },
    closed: 'Закрыто',
    todayOpen: 'Сегодня открыто',
    todayClosed: 'Сегодня закрыто',
    allHours: 'Все часы работы',
  },
};

export function getHoursLabels(locale: string): HoursLabels {
  return HOURS_LABELS[locale as LocaleKey] || HOURS_LABELS.tr;
}
