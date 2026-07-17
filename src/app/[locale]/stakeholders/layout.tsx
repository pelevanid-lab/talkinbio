import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Stakeholders' });
  const title = t('title');
  const description = t('intro');
  const path = '/stakeholders';

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}${path}`,
      languages: {
        en: `/en${path}`,
        tr: `/tr${path}`,
        ru: `/ru${path}`,
        'x-default': `/en${path}`,
      },
    },
    openGraph: {
      title,
      description,
      url: `/${locale}${path}`,
      siteName: 'Talkinbio',
      locale,
      type: 'website',
    },
  };
}

export default function StakeholdersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
