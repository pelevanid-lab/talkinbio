import { requireAdmin } from '@/utils/adminAuth';
import AdminLayout from '@/components/AdminLayout';
import { supabaseAdmin } from '@/utils/supabase/admin';
import AdminRequestsClient from '@/components/AdminRequestsClient';

export default async function AdminRequestsPage() {
  await requireAdmin();

  // Fetch pending requests
  const { data: requests } = await supabaseAdmin
    .from('onboarding_requests')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  // Fetch recently processed
  const { data: processed } = await supabaseAdmin
    .from('onboarding_requests')
    .select('*')
    .neq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <AdminLayout>
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Kayıt Talepleri</h1>
      
      <AdminRequestsClient 
        initialPending={requests || []} 
        initialProcessed={processed || []} 
      />
    </AdminLayout>
  );
}
