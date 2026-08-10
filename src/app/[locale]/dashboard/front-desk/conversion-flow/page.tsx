import { createClient as createServerClient } from '@/utils/supabase/server';
import { redirect } from '@/i18n/routing';
import ConversionFlowClient from './ConversionFlowClient';

export default async function ConversionFlowPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const supabase = await createServerClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData?.user) {
    redirect({ href: '/login', locale });
    return null;
  }
  const user = userData.user;

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, username, saule_settings, credit_balance')
    .eq('owner_id', user.id)
    .single();

  if (!business) {
    redirect({ href: '/onboarding', locale });
    return null;
  }
  const ownedBusiness = business;

  const { data: blocks } = await supabase
    .from('blocks')
    .select('id, type, title, content, order, is_visible')
    .eq('business_id', ownedBusiness.id)
    .order('order', { ascending: true });

  return <ConversionFlowClient business={ownedBusiness} blocks={blocks || []} />;
}
