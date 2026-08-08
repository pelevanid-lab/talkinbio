import { routing } from '@/i18n/routing';
import { DEFAULT_LOCALE, MARKETING_LOCALES } from '@/i18n/locales';

// Single source of truth for "what is this page's real, non-redirecting URL in each
// locale". routing.ts sets localePrefix:'as-needed' with defaultLocale:'en' — meaning
// the English version of any page is served with NO /en prefix. Any code
// that builds a canonical tag, hreflang alternate, or JSON-LD self-reference by
// hardcoding a /{locale}/... prefix for every locale — including en — ends up pointing
// the English page at a URL that immediately redirects away from itself, which breaks
// Google's hreflang validation (it requires the target URL to return 200, not a
// redirect) and undermines the canonical signal. Route all such URL-building through
// here so it can't drift out of sync with routing.ts again.

export const SITE_BASE_URL = 'https://talkinbio.com';

/** Path only (no domain), e.g. for `alternates.canonical` when `metadataBase` is set. */
export function localizedPath(locale: string, path: string): string {
  if (locale === routing.defaultLocale) return path || '/';
  return `/${locale}${path}`;
}

/** Full absolute URL, e.g. for sitemap.xml entries and JSON-LD self-references. */
export function localizedUrl(locale: string, path: string): string {
  return `${SITE_BASE_URL}${localizedPath(locale, path)}`;
}

/** Public hreflang map (path form), plus x-default → English root. */
export function hreflangPaths(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const locale of MARKETING_LOCALES) out[locale] = localizedPath(locale, path);
  out['x-default'] = localizedPath(DEFAULT_LOCALE, path);
  return out;
}

/** Public hreflang map (absolute-URL form), plus x-default → English root. */
export function hreflangUrls(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const locale of MARKETING_LOCALES) out[locale] = localizedUrl(locale, path);
  out['x-default'] = localizedUrl(DEFAULT_LOCALE, path);
  return out;
}
