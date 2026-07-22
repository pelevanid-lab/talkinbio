import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import EditorClient from '@/components/EditorClient';

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
    // If no business, maybe they didn't go through request access?
    // Usually they should have it if they logged in via invite.
    const t = await getTranslations('Editor');
    return <div>{t('businessNotFound')}</div>;
  }

  // Fetch blocks, setup_sessions, setup_messages. Beiwe insights (Faz 3.1 — konuşma madenciliği)
  // intentionally NOT fetched here anymore — the suggestions panel that displayed them was
  // frozen and removed from the UI (2026-07-22, live pilot finding, see ROADMAP.md "Kapsam
  // dışı"); the cron job that populates beiwe_insights keeps running, just nothing reads it.
  const [{ data: blocks }, { data: setupSessions }, { data: setupMessages }] = await Promise.all([
    supabase.from('blocks').select('*').eq('business_id', business.id).order('order', { ascending: true }),
    supabase.from('setup_sessions').select('*').eq('business_id', business.id).order('created_at', { ascending: false }),
    supabase.from('setup_messages').select('*').eq('business_id', business.id).order('created_at', { ascending: true }),
  ]);

  return <EditorClient business={business} initialBlocks={blocks || []} initialChatMessages={setupMessages || []} initialSessions={setupSessions || []} />;
}
