import { redirect } from 'next/navigation';
import { requireBusinessOwner } from '@/utils/businessAuth';
import { getOrCreateBusinessTwin } from '@/utils/creativeStudioScope';

// Podcast'in kendisi yok — varsayılan olarak işletmenin kendi Twin'ine düşer.
export default async function CreativeStudioPodcastIndexPage() {
  const business = await requireBusinessOwner();
  const characterId = await getOrCreateBusinessTwin(business.id);
  redirect(`/dashboard/creative-studio/podcast/${characterId}`);
}
