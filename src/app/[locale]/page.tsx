import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { Link } from '@/i18n/routing';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import MobileMenu from '@/components/MobileMenu';
import InteractivePhoneMockup from '@/components/InteractivePhoneMockup';
import './landing.css';

type Locale = 'tr' | 'en' | 'ru';

const landingCopy = {
  tr: {
    nav: {
      products: 'Ürünler',
      templates: 'Şablonlar',
      apps: 'Uygulamalar',
      discover: 'Keşfet',
      pricing: 'Fiyatlandırma',
      resources: 'Kaynaklar',
      login: 'Giriş yap',
      startFree: 'Ücretsiz başla',
      dashboard: 'Panel'
    },
    hero: {
      tag: 'Stop linking. Start talking.',
      title: 'Profilindeki bağlantı senin yerine konuşsun.',
      subtitle: 'İnteraktif sayfanı dakikalar içinde tasarla.',
      inputPlaceholder: 'kullanıcıadı',
      playDemo: 'Talkinbio ile yaratılmış sayfaları gör',
      trustCue: 'Ücretsiz yayınla. Kredi kartı gerekmez.'
    },
    interaction: {
      title: 'Sayfan ücretsiz.\nKrediyi sadece\nkullandığında harca.',
      subtitle: 'Sayfa oluşturma, yayınlama ve düzenleme tamamen ücretsizdir. Krediler yalnızca interaktif ziyaretçi deneyimlerinde ve yapay zekâ üretimlerinde kullanılır.',
      cta: 'Tüm fiyatlandırmayı gör',
      freeLabel: 'Sayfa + yayın',
      freeValue: 'Ücretsiz',
      packages: [
        { label: '1.000 kredi', price: '$8' },
        { label: '2.000 kredi', price: '$15' },
        { label: '6.000 kredi', price: '$40' },
        { label: '15.000 kredi', price: '$90' },
      ],
      footNote: 'Krediler süre aşımına uğramaz · Aylık ücret yok'
    },
    features: {
      cards: [
        {
          step: '01',
          title: 'Sayfanı 10 dakikada kur',
          desc: 'Kategorini seç, birkaç soruyu yanıtla. Talkinbio sayfanı ve interaktif deneyimini birlikte hazırlar — ek kurulum gerekmez.',
        },
        {
          step: '02',
          title: 'Bağlantını bio\'na ekle',
          desc: 'Talkinbio adresini Instagram, TikTok ve diğer kanallardaki bio bölümüne koy. Tek link, her yerde çalışır.',
        },
        {
          step: '03',
          title: 'Ziyaretçin sorar, sayfan cevaplar',
          desc: 'İnteraktif sayfan ziyaretçinin ne aradığını anlar; doğru bölümü açar, hazırladığın cevabı gösterir veya seni çağırır.',
        },
        {
          step: '04',
          title: 'Kitleni tanı ve büyü',
          desc: 'Her ziyareti, tıklamayı ve iletişim talebini kayıt altına al. Neyin işe yaradığını gör, stratejini güçlendir.',
        },
      ]
    },
    splitDiscover: {
      title: 'Sayfanı istediğin an güncelle.',
      desc: 'Panelindeki AI destekli editörle metnini değiştir, yeni bölüm ekle, temanı yenile — kod yazmadan, dakikalar içinde.',
      linkText: 'Editörü keşfet'
    },
    splitFree: {
      title: 'Ücretsiz başla. İhtiyacın oldukça geliştir.',
      bullets: [
        'İnteraktif Talkinbio sayfası',
        'Linkler ve içerik bölümleri',
        'Ürün ve hizmet yayınlama',
        'Harici satış bağlantıları',
        'Temel soru yönlendirmesi',
        'Temel Analitik'
      ]
    },
    faq: {
      title: 'Sıkça sorulan sorular',
      items: [
        {
          q: 'Talkinbio ücretsiz mi?',
          a: 'Evet, Talkinbio\'nun temel sürümü tamamen ücretsizdir. İstediğiniz zaman ücretsiz başlayabilir ve hemen kullanmaya başlayabilirsiniz.'
        },
        {
          q: 'Ürün ve hizmetlerimi yayınlayabilir miyim?',
          a: 'Evet! Ürünlerinizi, hizmetlerinizi ve paketlerinizi doğrudan sayfanızda sergileyebilir ve harici satış bağlantılarınızı bağlayabilirsiniz.'
        },
        {
          q: 'Talkinbio satışlardan komisyon alıyor mu?',
          a: 'Hayır, Talkinbio yaptığınız satışlardan veya aldığınız ödemelerden hiçbir şekilde komisyon kesmez.'
        },
        {
          q: 'Ziyaretçi soruları nasıl cevaplanıyor?',
          a: 'Ziyaretçileriniz soru sorduğunda, Talkinbio sayfanızdaki ilgili bölümü açar veya doğrudan bilgi tabanındaki notlardan cevap üretir.'
        },
        {
          q: 'Kendi ödeme veya randevu sistemimi kullanabilir miyim?',
          a: 'Kesinlikle! Mevcut ödeme veya randevu sistemi bağlantılarınızı kolayca Talkinbio butonlarına ve detay sayfalarına entegre edebilirsiniz.'
        },
        {
          q: 'Sayfamı nerelerde paylaşabilirim?',
          a: 'Instagram, TikTok, LinkedIn, YouTube hesaplarınızın biyografi linkinde veya basılı QR kodlarınızda paylaşabilirsiniz.'
        }
      ]
    },
    footer: {
      desc: 'İnteraktif sayfanı oluştur, içeriğini paylaş, işini büyüt.',
      newsletterTitle: 'Gelişmelerden haberdar olun',
      newsletterPlaceholder: 'E-posta adresinizi girin',
      rights: '© 2026 talkinbio. Tüm hakları saklıdır.',
      cols: {
        products: { title: 'Ürünler', links: ['Sayfa Oluşturucu', 'Fiyatlandırma'] },
        company: { title: 'Şirket', links: ['Hakkımızda', 'Blog', 'Kariyer', 'İletişim'] },
        resources: { title: 'Kaynaklar', links: ['Yardım Merkezi', 'Kılavuzlar', 'Geliştiriciler'] },
        legal: { title: 'Yasal', links: ['Kullanım Koşulları', 'Gizlilik Politikası', 'Çerez Politikası'] }
      }
    }
  },
  en: {
    nav: {
      products: 'Products',
      templates: 'Templates',
      apps: 'Applications',
      discover: 'Discover',
      pricing: 'Pricing',
      resources: 'Resources',
      login: 'Log in',
      startFree: 'Sign up free',
      dashboard: 'Dashboard'
    },
    hero: {
      tag: 'Stop linking. Start talking.',
      title: 'A link in bio talking for you.',
      subtitle: 'Design your interactive page in minutes.',
      inputPlaceholder: 'username',
      playDemo: 'See pages made with Talkinbio',
      trustCue: 'Publish for free. No credit card required.'
    },
    interaction: {
      title: 'Your page is free.\nPay with credits\nonly when you use them.',
      subtitle: 'Page creation, publishing, and editing are completely free. Credits are only used for interactive visitor experiences and AI-powered creation.',
      cta: 'See full pricing',
      freeLabel: 'Page + publishing',
      freeValue: 'Free',
      packages: [
        { label: '1,000 credits', price: '$8' },
        { label: '2,000 credits', price: '$15' },
        { label: '6,000 credits', price: '$40' },
        { label: '15,000 credits', price: '$90' },
      ],
      footNote: 'Credits never expire · No monthly fee'
    },
    features: {
      cards: [
        {
          step: '01',
          title: 'Set up in 10 minutes',
          desc: 'Choose your category and answer a few questions. Talkinbio builds your page and interactive experience together — no extra setup needed.',
        },
        {
          step: '02',
          title: 'Add the link to your bio',
          desc: 'Put your Talkinbio address in your Instagram, TikTok, and other bio sections. One link, works everywhere.',
        },
        {
          step: '03',
          title: 'Visitor asks, page answers',
          desc: 'Your interactive page understands what the visitor is looking for — opens the right section, shows your answer, or calls on you.',
        },
        {
          step: '04',
          title: 'Know your audience, grow',
          desc: 'Track every visit, click, and contact request. See what works and sharpen your strategy.',
        },
      ]
    },
    splitDiscover: {
      title: 'Update your page anytime.',
      desc: 'Change your text, add a new section, refresh your theme — all with the AI-powered editor in your dashboard, no code required.',
      linkText: 'Explore the editor'
    },
    splitFree: {
      title: 'Start for free. Scale as you need.',
      bullets: [
        'Interactive Talkinbio page',
        'Links and content sections',
        'Product and service publishing',
        'External sales connections',
        'Basic question routing',
        'Basic Analytics'
      ]
    },
    faq: {
      title: 'Frequently asked questions',
      items: [
        {
          q: 'Is Talkinbio free?',
          a: 'Yes, the basic version of Talkinbio is completely free. You can start anytime and begin using it right away.'
        },
        {
          q: 'Can I publish my products and services?',
          a: 'Yes! You can showcase your products, services, and packages directly on your page and connect your external checkout links.'
        },
        {
          q: 'Does Talkinbio take commissions from sales?',
          a: 'No, Talkinbio does not take any commission from your sales or payments received.'
        },
        {
          q: 'How are visitor questions answered?',
          a: 'When visitors ask a question, Talkinbio opens the relevant section on your page or answers directly from your knowledge base notes.'
        },
        {
          q: 'Can I use my own payment or booking system?',
          a: 'Absolutely! You can easily integrate your existing payment or booking platform links into Talkinbio buttons.'
        },
        {
          q: 'Where can I share my page?',
          a: 'You can share it in the bio link of your Instagram, TikTok, LinkedIn, or YouTube accounts, or on printed QR codes.'
        }
      ]
    },
    footer: {
      desc: 'Create your interactive page, share your content, grow your business.',
      newsletterTitle: 'Stay updated',
      newsletterPlaceholder: 'Enter your email address',
      rights: '© 2026 talkinbio. All rights reserved.',
      cols: {
        products: { title: 'Products', links: ['Page Builder', 'Pricing'] },
        company: { title: 'Company', links: ['About Us', 'Blog', 'Careers', 'Contact'] },
        resources: { title: 'Resources', links: ['Help Center', 'Guides', 'Developers'] },
        legal: { title: 'Legal', links: ['Terms of Use', 'Privacy Policy', 'Cookie Policy'] }
      }
    }
  },
  ru: {
    nav: {
      products: 'Продукты',
      templates: 'Шаблоны',
      apps: 'Приложения',
      discover: 'Обзор',
      pricing: 'Тарифы',
      resources: 'Ресурсы',
      login: 'Войти',
      startFree: 'Начать бесплатно',
      dashboard: 'Панель'
    },
    hero: {
      tag: 'Stop linking. Start talking.',
      title: 'Пусть ссылка в био говорит за вас.',
      subtitle: 'Создайте интерактивную страницу за минуты.',
      inputPlaceholder: 'имяпользователя',
      playDemo: 'Смотреть страницы, созданные в Talkinbio',
      trustCue: 'Публикация бесплатна. Карта не требуется.'
    },
    interaction: {
      title: 'Страница бесплатна.\nТратьте кредиты\nтолько когда используете.',
      subtitle: 'Создание, публикация и редактирование страницы полностью бесплатны. Кредиты используются только для интерактивных визитов и AI-создания.',
      cta: 'Все тарифы',
      freeLabel: 'Страница + публикация',
      freeValue: 'Бесплатно',
      packages: [
        { label: '1 000 кредитов', price: '$8' },
        { label: '2 000 кредитов', price: '$15' },
        { label: '6 000 кредитов', price: '$40' },
        { label: '15 000 кредитов', price: '$90' },
      ],
      footNote: 'Кредиты не истекают · Без ежемесячной платы'
    },
    features: {
      cards: [
        {
          step: '01',
          title: 'Настройте за 10 минут',
          desc: 'Выберите категорию и ответьте на несколько вопросов. Talkinbio создаёт страницу и интерактивный опыт вместе — без лишних настроек.',
        },
        {
          step: '02',
          title: 'Добавьте ссылку в bio',
          desc: 'Разместите адрес Talkinbio в Instagram, TikTok и других каналах. Одна ссылка, работает везде.',
        },
        {
          step: '03',
          title: 'Гость спрашивает — страница отвечает',
          desc: 'Интерактивная страница понимает, что ищет гость, открывает нужный раздел, показывает ответ или зовёт вас.',
        },
        {
          step: '04',
          title: 'Узнайте аудиторию, растите',
          desc: 'Фиксируйте каждый визит, клик и запрос. Видите, что работает — усиливайте стратегию.',
        },
      ]
    },
    splitDiscover: {
      title: 'Обновляйте страницу в любой момент.',
      desc: 'Меняйте текст, добавляйте новый блок, обновляйте тему — прямо в редакторе с AI в панели управления, без кода.',
      linkText: 'Посмотреть редактор'
    },
    splitFree: {
      title: 'Начните бесплатно. Развивайте по мере роста.',
      bullets: [
        'Интерактивная страница Talkinbio',
        'Ссылки и контентные блоки',
        'Публикация продуктов и услуг',
        'Внешние платежные ссылки',
        'Базовая маршрутизация вопросов',
        'Базовая аналитика'
      ]
    },
    faq: {
      title: 'Часто задаваемые вопросы',
      items: [
        {
          q: 'Talkinbio бесплатный?',
          a: 'Да, базовая версия Talkinbio полностью бесплатна. Вы можете начать в любое время и пользоваться без ограничений.'
        },
        {
          q: 'Могу ли я публиковать продукты и услуги?',
          a: 'Да! Вы можете размещать пакеты услуг прямо на странице и подключать внешние ссылки для оплаты.'
        },
        {
          q: 'Берет ли Talkinbio комиссию с продаж?',
          a: 'Нет, Talkinbio не взимает комиссию с ваших продаж или полученных платежей.'
        },
        {
          q: 'Как Saule отвечает на вопросы гостей?',
          a: 'Когда гость спрашивает, Talkinbio открывает нужный блок на странице или дает ответ из базы знаний.'
        },
        {
          q: 'Могу ли я использовать свою систему записи/оплаты?',
          a: 'Конечно! Вы можете легко подключить ссылки на сторонние платформы записи или оплаты к кнопкам.'
        },
        {
          q: 'Где я могу поделиться ссылкой?',
          a: 'В био-ссылке ваших аккаунтов Instagram, TikTok, LinkedIn, YouTube или на печатных QR-кодах.'
        }
      ]
    },
    footer: {
      desc: 'Создайте интерактивную страницу, делитесь контентом, растите бизнес.',
      newsletterTitle: 'Будьте в курсе событий',
      newsletterPlaceholder: 'Введите адрес эл. почты',
      rights: '© 2026 talkinbio. Все права защищены.',
      cols: {
        products: { title: 'Продукты', links: ['Конструктор страниц', 'Тарифы'] },
        company: { title: 'Компания', links: ['О нас', 'Блог', 'Вакансии', 'Контакты'] },
        resources: { title: 'Ресурсы', links: ['Центр помощи', 'Руководства', 'Разработчикам'] },
        legal: { title: 'Юридические', links: ['Условия использования', 'Политика конфиденциальности', 'Куки'] }
      }
    }
  }
} satisfies Record<Locale, any>;

const LogoSVG = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="130 15 350 135" width="150" height="50" role="img" aria-labelledby="logoTitle">
    <title id="logoTitle">talkinbio</title>
    <defs>
      <style>{`.word { font-family: 'Bricolage Grotesque', 'Arial Black', sans-serif; font-weight: 800; }`}</style>
    </defs>
    <text x="130" y="102" className="word" fontSize="66" fill="#14231F">talkinbio</text>
    <circle cx="152" cy="120" r="6" fill="#14231F" />
    <circle cx="176" cy="120" r="6" fill="#14231F" />
    <circle cx="200" cy="120" r="6" fill="#14231F" />
  </svg>
);

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = (['tr', 'en', 'ru'].includes(rawLocale) ? rawLocale : 'tr') as Locale;
  const copy = landingCopy[locale] || landingCopy.tr;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': 'https://talkinbio.com/#website',
        url: 'https://talkinbio.com/',
        name: 'Talkinbio',
        description: copy.hero.subtitle,
        inLanguage: locale,
      },
      {
        '@type': 'Organization',
        '@id': 'https://talkinbio.com/#organization',
        name: 'Talkinbio',
        url: 'https://talkinbio.com/',
        logo: 'https://talkinbio.com/icon.svg',
      },
    ],
  };

  return (
    <div id="landing-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Nav Header */}
      <header>
        <div className="wrap nav">
          <Link href="/">
            <LogoSVG />
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <div className="flex items-center gap-5 ml-4">
              <Link href="/pricing" className="font-semibold text-sm text-[var(--ink)] hover:opacity-80 transition-opacity">
                {copy.nav.pricing}
              </Link>
              <LanguageSwitcher />
              {isLoggedIn ? (
                <Link href="/dashboard" className="btn btn-primary">
                  {copy.nav.dashboard || 'Dashboard'}
                </Link>
              ) : (
                <>
                  <Link href="/login" className="font-semibold text-sm text-[var(--ink)] hover:opacity-80 transition-opacity">
                    {copy.nav.login}
                  </Link>
                  <Link href="/register" className="btn btn-primary">
                    {copy.nav.startFree}
                  </Link>
                </>
              )}
            </div>
          </div>
          <MobileMenu isLoggedIn={isLoggedIn} texts={{ pricing: copy.nav.pricing, login: copy.nav.login, dashboard: copy.nav.dashboard }} />
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="hero">
          <div className="wrap">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-7 space-y-6 relative z-10 text-center lg:text-left">
                <span className="hero-badge animate-fade-up">{copy.hero.tag}</span>
                <h1 className="text-4xl md:text-6xl font-extrabold text-[var(--ink)] leading-tight animate-fade-up delay-100 max-w-xl mx-auto lg:mx-0">
                  {copy.hero.title}
                </h1>
                <p className="text-lg md:text-xl text-[var(--ink-soft)] leading-relaxed max-w-xl mx-auto lg:mx-0 animate-fade-up delay-100">
                  {copy.hero.subtitle}
                </p>

                {/* Input box form */}
                <div className="pt-2 flex justify-center lg:justify-start animate-fade-up delay-200">
                  <form action="/onboarding" method="GET" className="hero-input-container">
                    <span className="hero-input-prefix">talkinbio.com/</span>
                    <input 
                      type="text" 
                      name="username" 
                      placeholder={copy.hero.inputPlaceholder} 
                      className="hero-input"
                      required
                    />
                    <button type="submit" className="btn btn-primary">
                      {copy.nav.startFree}
                    </button>
                  </form>
                </div>

                {/* Trust Cue Row */}
                <div className="pt-3 flex justify-center lg:justify-start text-xs font-semibold text-[var(--ink-soft)] animate-fade-up delay-250">
                  <span className="flex items-center gap-2">
                    <svg width="14" height="16" viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[var(--muted)]">
                      <rect x="1.5" y="6.5" width="11" height="8" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M4 6.5V4.5a3 3 0 116 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    {copy.hero.trustCue}
                  </span>
                </div>

                {/* Try play button */}
                <div className="pt-5 flex justify-center lg:justify-start animate-fade-up delay-300">
                  <a
                    href="https://talkinbio.com/ulianapehlivan"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 text-sm font-bold text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors group"
                  >
                    <span className="w-12 h-12 rounded-full bg-white border border-[var(--border)] flex items-center justify-center text-[var(--coral)] shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:border-[var(--coral)]">
                      <svg width="12" height="14" viewBox="0 0 10 12" fill="currentColor" className="ml-1">
                        <path d="M1.5 1.634a1 1 0 011.5-.866l5.5 3.175a1 1 0 010 1.732l-5.5 3.175a1 1 0 01-1.5-.866V1.634z"/>
                      </svg>
                    </span>
                    <span className="text-[15px] font-extrabold tracking-tight text-[var(--ink)] group-hover:text-[var(--coral)] transition-colors">{copy.hero.playDemo}</span>
                  </a>
                </div>
              </div>

              {/* Interactive Phone Mockup Column */}
              <div className="lg:col-span-5 relative z-10 flex justify-center animate-fade-up delay-200">
                <InteractivePhoneMockup locale={locale} />
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Dark Interactive Panel */}
        <section id="demo-akisi" className="interaction-section scroll-mt-20">
          <div className="wrap">
            <div className="dark-card">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-4">
                  <h2 className="font-extrabold text-white leading-tight">
                    {copy.interaction.title.split('\n').map((line: string, i: number) => (
                      <span key={i} className="block">{line}</span>
                    ))}
                  </h2>
                  <p className="sub text-white/70 leading-relaxed text-base">
                    {copy.interaction.subtitle}
                  </p>
                  <div className="pt-4">
                    <Link href="/pricing" className="coral-link">
                      {copy.interaction.cta}
                      <svg width="18" height="12" viewBox="0 0 18 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 1L17 6M17 6L12 11M17 6H1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </Link>
                  </div>
                </div>

                {/* Fiyatlandırma mini tablosu */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Ücretsiz satırı */}
                  <div style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    borderRadius: '14px',
                    padding: '13px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(244,242,237,0.80)' }}>
                      {(copy.interaction as any).freeLabel}
                    </span>
                    <span style={{
                      padding: '3px 11px',
                      background: 'rgba(43,111,92,0.30)',
                      border: '1px solid rgba(43,111,92,0.45)',
                      borderRadius: '100px',
                      fontSize: '11px', fontWeight: 700,
                      color: '#7ECEA0', whiteSpace: 'nowrap',
                      fontFamily: 'var(--font-ibm-plex-mono)',
                      letterSpacing: '0.04em',
                    }}>
                      {(copy.interaction as any).freeValue}
                    </span>
                  </div>

                  {/* Kredi paketleri */}
                  {(copy.interaction as any).packages.map((pkg: any, i: number) => (
                    <div key={i} className="bubble-item" style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '11px 18px',
                    }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(244,242,237,0.75)', fontFamily: 'var(--font-ibm-plex-mono)' }}>
                        {pkg.label}
                      </span>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--coral)', fontFamily: 'var(--font-bricolage)' }}>
                        {pkg.price}
                      </span>
                    </div>
                  ))}

                  {/* Alt not */}
                  <p style={{
                    fontSize: '11px', color: 'rgba(244,242,237,0.30)',
                    fontFamily: 'var(--font-ibm-plex-mono)',
                    textAlign: 'center', margin: '2px 0 0', letterSpacing: '0.02em',
                  }}>
                    {(copy.interaction as any).footNote}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Features 4-Column Grid */}
        <section id="urunler" className="features-section">
          <div className="wrap">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {copy.features.cards.map((card: any, idx: number) => (
                <div key={idx} className="feature-card" style={{ position: 'relative' }}>
                  {/* Adım numarası + ikon */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <span style={{
                      fontFamily: 'var(--font-ibm-plex-mono)',
                      fontSize: '11px', fontWeight: 700,
                      color: 'var(--teal)', letterSpacing: '0.08em',
                    }}>
                      {card.step}
                    </span>
                    <div className="feature-card-icon" style={{ margin: 0 }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--ink)]">
                        {/* 01 – AI sohbet / wand */}
                        {idx === 0 && <><path d="M15 4V2m0 2v2m0-2h-2m2 0h2M9 11l-4 4 4 4m-4-4h10"/><path d="M17.5 7.5 19 9l-6.5 6.5-1.5-1.5z"/></>}
                        {/* 02 – link zinciri */}
                        {idx === 1 && <><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></>}
                        {/* 03 – konuşma balonu */}
                        {idx === 2 && <><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></>}
                        {/* 04 – chart bars */}
                        {idx === 3 && <path d="M18 20V10M12 20V4M6 20v-6"/>}
                      </svg>
                    </div>
                  </div>

                  <h3 style={{ marginBottom: '10px' }}>{card.title}</h3>
                  <p style={{ marginBottom: 0 }}>{card.desc}</p>

                  {/* Adımlar arası bağlantı oku — son kartta yok */}
                  {idx < 3 && (
                    <div style={{
                      display: 'none',
                    }} className="step-connector" aria-hidden="true" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 6: Discover & Free Tier Card Panels */}
        <section id="kesfet" className="split-row-section">
          <div className="wrap">
            <div className="split-container">
              {/* Left Card: Sadece paylaşma. Keşfedil. */}
              <div className="split-card bg-white">
                <div>
                  <h2>{copy.splitDiscover.title}</h2>
                  <p className="card-desc" style={{ marginBottom: '16px' }}>{copy.splitDiscover.desc}</p>
                </div>
                
                <div className="pt-2">
                  <Link href="/register" className="coral-link">
                    {copy.splitDiscover.linkText} →
                  </Link>
                </div>
              </div>

              {/* Right Card: Ücretsiz başla. İhtiyacın oldukça geliştir. */}
              <div className="split-card bg-white" style={{ paddingBottom: '24px' }}>
                <div>
                  <h2>{copy.splitFree.title}</h2>
                  
                  {/* Two column bullet details */}
                  <div className="grid grid-cols-2 gap-4 my-4">
                    <div className="checkmark-list">
                      {copy.splitFree.bullets.slice(0, 3).map((b: string, idx: number) => (
                        <div key={idx} className="checkmark-item">
                          <svg className="checkmark-icon" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          {b}
                        </div>
                      ))}
                    </div>
                    <div className="checkmark-list">
                      {copy.splitFree.bullets.slice(3, 6).map((b: string, idx: number) => (
                        <div key={idx} className="checkmark-item">
                          <svg className="checkmark-icon" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="16" height="16">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          {b}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 7: Frequently Asked Questions (FAQ) Accordion */}
        <section className="faq-section">
          <div className="wrap">
            <h2>{copy.faq.title}</h2>
            <div className="faq-grid">
              {/* Left Column FAQs */}
              <div className="space-y-4">
                {copy.faq.items.slice(0, 3).map((item: any, idx: number) => (
                  <details key={idx} className="faq-item">
                    <summary className="faq-trigger">
                      <span>{item.q}</span>
                      <svg className="faq-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </summary>
                    <div className="faq-content">
                      <p className="faq-answer">{item.a}</p>
                    </div>
                  </details>
                ))}
              </div>

              {/* Right Column FAQs */}
              <div className="space-y-4">
                {copy.faq.items.slice(3, 6).map((item: any, idx: number) => (
                  <details key={idx} className="faq-item">
                    <summary className="faq-trigger">
                      <span>{item.q}</span>
                      <svg className="faq-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </summary>
                    <div className="faq-content">
                      <p className="faq-answer">{item.a}</p>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer Section */}
      <footer>
        <div className="wrap">
          <div className="footer-grid">
            {/* Column 1: Brand Info */}
            <div className="footer-brand-col">
              <LogoSVG />
              <p>{copy.footer.desc}</p>
              <div className="footer-social-row">
                <a href="https://instagram.com" className="footer-social-link" aria-label="Instagram">
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.79.073 7.151.014 8.43 0 8.839 0 12s.014 3.77.072 5.049c.2 4.363 2.615 6.88 6.975 7.08 1.28.058 1.688.072 4.953.072s3.673-.014 4.953-.072c4.354-.2 6.782-2.718 6.975-7.08.058-1.28.072-1.687.072-5.049s-.014-3.77-.072-5.049c-.2-4.364-2.615-6.88-6.975-7.08C15.673.014 15.264 0 12 0z"/></svg>
                </a>
                <a href="https://tiktok.com" className="footer-social-link" aria-label="TikTok">
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.03 2.5.52 3.37 1.42.92-.11 1.82-.44 2.62-.96-.34 1.05-1.01 1.91-1.9 2.52.82-.09 1.61-.31 2.35-.64-.53.79-1.2 1.47-1.97 2 .01.2.02.41.02.61 0 6.22-4.74 13.39-13.39 13.39-2.66 0-5.13-.78-7.35-2.13.37.04.74.06 1.13.06 2.21 0 4.24-.75 5.84-2.01-2.06-.04-3.8-1.4-4.4-3.27.29.06.58.08.89.08.43 0 .85-.06 1.24-.17-2.15-.43-3.77-2.33-3.77-4.6v-.06c.63.35 1.35.56 2.11.58-1.26-.84-2.09-2.29-2.09-3.93 0-1.21.33-2.35.9-3.33 2.32 2.85 5.79 4.73 9.71 4.93-.11-.48-.17-.99-.17-1.5 0-3.61 2.93-6.54 6.54-6.54z"/></svg>
                </a>
                <a href="https://youtube.com" className="footer-social-link" aria-label="YouTube">
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.163a3.003 3.003 0 00-2.11-2.11C19.517 3.545 12 3.545 12 3.545s-7.517 0-9.388.507a3.003 3.003 0 00-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 002.11 2.11c1.871.507 9.388.507 9.388.507s7.517 0 9.388-.507a3.003 3.003 0 002.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.455L15.818 12l-6.273 3.568z"/></svg>
                </a>
                <a href="https://linkedin.com" className="footer-social-link" aria-label="LinkedIn">
                  <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                </a>
              </div>
            </div>

            {/* Column 2: Ürünler */}
            <div>
              <div className="footer-col-title">{copy.footer.cols.products.title}</div>
              <div className="footer-links-list">
                {copy.footer.cols.products.links.map((link: string, i: number) => (
                  <Link key={i} href={link === 'Fiyatlandırma' || link === 'Pricing' || link === 'Тарифы' ? '/pricing' : '/register'}>{link}</Link>
                ))}
              </div>
            </div>

            {/* Column 3: Şirket */}
            <div>
              <div className="footer-col-title">{copy.footer.cols.company.title}</div>
              <div className="footer-links-list">
                {copy.footer.cols.company.links.map((link: string, i: number) => (
                  <Link key={i} href="/register">{link}</Link>
                ))}
              </div>
            </div>

            {/* Column 4: Kaynaklar */}
            <div>
              <div className="footer-col-title">{copy.footer.cols.resources.title}</div>
              <div className="footer-links-list">
                {copy.footer.cols.resources.links.map((link: string, i: number) => (
                  <Link key={i} href="/register">{link}</Link>
                ))}
              </div>
            </div>

            {/* Column 5: Yasal */}
            <div>
              <div className="footer-col-title">{copy.footer.cols.legal.title}</div>
              <div className="footer-links-list">
                {copy.footer.cols.legal.links.map((link: string, i: number) => (
                  <Link key={i} href="/legal">{link}</Link>
                ))}
              </div>
            </div>

            {/* Column 6: Newsletter bülten */}
            <div className="newsletter-col">
              <h5>{copy.footer.newsletterTitle}</h5>
              <form className="newsletter-form" action="/register" method="GET">
                <input 
                  type="email" 
                  name="email" 
                  placeholder={copy.footer.newsletterPlaceholder} 
                  className="newsletter-input"
                  required
                />
                <button type="submit" className="newsletter-btn" aria-label="Subscribe">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 6H11M11 6L6 1M11 6L6 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </form>
            </div>
          </div>

          {/* Footer bottom row */}
          <div className="footer-bottom-row">
            <span className="footer-copy">{copy.footer.rights}</span>
            <span className="footer-copy">info@talkinbio.com</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
