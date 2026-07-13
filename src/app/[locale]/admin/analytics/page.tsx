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

  return (
    <AdminLayout>
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Sistem Analitiği</h1>
      
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
