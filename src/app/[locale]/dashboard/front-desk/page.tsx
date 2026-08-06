import { createClient as createServerClient } from '@/utils/supabase/server';
import { redirect } from '@/i18n/routing';
import { getTranslations } from 'next-intl/server';
import FrontDeskClient from './FrontDeskClient';

export default async function FrontDeskDashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const supabase = await createServerClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData?.user) {
    redirect({ href: '/login', locale });
  }

  // Fetch business of user
  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, username, saule_settings, credit_balance, contact_method, contact_value')
    .eq('owner_id', userData!.user!.id)
    .single();

  if (!business) {
    const t = await getTranslations('Leads');
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">{t('noBusinessTitle')}</h1>
        <p className="text-slate-500 mb-6">{t('noBusinessDescription')}</p>
        <a href="/onboarding" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700">{t('createProfileBtn')}</a>
      </div>
    );
  }

  // Fetch Saule knowledge base (Faz 1.4)
  const { data: knowledge } = await supabase
    .from('saule_knowledge')
    .select('*')
    .eq('business_id', business.id)
    .order('created_at', { ascending: false });

  return <FrontDeskClient business={business} initialKnowledge={knowledge || []} />;
}
