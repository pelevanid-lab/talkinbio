import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { articleLocalizedSlugs, editorialArticles, getEditorialArticle, getEditorialArticlePath } from '@/components/editorial/editorialData';

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
  const localizedPrefix = locale === 'en' ? '' : `/${locale}`;
  redirect(`${localizedPrefix}${getEditorialArticlePath(slug, locale)}`);
}
