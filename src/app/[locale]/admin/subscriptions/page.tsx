import { requireAdmin } from '@/utils/adminAuth';
import AdminLayout from '@/components/AdminLayout';
import { supabaseAdmin } from '@/utils/supabase/admin';
import AdminSubscriptionsClient from '@/components/AdminSubscriptionsClient';

export default async function AdminSubscriptionsPage() {
  await requireAdmin();

  const [{ data: businesses }, { data: subscriptions }, { data: inquiries }] = await Promise.all([
    supabaseAdmin.from('businesses').select('id, name, username, owner_id, credit_balance').order('name', { ascending: true }),
    supabaseAdmin.from('subscriptions').select('business_id, plan'),
    supabaseAdmin.from('pricing_inquiries').select('*').order('status', { ascending: false }).order('created_at', { ascending: false }),
  ]);

  const planByBusiness = new Map((subscriptions || []).map((s) => [s.business_id, s.plan]));

  const businessRows = await Promise.all(
    (businesses || []).map(async (b) => {
      const { data: ownerUser } = await supabaseAdmin.auth.admin.getUserById(b.owner_id);
      return {
        id: b.id,
        name: b.name,
        username: b.username,
        ownerEmail: ownerUser?.user?.email || null,
        creditBalance: b.credit_balance,
        plan: planByBusiness.get(b.id) || null,
      };
    })
  );

  return (
    <AdminLayout>
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Abonelikler</h1>
      <AdminSubscriptionsClient initialBusinesses={businessRows} initialInquiries={inquiries || []} />
    </AdminLayout>
  );
}
