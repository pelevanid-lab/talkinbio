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

      <div className="mt-8 bg-indigo-50/50 p-6 rounded-xl shadow-sm border border-indigo-100">
        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
          <span className="mr-2">🌍</span> Sistem Dil Politikası (Hedeflenen Mimari)
        </h2>
        <div className="text-slate-700 space-y-3">
          <p>
            <strong>Geo-IP Tabanlı "Local-First" Stratejisi:</strong> Sistemimiz, kullanıcının bağlandığı ülkeye (IP bazlı) göre dinamik olarak şekillenecektir.
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Bölgesel Kısıtlama:</strong> Bir kullanıcı örneğin Ukrayna'dan bağlanıyorsa; sistem o bölge için sadece <strong>Ukraynaca, İngilizce ve Rusça</strong> dillerini aktif eder. 
            </li>
            <li>
              <strong>Gereksiz Dillerin Gizlenmesi (Kaybolması):</strong> Ukrayna'daki bir kullanıcı için Türkçe dil seçeneği menülerden tamamen kaldırılır ve kilitlenir. URL üzerinden erişilmeye çalışılsa bile 404 verir veya yerel dile yönlendirir.
            </li>
            <li>
              <strong>Standart Şablon:</strong> Hedeflenen her yeni ülke için aktif edilecek diller: <code className="bg-white px-2 py-0.5 rounded border border-indigo-100 text-indigo-900 font-medium">O Ülkenin Yerel Dili + İngilizce + Rusça</code> şeklinde sadece 3 seçenek olacaktır. Menüler kalabalıklaştırılmayacak, kullanıcılara "doğrudan kendi ülkeleri için yapılmış" hissi verilecektir.
            </li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
}
