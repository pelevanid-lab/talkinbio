import type { Metadata } from 'next';
import OppoHamamReview from '@/components/editorial/OppoHamamReview';
import { redirect } from '@/i18n/routing';
import { isRoutingLocale, type RoutingLocale } from '@/i18n/locales';

type PageProps = { params: Promise<{ locale: string }> };
const normalize = (locale: string): RoutingLocale => isRoutingLocale(locale) ? locale : 'en';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = normalize((await params).locale);
  const title = locale === 'ru' ? 'OPPO «Tellaktan Tertemiz»: разбор рекламы | Talkinbio' : 'OPPO “Tellaktan Tertemiz” Ad Review | Talkinbio';
  const description = locale === 'ru' ? 'Критический разбор рекламы OPPO через CBBE, Jobs-to-be-Done, эффект вампира и POP–POD.' : 'A critical reading of the OPPO commercial through CBBE, Jobs-to-be-Done, the Vampire Effect, and POP–POD.';
  return { title, description, alternates: { canonical: locale === 'ru' ? '/ru/ad-reviews/oppo-tellaktan-tertemiz' : '/ad-reviews/oppo-tellaktan-tertemiz', languages: { en: '/ad-reviews/oppo-tellaktan-tertemiz', tr: '/tr/reklam-incelemeleri/oppo-tellaktan-tertemiz', ru: '/ru/ad-reviews/oppo-tellaktan-tertemiz', 'x-default': '/ad-reviews/oppo-tellaktan-tertemiz' } } };
}

export default async function OppoAdReviewPage({ params }: PageProps) {
  const locale = normalize((await params).locale);
  if (locale === 'tr') redirect({ href: '/reklam-incelemeleri/oppo-tellaktan-tertemiz', locale });
  return <OppoHamamReview locale={locale} />;
}
