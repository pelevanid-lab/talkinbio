import { redirect } from '@/i18n/routing';

export default async function CreativeStudioPostRedirectPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: '/dashboard/creative-studio', locale });
}
