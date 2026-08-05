// Kategori tabanlı kurulum sihirbazı yapılandırması.
// Her kategori kendi adım sırası, blok tipi ve i18n anahtarlarını tanımlar.
// Gerçek metinler messages/{locale}.json içinde — burası sadece yapı.

export type WizardBlockType =
  | 'header'       // İşletme kaydı — blok oluşturmaz, business row oluşturur
  | 'services'
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
  itemLabelKey?: string; // Liste blokları için (services/links vb.) öğe etiketi
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
  // ─── HİZMET ────────────────────────────────────────────────────────────────
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
        id: 'services',
        blockType: 'services',
        required: false,
        labelKey: 'hizmet.services.label',
        tipKey: 'hizmet.services.tip',
        itemLabelKey: 'hizmet.services.itemLabel',
      },
      {
        id: 'about',
        blockType: 'about',
        required: false,
        labelKey: 'hizmet.about.label',
        tipKey: 'hizmet.about.tip',
      },
      {
        id: 'testimonials',
        blockType: 'testimonials',
        required: false,
        labelKey: 'hizmet.testimonials.label',
        tipKey: 'hizmet.testimonials.tip',
      },
      {
        id: 'gallery',
        blockType: 'gallery',
        required: false,
        labelKey: 'hizmet.gallery.label',
        tipKey: 'hizmet.gallery.tip',
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

  // ─── İÇERİK ÜRETİCİSİ ─────────────────────────────────────────────────────
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
        id: 'links',
        blockType: 'links',
        required: false,
        labelKey: 'icerikUreticisi.links.label',
        tipKey: 'icerikUreticisi.links.tip',
        itemLabelKey: 'icerikUreticisi.links.itemLabel',
      },
      {
        id: 'kitlem',
        blockType: 'custom',
        required: false,
        labelKey: 'icerikUreticisi.kitlem.label',
        tipKey: 'icerikUreticisi.kitlem.tip',
      },
      {
        id: 'gallery',
        blockType: 'gallery',
        required: false,
        labelKey: 'icerikUreticisi.gallery.label',
        tipKey: 'icerikUreticisi.gallery.tip',
      },
      {
        id: 'testimonials',
        blockType: 'testimonials',
        required: false,
        labelKey: 'icerikUreticisi.testimonials.label',
        tipKey: 'icerikUreticisi.testimonials.tip',
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

  // ─── MÜZİSYEN ──────────────────────────────────────────────────────────────
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
        id: 'links',
        blockType: 'links',
        required: false,
        labelKey: 'muzisyen.links.label',
        tipKey: 'muzisyen.links.tip',
        itemLabelKey: 'muzisyen.links.itemLabel',
      },
      {
        id: 'sonCikan',
        blockType: 'custom',
        required: false,
        labelKey: 'muzisyen.sonCikan.label',
        tipKey: 'muzisyen.sonCikan.tip',
      },
      {
        id: 'about',
        blockType: 'about',
        required: false,
        labelKey: 'muzisyen.about.label',
        tipKey: 'muzisyen.about.tip',
      },
      {
        id: 'testimonials',
        blockType: 'testimonials',
        required: false,
        labelKey: 'muzisyen.testimonials.label',
        tipKey: 'muzisyen.testimonials.tip',
      },
      {
        id: 'gallery',
        blockType: 'gallery',
        required: false,
        labelKey: 'muzisyen.gallery.label',
        tipKey: 'muzisyen.gallery.tip',
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

  // ─── ÜRÜN ──────────────────────────────────────────────────────────────────
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
        id: 'links',
        blockType: 'links',
        required: false,
        labelKey: 'urun.links.label',
        tipKey: 'urun.links.tip',
        itemLabelKey: 'urun.links.itemLabel',
      },
      {
        id: 'testimonials',
        blockType: 'testimonials',
        required: false,
        labelKey: 'urun.testimonials.label',
        tipKey: 'urun.testimonials.tip',
      },
      {
        id: 'gallery',
        blockType: 'gallery',
        required: false,
        labelKey: 'urun.gallery.label',
        tipKey: 'urun.gallery.tip',
      },
      {
        id: 'about',
        blockType: 'about',
        required: false,
        labelKey: 'urun.about.label',
        tipKey: 'urun.about.tip',
      },
      {
        id: 'faq',
        blockType: 'faq',
        required: false,
        labelKey: 'urun.faq.label',
        tipKey: 'urun.faq.tip',
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
