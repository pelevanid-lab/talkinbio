import { createClient } from '@/utils/supabase/server';
import { redirect } from '@/i18n/routing';
import { getTranslations } from 'next-intl/server';
import EditorClient from '@/components/EditorClient';
import DashboardShell from '@/components/dashboard/DashboardShell';

export default async function EditorPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData?.user) {
    redirect({ href: '/login', locale });
  }

  // Fetch business
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', userData!.user!.id)
    .single();

  if (!business) {
    const t = await getTranslations('Editor');
    return <div>{t('businessNotFound')}</div>;
  }

  // Kurulum tamamlanmamışsa sihirbaza yönlendir
  if (!business.setup_completed) {
    redirect({ href: '/onboarding', locale });
  }

  const { data: blocks } = await supabase
    .from('blocks')
    .select('*')
    .eq('business_id', business.id)
    .order('order', { ascending: true });

  return (
    <DashboardShell business={business} active="setup">
      <EditorClient
        business={business}
        initialBlocks={blocks || []}
      />
    </DashboardShell>
  );
}
