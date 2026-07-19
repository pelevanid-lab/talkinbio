import { tool } from 'ai';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getLocaleTitles, LOCALE_TITLES } from './prompt';

export type BeiweToolParams = {
  supabase: SupabaseClient;
  businessId: string;
  locale: string;
};

export function setThemeTool({ supabase, businessId }: BeiweToolParams) {
  return tool({
    description: "İşletmeye özgün bir renk paleti + Google Font çifti tasarlar. 11 sabit temadan biri DEĞİL, senin o işletmeye özel ürettiğin bir kombinasyon.",
    inputSchema: z.object({
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
        theme: { colors, headingFont, bodyFont, mediaProfile, layoutStyle, borderRadius },
      }).eq('id', businessId);
      if (error) return `Error: ${error.message}`;
      return `Tema ayarlandı: ${headingFont} / ${bodyFont}, ana renk ${colors.primary}.`;
    },
  });
}

export function updateAboutTool({ supabase, businessId, locale }: BeiweToolParams) {
  const locTitles = getLocaleTitles(locale);
  return tool({
    description: 'Hakkında (About) bloğunu günceller veya oluşturur. Metinleri 3 dilde sağlamalısın.',
    inputSchema: z.object({
      tr: z.object({ text: z.string() }).describe('Türkçe hakkında metni'),
      en: z.object({ text: z.string() }).describe('İngilizce hakkında metni'),
      ru: z.object({ text: z.string() }).describe('Rusça hakkında metni'),
      sectionTitle: z.string().optional().describe("Kullanıcı bu bölüm için 'Hakkımda' yerine özel bir başlık istediyse (örn. 'Merhaba') buraya yaz — aynı kelime üç dilde de kullanılır. Belirtilmezse varsayılan 'Hakkımda/About/Обо мне' kullanılır; daha önce ayarlanmış özel bir başlık varsa (boş bırakılsa bile) o korunur."),
      mediaUrl: z.string().optional().describe('Kullanıcının yüklediği görsel URL adresi'),
      mediaPosition: z.enum(['top', 'middle', 'bottom']).optional()
        .describe("SADECE 'standard' varyantındayken (veya varyant belirtilmediğinde) anlamlı: mediaUrl görselini metnin NORMAL AKIŞI İÇİNE, başlığın öncesine ('top'), başlık ile metin arasına ('middle', varsayılan) veya metnin sonrasına ('bottom') yerleştirir. Kullanıcı 'görseli üste/yukarı koy' derse — arka plana koy DEMEDİYSE — bu alanı kullan, layoutVariant'ı 'hero-overlay' YAPMA: o, görseli tüm bölümün ARKA PLANI yapıp üstüne beyaz yazı bindiren tamamen farklı bir tasarımdır."),
      extraImages: z.array(z.string()).optional().describe("'image-grid' varyantı için 1-2 ek görsel URL'i (mediaUrl'e ek olarak)."),
      layoutVariant: z.enum(['standard', 'hero-overlay', 'split-card', 'big-statement', 'image-grid']).optional()
        .describe("Tasarım tipi. hero-overlay: Tam ekran görsel ve üstüne yazı. split-card: Yan yana resim ve yazı. big-statement: Görselsiz, çok büyük tipografili editoryal metin (kısa ve güçlü bir 'manifesto' metni varsa kullan). image-grid: Tek büyük görsel yerine küçük görsel kolajı + metin."),
      backgroundImage: z.string().optional().describe("Sadece 'standard' varyantındayken: bölümün arkasına konacak opsiyonel bir arka plan görseli."),
      backgroundOverlay: z.enum(['dark', 'light', 'tint', 'none']).optional().describe('backgroundImage üzerindeki karartma/renk katmanı. dark: siyah karartma (varsayılan). light: açık/beyaz. tint: arketipin ana rengiyle yarı saydam katman. none: katmansız.'),
    }),
    execute: async ({ tr, en, ru, sectionTitle, mediaUrl, mediaPosition, extraImages, layoutVariant, backgroundImage, backgroundOverlay }) => {
      const { data: existing } = await supabase.from('blocks').select('content').eq('business_id', businessId).eq('type', 'about').single();
      const existingCustomTitle = existing?.content?.tr?.title && existing.content.tr.title !== LOCALE_TITLES.tr.about ? existing.content.tr.title : undefined;
      const customTitle = sectionTitle || existingCustomTitle;

      const { error } = await supabase.from('blocks').upsert({
        business_id: businessId,
        type: 'about',
        title: customTitle || locTitles.about,
        content: {
          tr: { text: tr.text, title: customTitle || LOCALE_TITLES.tr.about },
          en: { text: en.text, title: customTitle || LOCALE_TITLES.en.about },
          ru: { text: ru.text, title: customTitle || LOCALE_TITLES.ru.about },
          mediaUrl: mediaUrl || undefined,
          mediaPosition: mediaPosition || 'middle',
          items: (extraImages || []).map((url) => ({ url })),
          layoutVariant: layoutVariant || 'standard',
          backgroundImage: backgroundImage || undefined,
          backgroundOverlay: backgroundOverlay || 'dark',
        },
        order: 1,
        is_visible: true,
      }, { onConflict: 'business_id,singleton_key' });

      if (error) return `Error: ${error.message}`;
      return 'Hakkında bloğu güncellendi. Lütfen sıradaki bölüme geçerek sohbete devam et.';
    },
  });
}

export function addServicesTool({ supabase, businessId, locale }: BeiweToolParams) {
  const locTitles = getLocaleTitles(locale);
  return tool({
    description: 'Yeni hizmetleri (services) ekler. Metinleri 3 dilde sağlamalısın.',
    inputSchema: z.object({
      sectionTitle: z.string().optional().describe("Kullanıcı bu bölüm için 'Hizmetler' yerine özel bir başlık istediyse buraya yaz — aynı kelime üç dilde de kullanılır. Belirtilmezse varsayılan 'Hizmetler/Services/Услуги' korunur (önceden ayarlanmış özel bir başlık varsa o da korunur)."),
      layoutVariant: z.enum(['list', 'grid-cards', 'numbered-list', 'feature-split', 'price-table']).optional()
        .describe('Tasarım tipi. list: Alt alta. grid-cards: Yan yana kutucuklar. numbered-list: Büyük sıra numaralı zarif liste (az sayıda, premium hizmet için iyi). feature-split: Sağ-sol dönüşümlü büyük görsel+metin satırları (görseli olan az sayıda öne çıkan hizmet için). price-table: Klasik menü/fiyat listesi görünümü (restoran/kafe için iyi).'),
      backgroundImage: z.string().optional().describe('Bölümün arkasına konacak opsiyonel bir arka plan görseli (seçilen varyanttan bağımsız, tüm bölümü kaplar).'),
      backgroundOverlay: z.enum(['dark', 'light', 'tint', 'none']).optional().describe('backgroundImage üzerindeki karartma/renk katmanı. dark: siyah karartma (varsayılan). light: açık/beyaz. tint: arketipin ana rengiyle yarı saydam katman. none: katmansız.'),
      items: z.array(z.object({
        tr: z.object({ title: z.string(), description: z.string().optional() }),
        en: z.object({ title: z.string(), description: z.string().optional() }),
        ru: z.object({ title: z.string(), description: z.string().optional() }),
        price: z.string().optional(),
        mediaUrl: z.string().optional(),
      })),
    }),
    execute: async (args) => {
      const { data: existing } = await supabase.from('blocks').select('*').eq('business_id', businessId).eq('type', 'services').single();
      const oldItems = existing?.content?.items || [];
      const newItems = [...oldItems, ...args.items];
      const existingCustomTitle = existing?.content?.tr?.title && existing.content.tr.title !== LOCALE_TITLES.tr.services ? existing.content.tr.title : undefined;
      const customTitle = args.sectionTitle || existingCustomTitle;

      const { error } = await supabase.from('blocks').upsert({
        business_id: businessId,
        type: 'services',
        title: customTitle || locTitles.services,
        content: {
          tr: { title: customTitle || LOCALE_TITLES.tr.services },
          en: { title: customTitle || LOCALE_TITLES.en.services },
          ru: { title: customTitle || LOCALE_TITLES.ru.services },
          items: newItems,
          layoutVariant: args.layoutVariant || existing?.content?.layoutVariant || 'grid-cards',
          backgroundImage: args.backgroundImage || existing?.content?.backgroundImage || undefined,
          backgroundOverlay: args.backgroundOverlay || existing?.content?.backgroundOverlay || 'dark',
        },
        order: 2,
        is_visible: true,
      }, { onConflict: 'business_id,singleton_key' });
      if (error) return `Error: ${error.message}`;
      return `Hizmetler bloğu başarıyla kaydedildi.`;
    },
  });
}

export function addLinksTool({ supabase, businessId, locale }: BeiweToolParams) {
  const locTitles = getLocaleTitles(locale);
  return tool({
    description: "İşletmenin sosyal medya veya iletişim linklerini ekler.",
    inputSchema: z.object({
      sectionTitle: z.string().optional().describe("Kullanıcı bu bölüm için 'Bağlantılar' yerine özel bir başlık istediyse buraya yaz — aynı kelime üç dilde de kullanılır. Belirtilmezse varsayılan 'Bağlantılar/Links/Ссылки' korunur (önceden ayarlanmış özel bir başlık varsa o da korunur)."),
      layoutVariant: z.enum(['stacked', 'icon-row', 'two-col-grid']).optional()
        .describe('Tasarım tipi. stacked: Alt alta tam genişlik butonlar (uzun etiketli linkler için iyi). icon-row: Yan yana yuvarlak ikon butonları (çoğunlukla sosyal medya linkleri için, kısa/etiketsiz görünüm ister). two-col-grid: 2 sütunlu etiketli kart ızgarası (stacked ile icon-row arası orta yol).'),
      items: z.array(z.object({
        label: z.string(),
        url: z.string(),
      })),
    }),
    execute: async (args) => {
      const { data: existing } = await supabase.from('blocks').select('*').eq('business_id', businessId).eq('type', 'links').single();
      const oldItems = existing?.content?.items || [];
      const newItems = [...oldItems, ...args.items];
      const existingCustomTitle = existing?.content?.tr?.title && existing.content.tr.title !== LOCALE_TITLES.tr.links ? existing.content.tr.title : undefined;
      const customTitle = args.sectionTitle || existingCustomTitle;

      const { error } = await supabase.from('blocks').upsert({
        business_id: businessId,
        type: 'links',
        title: customTitle || locTitles.links || 'Links',
        content: {
          tr: { title: customTitle || LOCALE_TITLES.tr.links },
          en: { title: customTitle || LOCALE_TITLES.en.links },
          ru: { title: customTitle || LOCALE_TITLES.ru.links },
          items: newItems,
          layoutVariant: args.layoutVariant || existing?.content?.layoutVariant || 'stacked',
        },
        order: 4,
      }, { onConflict: 'business_id,singleton_key' });
      if (error) return `Error saving links: ${error.message}`;
      return `Sosyal medya / link bloğu kaydedildi.`;
    },
  });
}

export function addGalleryTool({ supabase, businessId }: BeiweToolParams) {
  return tool({
    description: "Galeriyi oluşturur. Altyazıları (caption) 3 dilde yazmalısın.",
    inputSchema: z.object({
      tr: z.object({ title: z.string() }),
      en: z.object({ title: z.string() }),
      ru: z.object({ title: z.string() }),
      items: z.array(z.object({
        url: z.string(),
        caption: z.object({
          tr: z.string().optional(),
          en: z.string().optional(),
          ru: z.string().optional(),
        }).optional(),
      })),
      layoutVariant: z.enum(['grid', 'masonry', 'fullbleed-carousel', 'stacked-fullwidth']).optional()
        .describe('Tasarım tipi. grid: Standart ızgara. masonry: Pinterest tarzı asimetrik ızgara. fullbleed-carousel: Kenar boşluksuz, yatay kaydırmalı tam genişlik görsel şeridi (mobil-öncelikli, az sayıda etkileyici görsel için iyi). stacked-fullwidth: Alt alta büyük tam genişlik görseller (hikaye anlatımı/portfolyo hissi).'),
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
          layoutVariant: args.layoutVariant || existing?.content?.layoutVariant || 'grid',
        },
        order: 5,
      }, { onConflict: 'business_id,singleton_key' });
      if (error) return `Error: ${error.message}`;
      return `Galeri bloğu başarıyla kaydedildi.`;
    },
  });
}

export function addTestimonialsTool({ supabase, businessId }: BeiweToolParams) {
  return tool({
    description: "Müşteri yorumlarını (Testimonials) ekler. Yorumları 3 dilde sağlamalısın.",
    inputSchema: z.object({
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
          ru: z.string(),
        }),
        author: z.string(),
        role: z.object({
          tr: z.string().optional(),
          en: z.string().optional(),
          ru: z.string().optional(),
        }).optional(),
      })),
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
          backgroundOverlay: args.backgroundOverlay || existing?.content?.backgroundOverlay || 'dark',
        },
        order: 6,
      }, { onConflict: 'business_id,singleton_key' });
      if (error) return `Error: ${error.message}`;
      return `Müşteri yorumları kaydedildi.`;
    },
  });
}

export function addHoursTool({ supabase, businessId, locale }: BeiweToolParams) {
  const locTitles = getLocaleTitles(locale);
  return tool({
    description: "İşletmenin haftalık çalışma saatlerini oluşturur veya günceller.",
    inputSchema: z.object({
      sectionTitle: z.string().optional().describe("Kullanıcı bu bölüm için 'Çalışma Saatleri' yerine özel bir başlık istediyse buraya yaz — aynı kelime üç dilde de kullanılır. Belirtilmezse varsayılan korunur (önceden ayarlanmış özel bir başlık varsa o da korunur)."),
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
      }),
    }),
    execute: async ({ schedule, layoutVariant, sectionTitle }) => {
      const { data: existing } = await supabase.from('blocks').select('content').eq('business_id', businessId).eq('type', 'hours').single();
      const existingCustomTitle = existing?.content?.tr?.title && existing.content.tr.title !== LOCALE_TITLES.tr.hours ? existing.content.tr.title : undefined;
      const customTitle = sectionTitle || existingCustomTitle;

      const { error } = await supabase.from('blocks').upsert({
        business_id: businessId,
        type: 'hours',
        title: customTitle || locTitles.hours,
        content: {
          tr: { title: customTitle || LOCALE_TITLES.tr.hours },
          en: { title: customTitle || LOCALE_TITLES.en.hours },
          ru: { title: customTitle || LOCALE_TITLES.ru.hours },
          schedule, layoutVariant: layoutVariant || 'table',
        },
        order: 3,
      }, { onConflict: 'business_id,singleton_key' });
      if (error) return `Error: ${error.message}`;
      return 'Çalışma saatleri kaydedildi.';
    },
  });
}

export function addFAQTool({ supabase, businessId, locale }: BeiweToolParams) {
  const locTitles = getLocaleTitles(locale);
  return tool({
    description: "Sıkça sorulan soruları (FAQ) ekler. Bu blok tek dillidir, kullanıcının konuştuğu dilde yaz.",
    inputSchema: z.object({
      sectionTitle: z.string().optional().describe("Kullanıcı bu bölüm için 'Sıkça Sorulan Sorular' yerine özel bir başlık istediyse buraya yaz. Belirtilmezse varsayılan korunur (önceden ayarlanmış özel bir başlık varsa o da korunur)."),
      layoutVariant: z.enum(['chips', 'accordion', 'numbered']).optional()
        .describe('Tasarım tipi. chips: Soruya tıklayınca cevabı asistana sorar (etiket görünümlü). accordion: Klasik aç/kapa liste, cevabı doğrudan sayfada gösterir (uzun SSS listeleri veya daha resmi arketipler için iyi). numbered: Büyük numaralı liste, tüm cevaplar her zaman açık/görünür (services numbered-list ile aynı dil).'),
      items: z.array(z.object({
        question: z.string(),
        answer: z.string(),
      })),
    }),
    execute: async ({ items, layoutVariant, sectionTitle }) => {
      const { data: existing } = await supabase.from('blocks').select('*').eq('business_id', businessId).eq('type', 'faq').single();
      const oldItems = existing?.content?.items || [];
      const newItems = [...oldItems, ...items];
      const existingCustomTitle = existing?.content?.tr?.title && existing.content.tr.title !== LOCALE_TITLES.tr.faq ? existing.content.tr.title : undefined;
      const customTitle = sectionTitle || existingCustomTitle;

      const { error } = await supabase.from('blocks').upsert({
        business_id: businessId,
        type: 'faq',
        title: customTitle || locTitles.faq,
        content: {
          tr: { title: customTitle || LOCALE_TITLES.tr.faq },
          en: { title: customTitle || LOCALE_TITLES.en.faq },
          ru: { title: customTitle || LOCALE_TITLES.ru.faq },
          items: newItems, layoutVariant: layoutVariant || existing?.content?.layoutVariant || 'chips',
        },
        order: 7,
      }, { onConflict: 'business_id,singleton_key' });
      if (error) return `Error: ${error.message}`;
      return 'SSS bloğu kaydedildi.';
    },
  });
}

export function updateContactTool({ supabase, businessId }: BeiweToolParams) {
  return tool({
    description: "İşletmenin iletişim yöntemlerini (WhatsApp/Telefon, Instagram, e-posta, Telegram) günceller. Bu bir blok değil, işletmenin genel ayarıdır.",
    inputSchema: z.object({
      items: z.array(z.object({
        method: z.enum(['whatsapp', 'instagram', 'email', 'telegram']).describe("'whatsapp': hem telefon araması hem WhatsApp için kullanılan tek numara."),
        value: z.string(),
      })),
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
        contact_value: JSON.stringify(mergedValues),
      }).eq('id', businessId);
      if (error) return `Error: ${error.message}`;
      return 'İletişim bilgileri güncellendi.';
    },
  });
}

export function createBeiweTools(params: BeiweToolParams) {
  return {
    setTheme: setThemeTool(params),
    updateAbout: updateAboutTool(params),
    addServices: addServicesTool(params),
    addLinks: addLinksTool(params),
    addGallery: addGalleryTool(params),
    addTestimonials: addTestimonialsTool(params),
    addHours: addHoursTool(params),
    addFAQ: addFAQTool(params),
    updateContact: updateContactTool(params),
  };
}
