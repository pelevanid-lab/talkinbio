import { tool } from 'ai';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export type InsertLeadAndNotifyParams = {
  supabaseAdmin: SupabaseClient;
  businessId: string;
  conversationId: string;
  contactValues: Record<string, string>;
  directLinks: string[];
  isPreview: boolean;
  name: string;
  contact: string;
  summary: string;
  sourceUsername?: string;
  preferredDatetime?: string;
  notificationEmail?: string;
  // 'no_match' | 'credits_exhausted' | 'proactive' | null — bkz. leads.trigger_reason
  // (migration 00071). Instagram DM/capture_lead aracı gibi bu ayrımı bilmeyen çağıranlar
  // için opsiyonel; null "diğer" olarak raporlanır.
  triggerReason?: string | null;
};

/**
 * Lead'i DB'ye yazar + sahibe Resend e-postası atar. Hem LLM'li capture_lead
 * aracı hem de Faz 4.3'ün kredi bitince devreye giren LLM'siz form gönderimi
 * (direct-capture route) bu fonksiyonu kullanır.
 */
export async function insertLeadAndNotify({
  supabaseAdmin,
  businessId,
  conversationId,
  contactValues,
  directLinks,
  isPreview,
  name,
  contact,
  summary,
  sourceUsername,
  preferredDatetime,
  notificationEmail,
  triggerReason,
}: InsertLeadAndNotifyParams): Promise<{ success: boolean; message: string }> {
  // Faz 1.7: editör test konuşmalarından lead yazılmaz. Lead capture sadece ziyaretçilerin
  // (preview: false) girişlerinden tutulur. Böylece test konuşmalarındaki demo veriler
  // lead paneline karışmaz ve silinen test talepleri tekrar oluşturulamaz.
  if (isPreview) {
    return { success: true, message: 'Test konuşmasında lead tutulmuyor.' };
  }

  const { error } = await supabaseAdmin.from('leads').insert({
    business_id: businessId,
    conversation_id: conversationId,
    name,
    contact,
    summary,
    source_username: sourceUsername,
    preferred_datetime: preferredDatetime,
    trigger_reason: triggerReason || null,
    status: 'new',
  });
  if (error) {
    console.error('Lead capture error:', error);
    return { success: false, message: 'Kayıt sırasında bir hata oluştu.' };
  }

  // Notification recipient: owner-configured address (saule_settings.notificationEmail)
  // takes priority over the public contact email shown on the bio page — they're not
  // necessarily the same inbox.
  const recipientEmail = notificationEmail?.trim() || contactValues.email;

  // Send email via Resend to owner
  if (process.env.RESEND_API_KEY && recipientEmail) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://talkinbio.com';
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'info@talkinbio.com',
        to: recipientEmail,
        subject: `Yeni Müşteri Talebi: ${name}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #14231F;">Yeni bir müşteri talebiniz var!</h2>
            <p style="color: #4B5A55;">Saule dijital asistanınız sizin için yeni bir müşteri yakaladı.</p>
            <div style="background-color: #F4F2ED; padding: 20px; border-radius: 12px; margin: 20px 0;">
              <p><strong>Müşteri:</strong> ${name}</p>
              <p><strong>İletişim:</strong> ${contact}</p>
              <p><strong>Talep:</strong> ${summary}</p>
              ${preferredDatetime ? `<p><strong>Tercih Edilen Zaman:</strong> ${preferredDatetime}</p>` : ''}
              ${sourceUsername ? `<p><strong>Sosyal Medya Kullanıcı Adı:</strong> ${sourceUsername}</p>` : ''}
            </div>
            <a href="${baseUrl}/dashboard/leads" style="display:inline-block;padding:12px 24px;background-color:#14231F;color:#fff;text-decoration:none;border-radius:100px;font-weight:bold;margin-right:12px;">
              Panelde Görüntüle
            </a>
            ${sourceUsername ? `
            <a href="https://ig.me/m/${sourceUsername.replace('@', '')}" style="display:inline-block;padding:12px 24px;background-color:#FF6A5C;color:#fff;text-decoration:none;border-radius:100px;font-weight:bold;">
              Instagram'da Mesaj At
            </a>
            ` : ''}
          </div>
        `,
      });
    } catch (err) {
      console.error('Resend email error:', err);
    }
  } else {
    console.log('Skipping email. No RESEND_API_KEY or email configured.', recipientEmail);
  }

  return { success: true, message: 'Bilgileriniz başarıyla işletmeye iletildi. En kısa sürede sizinle iletişime geçecekler.' + (directLinks.length > 0 ? ' Dilerseniz beklemeden işletme sahibine doğrudan şu linklerden yazabilirsiniz: ' + directLinks.join(', ') : '') };
}

export type CaptureLeadToolParams = {
  supabaseAdmin: SupabaseClient;
  businessId: string;
  conversationId: string;
  contactValues: Record<string, string>;
  directLinks: string[];
  isPreview: boolean;
  notificationEmail?: string;
};

export function captureLeadTool({ supabaseAdmin, businessId, conversationId, contactValues, directLinks, isPreview, notificationEmail }: CaptureLeadToolParams) {
  return tool({
    description: 'Müşteri bir hizmet almak, rezervasyon yapmak veya kendisine ulaşılmasını istediğinde, isim ve iletişim bilgisini verdiyse bu aracı çalıştır.',
    inputSchema: z.object({
      name: z.string().describe('Müşterinin adı soyadı'),
      contact: z.string().describe('Müşterinin telefon numarası veya e-posta adresi'),
      summary: z.string().describe('Müşterinin tam olarak ne istediğinin kısa bir özeti (örn: Salı günü saç kesimi istiyor)'),
      source_username: z.string().optional().describe('Müşterinin Instagram veya sosyal medya kullanıcı adı (varsa)'),
      preferred_datetime: z.string().optional().describe('Müşterinin randevu/rezervasyon için belirttiği tercih ettiği gün ve/veya saat (varsa, örn: "Salı 14:00")'),
    }),
    execute: async ({ name, contact, summary, source_username, preferred_datetime }: { name: string; contact: string; summary: string; source_username?: string; preferred_datetime?: string }) => {
      return insertLeadAndNotify({
        supabaseAdmin,
        businessId,
        conversationId,
        contactValues,
        directLinks,
        isPreview,
        name,
        contact,
        summary,
        sourceUsername: source_username,
        preferredDatetime: preferred_datetime,
        notificationEmail,
        // Bu araç bugün yalnızca Instagram DM kanalından (bkz. webhooks/instagram) çağrılıyor.
        triggerReason: 'instagram_dm',
      });
    },
  });
}

export type CaptureAccessRequestToolParams = {
  supabaseAdmin: SupabaseClient;
  businessId: string;
  conversationId: string;
  isPreview: boolean;
};

export function captureAccessRequestTool({ supabaseAdmin, businessId, conversationId, isPreview }: CaptureAccessRequestToolParams) {
  return tool({
    description: "Ziyaretçi Talkinbio'ya erken erişim talebinde bulunmak istediğinde, isim ve e-posta bilgisini verdiyse bu aracı çalıştır.",
    inputSchema: z.object({
      name: z.string().describe('Ziyaretçinin adı soyadı'),
      email: z.string().describe('Ziyaretçinin e-posta adresi'),
      category: z.string().optional().describe('Ziyaretçinin işletme kategorisi/sektörü (varsa)'),
    }),
    execute: async ({ name, email, category }: { name: string; email: string; category?: string }) => {
      // Test konuşmalarından erken erişim talebinin tutulması yok
      if (isPreview) {
        return { success: true, message: 'Test konuşmasında erken erişim talebi tutulmuyor.' };
      }

      const baseUsername = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const username = baseUsername + Math.floor(Math.random() * 10000);
      const { error } = await supabaseAdmin.from('onboarding_requests').insert({
        email, username, name, category: category || '', contacts: {}, source: 'saule',
      });
      if (error) {
        console.error('Access request capture error:', error);
        return { success: false, message: 'Kayıt sırasında bir hata oluştu.' };
      }
      // Also record as a normal lead so it shows up alongside other Saule conversations in reporting
      await supabaseAdmin.from('leads').insert({
        business_id: businessId,
        conversation_id: conversationId,
        name,
        contact: email,
        summary: `Erken erişim talebi${category ? ` (${category})` : ''}`,
        status: 'new',
      });
      return { success: true, message: 'Erken erişim talebiniz alındı! Onaylandığında giriş linkiniz e-postanıza gelecek.' };
    },
  });
}
