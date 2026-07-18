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
}: InsertLeadAndNotifyParams): Promise<{ success: boolean; message: string }> {
  const { error } = await supabaseAdmin.from('leads').insert({
    business_id: businessId,
    conversation_id: conversationId,
    name,
    contact,
    summary,
    source_username: sourceUsername,
    preferred_datetime: preferredDatetime,
    status: 'new',
  });
  if (error) {
    console.error('Lead capture error:', error);
    return { success: false, message: 'Kayıt sırasında bir hata oluştu.' };
  }

  // Send email via Resend (skipped for editor preview test conversations — Faz 1.7)
  if (!isPreview && process.env.RESEND_API_KEY && contactValues.email) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'info@talkinbio.com',
        to: contactValues.email,
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
    console.log('Skipping email. No RESEND_API_KEY or email configured.', contactValues.email);
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
};

export function captureLeadTool({ supabaseAdmin, businessId, conversationId, contactValues, directLinks, isPreview }: CaptureLeadToolParams) {
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
      });
    },
  });
}

export type CaptureAccessRequestToolParams = {
  supabaseAdmin: SupabaseClient;
  businessId: string;
  conversationId: string;
};

export function captureAccessRequestTool({ supabaseAdmin, businessId, conversationId }: CaptureAccessRequestToolParams) {
  return tool({
    description: "Ziyaretçi Talkinbio'ya erken erişim talebinde bulunmak istediğinde, isim ve e-posta bilgisini verdiyse bu aracı çalıştır.",
    inputSchema: z.object({
      name: z.string().describe('Ziyaretçinin adı soyadı'),
      email: z.string().describe('Ziyaretçinin e-posta adresi'),
      category: z.string().optional().describe('Ziyaretçinin işletme kategorisi/sektörü (varsa)'),
    }),
    execute: async ({ name, email, category }: { name: string; email: string; category?: string }) => {
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
