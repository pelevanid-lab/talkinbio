import { redirect } from 'next/navigation';
import { requireBusinessOwner } from '@/utils/businessAuth';
import { getOrCreateBusinessTwin } from '@/utils/creativeStudioScope';

// Voice'un kendisi yok — varsayılan olarak işletmenin kendi Twin'ine düşer (admin'deki
// aynı index-redirect deseni). Yardımcı Oyuncular'ın sesi için bkz. [characterId] sayfası.
export default async function CreativeStudioVoiceIndexPage() {
  const business = await requireBusinessOwner();
  const characterId = await getOrCreateBusinessTwin(business.id);
  redirect(`/dashboard/creative-studio/voice/${characterId}`);
}
