import { redirect } from '@/i18n/routing';
import { FEATURES } from '@/config/features';

// Tek kapı: `creative-studio/layout.tsx` ile AYNI desen — bilerek yalnızca flag kapısı,
// başka hiçbir şey YOK. DashboardShell + sekme şeridi her sayfanın kendi içinde (bkz.
// planla/duzenle/uret/page.tsx) — creative-studio'nun 7 sayfasının her birinin kendi
// DashboardShell'i kurmasıyla AYNI gerekçe, tutarlılık için.
export default async function StudioHubLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  if (!FEATURES.studioHub) {
    const { locale } = await params;
    redirect({ href: '/dashboard/editor', locale });
  }
  return children;
}
