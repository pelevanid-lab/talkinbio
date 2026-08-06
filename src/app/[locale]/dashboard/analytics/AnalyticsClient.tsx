'use client';

import { useTranslations } from 'next-intl';
import { BarChart3, Users, MessageCircle, Inbox, Send, Lightbulb, ArrowRight } from 'lucide-react';
import DashboardShell from '@/components/dashboard/DashboardShell';

type Business = { id: string; name: string; username: string; credit_balance: number };
type Insight = { id: string; topic: string; count: number };

// Aynı "etiket + yüzde çubuğu" görselini birden fazla bölümde (kaynaklar, lead sebebi,
// iletişim niyeti) tekrar kullanan küçük bir yardımcı — tek bir yerde bakım.
function BarList({ items, unitLabel, emptyLabel }: { items: { label: string; count: number }[]; unitLabel?: string; emptyLabel: string }) {
  const total = items.reduce((sum, i) => sum + i.count, 0);
  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-[#8A8880] text-sm">{emptyLabel}</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {items.map((item) => {
        const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
        return (
          <div key={item.label} className="flex flex-col gap-2">
            <div className="flex justify-between items-end text-sm">
              <span className="font-semibold text-[#14231F] capitalize">{item.label}</span>
              <span className="text-[#4B5A55] font-mono">{item.count}{unitLabel ? ` ${unitLabel}` : ''}</span>
            </div>
            <div className="w-full bg-[#F4F2ED] rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-[#FF6A5C] h-2.5 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SectionCard({ icon, title, sub, children }: { icon: React.ReactNode; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[rgba(20,35,31,0.10)] rounded-[20px] overflow-hidden">
      <div className="px-6 py-5 border-b border-[rgba(20,35,31,0.10)] flex items-center gap-3">
        {icon}
        <div>
          <h3 className="text-lg font-[800] font-['Bricolage_Grotesque'] text-[#14231F]">{title}</h3>
          {sub && <p className="text-xs text-[#8A8880] mt-0.5">{sub}</p>}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

export default function AnalyticsClient({
  business,
  viewsBySource,
  totalViews,
  totalConversations,
  engagementByChannel,
  totalEngagement,
  leadsByReason,
  totalLeads,
  insights,
}: {
  business: Business;
  viewsBySource: Record<string, number>;
  totalViews: number;
  totalConversations: number;
  engagementByChannel: Record<string, number>;
  totalEngagement: number;
  leadsByReason: Record<string, number>;
  totalLeads: number;
  insights: Insight[];
}) {
  const t = useTranslations('Analytics');

  const sources = Object.entries(viewsBySource)
    .sort((a, b) => b[1] - a[1])
    .map(([source, count]) => ({ label: source, count }));

  // Sabit haritalar — next-intl anahtarları statik olmalı, `t(`engagement.${channel}`)` gibi
  // çalışma zamanında üretilen anahtarlar hem tip güvenliğini hem çeviri çıkarma araçlarını
  // bozar. Bilinmeyen bir değer gelirse 'other' etiketine düşülür.
  const ENGAGEMENT_LABELS: Record<string, string> = {
    whatsapp: t('engagement.whatsapp'),
    phone: t('engagement.phone'),
    email: t('engagement.email'),
    instagram: t('engagement.instagram'),
    telegram: t('engagement.telegram'),
    order: t('engagement.order'),
  };
  const LEAD_SOURCE_LABELS: Record<string, string> = {
    no_match: t('leadSource.no_match'),
    credits_exhausted: t('leadSource.credits_exhausted'),
    proactive: t('leadSource.proactive'),
    instagram_dm: t('leadSource.instagram_dm'),
  };

  const engagementItems = Object.entries(engagementByChannel)
    .sort((a, b) => b[1] - a[1])
    .map(([channel, count]) => ({ label: ENGAGEMENT_LABELS[channel] || t('engagement.other'), count }));

  const leadSourceItems = Object.entries(leadsByReason)
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => ({ label: LEAD_SOURCE_LABELS[reason] || t('leadSource.other'), count }));

  const funnelSteps = [
    { label: t('funnelViews'), value: totalViews, icon: <Users className="w-5 h-5" /> },
    { label: t('funnelConversations'), value: totalConversations, icon: <MessageCircle className="w-5 h-5" /> },
    { label: t('funnelEngagement'), value: totalEngagement + totalLeads, icon: <Send className="w-5 h-5" /> },
  ];

  return (
    <DashboardShell business={business} active="analytics">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-['Inter']">
        <div className="mb-8">
          <h1 className="text-xl font-[800] tracking-[-0.02em] text-[#14231F] flex items-center gap-2">
            <BarChart3 className="w-5 h-5" /> {t('title')}
          </h1>
          <p className="text-sm text-[#4B5A55]">{business.name}</p>
        </div>

        {/* Stat kartları */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-[rgba(20,35,31,0.10)] rounded-[20px] p-5 flex flex-col">
            <div className="w-10 h-10 bg-[#FFEDE9] text-[#FF6A5C] rounded-full flex items-center justify-center mb-3">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="text-[#8A8880] text-xs font-semibold font-mono tracking-wide uppercase mb-1">{t('statViews')}</h2>
            <p className="text-3xl font-[800] font-['Bricolage_Grotesque'] text-[#14231F]">{totalViews}</p>
          </div>

          <div className="bg-white border border-[rgba(20,35,31,0.10)] rounded-[20px] p-5 flex flex-col">
            <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-3">
              <MessageCircle className="w-5 h-5" />
            </div>
            <h2 className="text-[#8A8880] text-xs font-semibold font-mono tracking-wide uppercase mb-1">{t('statConversations')}</h2>
            <p className="text-3xl font-[800] font-['Bricolage_Grotesque'] text-[#14231F]">{totalConversations}</p>
          </div>

          <div className="bg-white border border-[rgba(20,35,31,0.10)] rounded-[20px] p-5 flex flex-col">
            <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-3">
              <Inbox className="w-5 h-5" />
            </div>
            <h2 className="text-[#8A8880] text-xs font-semibold font-mono tracking-wide uppercase mb-1">{t('statLeads')}</h2>
            <p className="text-3xl font-[800] font-['Bricolage_Grotesque'] text-[#14231F]">{totalLeads}</p>
          </div>

          <div className="bg-white border border-[rgba(20,35,31,0.10)] rounded-[20px] p-5 flex flex-col">
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-3">
              <Send className="w-5 h-5" />
            </div>
            <h2 className="text-[#8A8880] text-xs font-semibold font-mono tracking-wide uppercase mb-1">{t('statEngagement')}</h2>
            <p className="text-3xl font-[800] font-['Bricolage_Grotesque'] text-[#14231F]">{totalEngagement}</p>
          </div>
        </div>

        {/* Ziyaretçi Yolculuğu — huni */}
        <div className="bg-white border border-[rgba(20,35,31,0.10)] rounded-[20px] p-6 mb-8">
          <h3 className="text-lg font-[800] font-['Bricolage_Grotesque'] text-[#14231F] mb-5">{t('funnelTitle')}</h3>
          <div className="flex items-center gap-2 flex-wrap">
            {funnelSteps.map((step, idx) => (
              <div key={step.label} className="flex items-center gap-2">
                <div className="flex flex-col items-center text-center px-3 py-2 min-w-[110px]">
                  <div className="w-9 h-9 rounded-full bg-[#F4F2ED] text-[#4B5A55] flex items-center justify-center mb-2">
                    {step.icon}
                  </div>
                  <p className="text-xl font-[800] font-['Bricolage_Grotesque'] text-[#14231F]">{step.value}</p>
                  <p className="text-[11px] text-[#8A8880] leading-tight mt-0.5">{step.label}</p>
                </div>
                {idx < funnelSteps.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-[#D8D4CB] shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <SectionCard icon={<BarChart3 className="w-5 h-5 text-[#4B5A55]" />} title={t('channelsTitle')}>
            <BarList items={sources} unitLabel={t('visitorUnit')} emptyLabel={t('noData')} />
          </SectionCard>

          <SectionCard icon={<Send className="w-5 h-5 text-[#4B5A55]" />} title={t('engagementTitle')}>
            <BarList items={engagementItems} emptyLabel={t('noData')} />
          </SectionCard>
        </div>

        <div className="mb-8">
          <SectionCard icon={<Inbox className="w-5 h-5 text-[#4B5A55]" />} title={t('leadSourceTitle')}>
            <BarList items={leadSourceItems} emptyLabel={t('noData')} />
          </SectionCard>
        </div>

        {/* Ziyaretçilerin bulamadığı konular — beiwe_insights, önceden sadece haftalık e-postada */}
        <SectionCard
          icon={<Lightbulb className="w-5 h-5 text-amber-500" />}
          title={t('insightsTitle')}
          sub={t('insightsSub')}
        >
          {insights.length === 0 ? (
            <p className="text-[#8A8880] text-sm text-center py-4">{t('insightsEmpty')}</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {insights.map((insight) => (
                <div
                  key={insight.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 bg-amber-50/60 border border-amber-100 rounded-xl"
                >
                  <span className="text-sm font-medium text-[#14231F]">{insight.topic}</span>
                  <span className="text-xs text-amber-700 font-mono whitespace-nowrap shrink-0">
                    {t('insightsCount', { count: insight.count })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </main>
    </DashboardShell>
  );
}
