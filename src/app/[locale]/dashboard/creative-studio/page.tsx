import { createClient as createServerClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Sparkles, UserRound, Mic, Clapperboard } from 'lucide-react';
import DashboardShell from '@/components/dashboard/DashboardShell';

// Beiwe Lab'ın (bkz. src/config/beiweLab.ts) müşteriye açık, çok-kiracılı hâli
// ayrı bir backend projesi (business_id şeması, admin-auth yerine işletme-sahibi
// auth'u, üretim başına kredi düşümü). Bu sayfa şimdilik yalnızca giriş noktasını
// ve markayı ("Creative Studio") dashboard'da yer tutucu olarak kuruyor.
export default async function CreativeStudioPage() {
  const supabase = await createServerClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData?.user) {
    redirect('/login');
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, username, credit_balance')
    .eq('owner_id', userData.user.id)
    .single();

  if (!business) {
    const t = await getTranslations('Leads');
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">{t('noBusinessTitle')}</h1>
        <p className="text-slate-500 mb-6">{t('noBusinessDescription')}</p>
        <a href="/onboarding" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700">{t('createProfileBtn')}</a>
      </div>
    );
  }

  const t = await getTranslations('CreativeStudio');

  const features = [
    { icon: UserRound, title: t('feature1Title'), desc: t('feature1Desc') },
    { icon: Mic, title: t('feature2Title'), desc: t('feature2Desc') },
    { icon: Clapperboard, title: t('feature3Title'), desc: t('feature3Desc') },
  ];

  return (
    <DashboardShell business={business} active="creative-studio">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-['Inter']">
        <div className="bg-white border border-[rgba(20,35,31,0.10)] rounded-[20px] p-8 sm:p-12 text-center">
          <div className="w-16 h-16 bg-[#FFEDE9] text-[#FF6A5C] rounded-full flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-8 h-8" />
          </div>
          <span className="inline-block text-xs font-semibold uppercase tracking-wider text-[#FF6A5C] bg-[#FFEDE9] px-3 py-1 rounded-full mb-4">
            {t('comingSoonBadge')}
          </span>
          <h1 className="text-2xl sm:text-3xl font-[800] tracking-[-0.02em] text-[#14231F] font-['Bricolage_Grotesque'] mb-3">
            {t('heroTitle')}
          </h1>
          <p className="text-[#4B5A55] max-w-xl mx-auto">
            {t('heroDesc')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white border border-[rgba(20,35,31,0.10)] rounded-[20px] p-6">
              <div className="w-10 h-10 bg-[#F4F2ED] text-[#14231F] rounded-full flex items-center justify-center mb-4">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-[800] text-[#14231F] font-['Bricolage_Grotesque'] mb-1">{title}</h3>
              <p className="text-sm text-[#4B5A55]">{desc}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-[#8A8880] mt-8">{t('notifyHint')}</p>
      </main>
    </DashboardShell>
  );
}
