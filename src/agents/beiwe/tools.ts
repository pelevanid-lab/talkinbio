import { tool } from 'ai';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { LOCALE_TITLES, type LocaleKey } from '@/config/localeTitles';

export type BeiweToolParams = {
  supabase: SupabaseClient;
  businessId: string;
  locale: string;
};

export type SectionTitles = Record<LocaleKey, string>;

// Custom section titles are per-locale: the model translates the user's wording into each
// language (or repeats the same word when the user explicitly asks for that).
const sectionTitleInput = z.object({
  tr: z.string().describe('Başlığın Türkçesi'),
  en: z.string().describe('Başlığın İngilizcesi'),
  ru: z.string().describe('Başlığın Rusçası'),
});

const resetSectionTitleInput = z.boolean().optional()
  .describe("true gönderilirse özel başlık silinir ve her dil kendi varsayılan başlığına döner. Kullanıcı 'varsayılan başlığa dön' dediğinde bunu kullan; sectionTitle ile birlikte gönderme.");

function defaultTitlesFor(type: string): SectionTitles {
  return { tr: LOCALE_TITLES.tr[type], en: LOCALE_TITLES.en[type], ru: LOCALE_TITLES.ru[type] };
}

// Decides the final per-locale titles for a section write. Priority per locale:
// explicit reset → tool-provided translation → whatever that locale already had
// (a manual edit from the editor or an earlier custom title) → the locale's default.
// Crucially there is no cross-locale copying: one locale's custom title never leaks into another.
export function resolveSectionTitles(
  existingContent: Record<string, { title?: string } | undefined> | null | undefined,
  defaults: SectionTitles,
  sectionTitle: SectionTitles | undefined,
  resetSectionTitle: boolean | undefined,
): SectionTitles {
  const pick = (loc: LocaleKey): string => {
    if (resetSectionTitle) return defaults[loc];
    if (sectionTitle) return sectionTitle[loc]?.trim() || defaults[loc];
    return existingContent?.[loc]?.title || defaults[loc];
  };
  return { tr: pick('tr'), en: pick('en'), ru: pick('ru') };
}

// Echoed back in every tool result so the model reasons from the actually-saved state
// instead of assuming its request took effect (see prompt rule 5c).
function describeSavedTitles(titles: SectionTitles): string {
  return `Kayıtlı bölüm başlıkları — TR: "${titles.tr}", EN: "${titles.en}", RU: "${titles.ru}".`;
}

function titleForLocale(titles: SectionTitles, locale: string): string {
  return titles[locale as LocaleKey] || titles.tr;
}

const SECTION_TITLE_DESC = "Kullanıcı bu bölüm için varsayılan yerine özel bir başlık istediyse, o başlığın ÜÇ DİLDEKİ karşılıklarını ver — her dile çevir (ör. {tr: 'Merhaba', en: 'Hello', ru: 'Привет'}); kullanıcı açıkça aynı kelimeyi her dilde istiyorsa üçüne de aynı kelimeyi yaz. Belirtilmezse mevcut başlıklar dil bazında aynen korunur.";

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
  return tool({
    description: 'Hakkında (About) bloğunu günceller veya oluşturur. Metinleri 3 dilde sağlamalısın.',
    inputSchema: z.object({
      tr: z.object({ text: z.string() }).describe('Türkçe hakkında metni'),
      en: z.object({ text: z.string() }).describe('İngilizce hakkında metni'),
      ru: z.object({ text: z.string() }).describe('Rusça hakkında metni'),
      sectionTitle: sectionTitleInput.optional().describe(SECTION_TITLE_DESC),
      resetSectionTitle: resetSectionTitleInput,
      mediaUrl: z.string().optional().describe('Kullanıcının yüklediği görsel URL adresi'),
      mediaPosition: z.enum(['top', 'middle', 'bottom']).optional()
        .describe("SADECE 'standard' varyantındayken (veya varyant belirtilmediğinde) anlamlı: mediaUrl görselini metnin NORMAL AKIŞI İÇİNE, başlığın öncesine ('top'), başlık ile metin arasına ('middle', varsayılan) veya metnin sonrasına ('bottom') yerleştirir. Kullanıcı 'görseli üste/yukarı koy' derse — arka plana koy DEMEDİYSE — bu alanı kullan, layoutVariant'ı 'hero-overlay' YAPMA: o, görseli tüm bölümün ARKA PLANI yapıp üstüne beyaz yazı bindiren tamamen farklı bir tasarımdır."),
      extraImages: z.array(z.string()).optional().describe("'image-grid' varyantı için 1-2 ek görsel URL'i (mediaUrl'e ek olarak)."),
      layoutVariant: z.enum(['standard', 'hero-overlay', 'split-card', 'big-statement', 'image-grid']).optional()
        .describe("Tasarım tipi. hero-overlay: Tam ekran görsel ve üstüne yazı. split-card: Yan yana resim ve yazı. big-statement: Görselsiz, çok büyük tipografili editoryal metin (kısa ve güçlü bir 'manifesto' metni varsa kullan). image-grid: Tek büyük görsel yerine küçük görsel kolajı + metin."),
      backgroundImage: z.string().optional().describe("Sadece 'standard' varyantındayken: bölümün arkasına konacak opsiyonel bir arka plan görseli."),
      backgroundOverlay: z.enum(['dark', 'light', 'tint', 'none']).optional().describe('backgroundImage üzerindeki karartma/renk katmanı. dark: siyah karartma (varsayılan). light: açık/beyaz. tint: arketipin ana rengiyle yarı saydam katman. none: katmansız.'),
    }),
    execute: async ({ tr, en, ru, sectionTitle, resetSectionTitle, mediaUrl, mediaPosition, extraImages, layoutVariant, backgroundImage, backgroundOverlay }) => {
      const { data: existing } = await supabase.from('blocks').select('content').eq('business_id', businessId).eq('type', 'about').single();
      const titles = resolveSectionTitles(existing?.content, defaultTitlesFor('about'), sectionTitle, resetSectionTitle);

      const { error } = await supabase.from('blocks').upsert({
        business_id: businessId,
        type: 'about',
        title: titleForLocale(titles, locale),
        content: {
          tr: { text: tr.text, title: titles.tr },
          en: { text: en.text, title: titles.en },
          ru: { text: ru.text, title: titles.ru },
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
      return `Hakkında bloğu güncellendi. ${describeSavedTitles(titles)} Lütfen sıradaki bölüme geçerek sohbete devam et.`;
    },
  });
}

export function addServicesTool({ supabase, businessId, locale }: BeiweToolParams) {
  return tool({
    description: 'Yeni hizmetleri (services) ekler. Metinleri 3 dilde sağlamalısın.',
    inputSchema: z.object({
      sectionTitle: sectionTitleInput.optional().describe(SECTION_TITLE_DESC),
      resetSectionTitle: resetSectionTitleInput,
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
      const titles = resolveSectionTitles(existing?.content, defaultTitlesFor('services'), args.sectionTitle, args.resetSectionTitle);

      const { error } = await supabase.from('blocks').upsert({
        business_id: businessId,
        type: 'services',
        title: titleForLocale(titles, locale),
        content: {
          tr: { title: titles.tr },
          en: { title: titles.en },
          ru: { title: titles.ru },
          items: newItems,
          layoutVariant: args.layoutVariant || existing?.content?.layoutVariant || 'grid-cards',
          backgroundImage: args.backgroundImage || existing?.content?.backgroundImage || undefined,
          backgroundOverlay: args.backgroundOverlay || existing?.content?.backgroundOverlay || 'dark',
        },
        order: 2,
        is_visible: true,
      }, { onConflict: 'business_id,singleton_key' });
      if (error) return `Error: ${error.message}`;
      return `Hizmetler bloğu başarıyla kaydedildi. ${describeSavedTitles(titles)}`;
    },
  });
}

export function addLinksTool({ supabase, businessId, locale }: BeiweToolParams) {
  return tool({
    description: "İşletmenin sosyal medya veya iletişim linklerini ekler.",
    inputSchema: z.object({
      sectionTitle: sectionTitleInput.optional().describe(SECTION_TITLE_DESC),
      resetSectionTitle: resetSectionTitleInput,
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
      const titles = resolveSectionTitles(existing?.content, defaultTitlesFor('links'), args.sectionTitle, args.resetSectionTitle);

      const { error } = await supabase.from('blocks').upsert({
        business_id: businessId,
        type: 'links',
        title: titleForLocale(titles, locale),
        content: {
          tr: { title: titles.tr },
          en: { title: titles.en },
          ru: { title: titles.ru },
          items: newItems,
          layoutVariant: args.layoutVariant || existing?.content?.layoutVariant || 'stacked',
        },
        order: 4,
      }, { onConflict: 'business_id,singleton_key' });
      if (error) return `Error saving links: ${error.message}`;
      return `Sosyal medya / link bloğu kaydedildi. ${describeSavedTitles(titles)}`;
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
  return tool({
    description: "İşletmenin haftalık çalışma saatlerini oluşturur veya günceller.",
    inputSchema: z.object({
      sectionTitle: sectionTitleInput.optional().describe(SECTION_TITLE_DESC),
      resetSectionTitle: resetSectionTitleInput,
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
    execute: async ({ schedule, layoutVariant, sectionTitle, resetSectionTitle }) => {
      const { data: existing } = await supabase.from('blocks').select('content').eq('business_id', businessId).eq('type', 'hours').single();
      const titles = resolveSectionTitles(existing?.content, defaultTitlesFor('hours'), sectionTitle, resetSectionTitle);

      const { error } = await supabase.from('blocks').upsert({
        business_id: businessId,
        type: 'hours',
        title: titleForLocale(titles, locale),
        content: {
          tr: { title: titles.tr },
          en: { title: titles.en },
          ru: { title: titles.ru },
          schedule, layoutVariant: layoutVariant || 'table',
        },
        order: 3,
      }, { onConflict: 'business_id,singleton_key' });
      if (error) return `Error: ${error.message}`;
      return `Çalışma saatleri kaydedildi. ${describeSavedTitles(titles)}`;
    },
  });
}

export function addFAQTool({ supabase, businessId, locale }: BeiweToolParams) {
  return tool({
    description: "Sıkça sorulan soruları (FAQ) ekler. Soru ve cevapları 3 dilde sağlamalısın.",
    inputSchema: z.object({
      sectionTitle: sectionTitleInput.optional().describe(SECTION_TITLE_DESC),
      resetSectionTitle: resetSectionTitleInput,
      layoutVariant: z.enum(['chips', 'accordion', 'numbered']).optional()
        .describe('Tasarım tipi. chips: Soruya tıklayınca cevabı asistana sorar (etiket görünümlü). accordion: Klasik aç/kapa liste, cevabı doğrudan sayfada gösterir (uzun SSS listeleri veya daha resmi arketipler için iyi). numbered: Büyük numaralı liste, tüm cevaplar her zaman açık/görünür (services numbered-list ile aynı dil).'),
      items: z.array(z.object({
        question: z.object({
          tr: z.string(),
          en: z.string(),
          ru: z.string(),
        }),
        answer: z.object({
          tr: z.string(),
          en: z.string(),
          ru: z.string(),
        }),
      })),
    }),
    execute: async ({ items, layoutVariant, sectionTitle, resetSectionTitle }) => {
      const { data: existing } = await supabase.from('blocks').select('*').eq('business_id', businessId).eq('type', 'faq').single();
      const oldItems = existing?.content?.items || [];
      const newItems = [...oldItems, ...items];
      const titles = resolveSectionTitles(existing?.content, defaultTitlesFor('faq'), sectionTitle, resetSectionTitle);

      const { error } = await supabase.from('blocks').upsert({
        business_id: businessId,
        type: 'faq',
        title: titleForLocale(titles, locale),
        content: {
          tr: { title: titles.tr },
          en: { title: titles.en },
          ru: { title: titles.ru },
          items: newItems, layoutVariant: layoutVariant || existing?.content?.layoutVariant || 'chips',
        },
        order: 7,
      }, { onConflict: 'business_id,singleton_key' });
      if (error) return `Error: ${error.message}`;
      return `SSS bloğu kaydedildi. ${describeSavedTitles(titles)}`;
    },
  });
}

// Sabit tipteki (about/services/hours/links/gallery/testimonials/faq) bölümlerin her biri kendi
// update/add aracına sahip ve her işletme başına tek satır olarak upsert edilir (bkz. singleton_key
// kısıtı — 00007/00008 migration'ları). Bu araç bunlardan biri DEĞİL: kullanıcı mevcut bir bölümü
// değiştirmek yerine tamamen YENİ, ek bir bölüm istediğinde (ör. "Yaklaşım ve Deneyim", "Misyonumuz")
// çağrılır — 'custom' tipinde, singleton kısıtı olmayan, birden fazlası olabilen yeni bir satır ekler.
export function addSectionTool({ supabase, businessId, locale }: BeiweToolParams) {
  const INSERT_AFTER_TYPES = ['about', 'services', 'hours', 'links', 'gallery', 'testimonials', 'faq'] as const;
  return tool({
    description: "Sayfaya TAMAMEN YENİ, ayrı bir bölüm ekler (ör. 'Yaklaşım ve Deneyim', 'Misyonumuz', 'Sertifikalar'). SADECE kullanıcı mevcut sabit bölümlerden (Hakkımda/Hizmetler/Çalışma Saatleri/Bağlantılar/Galeri/Yorumlar/SSS) hiçbirine uymayan, gerçekten yeni ve ayrı bir bölüm istediğinde kullan. Kullanıcı var olan bir bölümü DÜZENLEMEK/GENİŞLETMEK isterse bu aracı KULLANMA — o bölümün kendi aracını (updateAbout, addServices, vb.) çağır; aksi halde o bölümün mevcut içeriğini SİLERSİN.",
    inputSchema: z.object({
      title: sectionTitleInput.describe("Yeni bölümün başlığı, üç dildeki karşılıklarıyla — her dile çevir (ör. {tr: 'Yaklaşım ve Deneyim', en: 'Approach & Experience', ru: 'Подход и опыт'}). Kullanıcı açıkça aynı kelimeyi her dilde istiyorsa üçüne de aynı kelimeyi yaz."),
      tr: z.object({ text: z.string() }).describe('Türkçe metin'),
      en: z.object({ text: z.string() }).describe('İngilizce metin'),
      ru: z.object({ text: z.string() }).describe('Rusça metin'),
      insertAfterType: z.enum(INSERT_AFTER_TYPES).optional()
        .describe("Bu yeni bölümün hangi mevcut bölümün HEMEN ARDINDAN gelmesini istediğin (ör. kullanıcı 'Hakkımda'dan sonra' dediyse 'about'). Belirtilmezse sayfanın en sonuna eklenir."),
    }),
    execute: async ({ title, tr, en, ru, insertAfterType }) => {
      const { data: existingBlocks } = await supabase
        .from('blocks')
        .select('type, order')
        .eq('business_id', businessId)
        .not('type', 'in', '(settings,contact)');
      const sorted = (existingBlocks || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      let order: number;
      const lastOrder = sorted.length ? (sorted[sorted.length - 1].order ?? 0) : 0;
      if (insertAfterType) {
        const idx = sorted.findIndex((b) => b.type === insertAfterType);
        if (idx === -1) {
          order = lastOrder + 1;
        } else {
          const afterOrder = sorted[idx].order ?? 0;
          const nextOrder = sorted[idx + 1]?.order;
          order = nextOrder !== undefined ? (afterOrder + nextOrder) / 2 : afterOrder + 1;
        }
      } else {
        order = lastOrder + 1;
      }

      const { error } = await supabase.from('blocks').insert({
        business_id: businessId,
        type: 'custom',
        title: titleForLocale(title, locale),
        content: {
          tr: { text: tr.text, title: title.tr },
          en: { text: en.text, title: title.en },
          ru: { text: ru.text, title: title.ru },
        },
        order,
        is_visible: true,
      });
      if (error) return `Error: ${error.message}`;
      return `"${titleForLocale(title, locale)}" adında yeni, ayrı bir bölüm eklendi. ${describeSavedTitles(title)}`;
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
    addSection: addSectionTool(params),
    updateContact: updateContactTool(params),
  };
}
