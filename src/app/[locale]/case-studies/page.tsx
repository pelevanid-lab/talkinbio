import { redirect } from '@/i18n/routing';
import { isRoutingLocale } from '@/i18n/locales';

export default async function LegacyCaseStudiesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: '/ad-reviews', locale: isRoutingLocale(locale) ? locale : 'en' });
}
