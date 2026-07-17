import { createClient as createServerClient } from '@/utils/supabase/server';
import { notFound, redirect } from 'next/navigation';
import LeadsClient from './LeadsClient';

export default async function LeadsDashboardPage() {
  const supabase = await createServerClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData?.user) {
    redirect('/login');
  }

  // Fetch business of user
  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, username, saule_settings')
    .eq('owner_id', userData.user.id)
    .single();

  if (!business) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Henüz bir işletme kurmamışsınız</h1>
        <p className="text-slate-500 mb-6">Müşteri taleplerini görebilmek için önce profilinizi oluşturun.</p>
        <a href="/onboarding" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700">Profili Oluştur</a>
      </div>
    );
  }

  // Fetch leads
  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('business_id', business.id)
    .order('created_at', { ascending: false });

  // Fetch conversations (Faz 1.1 — transkript ekranı; is_preview'lar da gelir, "Test" rozetiyle ayrışır — Faz 1.7)
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id, visitor_session_id, last_message_at, is_read, is_preview, is_archived, created_at')
    .eq('business_id', business.id)
    .order('last_message_at', { ascending: false, nullsFirst: false });

  // Fetch Saule knowledge base (Faz 1.4)
  const { data: knowledge } = await supabase
    .from('saule_knowledge')
    .select('*')
    .eq('business_id', business.id)
    .order('created_at', { ascending: false });

  return <LeadsClient business={business} initialLeads={leads || []} initialConversations={conversations || []} initialKnowledge={knowledge || []} />;
}
