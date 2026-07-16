import { requireAdmin } from '@/utils/adminAuth';
import AdminLayout from '@/components/AdminLayout';
import { supabaseAdmin } from '@/utils/supabase/admin';

export default async function AdminAnalyticsPage() {
  await requireAdmin();

  // Fetch recent conversations with business name
  const { data: conversations } = await supabaseAdmin
    .from('conversations')
    .select(`
      id,
      visitor_session_id,
      created_at,
      businesses ( name )
    `)
    .order('created_at', { ascending: false })
    .limit(50);

  // Faz 1.6: Landing demosu raporlaması
  const demoBusinessId = process.env.TALKINBIO_BUSINESS_ID;
  let demoStats: { conversationCount: number; messageCount: number; requestCount: number; conversionRate: number } | null = null;
  if (demoBusinessId) {
    const [{ data: demoConversations }, { count: requestCount }] = await Promise.all([
      supabaseAdmin.from('conversations').select('id').eq('business_id', demoBusinessId).eq('is_preview', false),
      supabaseAdmin.from('onboarding_requests').select('id', { count: 'exact', head: true }).eq('source', 'saule'),
    ]);
    const conversationIds = (demoConversations || []).map(c => c.id);
    const { count: messageCount } = conversationIds.length > 0
      ? await supabaseAdmin.from('messages').select('id', { count: 'exact', head: true }).in('conversation_id', conversationIds)
      : { count: 0 };
    const conversationCount = conversationIds.length;
    demoStats = {
      conversationCount,
      messageCount: messageCount || 0,
      requestCount: requestCount || 0,
      conversionRate: conversationCount > 0 ? Math.round(((requestCount || 0) / conversationCount) * 100) : 0,
    };
  }

  return (
    <AdminLayout>
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Sistem Analitiği</h1>

      {demoStats && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-900">Landing Demo</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-100">
            <div className="p-6 text-center">
              <p className="text-2xl font-bold text-slate-900">{demoStats.conversationCount}</p>
              <p className="text-sm text-slate-500 mt-1">Konuşma</p>
            </div>
            <div className="p-6 text-center">
              <p className="text-2xl font-bold text-slate-900">{demoStats.messageCount}</p>
              <p className="text-sm text-slate-500 mt-1">Mesaj</p>
            </div>
            <div className="p-6 text-center">
              <p className="text-2xl font-bold text-slate-900">{demoStats.requestCount}</p>
              <p className="text-sm text-slate-500 mt-1">Saule Kaynaklı Erişim Talebi</p>
            </div>
            <div className="p-6 text-center">
              <p className="text-2xl font-bold text-slate-900">%{demoStats.conversionRate}</p>
              <p className="text-sm text-slate-500 mt-1">Dönüşüm (Konuşma → Talep)</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Son Görüşmeler (Platform Geneli)</h2>
        </div>
        
        <div className="divide-y divide-slate-100">
          {conversations?.map((conv: any) => (
            <div key={conv.id} className="p-4 flex justify-between items-center hover:bg-slate-50">
              <div>
                <p className="font-medium text-slate-900">Ziyaretçi: {conv.visitor_session_id.substring(0,8)}...</p>
                <p className="text-sm text-slate-500">İşletme: {conv.businesses?.name}</p>
              </div>
              <div className="text-right text-sm text-slate-500">
                {new Date(conv.created_at).toLocaleString('tr-TR')}
              </div>
            </div>
          ))}
          {(!conversations || conversations.length === 0) && (
            <div className="p-8 text-center text-slate-500">Kayıtlı görüşme bulunamadı.</div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
