import { ArrowLeft } from 'lucide-react';
import { Link } from '@/i18n/routing';
import type { RoutingLocale } from '@/i18n/locales';
import { adReviewArchiveCopy, adReviewEntries, adReviewPaths } from './adReviewData';
import { adReviewArticleContent, type AdReviewKey } from './adReviewArticleContent';
import YouTubeEmbed from './YouTubeEmbed';
import styles from './adReviews.module.css';

export default function AdReviewArticle({ locale, reviewKey }: { locale: RoutingLocale; reviewKey: AdReviewKey }) {
  const shell = adReviewArchiveCopy[locale];
  const entry = adReviewEntries.find((item) => item.key === reviewKey)!;
  const meta = entry.copy[locale];
  const article = adReviewArticleContent[reviewKey][locale];

  return (
    <main className={styles.articlePage} lang={locale}>
      <header className={styles.articleHeader}>
        <Link href={adReviewPaths.index[locale]} className={styles.back}>
          <ArrowLeft aria-hidden="true" size={16} /><span>{shell.articleBack}</span>
        </Link>
        <span className={styles.wordmark}>talkinbio</span>
      </header>

      <section className={styles.articleHero}>
        <div>
          <span>{meta.category} · {meta.duration}</span>
          <h1>{meta.title}</h1>
          <p>{meta.lead}</p>
        </div>
        <div className={styles.heroVideo}>
          <YouTubeEmbed title={meta.videoTitle} videoId={entry.videoId} />
        </div>
      </section>

      <article className={styles.articleBody}>
        <p className={styles.standfirst}>{article.standfirst}</p>
        {article.intro && <p>{article.intro}</p>}
        {article.sections.map((section) => (
          <section key={section.label}>
            <span className={styles.sectionLabel}>{section.label}</span>
            <h2>{section.heading}</h2>
            {section.blocks.map((block, index) => {
              if (block.type === 'paragraph') return <p className={'conclusion' in block && block.conclusion ? styles.conclusion : undefined} key={index}>{block.text}</p>;
              if (block.type === 'diagram') return <pre className={styles.diagram} key={index}>{block.text}</pre>;
              if (block.type === 'list') return <ul key={index}>{block.items.map((item) => <li key={item.label}><strong>{item.label}:</strong> {item.text}</li>)}</ul>;
              return <div className={styles.tableWrap} key={index}><table><thead><tr>{block.headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{block.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cellIndex === 0 ? <strong>{cell}</strong> : cell}</td>)}</tr>)}</tbody></table></div>;
            })}
          </section>
        ))}
      </article>
    </main>
  );
}
