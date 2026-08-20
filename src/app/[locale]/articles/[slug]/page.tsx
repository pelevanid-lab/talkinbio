import type { Metadata } from 'next';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { notFound, redirect } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { articleLocalizedSlugs, editorialArticles, getEditorialArticle, getEditorialArticlePath, getLocalizedArticleSlug, getEditorialTopic, getPublishedEditorialArticles } from '@/components/editorial/editorialData';
import hubStyles from '@/components/touchpoints/touchpoints.module.css';
import { IMMERSIVE_VIDEO } from '@/config/immersiveMedia';
import styles from '@/components/editorial/editorial.module.css';

export function generateStaticParams() {
  const localizedSlugs = Object.values(articleLocalizedSlugs).flatMap((slugs) => [slugs.en, slugs.tr]);
  return Array.from(new Set([...editorialArticles.map(({ slug }) => slug), ...localizedSlugs])).map((slug) => ({ slug }));
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
  const canonicalSlug = getLocalizedArticleSlug(slug, locale);
  if (slug !== canonicalSlug) {
    const localizedPrefix = locale === 'en' ? '' : `/${locale}`;
    redirect(`${localizedPrefix}${getEditorialArticlePath(slug, locale)}`);
  }

  const availableArticles = getPublishedEditorialArticles(locale);
  const currentIndex = availableArticles.findIndex((item) => item.slug === article.slug);
  const nextArticle = availableArticles[(currentIndex + 1) % availableArticles.length];
  const topics = article.topicSlugs.map((topicSlug) => getEditorialTopic(topicSlug, locale)).filter((item) => item !== undefined);
  const primaryTopic = topics[0];
  const copy = locale === 'tr'
    ? { home: 'Talkinbio ana sayfa', close: 'Okuma penceresini kapat', fallback: 'Müşteri ve Pazar İçgörüsü', connection: 'BAĞLANTI', note: 'KARAR NOTU', next: 'SONRAKİ OKUMA' }
    : { home: 'Talkinbio home', close: 'Close reading panel', fallback: 'Customer and Market Insight', connection: 'CONNECTION', note: 'DECISION NOTE', next: 'NEXT READING' };

  return (
    <main className={`${hubStyles.page} ${styles.immersiveArticleMain}`} data-revealed="true">
      <video className={hubStyles.media} src={IMMERSIVE_VIDEO.layer} autoPlay muted playsInline preload="auto" />
      <div className={hubStyles.scrim} aria-hidden="true" />
      <svg className={hubStyles.line} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M69,8 C84,1 96,2 97,7 C98,14 78,22 79,29 C80,36 99,39 98,46 C97,53 75,54 69,59 C64,64 87,66 84,72 C82,77 99,79 98,84" /></svg>
      <Link href="/" className={hubStyles.logo} aria-label={copy.home}><span>talkinbio</span></Link>
      <Link href={primaryTopic ? `/topics/${primaryTopic.slug}` : '/topics/customer-and-market-insights'} className={styles.articleBackdrop} aria-label={copy.close} />
      <article className={styles.immersiveArticlePanel}>
        <div className={styles.immersiveArticleScroll}>
          <header className={styles.bookHero}>
            <Link href={primaryTopic ? `/topics/${primaryTopic.slug}` : '/topics/customer-and-market-insights'} className={styles.bookBack}><ArrowLeft aria-hidden="true" size={15} /> {primaryTopic ? primaryTopic.title : copy.fallback}</Link>
            <span>{article.eyebrow} · {article.readingTime}</span>
            <h1>{article.title}</h1>
            <p>{article.standfirst}</p>
          </header>

          <div className={styles.bookLayout}>
            <aside>
              <span>{copy.connection}</span>
              {topics.map((topic) => <Link key={topic.slug} href={`/topics/${topic.slug}`}>{topic.title}</Link>)}
            </aside>
            <div className={styles.bookBody}>
              {article.sections.map((section) => (
                <section key={section.title}>
                  <h2>{section.title}</h2>
                  {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </section>
              ))}
              <blockquote><span>{copy.note}</span>{article.takeaway}</blockquote>
            </div>
          </div>

          <Link href={getEditorialArticlePath(nextArticle.slug, locale)} className={styles.bookNextArticle}>
            <span>{copy.next}</span>
            <strong>{nextArticle.title}</strong>
            <ArrowRight aria-hidden="true" size={18} />
          </Link>
        </div>
      </article>
    </main>
  );
}
