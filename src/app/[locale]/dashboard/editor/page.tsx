import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
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
    return <div>İşletme bulunamadı. Lütfen yöneticiyle iletişime geçin.</div>;
  }

  // Fetch blocks + prior setup-agent conversation (so the "Kurulum Ajanı" tab remembers
  // what was already discussed instead of restarting from the welcome message on every reload).
  const [{ data: blocks }, { data: setupMessages }] = await Promise.all([
    supabase.from('blocks').select('*').eq('business_id', business.id).order('order', { ascending: true }),
    supabase.from('setup_messages').select('*').eq('business_id', business.id).order('created_at', { ascending: true }),
  ]);

  return <EditorClient business={business} initialBlocks={blocks || []} initialChatMessages={setupMessages || []} />;
}
