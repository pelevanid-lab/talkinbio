import { redirect } from '@/i18n/routing';
import { requireAdmin } from '@/utils/adminAuth';
import { TWIN_CHARACTER_ID } from '@/config/beiweLab';

// Beiwe Voice'un kendisi yok — varsayılan olarak Twin'e (enes2) düşer. Yardımcı
// Oyuncular'ın (Saule/Beiwe/sanal karakterler) sesi için bkz. [characterId] sayfası.
export default async function BeiweVoiceIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  await requireAdmin();
  const { locale } = await params;
  redirect({ href: `/admin/beiwe-lab/voice/${TWIN_CHARACTER_ID}`, locale });
}
