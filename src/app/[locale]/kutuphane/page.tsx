import type { Metadata } from 'next';
import LibraryPage from '@/components/editorial/LibraryPage';
import { redirect } from '@/i18n/routing';
import { isRoutingLocale, type RoutingLocale } from '@/i18n/locales';

type PageProps = { params: Promise<{ locale: string }> };
const normalize = (locale: string): RoutingLocale => isRoutingLocale(locale) ? locale : 'en';

export const metadata: Metadata = {
  title: 'Kütüphane | Talkinbio',
  description: 'Holistik pazarlama yazıları ve reklam incelemeleri tek rafta.',
  alternates: { canonical: '/tr/kutuphane', languages: { en: '/library', tr: '/tr/kutuphane', ru: '/ru/library', 'x-default': '/library' } },
};

export default async function KutuphanePage({ params }: PageProps) {
  const locale = normalize((await params).locale);
  if (locale !== 'tr') redirect({ href: '/library', locale });
  return <LibraryPage locale={locale} />;
}
