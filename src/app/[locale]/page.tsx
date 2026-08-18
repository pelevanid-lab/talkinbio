import type { Metadata } from 'next';
import EditorialGateway from '@/components/editorial/EditorialGateway';
import { editorialLandingCopy } from '@/components/editorial/editorialLandingData';
import { isRoutingLocale, type RoutingLocale } from '@/i18n/locales';
import { localizedPath, hreflangPaths } from '@/utils/localizedUrl';

type HomePageProps = { params: Promise<{ locale: string }> };

function normalizeLocale(locale: string): RoutingLocale {
  return isRoutingLocale(locale) ? locale : 'en';
}

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);
  const copy = editorialLandingCopy[locale];
  const title = locale === 'tr' ? 'Talkinbio | Pazarlama, çalışmalar ve derleyici' : locale === 'ru' ? 'Talkinbio | Маркетинг, работы и автор' : 'Talkinbio | Marketing, work and curator';
  const url = localizedPath(locale, '');

  return {
    title,
    description: copy.title,
    alternates: {
      canonical: url,
      languages: hreflangPaths(''),
    },
    openGraph: {
      title,
      description: copy.title,
      url,
      siteName: 'Talkinbio',
      locale,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: copy.title,
    },
  };
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    url: 'https://talkinbio.com/',
    name: 'Talkinbio',
    description: editorialLandingCopy[locale].title,
    inLanguage: locale,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <EditorialGateway locale={locale} />
    </>
  );
}
