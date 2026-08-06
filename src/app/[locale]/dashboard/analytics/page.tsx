import { createClient } from '@/utils/supabase/server';
import { redirect } from '@/i18n/routing';
import AnalyticsClient from './AnalyticsClient';

export default async function AnalyticsPage({ params }: any) {
  const { locale } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect({ href: '/login', locale });
  }

  // Fetch business details
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user!.id)
    .single();

  if (!business) {
    redirect({ href: '/onboarding', locale });
  }

  // Fetch page views (kaynak kırılımı için)
  const { data: pageViews } = await supabase
    .from('page_views')
    .select('source')
    .eq('business_id', business.id);

  // Sahibin kendi önizleme/test konuşmaları sayıma karışmasın — eskiden is_preview filtresi
  // yoktu, "Saule ile Konuşma" sayısı sahibin kendi testleriyle şişiyordu.
  const { count: conversationsCount } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', business.id)
    .eq('is_preview', false);

  // Sıfır sürtünmeli niyet sinyalleri (bkz. migration 00070) — WhatsApp/telefon/e-posta/
  // Instagram/Sipariş Ver tıklamaları. Önceden hiçbir yerde görünmüyordu.
  const { data: engagementEvents } = await supabase
    .from('engagement_events')
    .select('event_type, channel')
    .eq('business_id', business.id);

  // Lead'ler + hangi sebepten yakalandıkları (bkz. migration 00071 — proaktif davet mi,
  // Saule cevap bulamadığı için mi, kredi bittiği için mi, yoksa Instagram DM'den mi).
  const { data: leads } = await supabase
    .from('leads')
    .select('trigger_reason')
    .eq('business_id', business.id);

  // Ziyaretçilerin sık sorup da sayfada cevabını bulamadığı konular — haftalık cron
  // (analyze-conversations) tarafından üretiliyor, şimdiye kadar sadece e-postada görünüyordu.
  const { data: insights } = await supabase
    .from('beiwe_insights')
    .select('id, payload, created_at')
    .eq('business_id', business.id)
    .eq('type', 'faq-suggestion')
    .eq('status', 'new')
    .order('created_at', { ascending: false })
    .limit(8);

  // Group page views by source
  const viewsBySource = (pageViews || []).reduce((acc: any, view: any) => {
    const source = view.source || 'direct';
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {});

  const engagementByChannel = (engagementEvents || []).reduce((acc: any, ev: any) => {
    const key = ev.event_type === 'order_click' ? 'order' : (ev.channel || 'other');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const leadsByReason = (leads || []).reduce((acc: any, lead: any) => {
    const key = lead.trigger_reason || 'other';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const totalViews = pageViews?.length || 0;

  return (
    <AnalyticsClient
      business={business}
      viewsBySource={viewsBySource}
      totalViews={totalViews}
      totalConversations={conversationsCount || 0}
      engagementByChannel={engagementByChannel}
      totalEngagement={engagementEvents?.length || 0}
      leadsByReason={leadsByReason}
      totalLeads={leads?.length || 0}
      insights={(insights || []).map((i: any) => ({ id: i.id, topic: i.payload?.topic || '', count: i.payload?.count || 0 }))}
    />
  );
}
