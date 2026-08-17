import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { touchpointPages } from '@/components/home/homeData';
import TouchpointCategoryPage from '@/components/touchpoints/TouchpointCategoryPage';

export function generateStaticParams() {
  return Object.keys(touchpointPages).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const content = touchpointPages[slug];
  if (!content) return { title: 'Talkinbio' };
  return {
    title: `${content.eyebrow} | Talkinbio`,
    description: content.subhead,
  };
}

export default async function ExploreCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const content = touchpointPages[slug];
  if (!content) notFound();

  return <TouchpointCategoryPage content={content} />;
}
