import { redirect } from '@/i18n/routing';
import { isRoutingLocale } from '@/i18n/locales';

export default async function LegacyOrnekCalismalarPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: locale === 'tr' ? '/reklam-incelemeleri' : '/ad-reviews', locale: isRoutingLocale(locale) ? locale : 'en' });
}
