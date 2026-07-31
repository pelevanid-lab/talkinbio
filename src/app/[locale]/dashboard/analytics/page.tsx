import { createClient } from '@/utils/supabase/server';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import AnalyticsClient from './AnalyticsClient';

export default async function AnalyticsPage({ params }: any) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Dashboard' });
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Fetch business details
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .single();

  if (!business) {
    redirect('/onboarding');
  }

  // Fetch page views
  const { data: pageViews } = await supabase
    .from('page_views')
    .select('source')
    .eq('business_id', business.id);

  // Fetch conversations count
  const { count: conversationsCount } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', business.id);

  // Group page views by source
  const viewsBySource = (pageViews || []).reduce((acc: any, view: any) => {
    const source = view.source || 'direct';
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {});

  const totalViews = pageViews?.length || 0;

  return (
    <AnalyticsClient
      business={business}
      viewsBySource={viewsBySource}
      totalViews={totalViews}
      totalConversations={conversationsCount || 0}
    />
  );
}
