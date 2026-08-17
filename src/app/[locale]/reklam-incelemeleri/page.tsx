import type { Metadata } from 'next';
import AdReviewsPage from '@/components/editorial/AdReviewsPage';
import { redirect } from '@/i18n/routing';
import { isRoutingLocale, type RoutingLocale } from '@/i18n/locales';

type PageProps = { params: Promise<{ locale: string }> };
const normalize = (locale: string): RoutingLocale => isRoutingLocale(locale) ? locale : 'en';

export const metadata: Metadata = {
  title: 'Reklam İncelemeleri | Talkinbio',
  description: 'Reklamları strateji, tüketici gerilimi ve ikna mekanizması üzerinden okuyan çözümlemeler.',
  alternates: { canonical: '/tr/reklam-incelemeleri', languages: { en: '/ad-reviews', tr: '/tr/reklam-incelemeleri', ru: '/ru/ad-reviews', 'x-default': '/ad-reviews' } },
};

export default async function ReklamIncelemeleriPage({ params }: PageProps) {
  const locale = normalize((await params).locale);
  if (locale !== 'tr') redirect({ href: '/ad-reviews', locale });
  return <AdReviewsPage locale={locale} />;
}
