import { getModel } from '@/utils/ai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { Resend } from 'resend';
import { isConversationActive } from '@/utils/conversationWindow';
import { createClient as createServerSupabase } from '@/utils/supabase/server';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const DEMO_MESSAGE_CAP = 30; // Faz 1.6: landing demosu için geçici, cömert oturum tavanı (Faz 4'te genel altyapıyla değişecek)

export async function POST(req: Request) {
  try {
    const { messages, businessId, locale, newConversation, preview } = await req.json();
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
    const [businessData, blocksData, knowledgeData] = await Promise.all([
      supabaseAdmin.from('businesses').select('*').eq('id', businessId).single(),
      supabaseAdmin.from('blocks').select('*').eq('business_id', businessId).eq('is_visible', true).order('order', { ascending: true }),
      supabaseAdmin.from('saule_knowledge').select('title, content').eq('business_id', businessId).eq('is_active', true)
    ]);

    if (!businessData.data) {
      return new Response('Business not found', { status: 404 });
    }

    const isDemoBusiness = !!process.env.TALKINBIO_BUSINESS_ID && businessId === process.env.TALKINBIO_BUSINESS_ID;

    // Faz 1.7: editor önizlemesi — yalnızca işletmenin sahibi, kendi işletmesi için preview isteyebilir.
    let isPreview = false;
    if (preview) {
      const supabaseAuth = await createServerSupabase();
      const { data: { user } } = await supabaseAuth.auth.getUser();
      if (!user || user.id !== businessData.data.owner_id) {
        return new Response('Preview not allowed', { status: 403 });
      }
      isPreview = true;
    }
    const conversationKey = isPreview ? `preview:${businessId}` : visitorSessionId;

    const sauleSettings = businessData.data.saule_settings || {};
    const tone = {
      friendly: 'Sıcak, samimi ve arkadaş canlısı bir dille konuş.',
      formal: 'Profesyonel, nazik ve mesafeli bir dille konuş.',
      energetic: 'Enerjik, pozitif ve heyecanlı bir dille konuş.'
    }[sauleSettings.personalityTone as 'friendly' | 'formal' | 'energetic'] || 'Sıcak, kısa ve işe yarar yanıtlar ver.';

    const appointmentGuidance = sauleSettings.appointmentEnabled
      ? `Ziyaretçi randevu veya rezervasyon yapmak isterse: ${sauleSettings.appointmentInstructions || 'Müsait gün ve saatini öğren, ardından isim ve iletişim bilgilerini al.'} "capture_lead" aracını çağırırken öğrendiğin gün/saat tercihini preferred_datetime parametresine yaz.`
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

    const knowledgeNotes = knowledgeData.data || [];
    const knowledgeSection = knowledgeNotes.length > 0
      ? `\n\nİşletme sahibinin sana özel olarak öğrettiği notlar (bunlara mutlaka uy):\n${knowledgeNotes.map(k => `- ${k.title ? `${k.title}: ` : ''}${k.content}`).join('\n')}`
      : '';

    const demoGuidance = isDemoBusiness
      ? `\n\nÖnemli: Bu Talkinbio'nun kendi demo sayfası — sen burada Talkinbio ürününün satış asistanısın. Amacın ziyaretçinin ürünle ilgili sorularını yanıtlamak ve hazır olduğunda "capture_access_request" aracıyla (capture_lead DEĞİL) erken erişim talebi almaktır: isim ve e-posta yeterli, sohbet içinde nazikçe iste.`
      : '';

    // Construct system prompt with context
    const systemPrompt = `
      Sen Saule'sin — ${businessData.data.name} adlı işletmenin dijital ön masa asistanısın. 
      Seni ziyaretçiler görüyor, işletme sahibi değil. ${tone}
      Kendiliğinden "yapay zeka" veya "bot" olduğunu gündeme getirme; bir asistan olarak konuş. Ama ziyaretçi doğrudan bir yapay zeka/bot ile mi konuştuğunu sorarsa, bunu inkar etme — dürüstçe dijital bir asistan olduğunu söyle.
      ${appointmentGuidance}

      Sektör: ${businessData.data.category || 'Belirtilmedi'}
      İletişim Tercihi: ${businessData.data.contact_method || 'Belirtilmedi'} (${businessData.data.contact_value || 'Belirtilmedi'})

      Aşağıdaki bilgileri kullanarak müşterilerin sorularını yanıtla:
      ${blocksData.data?.map(b => `${b.title} (${b.type}):\n${JSON.stringify(b.content, null, 2)}`).join('\n\n')}
      ${knowledgeSection}
      ${demoGuidance}

      Kurallar:
      - Ziyaretçinin dilinde yanıt ver (Türkçe, İngilizce veya Rusça).${localeName ? ` Ziyaretçi sayfayı ${localeName} dilinde görüntülüyor, aksi belli olmadıkça bu dilde yanıt ver.` : ''}
      - Sadece yukarıdaki verilere dayanarak cevap ver, bilgide olmayan şeyleri uydurma.
      - Bilgi yoksa kibarca ziyaretçiyi işletmeyle doğrudan iletişime geçmeye yönlendir.
      ${sauleSettings.leadCaptureEnabled !== false ? '- Kullanıcı bir hizmet için rezervasyon yapmak, fiyat almak veya iletişime geçilmesini isterse mutlaka isim ve iletişim bilgilerini iste. Özellikle Instagram veya başka bir sosyal medyadan ulaştıysa kullanıcı adını (@) da iste.\n      - Yeterli bilgiyi (isim ve telefon/email/kullanıcı adı) aldığında "capture_lead" aracını (tool) çağırarak kaydı tamamla ve kullanıcıya işletmenin onlara ulaşacağını söyle.' : ''}
      ${isDemoBusiness ? '- Ziyaretçi erken erişim talebinde bulunmak isterse veya sen bunu önerip olumlu yanıt alırsan isim ve e-posta iste; ikisini de aldığında "capture_access_request" aracını çağırarak talebi kaydet.' : ''}
      ${handoffInstruction}
    `;

    // Find the most recent conversation for this key; reuse it only if it's still
    // "active" (last activity within 7 days) and a fresh one wasn't requested.
    // Preview (Faz 1.7) uses a distinct key so the owner's test chat never mixes with real visitor conversations.
    let conversationId;
    if (!newConversation) {
      const { data: convData } = await supabaseAdmin
        .from('conversations')
        .select('id, last_message_at, created_at')
        .eq('business_id', businessId)
        .eq('visitor_session_id', conversationKey)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (convData && isConversationActive(convData.last_message_at, convData.created_at)) {
        conversationId = convData.id;
      }
    }

    if (!conversationId) {
      const { data: newConv } = await supabaseAdmin
        .from('conversations')
        .insert({ business_id: businessId, visitor_session_id: conversationKey, is_preview: isPreview })
        .select('id')
        .single();
      conversationId = newConv?.id;
    }

    if (!conversationId) {
      throw new Error('Failed to get or create conversation');
    }

    // Only the visitor's latest message is trusted; the rest of the client-sent
    // array is ignored to prevent a visitor from injecting fake assistant turns.
    const lastUserMessage = messages[messages.length - 1];
    if (!lastUserMessage || lastUserMessage.role !== 'user' || typeof lastUserMessage.content !== 'string') {
      return new Response('Invalid message', { status: 400 });
    }

    // Reconstruct history from the DB (last 30 messages) before persisting the new one
    const { data: historyData } = await supabaseAdmin
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(30);
    const history = (historyData || []).reverse();

    await supabaseAdmin.from('messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: lastUserMessage.content,
    });
    await supabaseAdmin.from('conversations').update({
      last_message_at: new Date().toISOString(),
      is_read: false,
    }).eq('id', conversationId);

    const persistAssistantMessage = async (text?: string) => {
      if (!text) return;
      await supabaseAdmin.from('messages').insert({ conversation_id: conversationId, role: 'assistant', content: text });
      await supabaseAdmin.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationId);
    };

    // Faz 1.6: landing demosu için geçici, cömert oturum tavanı — sert blokaj değil, davet.
    if (isDemoBusiness) {
      const { count } = await supabaseAdmin
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conversationId);
      if ((count || 0) > DEMO_MESSAGE_CAP) {
        const cappedResult = await streamText({
          model: getModel('saule'),
          system: 'Kullanıcıya kibarca bu sohbette mesaj sınırına ulaşıldığını söyle; "Yeni sohbet" butonuyla temiz bir oturum başlatabileceğini veya erken erişim talebinde bulunmak isterse isim/e-posta bırakabileceğini belirt. Kısa ve sıcak yaz, ziyaretçinin yazdığı dilde yanıtla.',
          messages: [{ role: 'user' as const, content: lastUserMessage.content }],
          onFinish: async ({ text }) => { await persistAssistantMessage(text); }
        });
        return cappedResult.toDataStreamResponse();
      }
    }

    const modelMessages = [...history, { role: 'user' as const, content: lastUserMessage.content }];

    const result = await streamText({
      model: getModel('saule'),
      maxSteps: 4,
      system: systemPrompt,
      messages: modelMessages,
      tools: isDemoBusiness ? {
        capture_access_request: tool({
          description: 'Ziyaretçi Talkinbio\'ya erken erişim talebinde bulunmak istediğinde, isim ve e-posta bilgisini verdiyse bu aracı çalıştır.',
          parameters: z.object({
            name: z.string().describe('Ziyaretçinin adı soyadı'),
            email: z.string().describe('Ziyaretçinin e-posta adresi'),
            category: z.string().optional().describe('Ziyaretçinin işletme kategorisi/sektörü (varsa)'),
          }),
          // @ts-ignore: Zod and AI SDK type inference mismatch
          execute: async ({ name, email, category }: { name: string; email: string; category?: string }) => {
            const baseUsername = name.toLowerCase().replace(/[^a-z0-9]/g, '');
            const username = baseUsername + Math.floor(Math.random() * 10000);
            const { error } = await supabaseAdmin.from('onboarding_requests').insert({
              email, username, name, category: category || '', contacts: {}, source: 'saule'
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
              status: 'new'
            });
            return { success: true, message: 'Erken erişim talebiniz alındı! Onaylandığında giriş linkiniz e-postanıza gelecek.' };
          },
        }),
      } : sauleSettings.leadCaptureEnabled !== false ? {
        capture_lead: tool({
          description: 'Müşteri bir hizmet almak, rezervasyon yapmak veya kendisine ulaşılmasını istediğinde, isim ve iletişim bilgisini verdiyse bu aracı çalıştır.',
          parameters: z.object({
            name: z.string().describe('Müşterinin adı soyadı'),
            contact: z.string().describe('Müşterinin telefon numarası veya e-posta adresi'),
            summary: z.string().describe('Müşterinin tam olarak ne istediğinin kısa bir özeti (örn: Salı günü saç kesimi istiyor)'),
            source_username: z.string().optional().describe('Müşterinin Instagram veya sosyal medya kullanıcı adı (varsa)'),
            preferred_datetime: z.string().optional().describe('Müşterinin randevu/rezervasyon için belirttiği tercih ettiği gün ve/veya saat (varsa, örn: "Salı 14:00")'),
          }),
          // @ts-ignore: Zod and AI SDK type inference mismatch
          execute: async ({ name, contact, summary, source_username, preferred_datetime }: { name: string; contact: string; summary: string; source_username?: string; preferred_datetime?: string }) => {
            const { error } = await supabaseAdmin.from('leads').insert({
              business_id: businessId,
              conversation_id: conversationId,
              name,
              contact,
              summary,
              source_username,
              preferred_datetime,
              status: 'new'
            });
            if (error) {
              console.error('Lead capture error:', error);
              return { success: false, message: "Kayıt sırasında bir hata oluştu." };
            }

            // Send email via Resend (skipped for editor preview test conversations — Faz 1.7)
            if (!isPreview && process.env.RESEND_API_KEY && contactValues.email) {
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
                        ${preferred_datetime ? `<p><strong>Tercih Edilen Zaman:</strong> ${preferred_datetime}</p>` : ''}
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
      onFinish: async ({ text }) => {
        await persistAssistantMessage(text);
      }
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Chat API Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
