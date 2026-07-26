import { Analytics } from '@vercel/analytics/react';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { Inter, Bricolage_Grotesque, IBM_Plex_Mono } from "next/font/google";
import "../globals.css";

// Alt küme notu: "latin" tek başına Türkçe'nin ı/ğ/ş/İ harflerini (latin-ext, U+0100-024F)
// ve Rusça'nın Kiril harflerini kapsamıyor — ikisi de sistem fontuna düşüyordu. Alt küme
// eklemek bedava: next/font unicode-range ile ayrı dosya üretir, o glifler sayfada
// geçmedikçe indirilmez. Bricolage'ın Kiril'i yok, Rusça metinde Inter kullanılmalı.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext", "cyrillic"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin", "latin-ext"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  weight: ['400', '500', '600'],
  subsets: ["latin", "latin-ext", "cyrillic"],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getMessages({ locale });
  // @ts-ignore - next-intl server typing
  const meta = t.Metadata || { title: "Talkinbio", description: "Transform your bio into a conversational agent." };

  return {
    title: meta.title,
    description: meta.description,
    metadataBase: new URL('https://www.talkinbio.com'),
    alternates: {
      canonical: `/${locale}`,
      languages: {
        'en': '/en',
        'tr': '/tr',
        'ru': '/ru',
        'x-default': '/en',
      },
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `/${locale}`,
      siteName: 'Talkinbio',
      locale,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.title,
      description: meta.description,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale} className={`${inter.variable} ${bricolage.variable} ${ibmPlexMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[var(--paper)] text-[var(--ink)]">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
