import { streamText, tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getModel } from '@/utils/ai';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { messages, businessId, locale = 'tr', completeness = 0 } = await req.json();

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

    const titles: Record<string, { about: string, services: string, links: string }> = {
      tr: { about: 'Hakkımda', services: 'Hizmetler', links: 'Bağlantılar' },
      en: { about: 'About', services: 'Services', links: 'Links' },
      ru: { about: 'Обо мне', services: 'Услуги', links: 'Ссылки' }
    };
    
    const currentLocale = (locale as string) || 'tr';
    const locTitles = titles[currentLocale] || titles['tr'];

    const systemPrompt = `
      Sen Talkinbio'nun 'Kurulum Asistanı'sın. Amacın, işletme sahibiyle sohbet ederek public profil sayfasını oluşturmak.
      Kullanıcı işletmesini anlattıkça, arka planda araçları (tools) kullanarak sayfayı güncellemelisin.
      
      Mevcut Sayfa Blokları:
      ${JSON.stringify(blocks || [], null, 2)}

      Mevcut Sayfa Doluluk Oranı: %${completeness}
      
      KURALLAR:
      1. Konuşkan ve yardımsever ol. Her mesajda sadece bir veya iki soru sor.
      2. İşletmenin türüne göre proaktifliğini sınırlandır: Eğer danışmanlık, avukatlık gibi 'minimal' bir profilse, medyayı fazla zorlama, sadece dilerse fotoğraf veya video ekleyebileceğini hatırlat. Eğer fotoğrafçı, kuaför veya mimar gibi 'galeri-öncelikli' bir işletmeyse daha proaktif ol ve bol bol portfolyo görseli iste.
      3. Bir konu hakkında (Örn: Hakkımda veya Hizmetler) hemen ilk cevapta konuyu kapatma. Elinde yeterince kaliteli materyal olana kadar müşteriyi yormadan, doğal ve akıcı bir şekilde derinleştirici sorular sor.
      4. ÖNEMLİ: Verileri araçlara (tools) kaydederken, TÜM METİNLERİ aynı anda 3 dile (Türkçe, İngilizce, Rusça) çevirerek gönder. Kullanıcı sadece tek bir dilde bilgi verse bile, sen arka planda bu bilgiyi diğer 2 dile çevirip araca o şekilde iletmelisin.
      5. Bir aracı (tool) başarıyla çalıştırıp bir bloğu kaydettikten sonra sohbeti sonlandırma! Hemen bir sonraki eksik bölüme (Örn: Hizmetler, İletişim) geçerek yeni sorular sor.
      6. Sektörel Mimari Kararları (ART DIRECTOR): Sen bir web tasarımcısısın. İşletme türüne göre sayfa mimarisini tasarla:
         - Görsel ağırlıklı bir sektörse (Kuaför, Fotoğrafçı, vb.) kullanıcıya 'addGallery' aracını kullanarak bir Galeri eklemeyi teklif et.
         - Güven ve uzmanlık ağırlıklı bir sektörse (Danışman, vb.) kullanıcıya 'addTestimonials' aracını kullanarak Yorumlar eklemeyi teklif et.
         - ÇOK ÖNEMLİ: Araçları kullanırken en uygun 'layoutVariant' (görünüm stili) parametresini seç! Masaj salonu veya şık bir restoran için Hakkımda bloğunda 'hero-overlay' (tam ekran) seç. Mimarlık ofisi için galeriyi 'masonry' seç.
      7. Kullanıcının tarzına ve işletme türüne göre bir arketip seç (setArchetype aracıyla). Seçenekler: minimal-light, dark-elegant, warm-natural, vibrant-bold, soft-inviting, professional-corporate, playful-colorful, artisan-rustic, luxury-spa, cyber-tech, fitness-heavy.
      8. Sayfa Doluluk Oranı: Şu an sayfanın doluluk oranı %${completeness}. %70'i aştığında, kullanıcının iletmek istediği başka bir detay olup olmadığını sorarak profili yayına hazır hale getirdiğini müjdele.
      9. TOPLU YÜKLEME (BULK UPLOAD) DURUMU: Eğer kullanıcı sana '[BULK]' etiketiyle çok uzun bir metin verirse, ona adım adım soru sormak yerine, elindeki BÜTÜN bilgiyi analiz et ve eksik olan tüm blokları arka arkaya araçları çağırarak TEK SEFERDE oluştur. İşlem sırasında "Bilgilerinizi analiz ediyorum..." gibi süreç notları yazabilirsin.
      10. KESİNLİKLE kullanıcının dilinde (${locale}) yanıt ver. Eğer 'ru' ise Rusça, 'en' ise İngilizce konuş.
    `;

    const result = await streamText({
      model: getModel(),
      maxSteps: 10,
      system: systemPrompt,
      messages,
      tools: {
        setArchetype: tool({
          description: 'İşletmenin görünümü için uygun arketipi (tema) seçer.',
          parameters: z.object({
            archetype_id: z.enum([
              'minimal-light', 'dark-elegant', 'warm-natural', 'vibrant-bold',
              'soft-inviting', 'professional-corporate', 'playful-colorful', 'artisan-rustic',
              'luxury-spa', 'cyber-tech', 'fitness-heavy'
            ])
          }),
          execute: async ({ archetype_id }) => {
            await supabase.from('businesses').update({ archetype_id }).eq('id', businessId);
            return `Arketip ${archetype_id} olarak ayarlandı.`;
          },
        }),
        updateAbout: tool({
          description: 'Hakkında (About) bloğunu günceller veya oluşturur. Metinleri 3 dilde sağlamalısın.',
          parameters: z.object({
            tr: z.object({ text: z.string() }).describe('Türkçe hakkında metni'),
            en: z.object({ text: z.string() }).describe('İngilizce hakkında metni'),
            ru: z.object({ text: z.string() }).describe('Rusça hakkında metni'),
            mediaUrl: z.string().optional().describe('Kullanıcının yüklediği görsel URL adresi'),
            layoutVariant: z.enum(['standard', 'hero-overlay', 'split-card']).optional().describe('Tasarım tipi. hero-overlay: Tam ekran görsel ve üstüne yazı. split-card: Yan yana resim ve yazı.')
          }),
          execute: async ({ tr, en, ru, mediaUrl, layoutVariant }) => {
            const { error } = await supabase.from('blocks').upsert({
              business_id: businessId,
              type: 'about',
              title: locTitles.about,
              content: {
                tr: { text: tr.text, title: locTitles.about },
                en: { text: en.text, title: titles.en.about },
                ru: { text: ru.text, title: titles.ru.about },
                mediaUrl: mediaUrl || undefined,
                layoutVariant: layoutVariant || 'standard'
              },
              order: 1,
              is_visible: true
            }, { onConflict: 'business_id,type' });
            
            if (error) return `Error: ${error.message}`;
            return 'Hakkında bloğu güncellendi. Lütfen sıradaki bölüme geçerek sohbete devam et.';
          }
        }),
        addServices: tool({
          description: 'Yeni hizmetleri (services) ekler. Metinleri 3 dilde sağlamalısın.',
          parameters: z.object({
            layoutVariant: z.enum(['list', 'grid-cards']).optional().describe('Tasarım tipi. list: Alt alta, grid-cards: Yan yana kutucuklar.'),
            items: z.array(z.object({
              tr: z.object({ title: z.string(), description: z.string().optional() }),
              en: z.object({ title: z.string(), description: z.string().optional() }),
              ru: z.object({ title: z.string(), description: z.string().optional() }),
              price: z.string().optional(),
              mediaUrl: z.string().optional()
            }))
          }),
          execute: async (args) => {
            const { data: existing } = await supabase.from('blocks').select('*').eq('business_id', businessId).eq('type', 'services').single();
            const oldItems = existing?.content?.items || [];
            const newItems = [...oldItems, ...args.items];

            const { error } = await supabase.from('blocks').upsert({
              business_id: businessId,
              type: 'services',
              title: locTitles.services,
              content: { 
                items: newItems, 
                layoutVariant: args.layoutVariant || existing?.content?.layoutVariant || 'grid-cards' 
              },
              order: 2,
              is_visible: true
            }, { onConflict: 'business_id,type' });
            if (error) return `Error: ${error.message}`;
            return `Hizmetler bloğu başarıyla kaydedildi.`;
          }
        }),
        addLinks: tool({
          description: "İşletmenin sosyal medya veya iletişim linklerini ekler.",
          parameters: z.object({
            items: z.array(z.object({
              label: z.string(),
              url: z.string()
            }))
          }),
          execute: async (args) => {
            const { data: existing } = await supabase.from('blocks').select('*').eq('business_id', businessId).eq('type', 'links').single();
            const oldItems = existing?.content?.items || [];
            const newItems = [...oldItems, ...args.items];

            const { error } = await supabase.from('blocks').upsert({
              business_id: businessId,
              type: 'links',
              title: locTitles.links || 'Links',
              content: { items: newItems },
              order: 4
            }, { onConflict: 'business_id,type' });
            if (error) return `Error saving links: ${error.message}`;
            return `Sosyal medya / link bloğu kaydedildi.`;
          }
        }),
        addGallery: tool({
          description: "Galeriyi oluşturur. Altyazıları (caption) 3 dilde yazmalısın.",
          parameters: z.object({
            tr: z.object({ title: z.string() }),
            en: z.object({ title: z.string() }),
            ru: z.object({ title: z.string() }),
            items: z.array(z.object({
              url: z.string(),
              caption: z.object({
                tr: z.string().optional(),
                en: z.string().optional(),
                ru: z.string().optional()
              }).optional()
            })),
            layoutVariant: z.enum(['grid', 'masonry']).optional().describe('Tasarım tipi. grid: Standart ızgara. masonry: Pinterest tarzı asimetrik ızgara.')
          }),
          execute: async (args) => {
            const { data: existing } = await supabase.from('blocks').select('*').eq('business_id', businessId).eq('type', 'gallery').single();
            const oldItems = existing?.content?.items || [];
            const newItems = [...oldItems, ...args.items];

            const { error } = await supabase.from('blocks').upsert({
              business_id: businessId,
              type: 'gallery',
              title: args.tr.title,
              content: { 
                tr: args.tr, en: args.en, ru: args.ru,
                items: newItems,
                layoutVariant: args.layoutVariant || existing?.content?.layoutVariant || 'grid'
              },
              order: 5
            }, { onConflict: 'business_id,type' });
            if (error) return `Error: ${error.message}`;
            return `Galeri bloğu başarıyla kaydedildi.`;
          }
        }),
        addTestimonials: tool({
          description: "Müşteri yorumlarını (Testimonials) ekler. Yorumları 3 dilde sağlamalısın.",
          parameters: z.object({
            tr: z.object({ title: z.string() }),
            en: z.object({ title: z.string() }),
            ru: z.object({ title: z.string() }),
            items: z.array(z.object({
              quote: z.object({
                tr: z.string(),
                en: z.string(),
                ru: z.string()
              }),
              author: z.string(),
              role: z.object({
                tr: z.string().optional(),
                en: z.string().optional(),
                ru: z.string().optional()
              }).optional()
            }))
          }),
          execute: async (args) => {
            const { data: existing } = await supabase.from('blocks').select('*').eq('business_id', businessId).eq('type', 'testimonials').single();
            const oldItems = existing?.content?.items || [];
            const newItems = [...oldItems, ...args.items];

            const { error } = await supabase.from('blocks').upsert({
              business_id: businessId,
              type: 'testimonials',
              title: args.tr.title,
              content: { 
                tr: args.tr, en: args.en, ru: args.ru,
                items: newItems 
              },
              order: 6
            }, { onConflict: 'business_id,type' });
            if (error) return `Error: ${error.message}`;
            return `Müşteri yorumları kaydedildi.`;
          }
        })
      },
    });

    return result.toDataStreamResponse();
  } catch (error: any) {
    console.error('Setup agent error:', error);
    return new Response(error.message, { status: 500 });
  }
}
