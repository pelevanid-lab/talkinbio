import AdminLayout from '@/components/AdminLayout';
import BeiweLabTabs from '@/components/beiwe-lab/BeiweLabTabs';
import SauleVoicePackagesClient from '@/components/beiwe-lab/SauleVoicePackagesClient';
import { requireAdmin } from '@/utils/adminAuth';
import { supabaseAdmin } from '@/utils/supabase/admin';

export default async function SauleVoicePackagesPage() {
  await requireAdmin();
  const { data: packages, error } = await supabaseAdmin
    .from('saule_voice_packages')
    .select('*, saule_voice_cues(*)')
    .order('created_at', { ascending: true });

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Saule Ses Paketleri</h1>
        <p className="text-sm text-slate-500 mt-1">
          Hazir cue sesleri burada yuklenir, dinlenerek onaylanir ve CDN uzerinden versiyonlanir.
        </p>
      </div>
      <BeiweLabTabs />

      {error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          Saule ses paketi tablolari henuz hazir degil. 00064_saule_voice_packages migration'ini calistir.
        </div>
      ) : (
        <SauleVoicePackagesClient packages={(packages || []) as any} />
      )}
    </AdminLayout>
  );
}
