import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CustomerInsightExperience from '@/components/editorial/CustomerInsightExperience';
import EditorialTopicExperience from '@/components/editorial/EditorialTopicExperience';
import { editorialTopics, getEditorialTopic, getPublishedEditorialArticles } from '@/components/editorial/editorialData';

export function generateStaticParams() {
  return editorialTopics.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const topic = getEditorialTopic(slug, locale);
  if (!topic) return { title: 'Talkinbio' };
  return { title: `${topic.title} | Talkinbio`, description: topic.thesis };
}

export default async function TopicPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const topic = getEditorialTopic(slug, locale);
  if (!topic) notFound();

  const relatedArticles = getPublishedEditorialArticles(locale).filter((article) => article.topicSlugs.includes(topic.slug));
  const nextTopics = topic.nextSlugs.map((nextSlug) => getEditorialTopic(nextSlug, locale)).filter((item) => item !== undefined);

  if (topic.slug === 'customer-and-market-insights') {
    return <CustomerInsightExperience locale={locale} relatedArticles={relatedArticles} nextTopics={nextTopics} />;
  }

  return <EditorialTopicExperience locale={locale} topic={topic} relatedArticles={relatedArticles} nextTopics={nextTopics} />;
}
