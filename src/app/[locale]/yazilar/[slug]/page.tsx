import type { Metadata } from 'next';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/routing';
import EditorialNav from '@/components/editorial/EditorialNav';
import { editorialArticles, getEditorialArticle, getEditorialTopic, getPublishedEditorialArticles } from '@/components/editorial/editorialData';
import styles from '@/components/editorial/editorial.module.css';

export function generateStaticParams() {
  return editorialArticles.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const article = getEditorialArticle(slug, locale);
  if (!article) return { title: 'Talkinbio' };
  return { title: `${article.title} | Talkinbio`, description: article.standfirst };
}

export default async function ArticlePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const article = getEditorialArticle(slug, locale);
  if (!article) notFound();

  const availableArticles = getPublishedEditorialArticles(locale);
  const currentIndex = availableArticles.findIndex((item) => item.slug === article.slug);
  const nextArticle = availableArticles[(currentIndex + 1) % availableArticles.length];
  const topics = article.topicSlugs.map((topicSlug) => getEditorialTopic(topicSlug, locale)).filter((item) => item !== undefined);
  const copy = locale === 'tr'
    ? { all: 'Bütün konular', connection: 'BAĞLANTI', note: 'KARAR NOTU', next: 'SONRAKİ OKUMA' }
    : { all: 'All topics', connection: 'CONNECTION', note: 'DECISION NOTE', next: 'NEXT READING' };

  return (
    <main className={`${styles.editorialMain} ${styles.detailPage}`}>
      <EditorialNav />
      <article className={styles.articlePage}>
        <header className={styles.articleHero}>
          <Link href="/#konular" className={styles.backLink}><ArrowLeft aria-hidden="true" size={15} /> {copy.all}</Link>
          <span className={styles.kicker}>{article.eyebrow} · {article.readingTime}</span>
          <h1>{article.title}</h1>
          <p>{article.standfirst}</p>
        </header>

        <div className={styles.articleBody}>
          <aside>
            <span>{copy.connection}</span>
            {topics.map((topic) => <Link key={topic.slug} href={`/topics/${topic.slug}`}>{topic.title}</Link>)}
          </aside>
          <div>
            {article.sections.map((section) => (
              <section key={section.title}>
                <h2>{section.title}</h2>
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </section>
            ))}
            <blockquote><span>{copy.note}</span>{article.takeaway}</blockquote>
          </div>
        </div>

        <Link href={`/articles/${nextArticle.slug}`} className={styles.nextArticle}>
          <span>{copy.next}</span>
          <strong>{nextArticle.title}</strong>
          <ArrowRight aria-hidden="true" size={20} />
        </Link>
      </article>
    </main>
  );
}
