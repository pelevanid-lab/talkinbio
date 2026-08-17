import { NextResponse, type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { APP_LOCALE_COOKIE, DEFAULT_LOCALE, ROUTING_LOCALE_COOKIE, isRoutingLocale, resolveProductLocale, resolveRoutingLocale } from './i18n/locales';
import { createServerClient } from '@supabase/ssr';
import { hasSupabaseAuthCookie } from './utils/supabase/authCookies';

// Next 16'da `middleware` dosya konvansiyonu kullanımdan kalktı ve `proxy` olarak
// yeniden adlandırıldı (davranış aynı; proxy varsayılan olarak Node.js runtime'ında
// çalışır, bu dosya zaten runtime belirtmiyordu). next-intl'in `createIntlMiddleware`
// fonksiyonu kendi API'si — o adı değiştirmiyoruz.
const intlMiddleware = createIntlMiddleware(routing);

function permanentRedirect(url: URL) {
  return NextResponse.redirect(url, 308);
}

function stripLocale(pathname: string): string {
  const parts = pathname.split('/');
  const first = parts[1];
  if (!isRoutingLocale(first)) return pathname;
  const rest = parts.slice(2).join('/');
  return rest ? `/${rest}` : '/';
}

function isDashboardPath(pathname: string): boolean {
  const unlocalized = stripLocale(pathname);
  return unlocalized === '/dashboard' || unlocalized.startsWith('/dashboard/');
}

function productLocalePath(pathname: string, locale: string): string {
  const unlocalized = stripLocale(pathname);
  return locale === DEFAULT_LOCALE ? unlocalized : `/${locale}${unlocalized === '/' ? '' : unlocalized}`;
}

function isExplicitLocalePath(pathname: string): boolean {
  return isRoutingLocale(pathname.split('/')[1]);
}

function browserLocalePath(pathname: string, acceptLanguage: string | null, preferredLocale?: string | null): string {
  const locale = isRoutingLocale(preferredLocale) ? preferredLocale : resolveRoutingLocale(acceptLanguage);
  return locale === DEFAULT_LOCALE ? pathname : `/${locale}${pathname === '/' ? '' : pathname}`;
}

function isPublicProfilePath(pathname: string): boolean {
  if (pathname === '/') return false;
  const unlocalized = stripLocale(pathname);
  const segments = unlocalized.split('/').filter(Boolean);
  if (segments.length !== 1) return false;

  const reserved = new Set([
    'ad-reviews',
    'about',
    'admin',
    'articles',
    'api',
    'auth',
    'case-studies',
    'dashboard',
    'explore',
    'first-contact',
    'hakkimda',
    'holistic-marketing',
    'holistik-pazarlama',
    'ilk-temas',
    'kesfet',
    'konular',
    'legal',
    'login',
    'onboarding',
    'ornek-calismalar',
    'pricing',
    'reklam-incelemeleri',
    'register',
    'request-access',
    'stakeholders',
    'topics',
    'updates',
    'yazilar',
  ]);

  return !reserved.has(segments[0]);
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const firstSegment = pathname.split('/')[1];

  if (firstSegment === 'en') {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = stripLocale(pathname);
    return permanentRedirect(redirectUrl);
  }

  if (isDashboardPath(pathname)) {
    const appLocale = resolveProductLocale(
      request.cookies.get(APP_LOCALE_COOKIE)?.value,
      request.headers.get('accept-language')
    );
    const expectedPath = productLocalePath(pathname, appLocale);
    if (pathname !== expectedPath) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = expectedPath;
      return NextResponse.redirect(redirectUrl);
    }
  }

  if (!isExplicitLocalePath(pathname) && isPublicProfilePath(pathname)) {
    const expectedPath = browserLocalePath(
      pathname,
      request.headers.get('accept-language'),
      request.cookies.get(ROUTING_LOCALE_COOKIE)?.value
    );
    if (pathname !== expectedPath) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = expectedPath;
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Intercept auth code from Supabase (e.g. password resets).
  // We redirect to the CLIENT-SIDE callback page so the browser Supabase client
  // can exchange the code using its own PKCE code verifier (stored in browser cookies).
  if (request.nextUrl.searchParams.has('code') && stripLocale(request.nextUrl.pathname) !== '/auth/callback') {
    const callbackUrl = request.nextUrl.clone();
    // Use the locale from the URL if present and valid, otherwise default to defaultLocale
    const possibleLocale = request.nextUrl.pathname.split('/')[1];
    const locale = isRoutingLocale(possibleLocale)
      ? possibleLocale
      : routing.defaultLocale;
    callbackUrl.pathname = locale === DEFAULT_LOCALE ? '/auth/callback' : `/${locale}/auth/callback`;
    // keep ?code= param intact
    return NextResponse.redirect(callbackUrl);
  }

  const response = intlMiddleware(request);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Set visitor_session_id if not present
  if (!request.cookies.has('visitor_session_id')) {
    const sessionId = crypto.randomUUID();
    response.cookies.set('visitor_session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
    request.cookies.set('visitor_session_id', sessionId);
  }

  // Anonymous requests have no session to refresh. Avoid a network round trip
  // on every public page, especially because Proxy runs before rendering.
  if (hasSupabaseAuthCookie(request.cookies.getAll())) {
    await supabase.auth.getUser();
  }

  return response;
}

export const config = {
  matcher: [
    '/',
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ]
};
