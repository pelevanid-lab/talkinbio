import { getModel } from '@/utils/ai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { Resend } from 'resend';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages, businessId, locale } = await req.json();
    const localeNames: Record<string, string> = { tr: 'Türkçe', en: 'İngilizce', ru: 'Rusça' };
    const localeName = localeNames[locale] || null;

    if (!businessId) {
      return new Response('Missing businessId', { status: 400 });
    }

    const cookieStore = await cookies();
    const visitorSessionId = cookieStore.get('visitor_session_id')?.value;

    if (!visitorSessionId) {
      return new Response('Missing visitor_session_id', { status: 401 });
    }

    // Initialize Supabase client with Service Role Key to bypass RLS for visitor operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch business context
    const [businessData, blocksData] = await Promise.all([
      supabaseAdmin.from('businesses').select('*').eq('id', businessId).single(),
      supabaseAdmin.from('blocks').select('*').eq('business_id', businessId).eq('is_visible', true).order('order', { ascending: true })
    ]);

    if (!businessData.data) {
      return new Response('Business not found', { status: 404 });
    }

    const sauleSettings = businessData.data.saule_settings || {};
    const tone = {
      friendly: 'Sıcak, samimi ve arkadaş canlısı bir dille konuş.',
      formal: 'Profesyonel, nazik ve mesafeli bir dille konuş.',
      energetic: 'Enerjik, pozitif ve heyecanlı bir dille konuş.'
    }[sauleSettings.personalityTone as 'friendly' | 'formal' | 'energetic'] || 'Sıcak, kısa ve işe yarar yanıtlar ver.';

    const appointmentGuidance = sauleSettings.appointmentEnabled
      ? `Ziyaretçi randevu veya rezervasyon yapmak isterse: ${sauleSettings.appointmentInstructions || 'Müsait gün ve saatini öğren, ardından isim ve iletişim bilgilerini al.'}`
      : '';

    let directLinks: string[] = [];
    let contactValues: any = {};
    try {
      contactValues = businessData.data.contact_value ? JSON.parse(businessData.data.contact_value) : {};
      if (contactValues.instagram) directLinks.push(`Instagram: https://ig.me/m/${contactValues.instagram.replace('@', '')}`);
      if (contactValues.whatsapp) directLinks.push(`WhatsApp: https://wa.me/${contactValues.whatsapp.replace(/[^0-9]/g, '')}`);
      if (contactValues.telegram) directLinks.push(`Telegram: https://t.me/${contactValues.telegram.replace('@', '')}`);
    } catch(e) {}
    
    const handoffInstruction = directLinks.length > 0 
      ? `\n- Eğer kullanıcıya cevap veremiyorsan veya müşteri lead formunu (capture_lead) başarıyla doldurduysa, onlara beklemek istemezlerse doğrudan şu linklerden birine tıklayarak işletme sahibine mesaj atabileceklerini söyle: ${directLinks.join(', ')}`
      : '';

    // Construct system prompt with context
    const systemPrompt = `
      Sen Saule'sin — ${businessData.data.name} adlı işletmenin dijital ön masa asistanısın. 
      Seni ziyaretçiler görüyor, işletme sahibi değil. ${tone}
      Asla "yapay zeka" veya "bot" olduğunu söyleme; bir asistan olarak konuş.
      ${appointmentGuidance}

      Sektör: ${businessData.data.category || 'Belirtilmedi'}
      İletişim Tercihi: ${businessData.data.contact_method || 'Belirtilmedi'} (${businessData.data.contact_value || 'Belirtilmedi'})

      Aşağıdaki bilgileri kullanarak müşterilerin sorularını yanıtla:
      ${blocksData.data?.map(b => `${b.title} (${b.type}):\n${JSON.stringify(b.content, null, 2)}`).join('\n\n')}

      Kurallar:
      - Ziyaretçinin dilinde yanıt ver (Türkçe, İngilizce veya Rusça).${localeName ? ` Ziyaretçi sayfayı ${localeName} dilinde görüntülüyor, aksi belli olmadıkça bu dilde yanıt ver.` : ''}
      - Sadece yukarıdaki verilere dayanarak cevap ver, bilgide olmayan şeyleri uydurma.
      - Bilgi yoksa kibarca ziyaretçiyi işletmeyle doğrudan iletişime geçmeye yönlendir.
      ${sauleSettings.leadCaptureEnabled !== false ? '- Kullanıcı bir hizmet için rezervasyon yapmak, fiyat almak veya iletişime geçilmesini isterse mutlaka isim ve iletişim bilgilerini iste. Özellikle Instagram veya başka bir sosyal medyadan ulaştıysa kullanıcı adını (@) da iste.\n      - Yeterli bilgiyi (isim ve telefon/email/kullanıcı adı) aldığında "capture_lead" aracını (tool) çağırarak kaydı tamamla ve kullanıcıya işletmenin onlara ulaşacağını söyle.' : ''}
      ${handoffInstruction}
    `;

    // Ensure conversation exists for this visitor and business
    let conversationId;
    const { data: convData } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('business_id', businessId)
      .eq('visitor_session_id', visitorSessionId)
      .single();

    if (convData) {
      conversationId = convData.id;
    } else {
      const { data: newConv } = await supabaseAdmin
        .from('conversations')
        .insert({ business_id: businessId, visitor_session_id: visitorSessionId })
        .select('id')
        .single();
      conversationId = newConv?.id;
    }

    if (!conversationId) {
      throw new Error('Failed to get or create conversation');
    }

    // Save user's latest message to DB
    const lastUserMessage = messages[messages.length - 1];
    if (lastUserMessage && lastUserMessage.role === 'user') {
      await supabaseAdmin.from('messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: lastUserMessage.content,
      });
    }

    const result = await streamText({
      model: getModel(),
      maxSteps: 4,
      system: systemPrompt,
      messages,
      tools: sauleSettings.leadCaptureEnabled !== false ? {
        capture_lead: tool({
          description: 'Müşteri bir hizmet almak, rezervasyon yapmak veya kendisine ulaşılmasını istediğinde, isim ve iletişim bilgisini verdiyse bu aracı çalıştır.',
          parameters: z.object({
            name: z.string().describe('Müşterinin adı soyadı'),
            contact: z.string().describe('Müşterinin telefon numarası veya e-posta adresi'),
            summary: z.string().describe('Müşterinin tam olarak ne istediğinin kısa bir özeti (örn: Salı günü saç kesimi istiyor)'),
            source_username: z.string().optional().describe('Müşterinin Instagram veya sosyal medya kullanıcı adı (varsa)'),
          }),
          // @ts-ignore: Zod and AI SDK type inference mismatch
          execute: async ({ name, contact, summary, source_username }: { name: string; contact: string; summary: string; source_username?: string }) => {
            const { error } = await supabaseAdmin.from('leads').insert({
              business_id: businessId,
              conversation_id: conversationId,
              name,
              contact,
              summary,
              source_username,
              status: 'new'
            });
            if (error) {
              console.error('Lead capture error:', error);
              return { success: false, message: "Kayıt sırasında bir hata oluştu." };
            }

            // Send email via Resend
            if (process.env.RESEND_API_KEY && contactValues.email) {
              try {
                const resend = new Resend(process.env.RESEND_API_KEY);
                await resend.emails.send({
                  from: 'onboarding@resend.dev',
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
                        ${source_username ? `<p><strong>Sosyal Medya Kullanıcı Adı:</strong> ${source_username}</p>` : ''}
                      </div>
                      ${source_username ? `
                      <a href="https://ig.me/m/${source_username.replace('@','')}" style="display:inline-block;padding:12px 24px;background-color:#FF6A5C;color:#fff;text-decoration:none;border-radius:100px;font-weight:bold;">
                        Instagram'da Mesaj At
                      </a>
                      ` : ''}
                    </div>
                  `
                });
              } catch (err) {
                console.error('Resend email error:', err);
              }
            } else {
              console.log('Skipping email. No RESEND_API_KEY or email configured.', contactValues.email);
            }

            return { success: true, message: "Bilgileriniz başarıyla işletmeye iletildi. En kısa sürede sizinle iletişime geçecekler." + (directLinks.length > 0 ? " Dilerseniz beklemeden işletme sahibine doğrudan şu linklerden yazabilirsiniz: " + directLinks.join(', ') : "") };
          },
        }),
      } : {},
      onFinish: async ({ text, toolCalls }) => {
        // Save assistant's text response to DB
        if (text) {
          await supabaseAdmin.from('messages').insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: text,
          });
        }
      }
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Chat API Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
