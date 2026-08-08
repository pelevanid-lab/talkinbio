import { getTranslations } from 'next-intl/server';
import DashboardShell from '@/components/dashboard/DashboardShell';
import StudioHubTabs from '@/components/studio-hub/StudioHubTabs';
import PlanlaClient from '@/components/studio-hub/PlanlaClient';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { requireBusinessOwner } from '@/utils/businessAuth';
import { parseContentPillars, type ContentPlanItem } from '@/config/contentPlan';

// Planla v2 — içerik stratejisi asistanı (sütunlar + kalıcı fikir panosu + isteğe bağlı
// trend aramalı üretim). Eski `ContentClient` (tek kaynak seç → tek caption üret,
// kalıcılık yok) burada ARTIK KULLANILMIYOR — kurucu talimatı: "eski/tıkalı" hâliyle
// bırakılmasın. `ContentClient` dosyasının kendisi DEĞİŞMEDİ, öksüz `/dashboard/content`
// route'u için olduğu gibi kalıyor (bkz. o dosyanın `embedded` prop'u — burada artık
// hiç kullanılmıyor).
export default async function StudioPlanlaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const business = await requireBusinessOwner(locale);
  const t = await getTranslations('StudioHub');

  const { data: items } = await supabaseAdmin
    .from('content_plan_items')
    .select('*')
    .eq('business_id', business.id)
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <DashboardShell business={business} active="studio">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-['Inter']">
        <StudioHubTabs />
        <div className="mb-6">
          <h1 className="text-xl font-[800] tracking-[-0.02em] text-[#14231F]">{t('planlaPageTitle')}</h1>
          <p className="text-sm text-[#4B5A55]">{t('planlaPageDesc')}</p>
        </div>
        <PlanlaClient
          business={{
            id: business.id,
            name: business.name,
            category: (business.category as string | null | undefined) ?? null,
            credit_balance: business.credit_balance,
          }}
          initialPillars={parseContentPillars(business.content_pillars)}
          initialItems={(items || []) as ContentPlanItem[]}
        />
      </main>
    </DashboardShell>
  );
}
