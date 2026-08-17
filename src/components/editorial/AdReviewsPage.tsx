import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { Link } from '@/i18n/routing';
import type { RoutingLocale } from '@/i18n/locales';
import { adReviewArchiveCopy, adReviewEntries } from './adReviewData';
import YouTubeEmbed from './YouTubeEmbed';
import styles from './adReviews.module.css';

export default function AdReviewsPage({ locale }: { locale: RoutingLocale }) {
  const copy = adReviewArchiveCopy[locale];

  return (
    <main className={styles.archive}>
      <header className={styles.header}>
        <Link href="/" className={styles.back}><ArrowLeft aria-hidden="true" size={16} /><span>{copy.back}</span></Link>
        <span className={styles.wordmark}>talkinbio</span>
      </header>

      <section className={styles.archiveIntro}>
        <span>{copy.eyebrow}</span>
        <h1>{copy.title}</h1>
        <p>{copy.lead}</p>
      </section>

      <section className={styles.reviewList} aria-label={copy.eyebrow}>
        {adReviewEntries.map((entry) => {
          const review = entry.copy[locale];
          return (
            <article className={styles.featured} key={entry.key}>
              <YouTubeEmbed title={review.videoTitle} videoId={entry.videoId} />
              <div className={styles.featuredCopy}>
                <div className={styles.meta}><span>{review.category}</span><span>{review.duration}</span></div>
                <h2>{review.title}</h2>
                <p>{review.lead}</p>
                <Link href={entry.path[locale]} className={styles.readLink}>
                  {copy.action}<ArrowUpRight aria-hidden="true" size={17} />
                </Link>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
