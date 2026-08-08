import { getTranslations } from 'next-intl/server';
import { localizedPath, hreflangPaths } from '@/utils/localizedUrl';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Pricing' });
  const title = t('title');
  const description = t('intro');
  const path = '/pricing';

  return {
    title,
    description,
    alternates: {
      canonical: localizedPath(locale, path),
      languages: hreflangPaths(path),
    },
    openGraph: {
      title,
      description,
      url: localizedPath(locale, path),
      siteName: 'Talkinbio',
      locale,
      type: 'website',
    },
  };
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
