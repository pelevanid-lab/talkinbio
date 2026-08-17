import type { Metadata } from 'next';
import AdReviewsPage from '@/components/editorial/AdReviewsPage';
import { redirect } from '@/i18n/routing';
import { isRoutingLocale, type RoutingLocale } from '@/i18n/locales';

type PageProps = { params: Promise<{ locale: string }> };
const normalize = (locale: string): RoutingLocale => isRoutingLocale(locale) ? locale : 'en';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = normalize((await params).locale);
  return {
    title: locale === 'ru' ? 'Разбор рекламы | Talkinbio' : 'Ad Reviews | Talkinbio',
    description: locale === 'ru' ? 'Разбор стратегии, потребительского напряжения и механики убеждения в рекламе.' : 'Close readings of strategy, consumer tension, and persuasion mechanics in advertising.',
    alternates: { canonical: locale === 'ru' ? '/ru/ad-reviews' : '/ad-reviews', languages: { en: '/ad-reviews', tr: '/tr/reklam-incelemeleri', ru: '/ru/ad-reviews', 'x-default': '/ad-reviews' } },
  };
}

export default async function AdReviewArchivePage({ params }: PageProps) {
  const locale = normalize((await params).locale);
  if (locale === 'tr') redirect({ href: '/reklam-incelemeleri', locale });
  return <AdReviewsPage locale={locale} />;
}
