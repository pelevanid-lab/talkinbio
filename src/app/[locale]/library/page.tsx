import type { Metadata } from 'next';
import LibraryPage from '@/components/editorial/LibraryPage';
import { libraryCopy } from '@/components/editorial/libraryData';
import { redirect } from '@/i18n/routing';
import { isRoutingLocale, type RoutingLocale } from '@/i18n/locales';

type PageProps = { params: Promise<{ locale: string }> };
const normalize = (locale: string): RoutingLocale => isRoutingLocale(locale) ? locale : 'en';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = normalize((await params).locale);
  const copy = libraryCopy[locale];
  return {
    title: locale === 'ru' ? 'Библиотека | Talkinbio' : 'Library | Talkinbio',
    description: copy.lead,
    alternates: { canonical: locale === 'ru' ? '/ru/library' : '/library', languages: { en: '/library', tr: '/tr/kutuphane', ru: '/ru/library', 'x-default': '/library' } },
  };
}

export default async function LibraryRoutePage({ params }: PageProps) {
  const locale = normalize((await params).locale);
  if (locale === 'tr') redirect({ href: '/kutuphane', locale });
  return <LibraryPage locale={locale} />;
}
