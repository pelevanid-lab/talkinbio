import { streamText, tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getModel } from '@/utils/ai';
import { REQUIRED_TYPES, RECOMMENDED_TYPES, hasRealContent } from '@/config/blockTypes';
import { matchSectorProfile } from '@/config/sectorProfiles';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { messages, businessId, locale = 'tr' } = await req.json();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch existing blocks + business to give context to the AI
    const [{ data: blocks }, { data: business }] = await Promise.all([
      supabase.from('blocks').select('*').eq('business_id', businessId).order('order', { ascending: true }),
      supabase.from('businesses').select('contact_method, contact_value, category, theme').eq('id', businessId).single(),
    ]);

    const sectorProfile = matchSectorProfile(business?.category);
    const sectorGuidance = sectorProfile
      ? `Bu işletmenin kategorisi ("${business?.category}") "${sectorProfile.id}" sektör profiliyle eşleşiyor:\n` +
        `- Tema ruh hali: ${sectorProfile.themeMood}\n` +
        `- Önerilen varyantlar: ${JSON.stringify(sectorProfile.variants)}\n` +
        `- Gerekçe: ${sectorProfile.note}\n` +
        `Aksi için güçlü bir sebep olmadıkça bu önerileri takip et.`
      : `Bu işletmenin kategorisi ("${business?.category || 'belirtilmedi'}") bilinen bir sektör profiliyle eşleşmedi; kendi takdirinle özgün bir tema tasarla.`;

    const titles: Record<string, { about: string, services: string, links: string, hours: string, faq: string }> = {
      tr: { about: 'Hakkımda', services: 'Hizmetler', links: 'Bağlantılar', hours: 'Çalışma Saatleri', faq: 'Sıkça Sorulan Sorular' },
      en: { about: 'About', services: 'Services', links: 'Links', hours: 'Working Hours', faq: 'FAQ' },
      ru: { about: 'Обо мне', services: 'Услуги', links: 'Ссылки', hours: 'Часы работы', faq: 'Частые вопросы' }
    };

    const currentLocale = (locale as string) || 'tr';
    const locTitles = titles[currentLocale] || titles['tr'];

    // Persist the conversation so returning to this tab (or reloading the page) doesn't lose context.
    const lastUserMessage = messages[messages.length - 1];
    if (lastUserMessage && lastUserMessage.role === 'user') {
      await supabase.from('setup_messages').insert({
        business_id: businessId,
        role: 'user',
        content: lastUserMessage.content,
      });
    }

    // Build a readiness summary (replaces the old numeric %completeness) so the AI knows
    // exactly which required/recommended sections are still missing.
    const blockList = blocks || [];
    let contactValues: Record<string, string> = {};
    try { contactValues = business?.contact_value ? JSON.parse(business.contact_value) : {}; } catch { contactValues = {}; }
    const hasContact = Object.values(contactValues).some((v) => typeof v === 'string' && v.trim().length > 0);

    const missingRequired = REQUIRED_TYPES.filter((type) => !blockList.some((b) => b.type === type && hasRealContent(b)));
    const missingRecommended = RECOMMENDED_TYPES.filter((type) => !blockList.some((b) => b.type === type && hasRealContent(b)));
    const readinessSummary = [
      `Zorunlu (en az biri dolu olmalı: Hakkımda veya Hizmetler + İletişim bilgisi): ${missingRequired.length === REQUIRED_TYPES.length && !hasContact ? 'Hiçbiri tamamlanmadı' : (missingRequired.length > 0 ? `Eksik: ${missingRequired.join(', ')}` : 'Hakkımda/Hizmetler tamam')}${hasContact ? '' : ' + İletişim bilgisi eksik'}`,
      `Önerilen ama zorunlu olmayan: ${missingRecommended.length > 0 ? `Eksik: ${missingRecommended.join(', ')}` : 'Hepsi tamam'}`,
    ].join('\n');

    const systemPrompt = `
      Sen Talkinbio'nun 'Kurulum Asistanı'sın. Amacın, işletme sahibiyle sohbet ederek public profil sayfasını oluşturmak.
      Kullanıcı işletmesini anlattıkça, arka planda araçları (tools) kullanarak sayfayı güncellemelisin.
      
      Mevcut Sayfa Blokları:
      ${JSON.stringify(blocks || [], null, 2)}

      Mevcut Tema:
      ${business?.theme ? JSON.stringify(business.theme) : 'Henüz tema ayarlanmadı.'}

      Yayına Hazırlık Durumu:
      ${readinessSummary}

      Sektör Profili Önerisi:
      ${sectorGuidance}

      KURALLAR:
      1. Konuşkan ve yardımsever ol. Her mesajda sadece bir veya iki soru sor.
      2. İşletmenin türüne göre proaktifliğini sınırlandır: Eğer danışmanlık, avukatlık gibi 'minimal' bir profilse, medyayı fazla zorlama, sadece dilerse fotoğraf veya video ekleyebileceğini hatırlat. Eğer fotoğrafçı, kuaför veya mimar gibi 'galeri-öncelikli' bir işletmeyse daha proaktif ol ve bol bol portfolyo görseli iste.
      3. Bir konu hakkında (Örn: Hakkımda veya Hizmetler) hemen ilk cevapta konuyu kapatma. Elinde yeterince kaliteli materyal olana kadar müşteriyi yormadan, doğal ve akıcı bir şekilde derinleştirici sorular sor.
      4. ÖNEMLİ: Verileri araçlara (tools) kaydederken, TÜM METİNLERİ aynı anda 3 dile (Türkçe, İngilizce, Rusça) çevirerek gönder. Kullanıcı sadece tek bir dilde bilgi verse bile, sen arka planda bu bilgiyi diğer 2 dile çevirip araca o şekilde iletmelisin. (addFAQ tool'u istisnadır, tek dilde kalabilir.)
      5. Bir aracı (tool) başarıyla çalıştırıp bir bloğu kaydettikten sonra sohbeti sonlandırma! Hemen bir sonraki eksik bölüme (Örn: Hizmetler, İletişim, Çalışma Saatleri, SSS) geçerek yeni sorular sor.
      5b. ÇOK ÖNEMLİ: Bir aracın (tool) sonucu "Error:" ile başlıyorsa, o bölüm KAYDEDİLMEMİŞTİR. Bunu asla başarılıymış gibi sunma — kullanıcıya açıkça "X bölümünü kaydederken teknik bir sorun oluştu, tekrar deneyeyim" gibi dürüstçe bildir ve mümkünse tekrar dene. Özet mesajında sadece gerçekten "Error:" içermeyen sonuçlar için ✅ kullan.
      6. Sektörel Mimari Kararları (ART DIRECTOR): Sen bir web tasarımcısısın. İşletme türüne göre sayfa mimarisini tasarla:
         - ÖNCE yukarıdaki "Sektör Profili Önerisi"ne bak — bir profil eşleştiyse tema ruh hali ve varyant seçimlerinde onu takip et, tahmin yürütme.
         - Görsel ağırlıklı bir sektörse (Kuaför, Fotoğrafçı, vb.) kullanıcıya 'addGallery' aracını kullanarak bir Galeri eklemeyi teklif et.
         - Güven ve uzmanlık ağırlıklı bir sektörse (Danışman, vb.) kullanıcıya 'addTestimonials' aracını kullanarak Yorumlar eklemeyi teklif et.
         - ÇOK ÖNEMLİ: Her aracın 'layoutVariant' parametresi var, her zaman işletmenin tarzına en uygun olanı seç (her tool'un açıklamasında hangi varyantın ne zaman uygun olduğu yazıyor). Örnekler: Masaj salonu/şık restoran için Hakkımda'da 'hero-overlay'; az sayıda ama güçlü bir manifesto metni varsa 'big-statement'; mimarlık ofisi için galeride 'masonry'; birkaç etkileyici fotoğrafla mobil-öncelikli bir his için galeride 'fullbleed-carousel' veya 'stacked-fullwidth'; premium/az sayıda hizmet için services'te 'numbered-list' veya 'feature-split'; restoran/kafe menüsü için services'te 'price-table'; tek ve güçlü bir müşteri yorumu varsa testimonials'ta 'big-quote', birden fazla kısa yorum varsa 'grid-quotes'; uzun bir SSS listesi varsa faq'da 'accordion', tüm cevapların hemen görünmesini istiyorsan 'numbered'; sosyal medya linkleri için links'te 'icon-row' veya 'two-col-grid'; haftalık saatleri tek satırda özetlemek için hours'ta 'pill-row'.
         - Arka plan görseli (backgroundImage): updateAbout (sadece 'standard' varyantında), addServices ve addTestimonials tool'larında opsiyonel 'backgroundImage' + 'backgroundOverlay' ('dark'/'light'/'tint'/'none') parametreleri var. Kullanıcı çarpıcı bir görsel yüklediyse ve o bölüm için özel bir varyant seçmediysen, bölümün arkasına bu görseli koyup 'dark' veya temanın ana rengiyle 'tint' overlay uygulamayı düşün — ama abartma, her bölüme koyma.
      7. TEMA (setTheme aracıyla): Sen artık 11 sabit temadan seçmiyorsun — işletmenin ruhuna uygun ÖZGÜN bir renk paleti (hex) + Google Font çifti tasarlıyorsun. Sektöre göre klişeleşmiş kombinasyonlardan kaçın (ör. her "spa" için aynı yeşil-bej paleti); yukarıdaki "Sektör Profili Önerisi"ndeki tema ruh hali ipucunu bir başlangıç noktası olarak kullan ama kendi yorumunu kat. Font isimleri gerçek, yaygın Google Fonts aile adları olmalı (ör. "Fraunces", "Playfair Display", "Space Grotesk", "Inter", "DM Sans", "Cormorant", "Bricolage Grotesque"). 'setTheme'i HER ZAMAN ilk çağırdığın araçlardan biri yap — ucuz bir adımdır ve süreç herhangi bir sebeple yarıda kesilse bile en azından tasarım uygulanmış olsun.
      8. Yayına Hazırlık: Yayınlanabilmesi için ZORUNLU olan tek şey (Hakkımda VEYA Hizmetler) + İletişim bilgisidir — yukarıdaki "Yayına Hazırlık Durumu"na bak. Bunlar tamamlandığında kullanıcıya "artık yayınlayabilirsin" de ve editördeki 'Yayınla' butonuna basmasını söyle (sen otomatik yayınlamazsın, karar kullanıcıya ait). Çalışma Saatleri, SSS, Galeri, Yorumlar ve Bağlantılar zorunlu değildir ama önerilir; bunlar eksikse nazikçe eklemeyi teklif etmeye devam et.
      8b. İletişim bilgisi (telefon/WhatsApp/Instagram/e-posta) bir "blok" değildir, işletmenin genel ayarlarında tutulur. Kullanıcı iletişim bilgisi verirse veya günceller ise 'updateContact' aracını kullan.
      8c. Çalışma saatleri için 'addHours', Sıkça Sorulan Sorular için 'addFAQ' aracını kullan.
      9. TOPLU YÜKLEME (BULK UPLOAD) DURUMU: Eğer kullanıcı sana '[BULK]' etiketiyle çok uzun bir metin verirse, ona adım adım soru sormak yerine, elindeki BÜTÜN bilgiyi analiz et ve eksik olan tüm blokları arka arkaya araçları çağırarak TEK SEFERDE oluştur. ÇOK ÖNEMLİ SIRALAMA: 'setTheme'i HER ZAMAN İLK araç çağrısı yap, ardından 'updateContact' (varsa iletişim bilgisi), sonra içerik bloklarına geç. Metin çok uzunsa ve her şeyi tek seferde bitiremeyeceğini düşünüyorsan, önce en önemlilerini (tema, Hakkımda veya Hizmetler, iletişim) tamamla — asla tema adımını atlayıp doğrudan uzun içerik üretmeye başlama, çünkü süreç yarıda kesilirse kullanıcı tasarımsız/çıplak bir sayfa görür. İşlem sırasında "Bilgilerinizi analiz ediyorum..." gibi süreç notları yazabilirsin.
      10. KESİNLİKLE kullanıcının dilinde (${locale}) yanıt ver. Eğer 'ru' ise Rusça, 'en' ise İngilizce konuş.
    `;

    const result = await streamText({
      model: getModel(),
      maxSteps: 16,
      maxTokens: 8000,
      system: systemPrompt,
      messages,
      tools: {
        setTheme: tool({
          description: "İşletmeye özgün bir renk paleti + Google Font çifti tasarlar. 11 sabit temadan biri DEĞİL, senin o işletmeye özel ürettiğin bir kombinasyon.",
          parameters: z.object({
            colors: z.object({
              background: z.string().regex(/^#[0-9a-fA-F]{6}$/).describe('Sayfa arka planı (hex)'),
              surface: z.string().regex(/^#[0-9a-fA-F]{6}$/).describe('Kart/konteyner arka planı (hex)'),
              primary: z.string().regex(/^#[0-9a-fA-F]{6}$/).describe('Vurgu rengi — butonlar, linkler (hex)'),
              text: z.string().regex(/^#[0-9a-fA-F]{6}$/).describe('Ana metin rengi (hex)'),
              textMuted: z.string().regex(/^#[0-9a-fA-F]{6}$/).describe('İkincil/pasif metin rengi (hex)'),
              border: z.string().regex(/^#[0-9a-fA-F]{6}$/).describe('Sınır çizgisi rengi (hex)'),
            }),
            headingFont: z.string().regex(/^[A-Za-z0-9 ]+$/).describe('Başlıklar için gerçek bir Google Font aile adı, örn. "Fraunces"'),
            bodyFont: z.string().regex(/^[A-Za-z0-9 ]+$/).describe('Gövde metni için gerçek bir Google Font aile adı, örn. "Mulish"'),
            mediaProfile: z.enum(['gallery-first', 'service-focused', 'minimal']).describe('gallery-first: görsel ağırlıklı sektörler. service-focused: hizmet görselleri orta düzeyde. minimal: az/hiç görsel.'),
            layoutStyle: z.enum(['compact', 'spacious', 'card-heavy', 'flat']).describe('compact: dar boşluklar. spacious: bol boşluk, lüks his. card-heavy: bölümler kart içinde. flat: kart çerçevesi yok.'),
            borderRadius: z.enum(['none', 'sm', 'md', 'xl', 'full']).describe('Köşe yuvarlaklığı. none: keskin köşe. full: çok yuvarlak.'),
          }),
          execute: async ({ colors, headingFont, bodyFont, mediaProfile, layoutStyle, borderRadius }) => {
            const { error } = await supabase.from('businesses').update({
              theme: { colors, headingFont, bodyFont, mediaProfile, layoutStyle, borderRadius }
            }).eq('id', businessId);
            if (error) return `Error: ${error.message}`;
            return `Tema ayarlandı: ${headingFont} / ${bodyFont}, ana renk ${colors.primary}.`;
          },
        }),
        updateAbout: tool({
          description: 'Hakkında (About) bloğunu günceller veya oluşturur. Metinleri 3 dilde sağlamalısın.',
          parameters: z.object({
            tr: z.object({ text: z.string() }).describe('Türkçe hakkında metni'),
            en: z.object({ text: z.string() }).describe('İngilizce hakkında metni'),
            ru: z.object({ text: z.string() }).describe('Rusça hakkında metni'),
            mediaUrl: z.string().optional().describe('Kullanıcının yüklediği görsel URL adresi'),
            extraImages: z.array(z.string()).optional().describe("'image-grid' varyantı için 1-2 ek görsel URL'i (mediaUrl'e ek olarak)."),
            layoutVariant: z.enum(['standard', 'hero-overlay', 'split-card', 'big-statement', 'image-grid']).optional()
              .describe("Tasarım tipi. hero-overlay: Tam ekran görsel ve üstüne yazı. split-card: Yan yana resim ve yazı. big-statement: Görselsiz, çok büyük tipografili editoryal metin (kısa ve güçlü bir 'manifesto' metni varsa kullan). image-grid: Tek büyük görsel yerine küçük görsel kolajı + metin."),
            backgroundImage: z.string().optional().describe("Sadece 'standard' varyantındayken: bölümün arkasına konacak opsiyonel bir arka plan görseli."),
            backgroundOverlay: z.enum(['dark', 'light', 'tint', 'none']).optional().describe('backgroundImage üzerindeki karartma/renk katmanı. dark: siyah karartma (varsayılan). light: açık/beyaz. tint: arketipin ana rengiyle yarı saydam katman. none: katmansız.')
          }),
          execute: async ({ tr, en, ru, mediaUrl, extraImages, layoutVariant, backgroundImage, backgroundOverlay }) => {
            const { error } = await supabase.from('blocks').upsert({
              business_id: businessId,
              type: 'about',
              title: locTitles.about,
              content: {
                tr: { text: tr.text, title: locTitles.about },
                en: { text: en.text, title: titles.en.about },
                ru: { text: ru.text, title: titles.ru.about },
                mediaUrl: mediaUrl || undefined,
                items: (extraImages || []).map((url) => ({ url })),
                layoutVariant: layoutVariant || 'standard',
                backgroundImage: backgroundImage || undefined,
                backgroundOverlay: backgroundOverlay || 'dark'
              },
              order: 1,
              is_visible: true
            }, { onConflict: 'business_id,singleton_key' });

            if (error) return `Error: ${error.message}`;
            return 'Hakkında bloğu güncellendi. Lütfen sıradaki bölüme geçerek sohbete devam et.';
          }
        }),
        addServices: tool({
          description: 'Yeni hizmetleri (services) ekler. Metinleri 3 dilde sağlamalısın.',
          parameters: z.object({
            layoutVariant: z.enum(['list', 'grid-cards', 'numbered-list', 'feature-split', 'price-table']).optional()
              .describe('Tasarım tipi. list: Alt alta. grid-cards: Yan yana kutucuklar. numbered-list: Büyük sıra numaralı zarif liste (az sayıda, premium hizmet için iyi). feature-split: Sağ-sol dönüşümlü büyük görsel+metin satırları (görseli olan az sayıda öne çıkan hizmet için). price-table: Klasik menü/fiyat listesi görünümü (restoran/kafe için iyi).'),
            backgroundImage: z.string().optional().describe('Bölümün arkasına konacak opsiyonel bir arka plan görseli (seçilen varyanttan bağımsız, tüm bölümü kaplar).'),
            backgroundOverlay: z.enum(['dark', 'light', 'tint', 'none']).optional().describe('backgroundImage üzerindeki karartma/renk katmanı. dark: siyah karartma (varsayılan). light: açık/beyaz. tint: arketipin ana rengiyle yarı saydam katman. none: katmansız.'),
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
                tr: { title: titles.tr.services },
                en: { title: titles.en.services },
                ru: { title: titles.ru.services },
                items: newItems,
                layoutVariant: args.layoutVariant || existing?.content?.layoutVariant || 'grid-cards',
                backgroundImage: args.backgroundImage || existing?.content?.backgroundImage || undefined,
                backgroundOverlay: args.backgroundOverlay || existing?.content?.backgroundOverlay || 'dark'
              },
              order: 2,
              is_visible: true
            }, { onConflict: 'business_id,singleton_key' });
            if (error) return `Error: ${error.message}`;
            return `Hizmetler bloğu başarıyla kaydedildi.`;
          }
        }),
        addLinks: tool({
          description: "İşletmenin sosyal medya veya iletişim linklerini ekler.",
          parameters: z.object({
            layoutVariant: z.enum(['stacked', 'icon-row', 'two-col-grid']).optional()
              .describe('Tasarım tipi. stacked: Alt alta tam genişlik butonlar (uzun etiketli linkler için iyi). icon-row: Yan yana yuvarlak ikon butonları (çoğunlukla sosyal medya linkleri için, kısa/etiketsiz görünüm ister). two-col-grid: 2 sütunlu etiketli kart ızgarası (stacked ile icon-row arası orta yol).'),
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
              content: {
                tr: { title: titles.tr.links },
                en: { title: titles.en.links },
                ru: { title: titles.ru.links },
                items: newItems,
                layoutVariant: args.layoutVariant || existing?.content?.layoutVariant || 'stacked'
              },
              order: 4
            }, { onConflict: 'business_id,singleton_key' });
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
            layoutVariant: z.enum(['grid', 'masonry', 'fullbleed-carousel', 'stacked-fullwidth']).optional()
              .describe('Tasarım tipi. grid: Standart ızgara. masonry: Pinterest tarzı asimetrik ızgara. fullbleed-carousel: Kenar boşluksuz, yatay kaydırmalı tam genişlik görsel şeridi (mobil-öncelikli, az sayıda etkileyici görsel için iyi). stacked-fullwidth: Alt alta büyük tam genişlik görseller (hikaye anlatımı/portfolyo hissi).')
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
            }, { onConflict: 'business_id,singleton_key' });
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
            layoutVariant: z.enum(['scroll-cards', 'big-quote', 'grid-quotes']).optional()
              .describe('Tasarım tipi. scroll-cards: Yatay kaydırmalı kart şeridi. big-quote: Tek tek, çok büyük tipografili editoryal alıntılar (tek ve güçlü bir yorum varsa veya "ciddi"/lüks bir arketipse iyi). grid-quotes: 2 sütunlu kompakt kart ızgarası (birden fazla kısa yorum için iyi).'),
            backgroundImage: z.string().optional().describe('Bölümün arkasına konacak opsiyonel bir arka plan görseli (seçilen varyanttan bağımsız, tüm bölümü kaplar).'),
            backgroundOverlay: z.enum(['dark', 'light', 'tint', 'none']).optional().describe('backgroundImage üzerindeki karartma/renk katmanı. dark: siyah karartma (varsayılan). light: açık/beyaz. tint: arketipin ana rengiyle yarı saydam katman. none: katmansız.'),
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
                items: newItems,
                layoutVariant: args.layoutVariant || existing?.content?.layoutVariant || 'scroll-cards',
                backgroundImage: args.backgroundImage || existing?.content?.backgroundImage || undefined,
                backgroundOverlay: args.backgroundOverlay || existing?.content?.backgroundOverlay || 'dark'
              },
              order: 6
            }, { onConflict: 'business_id,singleton_key' });
            if (error) return `Error: ${error.message}`;
            return `Müşteri yorumları kaydedildi.`;
          }
        }),
        addHours: tool({
          description: "İşletmenin haftalık çalışma saatlerini oluşturur veya günceller.",
          parameters: z.object({
            layoutVariant: z.enum(['table', 'compact-badge', 'pill-row']).optional()
              .describe("Tasarım tipi. table: Tüm haftayı sabit bir liste olarak gösterir. compact-badge: 'Bugün Açık/Kapalı' rozeti + tıklayınca açılan tam liste (daha app-like, spor/güzellik gibi enerjik arketipler için iyi). pill-row: Haftanın 7 gününü küçük renkli hap'ler halinde tek satırda özetler (çok kompakt)."),
            schedule: z.object({
              monday: z.object({ isOpen: z.boolean(), openTime: z.string().optional(), closeTime: z.string().optional() }),
              tuesday: z.object({ isOpen: z.boolean(), openTime: z.string().optional(), closeTime: z.string().optional() }),
              wednesday: z.object({ isOpen: z.boolean(), openTime: z.string().optional(), closeTime: z.string().optional() }),
              thursday: z.object({ isOpen: z.boolean(), openTime: z.string().optional(), closeTime: z.string().optional() }),
              friday: z.object({ isOpen: z.boolean(), openTime: z.string().optional(), closeTime: z.string().optional() }),
              saturday: z.object({ isOpen: z.boolean(), openTime: z.string().optional(), closeTime: z.string().optional() }),
              sunday: z.object({ isOpen: z.boolean(), openTime: z.string().optional(), closeTime: z.string().optional() }),
            })
          }),
          execute: async ({ schedule, layoutVariant }) => {
            const { error } = await supabase.from('blocks').upsert({
              business_id: businessId,
              type: 'hours',
              title: locTitles.hours,
              content: {
                tr: { title: titles.tr.hours },
                en: { title: titles.en.hours },
                ru: { title: titles.ru.hours },
                schedule, layoutVariant: layoutVariant || 'table'
              },
              order: 3
            }, { onConflict: 'business_id,singleton_key' });
            if (error) return `Error: ${error.message}`;
            return 'Çalışma saatleri kaydedildi.';
          }
        }),
        addFAQ: tool({
          description: "Sıkça sorulan soruları (FAQ) ekler. Bu blok tek dillidir, kullanıcının konuştuğu dilde yaz.",
          parameters: z.object({
            layoutVariant: z.enum(['chips', 'accordion', 'numbered']).optional()
              .describe('Tasarım tipi. chips: Soruya tıklayınca cevabı asistana sorar (etiket görünümlü). accordion: Klasik aç/kapa liste, cevabı doğrudan sayfada gösterir (uzun SSS listeleri veya daha resmi arketipler için iyi). numbered: Büyük numaralı liste, tüm cevaplar her zaman açık/görünür (services numbered-list ile aynı dil).'),
            items: z.array(z.object({
              question: z.string(),
              answer: z.string()
            }))
          }),
          execute: async ({ items, layoutVariant }) => {
            const { data: existing } = await supabase.from('blocks').select('*').eq('business_id', businessId).eq('type', 'faq').single();
            const oldItems = existing?.content?.items || [];
            const newItems = [...oldItems, ...items];

            const { error } = await supabase.from('blocks').upsert({
              business_id: businessId,
              type: 'faq',
              title: locTitles.faq,
              content: {
                tr: { title: titles.tr.faq },
                en: { title: titles.en.faq },
                ru: { title: titles.ru.faq },
                items: newItems, layoutVariant: layoutVariant || existing?.content?.layoutVariant || 'chips'
              },
              order: 7
            }, { onConflict: 'business_id,singleton_key' });
            if (error) return `Error: ${error.message}`;
            return 'SSS bloğu kaydedildi.';
          }
        }),
        updateContact: tool({
          description: "İşletmenin iletişim yöntemlerini (WhatsApp, telefon, Instagram, e-posta) günceller. Bu bir blok değil, işletmenin genel ayarıdır.",
          parameters: z.object({
            items: z.array(z.object({
              method: z.enum(['whatsapp', 'phone', 'instagram', 'email']),
              value: z.string()
            }))
          }),
          execute: async ({ items }) => {
            const { data: existingBusiness } = await supabase.from('businesses').select('contact_method, contact_value').eq('id', businessId).single();
            let existingValues: Record<string, string> = {};
            try { existingValues = existingBusiness?.contact_value ? JSON.parse(existingBusiness.contact_value) : {}; } catch { existingValues = {}; }

            const mergedValues = { ...existingValues };
            for (const { method, value } of items) mergedValues[method] = value;

            const contactMethod = Object.keys(mergedValues).filter((k) => mergedValues[k]?.trim()).join(',');

            const { error } = await supabase.from('businesses').update({
              contact_method: contactMethod,
              contact_value: JSON.stringify(mergedValues)
            }).eq('id', businessId);
            if (error) return `Error: ${error.message}`;
            return 'İletişim bilgileri güncellendi.';
          }
        })
      },
      onFinish: async ({ text }) => {
        if (text) {
          await supabase.from('setup_messages').insert({
            business_id: businessId,
            role: 'assistant',
            content: text,
          });
        }
      }
    });

    return result.toDataStreamResponse();
  } catch (error: any) {
    console.error('Setup agent error:', error);
    return new Response(error.message, { status: 500 });
  }
}
