import { redirect } from 'next/navigation';
import { FEATURES } from '@/config/features';

// Tek kapı: Content Studio prod'da pasif (bkz. src/config/features.ts). Nav'a
// hiç bağlanmamıştı ama URL biliniyorsa doğrudan erişilebiliyordu.
export default function ContentStudioLayout({ children }: { children: React.ReactNode }) {
  if (!FEATURES.contentStudio) {
    redirect('/dashboard/editor');
  }
  return children;
}
