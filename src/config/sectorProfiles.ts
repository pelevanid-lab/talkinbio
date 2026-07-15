// Fixed sector -> design recommendation table. This exists so the setup agent's theme/variant
// choices are grounded in a concrete, auditable mapping instead of being left entirely to the
// model's own inference from the business's free-text `category` field.
//
// `themeMood` is freeform creative direction (color mood + typography mood) fed into the
// `setTheme` tool's prompt guidance — the AI still invents the actual hex palette and picks a
// real Google Font pair itself, this just steers the mood instead of pointing at a fixed preset.

export interface SectorProfile {
  id: string;
  keywords: string[]; // matched as case-insensitive substrings of business.category
  themeMood: string; // renk/tipografi ruh hali ipucu (serbest metin)
  variants: {
    about?: string;
    services?: string;
    gallery?: string;
    testimonials?: string;
    hours?: string;
    faq?: string;
    links?: string;
  };
  note: string; // short rationale, injected into the AI system prompt
}

export const SECTOR_PROFILES: SectorProfile[] = [
  {
    id: 'kuafor-berber',
    keywords: ['kuaför', 'kuafor', 'berber', 'saç', 'sac'],
    themeMood: 'Koyu/şık bir zemin (antrasit/siyah) ile altın ya da enerjik canlı bir vurgu rengi; zarif serif veya modern kalın bir başlık fontu — premium bir his versin.',
    variants: { gallery: 'masonry', services: 'grid-cards', hours: 'compact-badge', testimonials: 'scroll-cards', links: 'icon-row' },
    note: 'Görsel ağırlıklı; güçlü önce-sonra galerisi önemli, enerjik/şık bir tema uygun.',
  },
  {
    id: 'guzellik-spa-masaj',
    keywords: ['güzellik', 'guzellik', 'spa', 'masaj', 'estetik'],
    themeMood: 'Sakin, açık tonlar (gri-yeşil ya da yumuşak pudra pembesi zemin); adaçayı yeşili veya pudra pembesi vurgu rengi; ince, zarif bir serif başlık fontu.',
    variants: { gallery: 'fullbleed-carousel', services: 'price-table', testimonials: 'big-quote', hours: 'compact-badge', links: 'icon-row' },
    note: 'Sakin ve lüks bir his hedeflenmeli; hizmet/fiyat listesi menü gibi net gösterilmeli.',
  },
  {
    id: 'fotografci',
    keywords: ['fotoğraf', 'fotograf', 'foto stüdyo', 'foto studyo'],
    themeMood: 'Koyu zemin veya toprak/bej tonları; görsellerin öne çıkmasını sağlayacak sade bir vurgu rengi; editoryal bir serif başlık fontu.',
    variants: { gallery: 'stacked-fullwidth', services: 'feature-split', testimonials: 'grid-quotes', links: 'stacked' },
    note: 'Portfolyo bu işin kalbi; büyük, tam genişlik görseller öncelikli olmalı.',
  },
  {
    id: 'restoran-kafe',
    keywords: ['restoran', 'kafe', 'cafe', 'lokanta', 'pastane', 'fırın', 'firin'],
    themeMood: 'Sıcak krem/bej veya canlı amber tonları; toprak kahvesi ya da amber vurgu rengi; sıcak/davetkâr bir sans-serif veya oyunbaz bir display font.',
    variants: { services: 'price-table', gallery: 'grid', hours: 'table', testimonials: 'scroll-cards', faq: 'accordion' },
    note: 'Klasik menü görünümü ve net çalışma saatleri müşteri için kritik.',
  },
  {
    id: 'diyet-beslenme',
    keywords: ['diyet', 'diyetisyen', 'beslenme uzman', 'beslenme dan'],
    themeMood: 'Açık, temiz tonlar (beyaz, açık pembe veya gri-yeşil); yumuşak, güven veren bir vurgu rengi; sade bir sans-serif başlık fontu.',
    variants: { services: 'numbered-list', testimonials: 'big-quote', faq: 'accordion', hours: 'compact-badge' },
    note: 'Kişisel ve güven verici bir his; danışmanlık paketleri sade bir listeyle sunulmalı, müşteri sonuç/yorumları öne çıkarılmalı.',
  },
  {
    id: 'saglikli-yasam',
    keywords: ['sağlıklı yaşam', 'saglikli yasam', 'wellness'],
    themeMood: 'Doğal, sakin tonlar (krem, yumuşak yeşil); pozitif ve motive edici bir vurgu rengi; yuvarlak/yumuşak bir sans-serif başlık fontu.',
    variants: { gallery: 'grid', services: 'grid-cards', testimonials: 'scroll-cards' },
    note: 'Sakin, pozitif ve motive edici bir his; günlük yaşam/rutin görselleri iyi çalışır.',
  },
  {
    id: 'saglikli-yemek',
    keywords: ['sağlıklı yemek', 'saglikli yemek', 'organik gıda', 'organik gida', 'fit yemek', 'diyet yemek'],
    themeMood: 'Doğal/temiz tonlar (krem, yeşilimsi); taze/organik hissi veren yeşil ya da turuncu bir vurgu rengi; sade ve davetkâr bir sans-serif.',
    variants: { services: 'price-table', gallery: 'grid', hours: 'table' },
    note: 'Restoran mantığına yakın ama daha "temiz/doğal" bir his; menü net gösterilmeli.',
  },
  {
    id: 'kocluk',
    keywords: ['koçluk', 'kocluk', 'koç', 'koc', 'kişisel gelişim', 'kisisel gelisim'],
    themeMood: 'Sıcak ve samimi açık tonlar; kişisel/insancıl bir vurgu rengi; yuvarlak, sıcak bir sans-serif başlık fontu.',
    variants: { services: 'numbered-list', testimonials: 'big-quote', faq: 'accordion' },
    note: 'Kişisel dönüşüm/motivasyon hissi; sıcak ve samimi bir tema, güçlü tek tek yorumlar öne çıkarılmalı.',
  },
  {
    id: 'psikolojik-danismanlik',
    keywords: ['psikolog', 'psikolojik', 'psikoterapi', 'terapist', 'terapi'],
    themeMood: 'Sakin, güven veren açık tonlar (yumuşak mavi-gri veya bej); göz yormayan, ölçülü bir vurgu rengi; sade, okunaklı bir sans-serif.',
    variants: { services: 'list', testimonials: 'grid-quotes', faq: 'accordion', hours: 'table' },
    note: 'Güven, mahremiyet ve sakinlik hissi öncelikli; gösterişten uzak, sade ve profesyonel bir sunum.',
  },
  {
    id: 'danismanlik',
    keywords: ['danışman', 'danisman'],
    themeMood: 'Kurumsal ve sade tonlar (gri/beyaz zemin); güven veren koyu mavi veya lacivert vurgu rengi; sade, profesyonel bir sans-serif.',
    variants: { services: 'numbered-list', testimonials: 'big-quote', faq: 'accordion', links: 'stacked' },
    note: 'Güven ve uzmanlık ön planda; sade tasarım, az görsel, güçlü müşteri yorumları.',
  },
  {
    id: 'hukuk-avukat',
    keywords: ['hukuk', 'avukat', 'baro'],
    themeMood: 'Ciddi, kurumsal tonlar (gri, koyu lacivert); az sayıda, ölçülü bir vurgu rengi; klasik güven veren bir serif veya sade bir sans-serif başlık fontu.',
    variants: { services: 'list', testimonials: 'grid-quotes', faq: 'accordion', hours: 'table' },
    note: 'Ciddi/kurumsal his öncelikli; gösterişli görsel öğelerden kaçınılmalı.',
  },
  {
    id: 'mimarlik',
    keywords: ['mimar', 'iç mimar', 'ic mimar', 'tasarım ofisi', 'tasarim ofisi'],
    themeMood: 'Sade, mimari bir his veren nötr tonlar (beton grisi, kırık beyaz veya koyu antrasit); minimal bir vurgu rengi; geometrik/modern bir sans-serif başlık fontu.',
    variants: { gallery: 'masonry', services: 'feature-split', testimonials: 'grid-quotes' },
    note: 'Masonry galeri, projelerin asimetrik/sanatsal sunumu için ideal.',
  },
  {
    id: 'fitness-spor',
    keywords: ['fitness', 'spor salonu', 'gym', 'crossfit', 'pilates'],
    themeMood: 'Koyu, güçlü bir zemin (siyah/koyu lacivert); yoğun kırmızı veya neon bir vurgu rengi; kalın, iri harfli/uppercase bir display font.',
    variants: { services: 'grid-cards', gallery: 'fullbleed-carousel', hours: 'pill-row', links: 'icon-row' },
    note: 'Enerjik, kalın tipografi; haftalık çalışma saatleri tek bakışta okunabilmeli (pill-row).',
  },
  {
    id: 'dis-klinik',
    keywords: ['diş', 'dis', 'klinik', 'hekim', 'doktor', 'sağlık merkezi', 'saglik merkezi'],
    themeMood: 'Temiz, güven veren açık tonlar (beyaz, açık mavi-gri); sakin mavi veya yeşilimsi bir vurgu rengi; sade, tıbbi ciddiyet hissi veren bir sans-serif.',
    variants: { services: 'list', faq: 'accordion', testimonials: 'grid-quotes', hours: 'table' },
    note: 'Güven verici ve temiz bir tıbbi ciddiyet; SSS hasta endişelerini gidermek için önemli.',
  },
  {
    id: 'artizan-atolye',
    keywords: ['atölye', 'atolye', 'el yapımı', 'el yapimi', 'zanaat', 'artizan', 'seramik', 'ahşap', 'ahsap'],
    themeMood: 'El emeği hissi veren toprak tonları (bej, kahve, terracotta); sıcak, doğal bir vurgu rengi; karakterli bir serif başlık fontu.',
    variants: { gallery: 'masonry', services: 'feature-split', testimonials: 'scroll-cards' },
    note: 'Hikaye anlatımı ve emek/detay vurgusu öne çıkmalı.',
  },
  {
    id: 'moda-butik',
    keywords: ['butik', 'moda', 'giyim', 'tasarımcı', 'tasarimci'],
    themeMood: 'Editoryal, dergi tarzı — koyu zemin ya da yüksek kontrast bir palet; cesur/moda bir vurgu rengi; şık, geniş harf aralıklı bir display veya serif başlık fontu.',
    variants: { gallery: 'stacked-fullwidth', services: 'grid-cards', links: 'icon-row' },
    note: 'Editoryal, dergi tarzı sunum; büyük görseller ön planda olmalı.',
  },
  {
    id: 'teknoloji-yazilim',
    keywords: ['yazılım', 'yazilim', 'teknoloji', 'ajans', 'dijital', 'yapay zeka'],
    themeMood: 'Koyu veya sade nötr tonlar; teknik/güven veren yeşil ya da mavi bir vurgu rengi; modern bir sans-serif veya monospace başlık fontu.',
    variants: { services: 'numbered-list', testimonials: 'big-quote', faq: 'accordion' },
    note: 'Net, güven veren, teknik ama sade bir anlatım.',
  },
];

export function matchSectorProfile(category: string | null | undefined): SectorProfile | null {
  if (!category) return null;
  const normalized = category.toLowerCase();
  return SECTOR_PROFILES.find((profile) => profile.keywords.some((kw) => normalized.includes(kw))) || null;
}
