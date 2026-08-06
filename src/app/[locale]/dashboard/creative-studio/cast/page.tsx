import { getTranslations } from 'next-intl/server';
import DashboardShell from '@/components/dashboard/DashboardShell';
import CreativeStudioCastClient from '@/components/beiwe-lab/CreativeStudioCastClient';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { requireBusinessOwner } from '@/utils/businessAuth';

// admin/beiwe-lab/cast'in müşteri karşılığı — işletme kendi sanal yardımcı
// oyuncularını (business_id = kendi id'si) oluşturur/görür, admin'in global cast'i
// (business_id NULL) burada görünmez.
export default async function CreativeStudioCastPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const business = await requireBusinessOwner(locale);
  const t = await getTranslations('BeiweLab');

  const { data: castRows } = await supabaseAdmin
    .from('character_profiles')
    .select('id, name, role, reference_image_url')
    .eq('is_cast', true)
    .eq('business_id', business.id)
    .order('created_at', { ascending: false });

  return (
    <DashboardShell business={business} active="creative-studio">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-['Inter']">
        <div className="mb-6">
          <h1 className="text-xl font-[800] tracking-[-0.02em] text-[#14231F]">{t('castTitle')}</h1>
          <p className="text-sm text-[#4B5A55]">{t('castDesc')}</p>
        </div>
        <CreativeStudioCastClient
          initialCharacters={(castRows || []).map((r) => ({
            id: r.id,
            name: r.name || r.id,
            role: r.role || 'Yardımcı oyuncu — sanal karakter',
            avatarUrl: r.reference_image_url || undefined,
          }))}
        />
      </main>
    </DashboardShell>
  );
}
