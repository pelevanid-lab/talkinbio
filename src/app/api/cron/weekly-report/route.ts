import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { isAuthorizedCronRequest } from '@/utils/cronAuth';

// Vercel Cron: Pazartesi 08:00 UTC (vercel.json). Faz 3.3 — bkz. ROADMAP.md.
export const maxDuration = 300;

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function resolveRecipientEmail(contactValue: string | null): string | null {
  try {
    const parsed = contactValue ? JSON.parse(contactValue) : {};
    return typeof parsed.email === 'string' && parsed.email ? parsed.email : null;
  } catch {
    return null;
  }
}

function renderReportHtml(business: { name: string }, stats: {
  newLeads: number;
  conversations: number;
  pageViews: number;
  insights: { payload: any }[];
}): string {
  const insightsHtml = stats.insights.length > 0
    ? `<div style="background-color: #F4F2ED; padding: 20px; border-radius: 12px; margin: 20px 0;">
         <p style="margin: 0 0 8px 0; font-weight: bold; color: #14231F;">Beiwe'nin bu haftaki önerisi:</p>
         ${stats.insights.map((i) => `<p style="margin: 4px 0; color: #4B5A55;">Müşterileriniz "${i.payload?.topic}" hakkında sık sık soru sordu.</p>`).join('')}
       </div>`
    : '';

  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #14231F;">${business.name} için haftalık özetiniz</h2>
      <p style="color: #4B5A55;">Son 7 günde sayfanızda neler oldu:</p>
      <div style="display: flex; gap: 12px; margin: 20px 0;">
        <div style="flex:1; background:#F4F2ED; padding:16px; border-radius:12px; text-align:center;">
          <div style="font-size:24px; font-weight:800; color:#14231F;">${stats.newLeads}</div>
          <div style="font-size:12px; color:#8A8880;">Yeni Talep</div>
        </div>
        <div style="flex:1; background:#F4F2ED; padding:16px; border-radius:12px; text-align:center;">
          <div style="font-size:24px; font-weight:800; color:#14231F;">${stats.conversations}</div>
          <div style="font-size:12px; color:#8A8880;">Konuşma</div>
        </div>
        <div style="flex:1; background:#F4F2ED; padding:16px; border-radius:12px; text-align:center;">
          <div style="font-size:24px; font-weight:800; color:#14231F;">${stats.pageViews}</div>
          <div style="font-size:12px; color:#8A8880;">Sayfa Görüntülenme</div>
        </div>
      </div>
      ${insightsHtml}
    </div>
  `;
}

export async function POST(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const since = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();

  const { data: businesses, error: businessesError } = await supabaseAdmin
    .from('businesses')
    .select('id, name, owner_id, contact_value')
    .eq('is_published', true);

  if (businessesError) {
    return NextResponse.json({ error: businessesError.message }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;

  for (const business of businesses || []) {
    try {
      let recipientEmail = resolveRecipientEmail(business.contact_value);
      if (!recipientEmail) {
        const { data: ownerUser } = await supabaseAdmin.auth.admin.getUserById(business.owner_id);
        recipientEmail = ownerUser?.user?.email || null;
      }
      if (!recipientEmail) {
        skipped++;
        continue;
      }

      const { count: newLeads } = await supabaseAdmin
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', business.id)
        .gte('created_at', since);

      const { count: conversations } = await supabaseAdmin
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', business.id)
        .eq('is_preview', false)
        .gte('created_at', since);

      const { count: pageViews } = await supabaseAdmin
        .from('page_views')
        .select('business_id', { count: 'exact', head: true })
        .eq('business_id', business.id)
        .gte('view_date', since.slice(0, 10));

      const { data: insights } = await supabaseAdmin
        .from('beiwe_insights')
        .select('payload')
        .eq('business_id', business.id)
        .eq('status', 'new')
        .order('created_at', { ascending: false })
        .limit(3);

      await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: recipientEmail,
        subject: `${business.name} — Haftalık Talkinbio Özetiniz`,
        html: renderReportHtml(business, {
          newLeads: newLeads || 0,
          conversations: conversations || 0,
          pageViews: pageViews || 0,
          insights: insights || [],
        }),
      });
      sent++;
    } catch (err) {
      console.error('[weekly-report] failed for business', { businessId: business.id, err });
      skipped++;
    }
  }

  return NextResponse.json({ sent, skipped });
}
