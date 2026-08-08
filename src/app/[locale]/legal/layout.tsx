import { getTranslations } from 'next-intl/server';
import { localizedPath, hreflangPaths } from '@/utils/localizedUrl';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Legal' });
  const title = t('title');
  const description = t('copy');
  const path = '/legal';

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

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
