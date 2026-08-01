import { createClient as createServerClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Sparkles, UserRound, Mic, Clapperboard, ArrowRight, Users, Image as ImageIcon, Film, Video } from 'lucide-react';
import DashboardShell from '@/components/dashboard/DashboardShell';

// Beiwe Lab'ın (bkz. src/config/beiweLab.ts) müşteriye açık, çok-kiracılı hâli — Twin,
// Cast, Voice, Podcast, Post, Studio ve Motion'ın hepsi artık gerçek işlevle bağlı
// (bkz. src/utils/creativeStudioScope.ts + her aracın /dashboard/creative-studio/*
// sayfası). Voice/Podcast/Motion sayfalarında henüz Cast karakter seçici yok — her araç
// şimdilik yalnız işletmenin kendi Twin'i üzerinde çalışıyor.
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
    { icon: UserRound, title: t('feature1Title'), desc: t('feature1Desc'), href: '/dashboard/creative-studio/twin', live: true },
    { icon: Mic, title: t('feature2Title'), desc: t('feature2Desc'), href: '/dashboard/creative-studio/voice', live: true },
    { icon: Clapperboard, title: t('feature3Title'), desc: t('feature3Desc'), href: '/dashboard/creative-studio/podcast', live: true },
    { icon: Users, title: t('feature4Title'), desc: t('feature4Desc'), href: '/dashboard/creative-studio/cast', live: true },
    { icon: ImageIcon, title: t('feature5Title'), desc: t('feature5Desc'), href: '/dashboard/creative-studio/post', live: true },
    { icon: Film, title: t('feature6Title'), desc: t('feature6Desc'), href: '/dashboard/creative-studio/studio', live: true },
    { icon: Video, title: t('feature7Title'), desc: t('feature7Desc'), href: '/dashboard/creative-studio/motion', live: true },
  ];

  return (
    <DashboardShell business={business} active="creative-studio">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-['Inter']">
        <div className="bg-white border border-[rgba(20,35,31,0.10)] rounded-[20px] p-8 sm:p-12 text-center">
          <div className="w-16 h-16 bg-[#FFEDE9] text-[#FF6A5C] rounded-full flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-8 h-8" />
          </div>
          <span className="inline-block text-xs font-semibold uppercase tracking-wider text-[#059669] bg-[#E6F9F3] px-3 py-1 rounded-full mb-4">
            {t('liveBadge')}
          </span>
          <h1 className="text-2xl sm:text-3xl font-[800] tracking-[-0.02em] text-[#14231F] font-['Bricolage_Grotesque'] mb-3">
            {t('heroTitle')}
          </h1>
          <p className="text-[#4B5A55] max-w-xl mx-auto mb-6">
            {t('heroDesc')}
          </p>
          <a
            href="/dashboard/creative-studio/twin"
            className="inline-flex items-center gap-2 bg-[#FF6A5C] text-white rounded-full px-6 py-3 text-sm font-[700] hover:opacity-90 transition"
          >
            {t('twinCta')} <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          {features.map(({ icon: Icon, title, desc, href, live }) => {
            const card = (
              <div className={`bg-white border rounded-[20px] p-6 h-full transition ${live ? 'border-[#FF6A5C]/30 hover:border-[#FF6A5C] hover:shadow-sm' : 'border-[rgba(20,35,31,0.10)]'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-4 ${live ? 'bg-[#FFEDE9] text-[#FF6A5C]' : 'bg-[#F4F2ED] text-[#14231F]'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-[800] text-[#14231F] font-['Bricolage_Grotesque']">{title}</h3>
                  {!live && <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8A8880] bg-[#F4F2ED] px-2 py-0.5 rounded-full">{t('comingSoonBadge')}</span>}
                </div>
                <p className="text-sm text-[#4B5A55]">{desc}</p>
              </div>
            );
            return href ? <a key={title} href={href}>{card}</a> : <div key={title}>{card}</div>;
          })}
        </div>

        <p className="text-center text-sm text-[#8A8880] mt-8">{t('notifyHint')}</p>
      </main>
    </DashboardShell>
  );
}
