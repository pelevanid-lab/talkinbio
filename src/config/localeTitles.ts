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
