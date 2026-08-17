import type { Metadata } from 'next';
import EditorialHomepage from '@/components/editorial/EditorialHomepage';
import { redirect } from '@/i18n/routing';
import { isRoutingLocale, type RoutingLocale } from '@/i18n/locales';

type PageProps = { params: Promise<{ locale: string }> };
const normalize = (locale: string): RoutingLocale => isRoutingLocale(locale) ? locale : 'en';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Holistik Pazarlama | Talkinbio',
    description: 'Pazarı anlamaktan ilişkiyi büyütmeye uzanan bütünsel pazarlama haritası.',
    alternates: { canonical: '/tr/holistik-pazarlama', languages: { en: '/holistic-marketing', tr: '/tr/holistik-pazarlama', ru: '/ru/holistic-marketing', 'x-default': '/holistic-marketing' } },
  };
}

export default async function HolistikPazarlamaPage({ params }: PageProps) {
  const locale = normalize((await params).locale);
  if (locale !== 'tr') redirect({ href: '/holistic-marketing', locale });
  return <EditorialHomepage />;
}
