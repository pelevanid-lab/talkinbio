import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { Inter, Bricolage_Grotesque, IBM_Plex_Mono } from "next/font/google";
import "../globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  weight: ['400', '500', '600'],
  subsets: ["latin"],
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
      images: [{ url: '/saule-avatar-v1.png', width: 512, height: 512 }],
      locale,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: meta.title,
      description: meta.description,
      images: ['/saule-avatar-v1.png'],
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
      </body>
    </html>
  );
}
