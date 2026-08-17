import Image from 'next/image';
import type { Metadata } from 'next';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { Link, redirect } from '@/i18n/routing';
import { aboutContent, aboutPaths } from '@/components/editorial/aboutContent';
import { isRoutingLocale, type RoutingLocale } from '@/i18n/locales';
import styles from './hakkimda.module.css';

type AboutPageProps = { params: Promise<{ locale: string }> };

function normalizeLocale(locale: string): RoutingLocale {
  return isRoutingLocale(locale) ? locale : 'en';
}

export function aboutMetadata(locale: RoutingLocale): Metadata {
  const content = aboutContent[locale];
  return {
    ...content.metadata,
    alternates: {
      canonical: aboutPaths[locale],
      languages: { en: '/about', tr: '/tr/hakkimda', ru: '/ru/about', 'x-default': '/about' },
    },
  };
}

export async function generateMetadata({ params }: AboutPageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  return aboutMetadata(normalizeLocale(rawLocale));
}

export function AboutEnes({ locale }: { locale: RoutingLocale }) {
  const content = aboutContent[locale];

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <Image src="/enes-pehlivan-about.png" alt={content.portraitAlt} fill priority sizes="100vw" className={styles.heroImage} />
        <div className={styles.heroScrim} aria-hidden="true" />
        <Link href="/" className={styles.backLink}>
          <ArrowLeft aria-hidden="true" size={16} />
          {content.back}
        </Link>
        <div className={styles.heroCopy}>
          <span>{content.curator}</span>
          <h1>Enes Pehlivan</h1>
          <p>{content.hero}</p>
          <a href="https://www.linkedin.com/in/enes-pehlivan/" className={styles.linkedinLink} target="_blank" rel="noreferrer">
            LinkedIn <ArrowUpRight aria-hidden="true" size={15} />
          </a>
        </div>
      </section>

      <section className={styles.chapters} aria-label={content.chaptersLabel}>
        {content.chapters.map((chapter) => (
          <article key={chapter.number} className={styles.chapter}>
            <div className={styles.chapterHeading}>
              <span>{chapter.number}</span>
              <small>{chapter.eyebrow}</small>
              <h2>{chapter.title}</h2>
            </div>
            <div className={styles.chapterBody}>
              {chapter.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
          </article>
        ))}
      </section>

      <section className={styles.principles} aria-labelledby="principles-title">
        <div>
          <span>{content.compass}</span>
          <h2 id="principles-title">{content.principlesTitle}</h2>
          <p>{content.principlesLead}</p>
        </div>
        <ol>
          {content.principles.map((principle) => <li key={principle}>{principle}</li>)}
        </ol>
      </section>

      <footer className={styles.footer}>
        <Link href="/">{content.footer} <ArrowUpRight aria-hidden="true" size={16} /></Link>
      </footer>
    </main>
  );
}

export default async function AboutEnesPage({ params }: AboutPageProps) {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);

  if (locale !== 'tr') redirect({ href: '/about', locale });

  return <AboutEnes locale={locale} />;
}
