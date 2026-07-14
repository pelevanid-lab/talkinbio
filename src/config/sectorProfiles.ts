// Fixed sector -> design recommendation table. This exists so the setup agent's archetype/variant
// choices are grounded in a concrete, auditable mapping instead of being left entirely to the model's
// own inference from the business's free-text `category` field.

export interface SectorProfile {
  id: string;
  keywords: string[]; // matched as case-insensitive substrings of business.category
  archetypes: string[]; // preferred order
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
    archetypes: ['dark-elegant', 'vibrant-bold', 'luxury-spa'],
    variants: { gallery: 'masonry', services: 'grid-cards', hours: 'compact-badge', testimonials: 'scroll-cards', links: 'icon-row' },
    note: 'Görsel ağırlıklı; güçlü önce-sonra galerisi önemli, enerjik/şık bir tema uygun.',
  },
  {
    id: 'guzellik-spa-masaj',
    keywords: ['güzellik', 'guzellik', 'spa', 'masaj', 'estetik'],
    archetypes: ['luxury-spa', 'soft-inviting'],
    variants: { gallery: 'fullbleed-carousel', services: 'price-table', testimonials: 'big-quote', hours: 'compact-badge', links: 'icon-row' },
    note: 'Sakin ve lüks bir his hedeflenmeli; hizmet/fiyat listesi menü gibi net gösterilmeli.',
  },
  {
    id: 'fotografci',
    keywords: ['fotoğraf', 'fotograf', 'foto stüdyo', 'foto studyo'],
    archetypes: ['dark-elegant', 'artisan-rustic'],
    variants: { gallery: 'stacked-fullwidth', services: 'feature-split', testimonials: 'grid-quotes', links: 'stacked' },
    note: 'Portfolyo bu işin kalbi; büyük, tam genişlik görseller öncelikli olmalı.',
  },
  {
    id: 'restoran-kafe',
    keywords: ['restoran', 'kafe', 'cafe', 'lokanta', 'pastane', 'fırın', 'firin'],
    archetypes: ['warm-natural', 'playful-colorful'],
    variants: { services: 'price-table', gallery: 'grid', hours: 'table', testimonials: 'scroll-cards', faq: 'accordion' },
    note: 'Klasik menü görünümü ve net çalışma saatleri müşteri için kritik.',
  },
  {
    id: 'diyet-beslenme',
    keywords: ['diyet', 'diyetisyen', 'beslenme uzman', 'beslenme dan'],
    archetypes: ['soft-inviting', 'minimal-light', 'luxury-spa'],
    variants: { services: 'numbered-list', testimonials: 'big-quote', faq: 'accordion', hours: 'compact-badge' },
    note: 'Kişisel ve güven verici bir his; danışmanlık paketleri sade bir listeyle sunulmalı, müşteri sonuç/yorumları öne çıkarılmalı.',
  },
  {
    id: 'saglikli-yasam',
    keywords: ['sağlıklı yaşam', 'saglikli yasam', 'wellness'],
    archetypes: ['soft-inviting', 'warm-natural', 'luxury-spa'],
    variants: { gallery: 'grid', services: 'grid-cards', testimonials: 'scroll-cards' },
    note: 'Sakin, pozitif ve motive edici bir his; günlük yaşam/rutin görselleri iyi çalışır.',
  },
  {
    id: 'saglikli-yemek',
    keywords: ['sağlıklı yemek', 'saglikli yemek', 'organik gıda', 'organik gida', 'fit yemek', 'diyet yemek'],
    archetypes: ['warm-natural', 'playful-colorful'],
    variants: { services: 'price-table', gallery: 'grid', hours: 'table' },
    note: 'Restoran mantığına yakın ama daha "temiz/doğal" bir his; menü net gösterilmeli.',
  },
  {
    id: 'kocluk',
    keywords: ['koçluk', 'kocluk', 'koç', 'koc', 'kişisel gelişim', 'kisisel gelisim'],
    archetypes: ['soft-inviting', 'minimal-light'],
    variants: { services: 'numbered-list', testimonials: 'big-quote', faq: 'accordion' },
    note: 'Kişisel dönüşüm/motivasyon hissi; sıcak ve samimi bir arketip, güçlü tek tek yorumlar öne çıkarılmalı.',
  },
  {
    id: 'psikolojik-danismanlik',
    keywords: ['psikolog', 'psikolojik', 'psikoterapi', 'terapist', 'terapi'],
    archetypes: ['soft-inviting', 'minimal-light', 'professional-corporate'],
    variants: { services: 'list', testimonials: 'grid-quotes', faq: 'accordion', hours: 'table' },
    note: 'Güven, mahremiyet ve sakinlik hissi öncelikli; gösterişten uzak, sade ve profesyonel bir sunum.',
  },
  {
    id: 'danismanlik',
    keywords: ['danışman', 'danisman'],
    archetypes: ['professional-corporate', 'minimal-light'],
    variants: { services: 'numbered-list', testimonials: 'big-quote', faq: 'accordion', links: 'stacked' },
    note: 'Güven ve uzmanlık ön planda; sade tasarım, az görsel, güçlü müşteri yorumları.',
  },
  {
    id: 'hukuk-avukat',
    keywords: ['hukuk', 'avukat', 'baro'],
    archetypes: ['professional-corporate', 'minimal-light'],
    variants: { services: 'list', testimonials: 'grid-quotes', faq: 'accordion', hours: 'table' },
    note: 'Ciddi/kurumsal his öncelikli; gösterişli görsel öğelerden kaçınılmalı.',
  },
  {
    id: 'mimarlik',
    keywords: ['mimar', 'iç mimar', 'ic mimar', 'tasarım ofisi', 'tasarim ofisi'],
    archetypes: ['artisan-rustic', 'minimal-light', 'dark-elegant'],
    variants: { gallery: 'masonry', services: 'feature-split', testimonials: 'grid-quotes' },
    note: 'Masonry galeri, projelerin asimetrik/sanatsal sunumu için ideal.',
  },
  {
    id: 'fitness-spor',
    keywords: ['fitness', 'spor salonu', 'gym', 'crossfit', 'pilates'],
    archetypes: ['fitness-heavy', 'vibrant-bold'],
    variants: { services: 'grid-cards', gallery: 'fullbleed-carousel', hours: 'pill-row', links: 'icon-row' },
    note: 'Enerjik, kalın tipografi; haftalık çalışma saatleri tek bakışta okunabilmeli (pill-row).',
  },
  {
    id: 'dis-klinik',
    keywords: ['diş', 'dis', 'klinik', 'hekim', 'doktor', 'sağlık merkezi', 'saglik merkezi'],
    archetypes: ['professional-corporate', 'minimal-light', 'luxury-spa'],
    variants: { services: 'list', faq: 'accordion', testimonials: 'grid-quotes', hours: 'table' },
    note: 'Güven verici ve temiz bir tıbbi ciddiyet; SSS hasta endişelerini gidermek için önemli.',
  },
  {
    id: 'artizan-atolye',
    keywords: ['atölye', 'atolye', 'el yapımı', 'el yapimi', 'zanaat', 'artizan', 'seramik', 'ahşap', 'ahsap'],
    archetypes: ['artisan-rustic', 'warm-natural'],
    variants: { gallery: 'masonry', services: 'feature-split', testimonials: 'scroll-cards' },
    note: 'Hikaye anlatımı ve emek/detay vurgusu öne çıkmalı.',
  },
  {
    id: 'moda-butik',
    keywords: ['butik', 'moda', 'giyim', 'tasarımcı', 'tasarimci'],
    archetypes: ['dark-elegant', 'playful-colorful', 'vibrant-bold'],
    variants: { gallery: 'stacked-fullwidth', services: 'grid-cards', links: 'icon-row' },
    note: 'Editoryal, dergi tarzı sunum; büyük görseller ön planda olmalı.',
  },
  {
    id: 'teknoloji-yazilim',
    keywords: ['yazılım', 'yazilim', 'teknoloji', 'ajans', 'dijital', 'yapay zeka'],
    archetypes: ['cyber-tech', 'professional-corporate'],
    variants: { services: 'numbered-list', testimonials: 'big-quote', faq: 'accordion' },
    note: 'Net, güven veren, teknik ama sade bir anlatım.',
  },
];

export function matchSectorProfile(category: string | null | undefined): SectorProfile | null {
  if (!category) return null;
  const normalized = category.toLowerCase();
  return SECTOR_PROFILES.find((profile) => profile.keywords.some((kw) => normalized.includes(kw))) || null;
}
