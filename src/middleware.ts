import { NextResponse, type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { createServerClient } from '@supabase/ssr';

const intlMiddleware = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  // Intercept auth code from Supabase (e.g. password resets).
  // We redirect to the CLIENT-SIDE callback page so the browser Supabase client
  // can exchange the code using its own PKCE code verifier (stored in browser cookies).
  if (request.nextUrl.searchParams.has('code')) {
    const callbackUrl = request.nextUrl.clone();
    // Use the locale from the URL if present and valid, otherwise default to defaultLocale
    const possibleLocale = request.nextUrl.pathname.split('/')[1];
    const locale = routing.locales.includes(possibleLocale as any) ? possibleLocale : routing.defaultLocale;
    callbackUrl.pathname = `/${locale}/auth/callback`;
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
  }

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    '/',
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ]
};
