import { getModel } from '@/utils/ai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { messages, businessId, locale = 'tr', completeness = 0 } = await req.json();

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
      2. İşletmenin türüne göre proaktifliğini sınırlandır: Eğer danışmanlık, avukatlık gibi 'minimal' bir profilse, medyayı fazla zorlama, sadece dilerse fotoğraf ekleyebileceğini bir kez hatırlat. Eğer fotoğrafçı, kuaför, masör gibi 'galeri öncelikli' bir profilse, fotoğraf veya video isteme konusunda biraz daha teşvik edici ol (ancak asla rahatsız edici boyutta ısrar etme). (Örn: "Sayfanızı canlandırmak dilerseniz sol alttaki ataş ikonunu kullanarak bir fotoğraf yükleyebilirsiniz.")
      3. Bir konu hakkında (Örn: Hakkımda veya Hizmetler) hemen ilk cevapta konuyu kapatma. Elinde yeterince kaliteli materyal olana kadar müşteriyi yormadan, doğal ve akıcı bir şekilde derinleştirici sorular sor.
      4. Yeterli detay topladığında veya kullanıcı bir fotoğraf/bilgi verdiğinde, aracı (tool) çağırırken bu metni DOĞRUDAN KOPYALAMA. Bir metin yazarı (copywriter) gibi davran; verilen bilgileri profesyonel ve ilgi çekici bir dile çevirerek kaydet. Kullanıcı bir medya yüklediyse (URL), bunu aracın "mediaUrl" parametresine KESİNLİKLE ekle.
      5. Bir aracı (tool) başarıyla çalıştırıp bir bloğu kaydettikten sonra sohbeti sonlandırma! Hemen bir sonraki eksik bölüme (Örn: Hizmetler, İletişim) geçerek yeni sorular sor.
      6. Sektörel Mimari Kararları: İşletme türüne göre sayfa mimarisini tasarla:
         - Görsel ağırlıklı bir sektörse (Kuaför, Fotoğrafçı, Mimar vb.) kullanıcıya 'addGallery' aracını kullanarak bir Galeri eklemeyi teklif et. Çoklu fotoğraf isteyebilirsin.
         - Güven ve uzmanlık ağırlıklı bir sektörse (Danışman, Avukat, Koç vb.) kullanıcıya 'addTestimonials' aracını kullanarak Müşteri Yorumları eklemeyi teklif et.
         - Temel blokların (Hakkımda, Hizmetler) dışında bu sektörel blokları mutlaka kullanarak sayfayı zenginleştir.
      7. Kullanıcının tarzına ve işletme türüne göre bir arketip seç (setArchetype aracıyla). Seçenekler: minimal-light, dark-elegant, warm-natural, vibrant-bold, soft-inviting, professional-corporate, playful-colorful, artisan-rustic, luxury-spa, cyber-tech, fitness-heavy. Sadece bir kez yapman yeterli.
      8. Sayfa Doluluk Oranı: Şu an sayfanın doluluk oranı %${completeness}. %70'i aştığında, kullanıcının iletmek istediği başka bir detay (örneğin çalışma saatleri, ek linkler) olup olmadığını sorarak profili yayına hazır hale getirdiğini (is_published) müjdele.
      9. KESİNLİKLE kullanıcının dilinde (${locale}) yanıt ver. Eğer 'ru' ise Rusça, 'en' ise İngilizce konuş.
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
          description: 'Hakkında (About) bloğunu günceller veya oluşturur.',
          parameters: z.object({
            text: z.string().describe('İşletme hakkında bilgi metni'),
            mediaUrl: z.string().optional().describe('Kullanıcının yüklediği görsel veya videonun URL adresi')
          }),
          execute: async ({ text, mediaUrl }) => {
            const existingAbout = blocks?.find((b: any) => b.type === 'about');
            if (existingAbout) {
              const newContent = { ...existingAbout.content, text };
              if (mediaUrl) newContent.mediaUrl = mediaUrl;
              await supabase.from('blocks').update({ content: newContent }).eq('id', existingAbout.id);
            } else {
              await supabase.from('blocks').insert({
                business_id: businessId,
                type: 'about',
                title: locTitles.about,
                content: { text, mediaUrl },
                order: 1,
                is_visible: true
              });
            }
            return 'Hakkında bloğu güncellendi. Lütfen sıradaki bölüme (Örn: Hizmetler) geçerek sohbete devam et.';
          }
        }),
        addService: tool({
          description: 'Yeni bir hizmet (service) ekler.',
          parameters: z.object({
            title: z.string(),
            description: z.string().optional(),
            price: z.string().optional(),
            mediaUrl: z.string().optional().describe('Hizmet ile ilgili görsel veya videonun URL adresi')
          }),
          execute: async ({ title, description, price, mediaUrl }) => {
            const existingServices = blocks?.find((b: any) => b.type === 'services');
            const newItem = { title, description, price, mediaUrl };
            
            if (existingServices) {
              const items = existingServices.content?.items || [];
              await supabase.from('blocks').update({
                content: { ...existingServices.content, items: [...items, newItem] }
              }).eq('id', existingServices.id);
            } else {
              await supabase.from('blocks').insert({
                business_id: businessId,
                type: 'services',
                title: locTitles.services,
                content: { items: [newItem] },
                order: 2,
                is_visible: true
              });
            }
            return `${title} hizmeti eklendi. Başka eklenecek hizmet yoksa sıradaki bölüme geç.`;
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
            const { error } = await supabase.from('blocks').upsert({
              business_id: businessId,
              type: 'links',
              title: locTitles.links || 'Links',
              content: { items: args.items },
              order: 4
            }, { onConflict: 'business_id,type' });
            
            if (error) return `Error saving links: ${error.message}`;
            return `Sosyal medya / link bloğu kaydedildi. Sıradaki eksik bloğu sormaya devam et! (Örn: Çalışma Saatleri)`;
          }
        }),
        addGallery: tool({
          description: "İşletmenin vizyonunu/ürünlerini sergilemek için bir Galeri (Gallery) bloğu oluşturur veya günceller.",
          parameters: z.object({
            title: z.string().describe("Galeri başlığı (Örn: Çalışmalarım, Portfolyo, Ortamımız)"),
            items: z.array(z.object({
              url: z.string().describe("Kullanıcının yüklediği görsel URL'si"),
              caption: z.string().optional().describe("Görsel hakkında kısa açıklama (Örn: Gelin Saçı)")
            })).describe("Galeriye eklenecek görsellerin listesi")
          }),
          execute: async (args) => {
            const { error } = await supabase.from('blocks').upsert({
              business_id: businessId,
              type: 'gallery',
              title: args.title,
              content: { items: args.items },
              order: 5
            }, { onConflict: 'business_id,type' });
            
            if (error) return `Error saving gallery: ${error.message}`;
            return `Galeri bloğu başarıyla kaydedildi. (${args.items.length} görsel eklendi). Müşteriye yeni eklenecek başka bir şey olup olmadığını sor.`;
          }
        }),
        addTestimonials: tool({
          description: "Müşteri yorumlarını ve referansları göstermek için Testimonials bloğu oluşturur.",
          parameters: z.object({
            title: z.string().describe("Yorum bloğu başlığı (Örn: Mutlu Müşterilerimiz, Referanslar)"),
            items: z.array(z.object({
              quote: z.string().describe("Müşterinin yorum metni"),
              author: z.string().describe("Müşterinin adı soyadı"),
              role: z.string().optional().describe("Müşterinin unvanı veya mesleği (Örn: CEO, Veli)")
            })).describe("Müşteri yorumlarının listesi")
          }),
          execute: async (args) => {
            const { error } = await supabase.from('blocks').upsert({
              business_id: businessId,
              type: 'testimonials',
              title: args.title,
              content: { items: args.items },
              order: 6
            }, { onConflict: 'business_id,type' });
            
            if (error) return `Error saving testimonials: ${error.message}`;
            return `Müşteri yorumları bloğu kaydedildi. Başka eklenecek bir şey kalmadıysa işlemi toparla.`;
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
