import { getModel } from '@/utils/ai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages, businessId } = await req.json();

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

    // Construct system prompt with context
    const systemPrompt = `
      Sen ${businessData.data.name} adlı işletmenin temsilcisisin. 
      Sektör: ${businessData.data.category || 'Belirtilmedi'}
      İletişim Tercihi: ${businessData.data.contact_method || 'Belirtilmedi'} (${businessData.data.contact_value || 'Belirtilmedi'})

      Aşağıdaki bilgileri kullanarak müşterilerin sorularını yanıtla:
      ${blocksData.data?.map(b => `${b.title} (${b.type}):\n${JSON.stringify(b.content, null, 2)}`).join('\n\n')}

      Kurallar:
      - Ziyaretçinin dilinde yanıt ver (Türkçe, İngilizce veya Rusça).
      - Sadece yukarıdaki verilere dayanarak cevap ver, bilgide olmayan şeyleri uydurma.
      - Bilgi yoksa kibarca ziyaretçiyi işletmeyle doğrudan iletişime geçmeye yönlendir.
      - Kullanıcı bir hizmet için rezervasyon yapmak, fiyat almak veya iletişime geçilmesini isterse mutlaka isim ve iletişim bilgilerini iste.
      - Yeterli bilgiyi (isim ve telefon/email) aldığında "capture_lead" aracını (tool) çağırarak kaydı tamamla ve kullanıcıya işletmenin onlara ulaşacağını söyle.
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
      system: systemPrompt,
      messages,
      tools: {
        capture_lead: tool({
          description: 'Müşteri bir hizmet almak, rezervasyon yapmak veya kendisine ulaşılmasını istediğinde, isim ve iletişim bilgisini verdiyse bu aracı çalıştır.',
          parameters: z.object({
            name: z.string().describe('Müşterinin adı soyadı'),
            contact: z.string().describe('Müşterinin telefon numarası veya e-posta adresi'),
            summary: z.string().describe('Müşterinin tam olarak ne istediğinin kısa bir özeti (örn: Salı günü saç kesimi istiyor)'),
          }),
          // @ts-ignore: Zod and AI SDK type inference mismatch
          execute: async ({ name, contact, summary }: { name: string; contact: string; summary: string }) => {
            const { error } = await supabaseAdmin.from('leads').insert({
              business_id: businessId,
              conversation_id: conversationId,
              name,
              contact,
              summary,
              status: 'new'
            });
            if (error) {
              console.error('Lead capture error:', error);
              return { success: false, message: "Kayıt sırasında bir hata oluştu." };
            }
            return { success: true, message: "Bilgileriniz başarıyla işletmeye iletildi. En kısa sürede sizinle iletişime geçecekler." };
          },
        }),
      },
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
