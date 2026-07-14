import { getModel } from '@/utils/ai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { messages, businessId, locale = 'tr' } = await req.json();

    if (!businessId) {
      return new Response('Missing businessId', { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch existing blocks to give context to the AI
    const { data: blocks } = await supabase
      .from('blocks')
      .select('*')
      .eq('business_id', businessId)
      .order('order', { ascending: true });

    const systemPrompt = `
      Sen Talkinbio'nun 'Kurulum Asistanı'sın. Amacın, işletme sahibiyle sohbet ederek public profil sayfasını oluşturmak.
      Kullanıcı işletmesini anlattıkça, arka planda araçları (tools) kullanarak sayfayı güncellemelisin.
      
      Mevcut Sayfa Blokları:
      ${JSON.stringify(blocks || [], null, 2)}
      
      KURALLAR:
      1. Konuşkan ve yardımsever ol. Her mesajda sadece bir veya iki soru sor.
      2. Kullanıcının verdiği bilgileri yakaladığın an ilgili aracı (tool) çalıştır.
      3. Kullanıcının tarzına ve işletme türüne göre bir arketip seç (setArchetype aracıyla). Seçenekler: minimal-light, dark-elegant, warm-natural, vibrant-bold, soft-inviting, professional-corporate, playful-colorful, artisan-rustic.
      4. KESİNLİKLE kullanıcının dilinde (${locale}) yanıt ver. Eğer 'ru' ise Rusça, 'en' ise İngilizce konuş.
    `;

    const result = await streamText({
      model: getModel(),
      system: systemPrompt,
      messages,
      tools: {
        setArchetype: tool({
          description: 'İşletmenin görünümü için uygun arketipi (tema) seçer.',
          parameters: z.object({
            archetype_id: z.enum([
              'minimal-light', 'dark-elegant', 'warm-natural', 'vibrant-bold',
              'soft-inviting', 'professional-corporate', 'playful-colorful', 'artisan-rustic'
            ])
          }),
          execute: async ({ archetype_id }) => {
            await supabase.from('businesses').update({ archetype_id }).eq('id', businessId);
            return `Arketip ${archetype_id} olarak ayarlandı.`;
          },
        }),
        updateAbout: tool({
          description: 'Hakkında (About) bloğunu günceller veya oluşturur.',
          parameters: z.object({
            text: z.string().describe('İşletme hakkında bilgi metni')
          }),
          execute: async ({ text }) => {
            const existingAbout = blocks?.find((b: any) => b.type === 'about');
            if (existingAbout) {
              await supabase.from('blocks').update({ content: { text } }).eq('id', existingAbout.id);
            } else {
              await supabase.from('blocks').insert({
                business_id: businessId,
                type: 'about',
                title: 'Hakkımda',
                content: { text },
                order: 1,
                is_visible: true
              });
            }
            return 'Hakkında bloğu güncellendi.';
          }
        }),
        addService: tool({
          description: 'Yeni bir hizmet (service) ekler.',
          parameters: z.object({
            title: z.string(),
            description: z.string().optional(),
            price: z.string().optional()
          }),
          execute: async ({ title, description, price }) => {
            const existingServices = blocks?.find((b: any) => b.type === 'services');
            const newItem = { title, description, price };
            
            if (existingServices) {
              const items = existingServices.content?.items || [];
              await supabase.from('blocks').update({
                content: { ...existingServices.content, items: [...items, newItem] }
              }).eq('id', existingServices.id);
            } else {
              await supabase.from('blocks').insert({
                business_id: businessId,
                type: 'services',
                title: 'Hizmetler',
                content: { items: [newItem] },
                order: 2,
                is_visible: true
              });
            }
            return `${title} hizmeti eklendi.`;
          }
        }),
      },
    });

    return result.toDataStreamResponse();
  } catch (error: any) {
    console.error('Setup agent error:', error);
    return new Response(error.message, { status: 500 });
  }
}
