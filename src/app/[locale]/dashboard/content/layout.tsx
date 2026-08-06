import { redirect } from '@/i18n/routing';
import { FEATURES } from '@/config/features';

// Tek kapı: Content Studio prod'da pasif (bkz. src/config/features.ts). Nav'a
// hiç bağlanmamıştı ama URL biliniyorsa doğrudan erişilebiliyordu.
export default async function ContentStudioLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  if (!FEATURES.contentStudio) {
    const { locale } = await params;
    redirect({ href: '/dashboard/editor', locale });
  }
  return children;
}
