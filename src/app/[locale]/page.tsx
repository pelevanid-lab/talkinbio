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
      playDemo: 'Canlı örneği dene',
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
    apps: {
      title: 'İhtiyacın olan uygulamaları ekle.',
      subtitle: 'Temel Talkinbio sayfası ücretsizdir. Daha fazlasına ihtiyaç duyduğunda yalnızca kullanacağın uygulamaları eklersin.',
      cta: 'Uygulamaları keşfet',
      list: [
        { title: 'Content Studio', desc: 'İçeriklerini planla, üret ve paylaş.', icon: 'pencil' },
        { title: 'Booking', desc: 'Randevularını yönet ve takvimini bağla.', icon: 'calendar' },
        { title: 'Survey', desc: 'Anketler ve formlar oluştur, yanıtları topla.', icon: 'survey' },
        { title: 'Waitlist', desc: 'Bekleyen müşterilerini ve doluluk durumunu yönet.', icon: 'waitlist' },
        { title: 'Mailing', desc: 'Abone listeni büyüt ve e-postalarını gönder.', icon: 'mailing' },
        { title: 'Integrations', desc: 'Kullandığın araçları Talkinbio\'ya bağla.', icon: 'integrations' }
      ]
    },
    splitShare: {
      title: 'Her yerde paylaş.',
      desc: 'Benzersiz Talkinbio adresini tüm sosyal medya hesaplarına, web sitene, e-posta imzalarına ve offline materyallerine ekle.',
      cta: 'Ücretsiz sayfanı oluştur'
    },
    splitStats: {
      title: 'Ziyaretçilerini tanı. Neyin işe yaradığını gör.',
      cta: 'Analitik özellikleri keşfet',
      labels: {
        visits: 'Toplam Ziyaret',
        clicks: 'Bağlantı Tıklamaları',
        leads: 'İletişim Talepleri',
        sales: 'Satış Dönüşümleri'
      }
    },
    splitDiscover: {
      title: 'Sadece paylaşma. Keşfedil.',
      desc: 'Talkinbio kullanıcılarının profilleri, ürünleri ve hizmetleri merkezi keşif alanında bulunabilir. İnsanlar ihtiyaç duyduğu kişiyi, ürünü veya hizmeti Talkinbio\'da arayabilir.',
      linkText: 'Talkinbio Discover hakkında daha fazla bilgi'
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
      ],
      teaserTitle: 'İsteğe bağlı uygulamalar',
      teaserDesc: 'İhtiyacın olan uygulamaları App Store\'dan seç ve sayfana ekle.',
      badgeText: 'Yakında: Talkinbio Discover çok yakında kullanımda!'
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
          q: 'Uygulamalar nasıl satın alınıyor?',
          a: 'Sayfanıza eklemek istediğiniz Booking veya Mailing gibi uygulamaları panelinizdeki uygulama mağazasından tek tıkla kiralayabilir veya satın alabilirsiniz.'
        },
        {
          q: 'Kendi ödeme veya randevu sistemimi kullanabilir miyim?',
          a: 'Kesinlikle! Mevcut ödeme veya randevu sistemi bağlantılarınızı kolayca Talkinbio butonlarına ve detay sayfalarına entegre edebilirsiniz.'
        },
        {
          q: 'Talkinbio Discover nedir?',
          a: 'Talkinbio kullanıcılarının profillerinin, sunduğu hizmetlerin ve ürünlerin listelendiği, insanların arama yapıp yeni uzmanlar keşfettiği ortak dizindir.'
        },
        {
          q: 'Sayfamı nerelerde paylaşabilirim?',
          a: 'Biyografi linkinizde, Instagram DM otomatik yanıtlarında, TikTok, LinkedIn, YouTube hesaplarınızda veya basılı QR kodlarınızda paylaşabilirsiniz.'
        }
      ]
    },
    footer: {
      desc: 'İnteraktif sayfanı oluştur, içeriğini paylaş, işini büyüt.',
      newsletterTitle: 'Gelişmelerden haberdar olun',
      newsletterPlaceholder: 'E-posta adresinizi girin',
      rights: '© 2026 talkinbio. Tüm hakları saklıdır.',
      cols: {
        products: { title: 'Ürünler', links: ['Sayfa Oluşturucu', 'Uygulamalar', 'Şablonlar', 'Fiyatlandırma'] },
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
      playDemo: 'Try live example',
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
    apps: {
      title: 'Add the applications you need.',
      subtitle: 'The basic Talkinbio page is free. When you need more, you only add and pay for the applications you actually use.',
      cta: 'Explore applications',
      list: [
        { title: 'Content Studio', desc: 'Plan, produce and share your content.', icon: 'pencil' },
        { title: 'Booking', desc: 'Manage your appointments and connect your calendar.', icon: 'calendar' },
        { title: 'Survey', desc: 'Create surveys and forms, collect responses.', icon: 'survey' },
        { title: 'Waitlist', desc: 'Manage your waiting customers and availability status.', icon: 'waitlist' },
        { title: 'Mailing', desc: 'Grow your subscriber list and send your emails.', icon: 'mailing' },
        { title: 'Integrations', desc: 'Connect the tools you already use to Talkinbio.', icon: 'integrations' }
      ]
    },
    splitShare: {
      title: 'Share everywhere.',
      desc: 'Add your unique Talkinbio link to all your social media accounts, website, email signatures and offline materials.',
      cta: 'Create your free page'
    },
    splitStats: {
      title: 'Know your visitors. See what works.',
      cta: 'Discover analytics features',
      labels: {
        visits: 'Total Visits',
        clicks: 'Link Clicks',
        leads: 'Contact Leads',
        sales: 'Sales Conversions'
      }
    },
    splitDiscover: {
      title: 'Don\'t just share. Be discovered.',
      desc: 'Talkinbio user profiles, products and services can be found in our central discover space. People can search for the experts or services they need.',
      linkText: 'Learn more about Talkinbio Discover'
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
      ],
      teaserTitle: 'Optional applications',
      teaserDesc: 'Select the applications you need from the App Store and add them.',
      badgeText: 'Coming Soon: Talkinbio Discover is launch ready soon!'
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
          q: 'How do I purchase applications?',
          a: 'You can rent or purchase applications like Booking or Mailing with a single click from the App Store inside your dashboard.'
        },
        {
          q: 'Can I use my own payment or booking system?',
          a: 'Absolutely! You can easily integrate your existing payment or booking platform links into Talkinbio buttons.'
        },
        {
          q: 'What is Talkinbio Discover?',
          a: 'It is a public directory listing Talkinbio user profiles, services, and products, where people can search and discover new experts.'
        },
        {
          q: 'Where can I share my page?',
          a: 'You can share it in your bio link, Instagram DM auto-replies, TikTok, LinkedIn, YouTube accounts, or on printed QR codes.'
        }
      ]
    },
    footer: {
      desc: 'Create your interactive page, share your content, grow your business.',
      newsletterTitle: 'Stay updated',
      newsletterPlaceholder: 'Enter your email address',
      rights: '© 2026 talkinbio. All rights reserved.',
      cols: {
        products: { title: 'Products', links: ['Page Builder', 'Applications', 'Templates', 'Pricing'] },
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
      playDemo: 'Попробовать демо',
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
    apps: {
      title: 'Добавляйте нужные приложения.',
      subtitle: 'Базовая страница Talkinbio бесплатна. Если вам нужно больше, вы платите только за те приложения, которые добавляете.',
      cta: 'Обзор приложений',
      list: [
        { title: 'Content Studio', desc: 'Планируйте, создавайте и делитесь контентом.', icon: 'pencil' },
        { title: 'Booking', desc: 'Управляйте записями и подключите календарь.', icon: 'calendar' },
        { title: 'Survey', desc: 'Создавайте опросы и формы, собирайте ответы.', icon: 'survey' },
        { title: 'Waitlist', desc: 'Управляйте списком ожидания и доступностью.', icon: 'waitlist' },
        { title: 'Mailing', desc: 'Растите базу подписчиков и делайте рассылки.', icon: 'mailing' },
        { title: 'Integrations', desc: 'Интегрируйте привычные инструменты в Talkinbio.', icon: 'integrations' }
      ]
    },
    splitShare: {
      title: 'Делитесь везде.',
      desc: 'Добавьте ссылку Talkinbio во все профили соцсетей, подписи писем или печатные QR-коды.',
      cta: 'Создать страницу бесплатно'
    },
    splitStats: {
      title: 'Знайте своих гостей. Видьте эффективность.',
      cta: 'Открыть функции аналитики',
      labels: {
        visits: 'Всего визитов',
        clicks: 'Клики по ссылкам',
        leads: 'Запросы контактов',
        sales: 'Конверсии продаж'
      }
    },
    splitDiscover: {
      title: 'Не просто делитесь. Будьте на виду.',
      desc: 'Профили пользователей, услуги и продукты будут доступны в общем каталоге, где люди смогут находить нужных экспертов.',
      linkText: 'Подробнее о Talkinbio Discover'
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
      ],
      teaserTitle: 'Дополнительные приложения',
      teaserDesc: 'Выбирайте приложения из магазина приложений и добавляйте их на страницу.',
      badgeText: 'Скоро: Talkinbio Discover готовится к запуску!'
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
          q: 'Как приобретаются приложения?',
          a: 'Вы можете подключить Booking или Mailing в один клик из магазина приложений в панели управления.'
        },
        {
          q: 'Могу ли я использовать свою систему записи/оплаты?',
          a: 'Конечно! Вы можете легко подключить ссылки на сторонние платформы записи или оплаты к кнопкам.'
        },
        {
          q: 'Что такое Talkinbio Discover?',
          a: 'Это общий каталог профилей, услуг и товаров пользователей Talkinbio, созданный для поиска экспертов.'
        },
        {
          q: 'Где я могу поделиться ссылкой?',
          a: 'В био-ссылке, автоответах Instagram DM, TikTok, LinkedIn, YouTube или печатных QR-кодах.'
        }
      ]
    },
    footer: {
      desc: 'Создайте интерактивную страницу, делитесь контентом, растите бизнес.',
      newsletterTitle: 'Будьте в курсе событий',
      newsletterPlaceholder: 'Введите адрес эл. почты',
      rights: '© 2026 talkinbio. Все права защищены.',
      cols: {
        products: { title: 'Продукты', links: ['Конструктор страниц', 'Приложения', 'Шаблоны', 'Тарифы'] },
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
                    href="https://talkinbio.com/talkinbio" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 text-sm font-bold text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors group"
                  >
                    <span className="w-12 h-12 rounded-full bg-white border border-[var(--border)] flex items-center justify-center text-[var(--coral)] shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:border-[var(--coral)]">
                      <svg width="12" height="14" viewBox="0 0 10 12" fill="currentColor" className="ml-1">
                        <path d="M1.5 1.634a1 1 0 011.5-.866l5.5 3.175a1 1 0 010 1.732l-5.5 3.175a1 1 0 01-1.5-.866V1.634z"/>
                      </svg>
                    </span>
                    <span className="flex flex-col items-start leading-snug">
                      <span className="text-[15px] font-extrabold tracking-tight text-[var(--ink)] group-hover:text-[var(--coral)] transition-colors">{copy.hero.playDemo}</span>
                      <span className="text-xs text-[var(--ink-soft)] font-mono font-medium mt-0.5">talkinbio.com/talkinbio</span>
                    </span>
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

        {/* Section 4: Apps Teaser Section */}
        <section id="uygulamalar" className="apps-section">
          <div className="wrap">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
              <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-28">
                <h2 className="font-extrabold text-[var(--ink)] leading-tight">{copy.apps.title}</h2>
                <p className="sub text-[var(--ink-soft)] leading-relaxed">{copy.apps.subtitle}</p>
                <div className="pt-4">
                  <Link href="/register" className="btn btn-coral" style={{ background: '#E85B4E' }}>
                    {copy.apps.cta}
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-8">
                <div className="app-card-grid">
                  {copy.apps.list.map((app: any, idx: number) => (
                    <div key={idx} className="app-item-card">
                      <div className={`app-icon-box bg-app-${app.icon}`}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          {app.icon === 'pencil' && <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z"/>}
                          {app.icon === 'calendar' && (
                            <>
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                              <line x1="16" y1="2" x2="16" y2="6"/>
                              <line x1="8" y1="2" x2="8" y2="6"/>
                              <line x1="3" y1="10" x2="21" y2="10"/>
                            </>
                          )}
                          {app.icon === 'survey' && (
                            <>
                              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                              <polyline points="14 2 14 8 20 8"/>
                              <line x1="16" y1="13" x2="8" y2="13"/>
                              <line x1="16" y1="17" x2="8" y2="17"/>
                              <polyline points="10 9 9 9 8 9"/>
                            </>
                          )}
                          {app.icon === 'waitlist' && (
                            <>
                              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                              <circle cx="9" cy="7" r="4"/>
                              <path d="M23 21v-2a4 4 0 00-3-3.87"/>
                              <path d="M16 3.13a4 4 0 010 7.75"/>
                            </>
                          )}
                          {app.icon === 'mailing' && (
                            <>
                              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                              <polyline points="22,6 12,13 2,6"/>
                            </>
                          )}
                          {app.icon === 'integrations' && (
                            <>
                              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                            </>
                          )}
                        </svg>
                      </div>
                      <h4>{app.title}</h4>
                      <p>{app.desc}</p>
                      <Link href="/register" className="tiny-link">
                        {locale === 'tr' ? 'Detayları gör' : locale === 'ru' ? 'Подробнее' : 'See details'} →
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: Split Row Card Panels (Share & Stats) */}
        <section className="split-row-section">
          <div className="wrap">
            <div className="split-container">
              {/* Left card: Her yerde paylaş */}
              <div className="split-card bg-white">
                <div>
                  <h2>{copy.splitShare.title}</h2>
                  <p className="card-desc">{copy.splitShare.desc}</p>
                  
                  {/* Social Circles Row */}
                  <div className="flex gap-4 items-center my-6">
                    <span className="w-11 h-11 rounded-full bg-[#FFEAE6] text-[#EA5E3E] flex items-center justify-center font-bold">
                      <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.79.073 7.151.014 8.43 0 8.839 0 12s.014 3.77.072 5.049c.2 4.363 2.615 6.88 6.975 7.08 1.28.058 1.688.072 4.953.072s3.673-.014 4.953-.072c4.354-.2 6.782-2.718 6.975-7.08.058-1.28.072-1.687.072-5.049s-.014-3.77-.072-5.049c-.2-4.364-2.615-6.88-6.975-7.08C15.673.014 15.264 0 12 0z"/></svg>
                    </span>
                    <span className="w-11 h-11 rounded-full bg-[#E5F7FF] text-[#3498DB] flex items-center justify-center font-bold">
                      <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12.29 14.298a1.29 1.29 0 010-1.824l1.37-1.37a4.93 4.93 0 00-.03-.13 1.29 1.29 0 011.854-1.69 1.34 1.34 0 01.127.15l.39-.391a1.29 1.29 0 011.825 0 1.29 1.29 0 010 1.824l-3.321 3.322a1.29 1.29 0 01-1.825 0l-.39-.391zM24 12c0 6.627-5.373 12-12 12S0 19.627 0 12 5.373 0 12 0s12 5.373 12 12zm-3.5 0a8.5 8.5 0 10-17 0 8.5 8.5 0 0017 0z"/></svg>
                    </span>
                    <span className="w-11 h-11 rounded-full bg-[#E8F8F2] text-[#23A470] flex items-center justify-center font-bold">
                      <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.248 8.477 3.517 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.739-1.45L0 24zm6.59-4.846c1.666.988 3.313 1.477 5.318 1.478 5.4 0 9.795-4.39 9.798-9.789.002-2.615-1.012-5.074-2.861-6.927C17.052 2.062 14.595 1.045 12 1.044c-5.402 0-9.798 4.392-9.802 9.791-.001 2.023.52 3.655 1.517 5.197L2.73 19.65l3.917-1.026z"/></svg>
                    </span>

                    {/* QR Code Icon Graphic */}
                    <div className="ml-auto w-16 h-16 border border-[var(--border)] rounded-xl p-2 bg-[var(--paper)]">
                      <svg width="100%" height="100%" viewBox="0 0 44 44" fill="currentColor" className="text-[var(--ink)]">
                        <path d="M2 2h12v12H2V2zm2 2v8h8V4H4zm1.5 1.5h5v5h-5v-5zM2 30h12v12H2V30zm2 2v8h8V4h-8v28zm1.5 1.5h5v5h-5v-5zM30 2h12v12H30V2zm2 2v8h8V4H4h-8V4zm1.5 1.5h5v5h-5v-5zm3.5 12.5h2v2h-2zm-6 2h2v2h-2zm4 2h2v2H30v-2zm2 2h2v2h-2zm2-4h2v2h-2zm4 4h2v2h-2zm-6 2h2v2h-2zm4-6h2v2h-2zm-12 10h2v2h-2zm2 2h2v2h-2zm2-2h2v2h-2zm2 2h2v2h-2zm-8 4h2v2h-2zm4 0h2v2h-2zm4-4h2v2h-2zm2 4h2v2h-2z"/>
                      </svg>
                    </div>
                  </div>
                </div>
                
                <div className="pt-2">
                  <Link href="/register" className="btn btn-coral" style={{ background: '#E85B4E', width: '100%' }}>
                    {copy.splitShare.cta}
                  </Link>
                </div>
              </div>

              {/* Right card: Ziyaretçilerini tanı */}
              <div className="split-card bg-white">
                <div>
                  <h2>{copy.splitStats.title}</h2>
                  
                  {/* Stats Grid mockup */}
                  <div className="stats-mockup-grid">
                    {/* Stat 1 */}
                    <div className="stat-box">
                      <span className="stat-box-title">{copy.splitStats.labels.visits}</span>
                      <div className="stat-box-val-row">
                        <span className="stat-box-val">24.8K</span>
                        <span className="stat-box-badge badge-red">-3%</span>
                      </div>
                      {/* Mini Sparkline Chart */}
                      <svg className="w-full h-8 mt-2" viewBox="0 0 100 30">
                        <path className="sparkline-path stroke-red-500" d="M0,25 Q15,10 30,18 T60,5 T90,22 T100,20" stroke="#EF4444" />
                      </svg>
                    </div>
                    {/* Stat 2 */}
                    <div className="stat-box">
                      <span className="stat-box-title">{copy.splitStats.labels.clicks}</span>
                      <div className="stat-box-val-row">
                        <span className="stat-box-val">18.6K</span>
                        <span className="stat-box-badge badge-green">+9%</span>
                      </div>
                      <svg className="w-full h-8 mt-2" viewBox="0 0 100 30">
                        <path className="sparkline-path stroke-green-500" d="M0,20 Q15,25 30,15 T60,25 T90,8 T100,5" stroke="#10B981" />
                      </svg>
                    </div>
                    {/* Stat 3 */}
                    <div className="stat-box">
                      <span className="stat-box-title">{copy.splitStats.labels.leads}</span>
                      <div className="stat-box-val-row">
                        <span className="stat-box-val">312</span>
                        <span className="stat-box-badge badge-green">+16%</span>
                      </div>
                      <svg className="w-full h-8 mt-2" viewBox="0 0 100 30">
                        <path className="sparkline-path stroke-green-500" d="M0,22 Q15,12 30,18 T60,10 T90,5 T100,2" stroke="#10B981" />
                      </svg>
                    </div>
                    {/* Stat 4 */}
                    <div className="stat-box">
                      <span className="stat-box-title">{copy.splitStats.labels.sales}</span>
                      <div className="stat-box-val-row">
                        <span className="stat-box-val">128</span>
                        <span className="stat-box-badge badge-green">+22%</span>
                      </div>
                      <svg className="w-full h-8 mt-2" viewBox="0 0 100 30">
                        <path className="sparkline-path stroke-green-500" d="M0,28 Q15,22 30,25 T60,12 T90,6 T100,2" stroke="#10B981" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Link href="/register" className="btn btn-coral" style={{ background: '#E85B4E', width: '100%' }}>
                    {copy.splitStats.cta}
                  </Link>
                </div>
              </div>
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

                  {/* App store quick teaser row */}
                  <div className="border-t border-[var(--border)] pt-4 mt-2">
                    <p className="text-[11px] font-bold uppercase text-[var(--muted)] mb-2">{copy.splitFree.teaserTitle}</p>
                    <p className="text-[12px] text-[var(--ink-soft)] mb-3 leading-normal">{copy.splitFree.teaserDesc}</p>
                    <div className="flex gap-2 items-center flex-wrap">
                      <span className="w-8 h-8 rounded-lg bg-app-pencil flex items-center justify-center text-xs font-bold">✎</span>
                      <span className="w-8 h-8 rounded-lg bg-app-mailing flex items-center justify-center text-xs font-bold">✉</span>
                      <span className="w-8 h-8 rounded-lg bg-app-calendar flex items-center justify-center text-xs font-bold">📅</span>
                      <span className="w-8 h-8 rounded-lg bg-app-survey flex items-center justify-center text-xs font-bold">📝</span>
                      <span className="w-8 h-8 rounded-lg bg-app-waitlist flex items-center justify-center text-xs font-bold">👥</span>
                      <span className="w-8 h-8 rounded-lg border border-dashed border-[var(--muted)] flex items-center justify-center text-xs font-bold text-[var(--muted)]">+</span>
                    </div>
                  </div>
                </div>

                {/* Coming soon teaser banner */}
                <div className="mt-6 p-4 rounded-xl border border-dashed border-[rgba(232,91,78,0.25)] bg-[var(--coral-tint)] flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[var(--coral)] shadow-sm">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                  </div>
                  <span className="text-[11px] font-bold text-[#E85B4E] leading-normal">{copy.splitFree.badgeText}</span>
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
                {copy.faq.items.slice(0, 4).map((item: any, idx: number) => (
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
                {copy.faq.items.slice(4, 8).map((item: any, idx: number) => (
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
                  <Link key={i} href="/register">{link}</Link>
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
