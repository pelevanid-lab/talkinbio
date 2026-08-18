import type { Metadata } from 'next';
import EditorialHomepage from '@/components/editorial/EditorialHomepage';
import { redirect } from '@/i18n/routing';
import { isRoutingLocale, type RoutingLocale } from '@/i18n/locales';

type PageProps = { params: Promise<{ locale: string }> };
const normalize = (locale: string): RoutingLocale => isRoutingLocale(locale) ? locale : 'en';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = normalize((await params).locale);
  return {
    title: 'Readings on Holistic Marketing',
    description: locale === 'ru' ? 'Целостная карта маркетинга: от понимания рынка до развития отношений.' : 'A holistic marketing map from understanding the market to growing the relationship.',
    alternates: { canonical: locale === 'ru' ? '/ru/holistic-marketing' : '/holistic-marketing', languages: { en: '/holistic-marketing', tr: '/tr/holistik-pazarlama', ru: '/ru/holistic-marketing', 'x-default': '/holistic-marketing' } },
  };
}

export default async function HolisticMarketingPage({ params }: PageProps) {
  const locale = normalize((await params).locale);
  if (locale === 'tr') redirect({ href: '/holistik-pazarlama', locale });
  return <EditorialHomepage />;
}
