import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import EditorClient from '@/components/EditorClient';
import { SAULE_STUDIO_INSTALL_CREDIT_COST } from '@/agents/shared/credits';

export default async function EditorPage() {
  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData?.user) {
    redirect('/login');
  }

  // Fetch business
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', userData.user.id)
    .single();

  if (!business) {
    const t = await getTranslations('Editor');
    return <div>{t('businessNotFound')}</div>;
  }

  const [{ data: blocks }, { data: setupSessions }, { data: setupMessages }] = await Promise.all([
    supabase.from('blocks').select('*').eq('business_id', business.id).order('order', { ascending: true }),
    supabase.from('setup_sessions').select('*').eq('business_id', business.id).order('created_at', { ascending: false }),
    supabase.from('setup_messages').select('*').eq('business_id', business.id).order('created_at', { ascending: true }),
  ]);

  return <EditorClient 
    business={business} 
    initialBlocks={blocks || []} 
    initialChatMessages={setupMessages || []} 
    initialSessions={setupSessions || []} 
    installCreditCost={SAULE_STUDIO_INSTALL_CREDIT_COST}
  />;
}
