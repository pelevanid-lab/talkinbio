import { routing } from '@/i18n/routing';

// Single source of truth for "what is this page's real, non-redirecting URL in each
// locale". routing.ts sets localePrefix:'as-needed' with defaultLocale:'tr' — meaning
// the Turkish version of any page is served with NO /tr prefix (src/proxy.ts's
// next-intl middleware 30x-redirects /tr/... down to the unprefixed path). Any code
// that builds a canonical tag, hreflang alternate, or JSON-LD self-reference by
// hardcoding a /{locale}/... prefix for every locale — including tr — ends up pointing
// the Turkish page at a URL that immediately redirects away from itself, which breaks
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

/** hreflang map (path form) for every configured locale, plus x-default → English. */
export function hreflangPaths(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const locale of routing.locales) out[locale] = localizedPath(locale, path);
  out['x-default'] = localizedPath('en', path);
  return out;
}

/** hreflang map (absolute-URL form) for every configured locale, plus x-default → English. */
export function hreflangUrls(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const locale of routing.locales) out[locale] = localizedUrl(locale, path);
  out['x-default'] = localizedUrl('en', path);
  return out;
}
