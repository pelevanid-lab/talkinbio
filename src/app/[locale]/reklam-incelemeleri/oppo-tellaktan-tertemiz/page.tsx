import type { Metadata } from 'next';
import OppoHamamReview from '@/components/editorial/OppoHamamReview';
import { redirect } from '@/i18n/routing';
import { isRoutingLocale, type RoutingLocale } from '@/i18n/locales';

type PageProps = { params: Promise<{ locale: string }> };
const normalize = (locale: string): RoutingLocale => isRoutingLocale(locale) ? locale : 'en';

export const metadata: Metadata = {
  title: 'OPPO “Tellaktan Tertemiz” Reklam İncelemesi | Talkinbio',
  description: 'OPPO reklamının CBBE, Jobs-to-be-Done, Vampir Etkisi ve POP–POD üzerinden eleştirel analizi.',
  alternates: { canonical: '/tr/reklam-incelemeleri/oppo-tellaktan-tertemiz', languages: { en: '/ad-reviews/oppo-tellaktan-tertemiz', tr: '/tr/reklam-incelemeleri/oppo-tellaktan-tertemiz', ru: '/ru/ad-reviews/oppo-tellaktan-tertemiz', 'x-default': '/ad-reviews/oppo-tellaktan-tertemiz' } },
};

export default async function OppoReklamIncelemesiPage({ params }: PageProps) {
  const locale = normalize((await params).locale);
  if (locale !== 'tr') redirect({ href: '/ad-reviews/oppo-tellaktan-tertemiz', locale });
  return <OppoHamamReview locale={locale} />;
}
