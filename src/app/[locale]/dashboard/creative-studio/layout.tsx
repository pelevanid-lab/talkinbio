import { redirect } from '@/i18n/routing';
import { FEATURES } from '@/config/features';

// Tek kapı: Creative Studio prod'da pasif (bkz. src/config/features.ts). Daha
// önce yalnızca DashboardShell'in nav'ında görsel olarak griye alınıyordu — URL
// biliniyorsa hâlâ doğrudan erişilebiliyordu. Bu layout, altındaki tüm sayfalar
// (cast/motion/podcast/post/studio/twin/voice) için tek kontrol noktası.
export default async function CreativeStudioLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  if (!FEATURES.creativeStudio) {
    const { locale } = await params;
    redirect({ href: '/dashboard/editor', locale });
  }
  return children;
}
