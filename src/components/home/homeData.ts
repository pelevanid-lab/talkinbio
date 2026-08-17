import type { LucideIcon } from 'lucide-react';
import { BarChart3, Compass, Link2, MessageCircle, MonitorSmartphone, PenLine, Send, Sparkles } from 'lucide-react';
import { IMMERSIVE_VIDEO } from '@/config/immersiveMedia';

export type HomepageIntent = 'curious' | 'create_page' | 'existing_link_bio';
export type HomepageSectionId = 'ask' | 'search' | 'transformation' | 'capabilities' | 'examples' | 'setup' | 'pricing';
export type HomepageAction = 'pricing' | 'examples' | 'how_it_works' | 'booking' | 'create';

export type NavCopy = {
  pricing: string;
  login: string;
  dashboard: string;
  create: string;
};

export const navCopy: Record<string, NavCopy> = {
  en: {
    pricing: 'Pricing',
    login: 'Log in',
    dashboard: 'Dashboard',
    create: 'Create your page',
  },
  tr: {
    pricing: 'Pricing',
    login: 'Log in',
    dashboard: 'Dashboard',
    create: 'Create your page',
  },
  ru: {
    pricing: 'Pricing',
    login: 'Log in',
    dashboard: 'Dashboard',
    create: 'Create your page',
  },
};

export const intentCopy: Record<HomepageIntent, { label: string; response: string; order: HomepageSectionId[] }> = {
  curious: {
    label: "I'm curious.",
    response: 'Good. Let me show you what we mean.',
    order: ['ask', 'search', 'transformation', 'capabilities', 'examples', 'setup', 'pricing'],
  },
  create_page: {
    label: 'I want a page.',
    response: "Good. Let's make yours talk.",
    order: ['ask', 'examples', 'setup', 'pricing', 'search', 'transformation', 'capabilities'],
  },
  existing_link_bio: {
    label: 'I already use a link-in-bio.',
    response: 'Keep your links. Give them a voice.',
    order: ['transformation', 'search', 'capabilities', 'ask', 'examples', 'setup', 'pricing'],
  },
};

export const defaultOrder = intentCopy.curious.order;

export type HomepageSection = {
  id: HomepageSectionId;
  eyebrow: string;
  title: string;
};

export const sectionMeta: Record<HomepageSectionId, HomepageSection> = {
  ask: { id: 'ask', eyebrow: '02', title: 'Ask the page.' },
  search: { id: 'search', eyebrow: '03', title: "A page shouldn't make people search." },
  transformation: { id: 'transformation', eyebrow: '04', title: 'Link -> page -> conversation.' },
  capabilities: { id: 'capabilities', eyebrow: '05', title: 'What can a page do?' },
  examples: { id: 'examples', eyebrow: '05', title: 'Every page has something to say.' },
  setup: { id: 'setup', eyebrow: '06', title: 'From zero to talking in minutes.' },
  pricing: { id: 'pricing', eyebrow: '07', title: 'Create your page for free.' },
};

export const suggestedQuestions = [
  'What do you charge?',
  'Are you available this week?',
  'Where can I see your work?',
  'Do you work internationally?',
];

export const capabilityItems: Array<{ icon: LucideIcon; title: string; body: string }> = [
  { icon: MessageCircle, title: 'Answer', body: 'Questions about you, your work or your content.' },
  { icon: Compass, title: 'Guide', body: 'Take visitors exactly where they need to go.' },
  { icon: MonitorSmartphone, title: 'Show', body: 'Products, work, content, services and releases.' },
  { icon: Link2, title: 'Connect', body: 'Booking, payment, WhatsApp, social and external tools.' },
  { icon: BarChart3, title: 'Learn', body: 'Understand what visitors actually want.' },
];

export const setupSteps: Array<{ icon: LucideIcon; step: string; title: string; body: string }> = [
  { icon: PenLine, step: '01', title: 'Create', body: 'Tell Talkinbio who you are.' },
  { icon: Send, step: '02', title: 'Publish', body: 'Your page goes live.' },
  { icon: MessageCircle, step: '03', title: 'Talk', body: 'Visitors arrive with questions.' },
];

export const examplePages = [
  { name: 'Aria Rey', role: 'Musician', accent: '#343b2b', prompts: ['Book', 'Listen', 'Tour dates'] },
  { name: 'Daniel Kim', role: 'Designer', accent: '#151515', prompts: ['Portfolio', 'Rates', 'Contact'] },
  { name: "Mira O'Rourk", role: 'Dietitian', accent: '#6f7054', prompts: ['Programs', 'Book a call', 'Meal guide'] },
  { name: 'Jamee Carter', role: 'Photographer', accent: '#252525', prompts: ['Work', 'Availability', 'Contact'] },
  { name: 'Lena Moreau', role: 'Coach', accent: '#314246', prompts: ['Sessions', 'Who I help', 'Results'] },
  { name: 'Noah Brown', role: 'Freelancer', accent: '#4d4a39', prompts: ['Services', 'Timeline', 'Start'] },
];

export type QuestionRoute = {
  match: string[];
  category: string;
  action: HomepageAction;
  target: HomepageSectionId;
  answer: string;
};

export const questionRoutes: QuestionRoute[] = [
  {
    match: ['cost', 'price', 'pricing', 'charge', 'free', 'pay', 'plan'],
    category: 'pricing',
    action: 'pricing',
    target: 'pricing',
    answer: 'Create your page for free, start with 200 visitor credits, and upgrade when your page starts talking more.',
  },
  {
    match: ['example', 'show', 'creator', 'musician', 'designer', 'portfolio'],
    category: 'examples',
    action: 'examples',
    target: 'examples',
    answer: 'Here are pages with different identities. The point is not another grid of links. It is a page that can respond.',
  },
  {
    match: ['work', 'how', 'link', 'bio', 'conversation', 'search'],
    category: 'how_it_works',
    action: 'how_it_works',
    target: 'transformation',
    answer: 'A visitor asks. Talkinbio answers and moves the interface to the right place.',
  },
  {
    match: ['book', 'booking', 'call', 'available', 'appointment', 'calendar'],
    category: 'booking',
    action: 'booking',
    target: 'ask',
    answer: 'Yes. A Talkinbio page can answer availability questions and guide the visitor into a booking action.',
  },
  {
    match: ['create', 'start', 'publish', 'build', 'page'],
    category: 'create',
    action: 'create',
    target: 'setup',
    answer: 'Create the page, publish it, and let visitors ask. The setup is intentionally short.',
  },
];

export const fallbackQuestionRoute: QuestionRoute = {
  match: [],
  category: 'general',
  action: 'how_it_works',
  target: 'capabilities',
  answer: 'Talkinbio answers, guides, shows, connects and learns. The interface changes because the visitor asked.',
};

export const heroStructuredDataDescription =
  'Müşterinin bıraktığı ilk sinyalden markanın vereceği karara uzanan bağımsız pazarlama yönetimi yayını.';

export const systemArtifact = Sparkles;

// ---------------------------------------------------------------------------
// Touchpoints: the 8 "first contact" categories shown on the homepage hero.
// Shared by DesktopConversionHero and MobileConversionHero so both surfaces
// stay in sync, and by /explore/[slug] category pages (only categories with an
// entry in `touchpointPages` get a working "Keşfet" link — the rest are
// homepage-only for now).
// ---------------------------------------------------------------------------
export type TouchpointCategory = {
  id: string;
  slug: string;
  eyebrow: string;
  label: string;
  items: string[];
};

export const touchpointCategories: TouchpointCategory[] = [
  {
    id: 'search',
    slug: 'search-and-discovery',
    eyebrow: 'ARAMA & KEŞİF',
    label: 'Arama motorları',
    items: ['Organik arama (SEO)', 'Arama motoru reklamları (SEM/PPC)', 'Harita ve yerel arama', 'Yapay zekâ asistanları'],
  },
  {
    id: 'social',
    slug: 'social-media-discovery',
    eyebrow: 'SOSYAL MEDYA',
    label: 'Sosyal medya keşfi',
    items: ['Algoritmik akış keşifleri', 'Hedefli sosyal medya reklamları', 'Influencer iş birlikleri'],
  },
  {
    id: 'marketplace',
    slug: 'marketplaces',
    eyebrow: 'PAZARYERİ',
    label: 'Pazaryerleri',
    items: ['E-ticaret pazaryeri aramaları', 'Fiyat / ürün karşılaştırma siteleri', 'Uygulama mağazaları'],
  },
  {
    id: 'community',
    slug: 'communities-and-reviews',
    eyebrow: 'TOPLULUK & YORUM',
    label: 'Forumlar ve yorumlar',
    items: ['Topluluk platformları (Reddit, Ekşi Sözlük...)', 'Şikayet ve deneyim siteleri'],
  },
  {
    id: 'outdoor',
    slug: 'outdoor-and-traditional-media',
    eyebrow: 'AÇIKHAVA & MEDYA',
    label: 'Açıkhava ve geleneksel medya',
    items: ['Billboardlar', 'Toplu taşıma giydirmeleri', 'Gerilla pazarlama', 'TV ve radyo', 'Basılı medya'],
  },
  {
    id: 'retail',
    slug: 'store-and-shelf',
    eyebrow: 'PERAKENDE',
    label: 'Mağaza ve raf',
    items: ['Mağaza vitrini ve cephe', 'Süpermarket / mağaza rafı', 'Pop-up mağazalar'],
  },
  {
    id: 'wordofmouth',
    slug: 'word-of-mouth',
    eyebrow: 'AĞIZDAN AĞIZA',
    label: 'Dolaylı temas',
    items: ['Ağızdan ağıza tavsiye', 'Sosyal gözlem', 'Hediyeleşme ve numune', 'İkinci el platformları'],
  },
  {
    id: 'partnership',
    slug: 'partnerships',
    eyebrow: 'İŞ ORTAKLIĞI',
    label: 'Ekosistem ortaklıkları',
    items: ['Çapraz promosyonlar (co-branding)', 'Sadakat ve avantaj programları', 'Kurumsal / çalışan yan hakları'],
  },
];

// ---------------------------------------------------------------------------
// Touchpoint category pages (/explore/[slug]). Each is a content-first "first
// contact" landing page, not an SEO listicle. Only categories with an entry
// here are reachable — the homepage only shows a "Keşfet" button when one
// exists, so a card never leads to a dead page.
// ---------------------------------------------------------------------------
export type TouchpointDiscoveryPath = {
  title: string;
  question: string;
  topics: string[];
};

export type TouchpointFrameworkStep = {
  letter: string;
  word: string;
  description: string;
};

export type TouchpointPageContent = {
  slug: string;
  categoryId: string;
  eyebrow: string;
  headline: string;
  subhead: string;
  videoSrc: string;
  signal: {
    prompt: string;
    examplePlaceholder: string;
  };
  discoveryPaths: TouchpointDiscoveryPath[];
  manifesto: string[];
  articles: string[];
  caseStudy: {
    title: string;
    teaser: string;
  };
  framework: {
    name: string;
    steps: TouchpointFrameworkStep[];
  };
  nextTouchpointIds: string[];
  coreClaim: string;
};

export const touchpointPages: Record<string, TouchpointPageContent> = {
  'search-and-discovery': {
    slug: 'search-and-discovery',
    categoryId: 'search',
    eyebrow: 'ARAMA & KEŞİF',
    headline: 'İnsanlar arama kutusuna yalnızca kelime değil, niyetlerini yazar.',
    subhead:
      'Bir ihtiyaç, soru veya sorun aramaya dönüştüğü anda marka için ilk anlamlı müşteri sinyali oluşur. Bu sinyallerin doğru işlenmesi sınıflandırmayı ve doğru deneyimin kurgulanmasını mümkün kılar.',
    videoSrc: IMMERSIVE_VIDEO.layer,
    signal: {
      prompt: 'Bir arama yaz. Arkasındaki niyeti birlikte okuyalım.',
      examplePlaceholder: 'örn. çocuğum için en iyi kaleci eldiveni',
    },
    discoveryPaths: [
      {
        title: 'Organik Arama',
        question: 'Müşteri sorusuna reklam vermeden nasıl cevap olunur?',
        topics: [
          'Arama niyeti ve müşteri ihtiyacı',
          'SEO ile müşteri deneyiminin ilişkisi',
          'İçerik kümeleri',
          'Marka güveni ve uzmanlık',
          'AI destekli içerik araştırması',
          'Arama sonucundan site deneyimine geçiş',
        ],
      },
      {
        title: 'Ücretli Arama',
        question: 'Doğru kelimeye teklif vermek, doğru ihtiyacı anlamak anlamına gelir mi?',
        topics: [
          'SEM/PPC stratejisi',
          'Arama kelimelerinden içgörü çıkarma',
          'Reklam mesajı ile açılış sayfası uyumu',
          'Kampanya segmentasyonu',
          'AI destekli reklam optimizasyonu',
          'Tıklama yerine kaliteli talep ölçümü',
        ],
      },
      {
        title: 'Harita ve Yerel Arama',
        question: 'Müşteri yalnızca ne istediğini değil, nerede istediğini de söyler.',
        topics: [
          'Yakınımdaki aramaları',
          'Google işletme profilleri',
          'Mağaza, servis ve şube deneyimi',
          'Yerel yorumlar',
          'Aramadan fiziksel ziyarete geçiş',
          'Lokasyon bazlı müşteri içgörüsü',
        ],
      },
      {
        title: 'Yapay Zekâ ile Keşif',
        question: 'Müşteri artık bağlantı listesi değil, doğrudan cevap bekliyor.',
        topics: [
          'AI asistanlarında marka görünürlüğü',
          'Geleneksel arama ile konuşarak arama farkı',
          'Markaların cevap motorlarına hazırlanması',
          'Yapılandırılmış ve güvenilir içerik',
          'AI tavsiyelerinde güven ve kaynak sorunu',
          'Arama olmadan gerçekleşen ürün keşfi',
        ],
      },
    ],
    manifesto: [
      'Arama bir trafik verisi değildir. Arama, müşterinin gönüllü olarak paylaştığı niyettir.',
      'Pazarlamanın görevi bu niyeti tıklamaya çevirmekten önce doğru anlamaktır.',
    ],
    articles: [
      'Arama Kelimesinden Müşteri İhtiyacına: Niyeti Nasıl Okunur?',
      'AI Asistanları Markaların Web Trafiğini Bitirecek mi?',
      'SEO Artık Sıralama Değil, Cevap Olma Yarışı',
      'Reklam Tıklaması ile Gerçek Müşteri Niyeti Aynı Şey Değildir',
      'Müşteri Yolculuğunun İlk Sinyali Neden Aramadır?',
      'Yapay Zekâ Çağında Marka Web Sitesinin Yeni Görevi',
    ],
    caseStudy: {
      title: 'Sinyal Analizi: Bir Arama Sonucundan Müşteri Yolculuğu Çıkarmak',
      teaser:
        'Bir arama yaz, Talkinbio SIGNAL bulgularını kısa, illüstratif bir vaka analizine dönüştürsün — gerçek bir marka adı uydurmadan, bu tür bir aramanın genellikle nasıl bir yolculuğa dönüştüğünü anlatan bir simülasyon.',
    },
    framework: {
      name: 'SIGNAL',
      steps: [
        { letter: 'S', word: 'Search', description: 'Müşteri ne arıyor?' },
        { letter: 'I', word: 'Intent', description: 'Asıl niyeti ne?' },
        { letter: 'G', word: 'Gap', description: 'Hangi bilgi veya güven eksik?' },
        { letter: 'N', word: 'Next step', description: 'Bir sonraki davranışı ne olacak?' },
        { letter: 'A', word: 'Answer', description: 'Marka nasıl cevap vermeli?' },
        { letter: 'L', word: 'Learn', description: 'Bu sinyalden ne öğrenilebilir?' },
      ],
    },
    nextTouchpointIds: ['social', 'marketplace', 'community'],
    coreClaim: 'Arama, pazarlamanın trafik kaynağı değil; müşteriyi dinleme kanalıdır.',
  },
};
