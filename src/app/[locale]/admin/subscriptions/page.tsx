import { requireAdmin } from '@/utils/adminAuth';
import AdminLayout from '@/components/AdminLayout';

export default async function AdminSubscriptionsPage() {
  await requireAdmin();

  return (
    <AdminLayout>
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Abonelikler</h1>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
        <h2 className="text-xl font-medium text-slate-700 mb-2">Abonelik Yönetimi</h2>
        <p className="text-slate-500">
          Abonelik planları, süre takibi ve hatırlatıcı sistemi henüz aktif değil. (İlerleyen aşamalarda eklenecektir.)
        </p>
      </div>
    </AdminLayout>
  );
}
