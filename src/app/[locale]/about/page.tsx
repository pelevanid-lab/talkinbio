import type { Metadata } from 'next';
import { redirect } from '@/i18n/routing';
import { isRoutingLocale, type RoutingLocale } from '@/i18n/locales';
import { AboutEnes, aboutMetadata } from '../hakkimda/page';

type AboutPageProps = { params: Promise<{ locale: string }> };

function normalizeLocale(locale: string): RoutingLocale {
  return isRoutingLocale(locale) ? locale : 'en';
}

export async function generateMetadata({ params }: AboutPageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  return aboutMetadata(normalizeLocale(rawLocale));
}

export default async function AboutPage({ params }: AboutPageProps) {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);

  if (locale === 'tr') redirect({ href: '/hakkimda', locale });

  return <AboutEnes locale={locale} />;
}
