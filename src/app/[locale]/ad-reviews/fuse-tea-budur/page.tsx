import type { Metadata } from 'next';
import FuseTeaReview from '@/components/editorial/FuseTeaReview';
import { redirect } from '@/i18n/routing';
import { isRoutingLocale, type RoutingLocale } from '@/i18n/locales';

type PageProps = { params: Promise<{ locale: string }> };
const normalize = (locale: string): RoutingLocale => isRoutingLocale(locale) ? locale : 'en';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = normalize((await params).locale);
  const title = locale === 'ru' ? 'Fusetea «Budur»: разбор рекламы | Talkinbio' : 'Fusetea “Budur” Ad Review | Talkinbio';
  const description = locale === 'ru' ? 'Разбор рекламы Fusetea через ценностное предложение, Jobs-to-be-Done и модель знания об убеждении.' : 'An analysis of the Fusetea commercial through value proposition, Jobs-to-be-Done, and the Persuasion Knowledge Model.';
  return { title, description, alternates: { canonical: locale === 'ru' ? '/ru/ad-reviews/fuse-tea-budur' : '/ad-reviews/fuse-tea-budur', languages: { en: '/ad-reviews/fuse-tea-budur', tr: '/tr/reklam-incelemeleri/fuse-tea-budur', ru: '/ru/ad-reviews/fuse-tea-budur', 'x-default': '/ad-reviews/fuse-tea-budur' } } };
}

export default async function FuseTeaAdReviewPage({ params }: PageProps) {
  const locale = normalize((await params).locale);
  if (locale === 'tr') redirect({ href: '/reklam-incelemeleri/fuse-tea-budur', locale });
  return <FuseTeaReview locale={locale} />;
}
