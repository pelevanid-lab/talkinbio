import { redirect } from '@/i18n/routing';

// Kök sayfa yok — pipeline sırasında ilk adıma (Planla) düş. `creative-studio/voice/page.tsx`
// ile AYNI "index-redirect" deseni.
export default async function StudioHubIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: '/dashboard/studio/planla', locale });
}
