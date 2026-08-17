import type { Metadata } from 'next';
import EditorialHomepage from '@/components/editorial/EditorialHomepage';
import { heroStructuredDataDescription } from '@/components/home/homeData';

export const metadata: Metadata = {
  title: 'Talkinbio | İlk sinyalden pazarlama kararına',
  description: heroStructuredDataDescription,
};

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': 'https://talkinbio.com/#website',
        url: 'https://talkinbio.com/',
        name: 'Talkinbio',
        description: heroStructuredDataDescription,
        inLanguage: locale,
      },
      {
        '@type': 'Organization',
        '@id': 'https://talkinbio.com/#organization',
        name: 'Talkinbio',
        url: 'https://talkinbio.com/',
        logo: 'https://talkinbio.com/icon.svg',
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <EditorialHomepage />
    </>
  );
}
