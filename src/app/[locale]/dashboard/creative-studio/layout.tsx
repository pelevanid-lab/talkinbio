import { redirect } from 'next/navigation';
import { FEATURES } from '@/config/features';

// Tek kapı: Creative Studio prod'da pasif (bkz. src/config/features.ts). Daha
// önce yalnızca DashboardShell'in nav'ında görsel olarak griye alınıyordu — URL
// biliniyorsa hâlâ doğrudan erişilebiliyordu. Bu layout, altındaki tüm sayfalar
// (cast/motion/podcast/post/studio/twin/voice) için tek kontrol noktası.
export default function CreativeStudioLayout({ children }: { children: React.ReactNode }) {
  if (!FEATURES.creativeStudio) {
    redirect('/dashboard/editor');
  }
  return children;
}
