import { redirect } from '@/i18n/routing';
import { requireBusinessOwner } from '@/utils/businessAuth';
import { getOrCreateBusinessTwin } from '@/utils/creativeStudioScope';

// Voice'un kendisi yok — varsayılan olarak işletmenin kendi Twin'ine düşer (admin'deki
// aynı index-redirect deseni). Yardımcı Oyuncular'ın sesi için bkz. [characterId] sayfası.
export default async function CreativeStudioVoiceIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const business = await requireBusinessOwner(locale);
  const characterId = await getOrCreateBusinessTwin(business.id);
  redirect({ href: `/dashboard/creative-studio/voice/${characterId}`, locale });
}
