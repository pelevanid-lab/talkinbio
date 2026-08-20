import { ArrowLeft, ArrowUpRight, BookOpen, Clapperboard } from 'lucide-react';
import type { CSSProperties } from 'react';
import { Link } from '@/i18n/routing';
import type { RoutingLocale } from '@/i18n/locales';
import { adReviewEntries } from './adReviewData';
import { getEditorialArticlePath, getPublishedEditorialArticles } from './editorialData';
import { libraryCopy } from './libraryData';
import styles from './library.module.css';

export default function LibraryPage({ locale }: { locale: RoutingLocale }) {
  const copy = libraryCopy[locale];
  const articleLocale = locale === 'ru' ? 'en' : locale;
  const articles = getPublishedEditorialArticles(articleLocale);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.back}><ArrowLeft aria-hidden="true" size={16} /><span>{copy.back}</span></Link>
        <span className={styles.wordmark}>talkinbio</span>
      </header>

      <section className={styles.hero}>
        <div>
          <span>{copy.eyebrow}</span>
          <h1>{copy.title}</h1>
          <p>{copy.lead}</p>
        </div>
        <dl className={styles.counts} aria-label={copy.eyebrow}>
          <div><dt>{copy.articles}</dt><dd>{copy.articleCount}</dd></div>
          <div><dt>{copy.reviews}</dt><dd>{copy.reviewCount}</dd></div>
        </dl>
      </section>

      <section className={styles.section} aria-labelledby="library-articles">
        <div className={styles.sectionTitle}>
          <BookOpen aria-hidden="true" size={22} />
          <h2 id="library-articles">{copy.articles}</h2>
        </div>
        <div className={styles.articleGrid}>
          {articles.map((article, index) => {
            const content = (
              <>
                <span>{String(index + 1).padStart(2, '0')} · {article.eyebrow} · {article.readingTime}</span>
                <h3>{article.title}</h3>
                <p>{article.standfirst}</p>
                <small>{copy.readArticle}<ArrowUpRight aria-hidden="true" size={15} /></small>
              </>
            );
            return locale === 'ru' ? (
              <a key={article.slug} href={getEditorialArticlePath(article.slug, articleLocale)} className={styles.articleCard}>{content}</a>
            ) : (
              <Link key={article.slug} href={getEditorialArticlePath(article.slug, articleLocale)} className={styles.articleCard}>{content}</Link>
            );
          })}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="library-reviews">
        <div className={styles.sectionTitle}>
          <Clapperboard aria-hidden="true" size={22} />
          <h2 id="library-reviews">{copy.reviews}</h2>
        </div>
        <div className={styles.reviewGrid}>
          {adReviewEntries.map((entry, index) => {
            const review = entry.copy[locale];
            return (
              <Link key={entry.key} href={entry.path[locale]} className={styles.reviewCard}>
                <div className={styles.videoStill} style={{ '--thumb-index': index } as CSSProperties} aria-hidden="true" />
                <div>
                  <span>{review.category} · {review.duration}</span>
                  <h3>{review.title}</h3>
                  <p>{review.lead}</p>
                  <small>{copy.readReview}<ArrowUpRight aria-hidden="true" size={15} /></small>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
