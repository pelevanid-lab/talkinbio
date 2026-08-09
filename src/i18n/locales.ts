export const DEFAULT_LOCALE = 'en' as const;
export const ROUTING_LOCALES = ['en', 'tr', 'ru'] as const;
export const MARKETING_LOCALES = ['en', 'tr'] as const;
export const PRODUCT_LOCALES = ['en', 'tr', 'ru'] as const;

export type RoutingLocale = (typeof ROUTING_LOCALES)[number];
export type MarketingLocale = (typeof MARKETING_LOCALES)[number];
export type ProductLocale = (typeof PRODUCT_LOCALES)[number];

export const APP_LOCALE_COOKIE = 'talkinbio_app_locale';
export const ROUTING_LOCALE_COOKIE = 'NEXT_LOCALE';

export function isRoutingLocale(value: string | undefined | null): value is RoutingLocale {
  return Boolean(value && (ROUTING_LOCALES as readonly string[]).includes(value));
}

export function isProductLocale(value: string | undefined | null): value is ProductLocale {
  return Boolean(value && (PRODUCT_LOCALES as readonly string[]).includes(value));
}

export function resolveProductLocale(cookieLocale?: string | null, acceptLanguage?: string | null): ProductLocale {
  if (isProductLocale(cookieLocale)) return cookieLocale;

  for (const part of (acceptLanguage || '').split(',')) {
    const lang = part.split(';')[0]?.trim().toLowerCase();
    const base = lang?.split('-')[0];
    if (isProductLocale(base)) return base;
  }

  return DEFAULT_LOCALE;
}

export function resolveRoutingLocale(acceptLanguage?: string | null): RoutingLocale {
  for (const part of (acceptLanguage || '').split(',')) {
    const lang = part.split(';')[0]?.trim().toLowerCase();
    const base = lang?.split('-')[0];
    if (isRoutingLocale(base)) return base;
  }

  return DEFAULT_LOCALE;
}
