import type { Metadata } from 'next';
import FuseTeaReview from '@/components/editorial/FuseTeaReview';
import { redirect } from '@/i18n/routing';
import { isRoutingLocale, type RoutingLocale } from '@/i18n/locales';

type PageProps = { params: Promise<{ locale: string }> };
const normalize = (locale: string): RoutingLocale => isRoutingLocale(locale) ? locale : 'en';

export const metadata: Metadata = {
  title: 'Fuse Tea “Budur” Reklam İncelemesi | Talkinbio',
  description: 'Fuse Tea şeftali reklamının değer önerisi, Jobs-to-be-Done ve İkna Bilgisi Modeli üzerinden analizi.',
  alternates: { canonical: '/tr/reklam-incelemeleri/fuse-tea-budur', languages: { en: '/ad-reviews/fuse-tea-budur', tr: '/tr/reklam-incelemeleri/fuse-tea-budur', ru: '/ru/ad-reviews/fuse-tea-budur', 'x-default': '/ad-reviews/fuse-tea-budur' } },
};

export default async function FuseTeaReklamIncelemesiPage({ params }: PageProps) {
  const locale = normalize((await params).locale);
  if (locale !== 'tr') redirect({ href: '/ad-reviews/fuse-tea-budur', locale });
  return <FuseTeaReview locale={locale} />;
}
