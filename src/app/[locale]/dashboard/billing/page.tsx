import { createClient as createServerClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import BillingClient from './BillingClient';
import { PLANS, EXTRA_PACK } from '@/config/plans';

export default async function BillingDashboardPage() {
  const supabase = await createServerClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData?.user) {
    redirect('/login');
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, username, credit_balance')
    .eq('owner_id', userData.user.id)
    .single();

  if (!business) {
    const t = await getTranslations('Billing');
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">{t('noBusinessTitle')}</h1>
        <p className="text-slate-500 mb-6">{t('noBusinessDescription')}</p>
        <a href="/onboarding" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700">{t('createProfileBtn')}</a>
      </div>
    );
  }

  const { data: usageEvents } = await supabase
    .from('usage_events')
    .select('id, agent, channel, model, credits_charged, created_at')
    .eq('business_id', business.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const { data: invoices } = await supabase
    .from('business_invoices')
    .select('id, plan_id, created_at')
    .eq('business_id', business.id)
    .eq('status', 'success')
    .order('created_at', { ascending: false })
    .limit(50);

  const transactions: any[] = [];
  
  if (usageEvents) {
    usageEvents.forEach((e: any) => transactions.push({
      id: e.id,
      type: 'usage',
      agent: e.agent,
      amount: -e.credits_charged,
      created_at: e.created_at,
    }));
  }

  if (invoices) {
    invoices.forEach((i: any) => {
      const plan = i.plan_id === 'extra' ? EXTRA_PACK : PLANS.find(p => p.id === i.plan_id);
      const credits = plan?.credits || 0;
      const planName = i.plan_id === 'test' ? 'Kaldırılan test paketi' : i.plan_id === 'extra' ? 'Ekstra Paket' : (plan as any)?.name || i.plan_id;
      
      transactions.push({
        id: i.id,
        type: 'reload',
        planName,
        amount: credits,
        created_at: i.created_at,
      });
    });
  }

  transactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const recentTransactions = transactions.slice(0, 50);

  return <BillingClient business={business} transactions={recentTransactions} ownerEmail={userData.user.email || ''} />;
}
