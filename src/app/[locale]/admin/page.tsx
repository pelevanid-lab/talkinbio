import { requireAdmin } from '@/utils/adminAuth';
import AdminLayout from '@/components/AdminLayout';
import { supabaseAdmin } from '@/utils/supabase/admin';

export default async function AdminDashboardPage() {
  await requireAdmin();

  const { count: pendingRequests } = await supabaseAdmin
    .from('onboarding_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  const { count: totalBusinesses } = await supabaseAdmin
    .from('businesses')
    .select('*', { count: 'exact', head: true });

  const { count: totalConversations } = await supabaseAdmin
    .from('conversations')
    .select('*', { count: 'exact', head: true });

  return (
    <AdminLayout>
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Genel Bakış</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-slate-500 font-medium mb-2">Bekleyen Talepler</h3>
          <p className="text-4xl font-bold text-slate-900">{pendingRequests || 0}</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-slate-500 font-medium mb-2">Aktif İşletmeler</h3>
          <p className="text-4xl font-bold text-slate-900">{totalBusinesses || 0}</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-slate-500 font-medium mb-2">Toplam Görüşme</h3>
          <p className="text-4xl font-bold text-slate-900">{totalConversations || 0}</p>
        </div>
      </div>
    </AdminLayout>
  );
}
