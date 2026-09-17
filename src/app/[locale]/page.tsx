import type { Metadata } from 'next';
import { createClient } from '@/utils/supabase/server';
import { Link } from '@/i18n/routing';
import MobileMenu from '@/components/MobileMenu';
import AdaptiveHomepage from '@/components/home/AdaptiveHomepage';
import { BrandLogo } from '@/components/home/HomepageSections';
import { heroStructuredDataDescription, navCopy } from '@/components/home/homeData';
import styles from '@/components/home/home.module.css';
import { cookies } from 'next/headers';
import { hasSupabaseAuthCookie } from '@/utils/supabase/authCookies';
import { isRoutingLocale, type RoutingLocale } from '@/i18n/locales';
import { localizedPath, hreflangPaths } from '@/utils/localizedUrl';

type HomePageProps = { params: Promise<{ locale: string }> };

function normalizeLocale(locale: string): RoutingLocale {
  return isRoutingLocale(locale) ? locale : 'en';
}

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);
  const title = 'Talkinbio';
  const url = localizedPath(locale, '');

  return {
    title,
    description: heroStructuredDataDescription,
    alternates: {
      canonical: url,
      languages: hreflangPaths(''),
    },
    openGraph: {
      title,
      description: heroStructuredDataDescription,
      url,
      siteName: 'Talkinbio',
      locale,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: heroStructuredDataDescription,
    },
  };
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);
  const nav = navCopy[locale] || navCopy.en;
  const cookieStore = await cookies();
  let user = null;
  if (hasSupabaseAuthCookie(cookieStore.getAll())) {
    const supabase = await createClient();
    const result = await supabase.auth.getUser();
    user = result.data.user;
  }
  const isLoggedIn = Boolean(user && !user.is_anonymous);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': 'https://talkinbio.com/#website',
        url: 'https://talkinbio.com/',
        name: 'Talkinbio',
        description: heroStructuredDataDescription,
        inLanguage: locale,
      },
      {
        '@type': 'Organization',
        '@id': 'https://talkinbio.com/#organization',
        name: 'Talkinbio',
        url: 'https://talkinbio.com/',
        logo: 'https://talkinbio.com/icon.svg',
      },
    ],
  };

  return (
    <div className={styles.shell}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className={styles.navbar}>
        <div className={styles.navInner}>
          <Link href="/" aria-label="Talkinbio home">
            <BrandLogo />
          </Link>
          <nav className={styles.desktopNav} aria-label="Primary navigation">
            <a href="#ask">Product</a>
            <a href="#examples">Examples</a>
            <a href="#capabilities">Resources</a>
            <Link href="/pricing">{nav.pricing}</Link>
          </nav>
          <div className={styles.navActions}>
            {isLoggedIn ? (
              <Link href="/dashboard" className={styles.navButton}>
                {nav.dashboard}
              </Link>
            ) : (
              <>
                <Link href="/login" className={styles.loginLink}>
                  {nav.login}
                </Link>
                <Link href="/register" className={styles.navButton}>
                  {nav.create}
                </Link>
              </>
            )}
          </div>
          <MobileMenu isLoggedIn={isLoggedIn} texts={{ pricing: nav.pricing, login: nav.login, dashboard: nav.dashboard, create: nav.create }} />
        </div>
      </header>
      <AdaptiveHomepage />
    </div>
  );
}
