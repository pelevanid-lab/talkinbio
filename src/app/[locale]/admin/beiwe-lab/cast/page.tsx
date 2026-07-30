import { redirect } from '@/i18n/routing';
import { requireAdmin } from '@/utils/adminAuth';

// Yardımcı Oyuncular'ın kendisi yok — iki oda var. Kök yol ilkine yönlendirir.
export default async function BeiweLabCastIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  await requireAdmin();
  const { locale } = await params;
  redirect({ href: '/admin/beiwe-lab/cast/saule', locale });
}
