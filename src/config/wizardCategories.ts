// Kategori tabanlı kurulum sihirbazı yapılandırması.
// Her kategori kendi adım sırası, blok tipi ve i18n anahtarlarını tanımlar.
// Gerçek metinler messages/{locale}.json içinde — burası sadece yapı.
//
// Akış "Ziyaretçilerinizin ne yapmasını istiyorsunuz?" sorusuna verilen cevaba göre
// kategori seçimidir — her kategorinin adım listesi o kategori için tanımlanan
// "başlangıç sayfası" iskeletini birebir üretir (bkz. kategori açıklamaları altında).

export type WizardBlockType =
  | 'header'       // İşletme kaydı — blok oluşturmaz, business row oluşturur
  | 'services'
  | 'pricing'
  | 'about'
  | 'links'
  | 'gallery'
  | 'testimonials'
  | 'faq'
  | 'custom'
  | 'contact';    // İletişim — blok oluşturmaz, business'ı günceller

export interface WizardStep {
  id: string;           // Kategori içinde benzersiz (adım atlama takibi için key)
  blockType: WizardBlockType;
  required: boolean;    // true → "Şimdilik geç" butonu gizlenir
  labelKey: string;     // useTranslations('Wizard') içinde kullanılacak alt anahtar
  tipKey: string;       // useTranslations('Wizard') içinde kullanılacak alt anahtar
  itemLabelKey?: string; // Liste blokları için (services/pricing/links vb.) öğe etiketi
}

export interface WizardCategory {
  id: string;
  emoji: string;
  color: string;         // Accent rengi
  schemaType: string;    // JSON-LD @type — kategori bazlı SEO
  labelKey: string;      // useTranslations('Wizard') içinde kullanılacak alt anahtar
  descKey: string;       // useTranslations('Wizard') içinde kullanılacak alt anahtar
  steps: WizardStep[];
}

export const WIZARD_CATEGORIES: WizardCategory[] = [
  // ─── HİZMET — "Hizmetlerimi incelesinler" ─────────────────────────────────
  // Danışman, eğitmen, terapist, freelancer, güzellik uzmanı, tamirci gibi hizmet verenler.
  // Başlangıç sayfası: Profil, Hakkımda, Hizmetler, Fiyatlar, Referanslar, SSS, İletişim.
  {
    id: 'hizmet',
    emoji: '🛎',
    color: '#2baa72',
    schemaType: 'LocalBusiness',
    labelKey: 'categories.hizmet.label',
    descKey: 'categories.hizmet.desc',
    steps: [
      {
        id: 'header',
        blockType: 'header',
        required: true,
        labelKey: 'hizmet.header.label',
        tipKey: 'hizmet.header.tip',
      },
      {
        id: 'about',
        blockType: 'about',
        required: false,
        labelKey: 'hizmet.about.label',
        tipKey: 'hizmet.about.tip',
      },
      {
        id: 'services',
        blockType: 'services',
        required: false,
        labelKey: 'hizmet.services.label',
        tipKey: 'hizmet.services.tip',
        itemLabelKey: 'hizmet.services.itemLabel',
      },
      {
        id: 'pricing',
        blockType: 'pricing',
        required: false,
        labelKey: 'hizmet.pricing.label',
        tipKey: 'hizmet.pricing.tip',
        itemLabelKey: 'hizmet.pricing.itemLabel',
      },
      {
        id: 'testimonials',
        blockType: 'testimonials',
        required: false,
        labelKey: 'hizmet.testimonials.label',
        tipKey: 'hizmet.testimonials.tip',
      },
      {
        id: 'faq',
        blockType: 'faq',
        required: false,
        labelKey: 'hizmet.faq.label',
        tipKey: 'hizmet.faq.tip',
      },
      {
        id: 'contact',
        blockType: 'contact',
        required: true,
        labelKey: 'hizmet.contact.label',
        tipKey: 'hizmet.contact.tip',
      },
    ],
  },

  // ─── İÇERİK ÜRETİCİSİ — "İçeriklerimi keşfetsinler" ───────────────────────
  // İçerik üreticisi, influencer, YouTuber, yayıncı.
  // Başlangıç sayfası: Profil, Öne çıkan içerik, Sosyal medya bağlantıları, İş birliği, İletişim.
  // NOT: Spesifikasyondaki "Son içerikler" ayrı bir adım değil — galeri bloğu tek (singleton)
  // olduğundan "Öne çıkan içerik" adımıyla birleştirildi (tip metni ikisini de kapsar).
  {
    id: 'icerik-ureticisi',
    emoji: '🎬',
    color: '#5b6af0',
    schemaType: 'Person',
    labelKey: 'categories.icerikUreticisi.label',
    descKey: 'categories.icerikUreticisi.desc',
    steps: [
      {
        id: 'header',
        blockType: 'header',
        required: true,
        labelKey: 'icerikUreticisi.header.label',
        tipKey: 'icerikUreticisi.header.tip',
      },
      {
        id: 'oneCikan',
        blockType: 'gallery',
        required: false,
        labelKey: 'icerikUreticisi.oneCikan.label',
        tipKey: 'icerikUreticisi.oneCikan.tip',
      },
      {
        id: 'links',
        blockType: 'links',
        required: false,
        labelKey: 'icerikUreticisi.links.label',
        tipKey: 'icerikUreticisi.links.tip',
        itemLabelKey: 'icerikUreticisi.links.itemLabel',
      },
      {
        id: 'isBirligi',
        blockType: 'testimonials',
        required: false,
        labelKey: 'icerikUreticisi.isBirligi.label',
        tipKey: 'icerikUreticisi.isBirligi.tip',
      },
      {
        id: 'contact',
        blockType: 'contact',
        required: true,
        labelKey: 'icerikUreticisi.contact.label',
        tipKey: 'icerikUreticisi.contact.tip',
      },
    ],
  },

  // ─── MÜZİSYEN — "Müziğimi dinlesinler" ────────────────────────────────────
  // Müzisyen, grup, DJ, prodüktör.
  // Başlangıç sayfası: Profil, Son yayın, Dinleme bağlantıları, Video veya galeri,
  // Hakkımızda, Etkinlikler, İletişim.
  // NOT: "Etkinlikler" için ayrı bir blok tipi yok — services bloğu (başlık/açıklama/fiyat)
  // etkinlik adı/mekan-tarih/bilet fiyatı olarak yeniden kullanılıyor.
  {
    id: 'muzisyen',
    emoji: '🎵',
    color: '#c04a8b',
    schemaType: 'MusicGroup',
    labelKey: 'categories.muzisyen.label',
    descKey: 'categories.muzisyen.desc',
    steps: [
      {
        id: 'header',
        blockType: 'header',
        required: true,
        labelKey: 'muzisyen.header.label',
        tipKey: 'muzisyen.header.tip',
      },
      {
        id: 'sonYayin',
        blockType: 'custom',
        required: false,
        labelKey: 'muzisyen.sonYayin.label',
        tipKey: 'muzisyen.sonYayin.tip',
      },
      {
        id: 'links',
        blockType: 'links',
        required: false,
        labelKey: 'muzisyen.links.label',
        tipKey: 'muzisyen.links.tip',
        itemLabelKey: 'muzisyen.links.itemLabel',
      },
      {
        id: 'gallery',
        blockType: 'gallery',
        required: false,
        labelKey: 'muzisyen.gallery.label',
        tipKey: 'muzisyen.gallery.tip',
      },
      {
        id: 'about',
        blockType: 'about',
        required: false,
        labelKey: 'muzisyen.about.label',
        tipKey: 'muzisyen.about.tip',
      },
      {
        id: 'etkinlikler',
        blockType: 'services',
        required: false,
        labelKey: 'muzisyen.etkinlikler.label',
        tipKey: 'muzisyen.etkinlikler.tip',
        itemLabelKey: 'muzisyen.etkinlikler.itemLabel',
      },
      {
        id: 'contact',
        blockType: 'contact',
        required: true,
        labelKey: 'muzisyen.contact.label',
        tipKey: 'muzisyen.contact.tip',
      },
    ],
  },

  // ─── ÜRÜN — "Ürünlerimi incelesinler" ─────────────────────────────────────
  // Fiziksel veya dijital ürün sunan kişiler.
  // Başlangıç sayfası: Profil, Ürünler, Fiyatlar, Galeri, Teslimat/iade bilgileri, SSS, İletişim
  // + (spesifikasyon dışı, bilinçli ek) Satın al bağlantısı — bir e-ticaret sayfası için dış
  // mağaza linki genelde iletişimden daha kritik bir dönüşüm adımı olduğundan eklendi.
  {
    id: 'urun',
    emoji: '📦',
    color: '#e07a30',
    schemaType: 'Store',
    labelKey: 'categories.urun.label',
    descKey: 'categories.urun.desc',
    steps: [
      {
        id: 'header',
        blockType: 'header',
        required: true,
        labelKey: 'urun.header.label',
        tipKey: 'urun.header.tip',
      },
      {
        id: 'services',
        blockType: 'services',
        required: false,
        labelKey: 'urun.services.label',
        tipKey: 'urun.services.tip',
        itemLabelKey: 'urun.services.itemLabel',
      },
      {
        id: 'pricing',
        blockType: 'pricing',
        required: false,
        labelKey: 'urun.pricing.label',
        tipKey: 'urun.pricing.tip',
        itemLabelKey: 'urun.pricing.itemLabel',
      },
      {
        id: 'gallery',
        blockType: 'gallery',
        required: false,
        labelKey: 'urun.gallery.label',
        tipKey: 'urun.gallery.tip',
      },
      {
        id: 'teslimatIade',
        blockType: 'custom',
        required: false,
        labelKey: 'urun.teslimatIade.label',
        tipKey: 'urun.teslimatIade.tip',
      },
      {
        id: 'faq',
        blockType: 'faq',
        required: false,
        labelKey: 'urun.faq.label',
        tipKey: 'urun.faq.tip',
      },
      {
        id: 'links',
        blockType: 'links',
        required: false,
        labelKey: 'urun.links.label',
        tipKey: 'urun.links.tip',
        itemLabelKey: 'urun.links.itemLabel',
      },
      {
        id: 'contact',
        blockType: 'contact',
        required: false,
        labelKey: 'urun.contact.label',
        tipKey: 'urun.contact.tip',
      },
    ],
  },
];

export function getCategoryById(id: string): WizardCategory | undefined {
  return WIZARD_CATEGORIES.find((c) => c.id === id);
}
