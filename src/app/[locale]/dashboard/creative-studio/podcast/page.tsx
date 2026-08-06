import { redirect } from '@/i18n/routing';
import { requireBusinessOwner } from '@/utils/businessAuth';
import { getOrCreateBusinessTwin } from '@/utils/creativeStudioScope';

// Podcast'in kendisi yok — varsayılan olarak işletmenin kendi Twin'ine düşer.
export default async function CreativeStudioPodcastIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const business = await requireBusinessOwner(locale);
  const characterId = await getOrCreateBusinessTwin(business.id);
  redirect({ href: `/dashboard/creative-studio/podcast/${characterId}`, locale });
}
