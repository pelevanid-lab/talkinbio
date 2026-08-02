import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { Link } from '@/i18n/routing';
import LandingHeroTabs from '@/components/LandingHeroTabs';
import ShowcaseSection from '@/components/ShowcaseSection';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import MobileMenu from '@/components/MobileMenu';
import InstagramDMSection from '@/components/InstagramDMSection';
import { EXTRA_PACK, PLANS } from '@/config/plans';
import { isConversationActive } from '@/utils/conversationWindow';
import './landing.css';

type Locale = 'tr' | 'en' | 'ru';

const landingCopy = {
  tr: {
    nav: { pricing: 'Fiyatlandırma', login: 'Giriş Yap' },
    hero: {
      // v1: Coşkulu ve modern
      kicker: 'Stop linking. Start talking.',
      title: 'Sayfanız her ziyaretçi için değişir.',
      subtitle:
        'Bio linkiniz statik bir liste değildir. Ziyaretçi soru sorduğunda o sorunun cevabı olan yeri açılır. Saule gerekli bilgiyi verir, ilgilenen müşteri not alınır - hiçbir zaman yanlış yere yönlendirilmez.',
      // v2 (merak uyandıran): title: 'Ziyaretçi ne sorarsa, orası açılsın.', subtitle: 'Bio linkiniz tek başına bir sayfaya dönüşmek yerine, her sorunun cevabını bilir. Müşteri "Fiyatlar nedir?" diye sorduğunda fiyat bölümü açılır. "Nasıl ulaşırım?" diye sorduğunda iletişim akışı başlar. Saule konuşur, sen cevapla - sistem yönlendirir.',
      primary: 'Örneği dene',
      pricing: 'Fiyatları gör',
      dashboard: 'Panel',
    },
    statement:
      'Bio linkiniz artık statik bir liste değil. Hizmetlerinizi, paketlerinizi, iletişim kanallarınızı ve arka plan bilgilerinizi ziyaretçinin niyetine göre açılan tek bir web deneyiminde toplar.',
    how: {
      title: 'Soru geldiğinde sayfa doğru yerden açılır.',
      items: [
        {
          title: 'Sayfanı kur',
          body: 'Instagram’dan al, toplu metin ekle veya ince ayardan düzenle. Talkinbio ilk sayfa bölümlerini ve Saule bilgisini hazırlar.',
        },
        {
          title: 'Ziyaretçi sorar',
          body: '“Paketler neler?”, “Online danışmanlık nasıl işliyor?”, “Nasıl ulaşırım?” gibi sorular sayfanın yönünü belirler.',
        },
        {
          title: 'İlgili bölüm açılır',
          body: 'Saule uzun uzun anlatmak yerine önce doğru bölümü açar. Bilgi sayfada yoksa kısa yazılı cevap verir veya iletişim akışına yönlendirir.',
        },
      ],
    },
    dm: {
      title: 'Instagram DM sorularını sayfanıza taşıyın.',
      body: 'Sık gelen sorular için Instagram\'da otomatik cevap koyun. Müşteri linke tıkladığında Talkinbio sayfanıza gelir; Saule ilgili bölümü açar, gerekiyorsa bilgi verir veya talep toplar.',
      kicker: 'Adım adım: DM\'deki soruları Talkinbio\'ya yönlendirin',
      linkCopyLabel: 'Linki Kopyala',
      exampleLink: 'talkinbio.com/seninsayfa',
      howLabel: 'Kurulum adımları',
      automationSteps: [
        'Instagram uygulamasında profilinize gidin, sağ üst köşedeki "İşletme araçları ve denetimler" seçeneğini açın.',
        '"Otomatik yanıtlar" → "Anında yanıt" seçeneğini etkinleştirin.',
        'Mesaj metinine Talkinbio sayfanızın linkini yazın (talkinbio.com/seninsayfa gibi).',
        'Değişiklikleri kaydedin — artık size gelen tüm DM\'lere otomatik olarak bu cevap gidecek.',
      ],
      note: 'Not: Anında yanıt özelliği sadece Profesyonel veya İşletme Instagram hesaplarında kullanılabilir.',
      readyLabel: 'Otomatik cevap örneği',
      steps: ['Instagram DM sor', 'Otomatik cevap gönder', 'Talkinbio linkini aç', 'İlgili bölümü göster', 'Lead topla'],
      exampleQuestion: 'Paketler nedir?',
      exampleReply: 'Tüm paketleri burada görebilirsin: talkinbio.com/seninsayfa?open=paketler',
    },
    website: {
      title: 'Bio link değil, küçük bir web sitesi.',
      cards: [
        ['Blok değil bölüm', 'Her kart açıldığında detaylı bir sayfa sahnesine dönüşebilir.'],
        ['Cevap değil yönlendirme', 'Ziyaretçi cevabın olduğu yere görsel olarak götürülür.'],
        ['Lead ya da iletişim', 'Lead yakalama açıksa talep alınır; kapalıysa seçtiğiniz kanala yönlendirilir.'],
        ['Hazır ses cue’ları', 'Dinamik TTS yerine onaylı kısa Saule sesleri çalınır.'],
      ],
    },
    visual: {
      title: 'Sayfanız markanız gibi görünür.',
      body: 'Vurgu rengi, gradyan arka plan, blok stilleri, detay sayfaları ve post araçları aynı görsel dilden beslenir.',
      items: ['Premium blok kartları', 'Açılan detay sahneleri', 'Post ve hareketli medya araçları'],
      sectionLabel: 'Bölüm',
      demoLabels: ['Paketler', 'Online danışmanlık', 'İletişim'],
    },
    saule: {
      title: 'Saule, sayfanızın yönlendiren zekası.',
      body: 'Saule her soruya uzun cevap yazmaya çalışmaz. Önce sayfada doğru yeri bulur. Bilgi sayfada yoksa bilgi tabanından kısa yanıt verir; lead açıksa talep toplar, kapalıysa seçtiğiniz iletişim kanalına yönlendirir.',
      items: ['Doğru bölümü açar', 'Bilgi tabanından kısa yanıt verir', 'Lead veya iletişim kanalına yönlendirir', 'Hazır ses cue’larını oynatır'],
    },
    setup: {
      title: 'Kurulum üç yoldan başlar.',
      items: [
        ['Instagram’dan Al', 'Profilinizdeki görünür bilgileri okuyup ilk sayfa taslağını çıkarır.'],
        ['Toplu Metin', 'Hazır metninizi bloklara ve Saule bilgisinin kullanabileceği net notlara dönüştürür.'],
        ['İnce Ayar', 'İçerik, tasarım, iletişim, yayın ve Saule ayarlarını elle düzenlersiniz.'],
      ],
    },
    pricing: {
      title: 'Abonelik değil, kredi.',
      body: 'Krediler yalnızca gerçek işlem olduğunda düşer. Basit yönlendirmeler ve hazır ses cue’ları runtime’da ekstra TTS maliyeti üretmez.',
      cta: 'Tüm fiyatları gör',
      extra: 'Ek kredi',
      credit: 'kredi',
    },
    faq: {
      title: 'Kısa cevaplar',
      items: [
        ['Talkinbio Linktree gibi mi?', 'Hayır. Link listesi değil; bölümleri açılan ve Saule ile yönlenen bir web sayfası.'],
        ['Saule her cevabı AI ile mi üretir?', 'Hayır. Önce sayfada doğru bölüm açılır; bilgi gerekiyorsa bilgi tabanı ve kısa yanıt kullanılır.'],
        ['Sesli cevaplar nasıl çalışır?', 'Dinamik TTS yerine onaylanmış hazır Saule ses cue’ları oynatılır. Mikrofon açıksa ziyaretçinin sorusu arka planda yazıya çevrilir.'],
        ['Lead yakalama kapalıysa ne olur?', 'Saule bilgi istemez, sizin seçtiğiniz WhatsApp, Instagram, Telegram veya e-posta kanalına yönlendirir.'],
      ],
    },
    final: {
      title: 'Bio linkinizi konuşan bir web sayfasına çevirin.',
      body: 'Ziyaretçiniz soru sorduğunda cevabın olduğu yer açılsın.',
      cta: 'Sayfanı oluştur',
    },
    footer: { privacy: 'KVKK & Gizlilik', brandLink: 'talkinbio.com/sen', rights: '© 2026 talkinbio. Tüm hakları saklıdır.' },
  },
  en: {
    nav: { pricing: 'Pricing', login: 'Log in' },
    hero: {
      kicker: 'Stop linking. Start talking.',
      title: 'Your page transforms for every visitor.',
      subtitle:
        'Your bio link is not a static list - it\'s intelligent. When a visitor asks, the answer opens. Saule provides context, interested customers are captured, and no one ever lands on the wrong page.',
      primary: 'Try the example',
      pricing: 'See pricing',
      dashboard: 'Panel',
    },
    statement:
      'Your bio link is no longer a static list. It brings your services, packages, contact channels and background knowledge into one web experience that opens based on visitor intent.',
    how: {
      title: 'When a question arrives, the page opens from the right place.',
      items: [
        { title: 'Build your page', body: 'Import Instagram, paste bulk text or fine tune manually. Talkinbio prepares page sections and Saule knowledge.' },
        { title: 'The visitor asks', body: 'Questions like “What are the packages?”, “How does online consulting work?” and “How can I reach you?” decide the direction.' },
        { title: 'The right section opens', body: 'Saule opens the relevant section first. If the answer is not on the page, it gives a short written response or routes to contact.' },
      ],
    },
    dm: {
      title: 'Move Instagram DM questions to your page.',
      body: 'Set up an automatic reply in Instagram DMs. When a customer clicks the link, they land on your Talkinbio page; Saule opens the relevant section, answers questions, or collects leads.',
      kicker: 'Step by step: Route DM questions to Talkinbio',
      linkCopyLabel: 'Copy Link',
      exampleLink: 'talkinbio.com/yourpage',
      howLabel: 'Setup steps',
      automationSteps: [
        'In the Instagram app, go to your profile and open "Business tools and settings" in the top right corner.',
        'Go to "Automatic Replies" → "Instant Reply" and turn it on with a custom message.',
        'Add your Talkinbio page link to the message (like talkinbio.com/yourpage).',
        'Save your changes — everyone who DMs you will now automatically receive this reply.',
      ],
      note: 'Note: Instant reply is only available for Professional or Business Instagram accounts.',
      readyLabel: 'Automatic reply example',
      steps: ['Instagram DM asked', 'Auto reply sent', 'Talkinbio link opens', 'Show relevant section', 'Collect lead'],
      exampleQuestion: 'What are your packages?',
      exampleReply: 'See all packages here: talkinbio.com/yourpage?open=packages',
    },
    website: {
      title: 'Not a bio link. A small website.',
      cards: [
        ['Not just blocks', 'Every card can open into a richer detail page.'],
        ['Not just answers', 'Visitors are visually taken to the place where the answer lives.'],
        ['Lead or contact', 'Collect a request when lead capture is on, or route to your selected contact channel.'],
        ['Ready voice cues', 'Approved short Saule audio cues play instead of dynamic TTS.'],
      ],
    },
    visual: {
      title: 'Your page looks like your brand.',
      body: 'Accent color, gradient background, block styles, detail pages and post tools all share the same visual language.',
      items: ['Premium block cards', 'Expanded detail scenes', 'Post and motion tools'],
      sectionLabel: 'Section',
      demoLabels: ['Packages', 'Online consulting', 'Contact'],
    },
    saule: {
      title: 'Saule is the routing intelligence of your page.',
      body: 'Saule does not try to write long answers to everything. It finds the right place on the page first. If the information is not visible, it uses the knowledge base for a short answer; then collects a lead or routes to your contact channel.',
      items: ['Opens the right section', 'Answers from the knowledge base', 'Routes to lead or contact', 'Plays ready voice cues'],
    },
    setup: {
      title: 'Setup starts in three ways.',
      items: [
        ['Import Instagram', 'Reads visible profile information and drafts the first page.'],
        ['Bulk Text', 'Turns prepared text into blocks and clear notes Saule can use.'],
        ['Fine Tune', 'Edit content, design, contact, publishing and Saule settings manually.'],
      ],
    },
    pricing: {
      title: 'Credits, not subscriptions.',
      body: 'Credits are spent only when real work happens. Simple routing and ready voice cues do not create extra dynamic TTS cost at runtime.',
      cta: 'See all pricing',
      extra: 'Extra credits',
      credit: 'credits',
    },
    faq: {
      title: 'Short answers',
      items: [
        ['Is Talkinbio like Linktree?', 'No. It is not a link list; it is a website with sections that open and route visitors with Saule.'],
        ['Does Saule use AI for every answer?', 'No. It opens the right page section first; when needed, it uses knowledge notes and short answers.'],
        ['How do voice replies work?', 'Approved Saule voice cues play instead of dynamic TTS. If microphone is enabled, the visitor question is transcribed in the background.'],
        ['What if lead capture is off?', 'Saule does not ask for contact info; it routes to your selected WhatsApp, Instagram, Telegram or email channel.'],
      ],
    },
    final: {
      title: 'Turn your bio link into a talking website.',
      body: 'When visitors ask, open the place where the answer lives.',
      cta: 'Create your page',
    },
    footer: { privacy: 'Privacy', brandLink: 'talkinbio.com/you', rights: '© 2026 talkinbio. All rights reserved.' },
  },
  ru: {
    nav: { pricing: 'Тарифы', login: 'Войти' },
    hero: {
      kicker: 'Stop linking. Start talking.',
      title: 'Ваша страница живая - она слышит и отвечает.',
      subtitle:
        'Bio-ссылка это не статичный список. Когда посетитель спрашивает, открывается ответ. Saule предоставляет контекст, заинтересованный клиент фиксируется, и никто не теряется на неправильной странице.',
      primary: 'Попробовать пример',
      pricing: 'Смотреть цены',
      dashboard: 'Панель',
    },
    statement:
      'Ваша bio-ссылка больше не статичный список. Услуги, пакеты, контакты и дополнительные знания собираются в один сайт, который открывается под намерение посетителя.',
    how: {
      title: 'Когда приходит вопрос, страница открывается с нужного места.',
      items: [
        { title: 'Создайте страницу', body: 'Импортируйте Instagram, вставьте текст или настройте вручную. Talkinbio подготовит разделы и знания для Saule.' },
        { title: 'Посетитель спрашивает', body: 'Вопросы про пакеты, онлайн-консультацию или контакт определяют, какой раздел открыть.' },
        { title: 'Открывается нужный раздел', body: 'Saule сначала открывает правильный раздел. Если информации нет на странице, даёт короткий ответ или ведёт к контакту.' },
      ],
    },
    dm: {
      title: 'Переведите вопросы из Instagram DM на вашу страницу.',
      body: 'Настройте автоматический ответ в Instagram DM. Клиент кликает на ссылку, попадает на вашу страницу Talkinbio; Saule открывает нужный раздел, отвечает на вопросы или собирает заявки.',
      kicker: 'Пошагово: маршрутизируйте DM-вопросы в Talkinbio',
      linkCopyLabel: 'Скопировать ссылку',
      exampleLink: 'talkinbio.com/vasastranitsa',
      howLabel: 'Этапы настройки',
      automationSteps: [
        'В приложении Instagram откройте профиль и нажмите "Инструменты для бизнеса и настройки" в правом верхнем углу.',
        'Перейдите в "Автоматические ответы" → "Мгновенный ответ" и включите его с вашим сообщением.',
        'Добавьте в сообщение ссылку на вашу страницу Talkinbio (например, talkinbio.com/vasastranitsa).',
        'Сохраните изменения — теперь все, кто напишет вам в DM, получат этот ответ автоматически.',
      ],
      note: 'Примечание: функция мгновенного ответа доступна только для профессиональных и бизнес-аккаунтов Instagram.',
      readyLabel: 'Пример автоответа',
      steps: ['DM-вопрос', 'Автоответ отправлен', 'Ссылка Talkinbio', 'Показать раздел', 'Собрать заявку'],
      exampleQuestion: 'Какие у вас пакеты?',
      exampleReply: 'Все пакеты здесь: talkinbio.com/vasastranitsa?open=packages',
    },
    website: {
      title: 'Не bio-ссылка, а небольшой сайт.',
      cards: [
        ['Не просто блоки', 'Каждая карточка может открываться как детальная страница.'],
        ['Не просто ответы', 'Посетитель визуально попадает туда, где находится ответ.'],
        ['Заявка или контакт', 'Собирайте заявку или направляйте в выбранный канал связи.'],
        ['Готовые голосовые cue', 'Вместо динамического TTS звучат утверждённые короткие аудио Saule.'],
      ],
    },
    visual: {
      title: 'Страница выглядит как ваш бренд.',
      body: 'Акцентный цвет, градиентный фон, карточки, детальные страницы и post-инструменты работают в одном визуальном языке.',
      items: ['Премиальные карточки', 'Детальные сцены', 'Post и motion инструменты'],
      sectionLabel: 'Раздел',
      demoLabels: ['Пакеты', 'Онлайн-консультация', 'Контакт'],
    },
    saule: {
      title: 'Saule — интеллект маршрутизации вашей страницы.',
      body: 'Saule не пытается писать длинный ответ на всё. Сначала находит нужное место на странице. Если информации нет, использует базу знаний, затем собирает заявку или направляет в контактный канал.',
      items: ['Открывает нужный раздел', 'Отвечает из базы знаний', 'Ведёт к заявке или контакту', 'Воспроизводит готовые voice cue'],
    },
    setup: {
      title: 'Настройка начинается тремя способами.',
      items: [
        ['Импорт Instagram', 'Считывает видимую информацию профиля и создаёт первый черновик.'],
        ['Bulk Text', 'Преобразует готовый текст в блоки и заметки для Saule.'],
        ['Fine Tune', 'Ручная настройка контента, дизайна, контактов, публикации и Saule.'],
      ],
    },
    pricing: {
      title: 'Кредиты, не подписка.',
      body: 'Кредиты списываются только за реальные операции. Простая маршрутизация и готовые voice cue не создают дополнительной TTS-стоимости.',
      cta: 'Смотреть все цены',
      extra: 'Доп. кредиты',
      credit: 'кредитов',
    },
    faq: {
      title: 'Короткие ответы',
      items: [
        ['Talkinbio похож на Linktree?', 'Нет. Это не список ссылок, а сайт с разделами, которые открываются и направляют посетителя через Saule.'],
        ['Saule использует AI для каждого ответа?', 'Нет. Сначала открывается нужный раздел; при необходимости используются база знаний и короткий ответ.'],
        ['Как работает голос?', 'Воспроизводятся утверждённые Saule voice cue вместо динамического TTS. При включённом микрофоне вопрос транскрибируется в фоне.'],
        ['Что если сбор лидов выключен?', 'Saule не просит контактные данные, а ведёт в выбранный WhatsApp, Instagram, Telegram или email.'],
      ],
    },
    final: {
      title: 'Превратите bio-ссылку в говорящий сайт.',
      body: 'Когда посетитель спрашивает, открывается место с ответом.',
      cta: 'Создать страницу',
    },
    footer: { privacy: 'Privacy', brandLink: 'talkinbio.com/you', rights: '© 2026 talkinbio. All rights reserved.' },
  },
} satisfies Record<Locale, any>;

const LogoSVG = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="130 15 350 135" width="160" height="60" role="img" aria-labelledby="logoTitle">
    <title id="logoTitle">Talkinbio</title>
    <defs>
      <style>{`.word { font-family: 'Bricolage Grotesque', 'Arial Black', sans-serif; font-weight: 800; }`}</style>
    </defs>
    <text x="130" y="102" className="word" fontSize="64" fill="#14231F">talkinbio</text>
    <circle cx="152" cy="118" r="5.5" fill="#14231F" />
    <circle cx="174" cy="118" r="5.5" fill="#14231F" />
    <circle cx="196" cy="118" r="5.5" fill="#14231F" />
  </svg>
);

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = (['tr', 'en', 'ru'].includes(rawLocale) ? rawLocale : 'tr') as Locale;
  const copy = landingCopy[locale];
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  const demoBusinessId = process.env.TALKINBIO_BUSINESS_ID || null;
  let demoInitialMessages: any[] = [];
  let demoBlocks: any[] = [];
  let demoTheme: any = null;
  if (demoBusinessId) {
    try {
      const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
      const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const [{ data: blocks }, { data: business }] = await Promise.all([
        supabaseAdmin.from('blocks').select('*').eq('business_id', demoBusinessId).eq('is_visible', true).order('order', { ascending: true }),
        supabaseAdmin.from('businesses').select('theme').eq('id', demoBusinessId).single(),
      ]);
      demoBlocks = blocks || [];
      demoTheme = business?.theme || null;

      const cookieStore = await cookies();
      const visitorSessionId = cookieStore.get('visitor_session_id')?.value;
      if (visitorSessionId) {
        const { data: conv } = await supabaseAdmin
          .from('conversations')
          .select('last_message_at, created_at, messages(id, role, content, created_at)')
          .eq('business_id', demoBusinessId)
          .eq('visitor_session_id', visitorSessionId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const isActive = conv && isConversationActive(conv.last_message_at, conv.created_at);
        if (isActive && conv?.messages) {
          demoInitialMessages = conv.messages
            .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            .map((m: any) => ({ id: m.id, role: m.role, content: m.content }));
        }
      }
    } catch (err) {
      console.error('Failed to load landing demo messages', err);
    }
  }

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
      {
        '@type': 'SoftwareApplication',
        '@id': 'https://talkinbio.com/#software',
        name: 'Talkinbio',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Any',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        description: copy.hero.subtitle,
        url: 'https://talkinbio.com/',
      },
    ],
  };

  return (
    <div id="landing-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header>
        <div className="wrap nav">
          <Link href="/">
            <LogoSVG />
          </Link>
          <div className="hidden md:flex items-center gap-5">
            <LanguageSwitcher />
            <Link href="/pricing" className="btn btn-ghost" style={{ padding: '0.6rem 1rem', fontSize: '0.9rem' }}>
              {copy.nav.pricing}
            </Link>
            {isLoggedIn ? (
              <Link href="/dashboard/editor" className="btn btn-primary nav-cta">
                {copy.hero.dashboard}
              </Link>
            ) : (
              <Link href="/login" className="btn btn-primary nav-cta" style={{ padding: '0.6rem 1rem', fontSize: '0.9rem' }}>
                {copy.nav.login}
              </Link>
            )}
          </div>
          <MobileMenu isLoggedIn={isLoggedIn} texts={{ pricing: copy.nav.pricing, login: copy.nav.login }} />
        </div>
      </header>

      <main>
        <section className="hero relative">
          <div className="wrap">
            <div className="max-w-[860px] mb-12 relative z-10">
              <p className="mono text-sm text-[var(--teal-deep)] mb-5">{copy.hero.kicker}</p>
              <h1 className="animate-fade-up" style={{ fontSize: 'clamp(48px, 7vw, 86px)', lineHeight: '1.02' }}>
                {copy.hero.title}
              </h1>
              <p className="sub animate-fade-up delay-100 text-xl md:text-2xl text-[var(--ink-soft)] mt-6 mb-8 leading-relaxed max-w-[760px]">
                {copy.hero.subtitle}
              </p>
              <div className="hero-ctas animate-fade-up delay-200 flex flex-wrap gap-4">
                <a href="#demo" className="btn btn-primary" style={{ padding: '16px 32px', fontSize: '17px' }}>
                  {copy.hero.primary}
                </a>
                <Link href="/pricing" className="btn btn-ghost bg-white" style={{ padding: '16px 32px', fontSize: '17px' }}>
                  {copy.hero.pricing}
                </Link>
              </div>
            </div>

            <div id="demo" className="animate-fade-up delay-300 relative z-10 scroll-mt-28">
              <LandingHeroTabs
                copy={{ pageTab: locale === 'tr' ? 'Sayfanız' : locale === 'ru' ? 'Ваша страница' : 'Your Page', setupTab: locale === 'tr' ? 'Kolay Kurulum' : locale === 'ru' ? 'Быстрый запуск' : 'Easy Setup' }}
                demoBusinessId={demoBusinessId}
                locale={locale}
                demoInitialMessages={demoInitialMessages}
                demoBlocks={demoBlocks}
                demoTheme={demoTheme}
                setupHref={isLoggedIn ? '/dashboard/editor?mode=instagram' : '/login'}
              />
            </div>
          </div>
        </section>

        <div className="wrap">
          <div className="statement">
            <p>{copy.statement}</p>
          </div>
        </div>

        <section id="nasil-calisir" className="py-20 md:py-28 bg-[var(--paper)] border-t border-[var(--border)]">
          <div className="wrap">
            <h2 className="text-3xl md:text-5xl font-bold text-[var(--ink)] mb-10 max-w-3xl">{copy.how.title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {copy.how.items.map((item: any, index: number) => (
                <div key={item.title} className="bg-white border border-[var(--border)] rounded-[28px] p-7 shadow-sm">
                  <div className="w-11 h-11 rounded-full bg-[var(--ink)] text-white flex items-center justify-center font-bold mb-6">{index + 1}</div>
                  <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
                  <p className="text-[var(--ink-soft)] leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <InstagramDMSection copy={copy.dm} />

        <section className="py-20 md:py-28 bg-[var(--paper)] border-t border-[var(--border)]">
          <div className="wrap">
            <h2 className="text-3xl md:text-5xl font-bold text-[var(--ink)] mb-10">{copy.website.title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {copy.website.cards.map((card: string[]) => {
                const [title, body] = card;
                return (
                <div key={title} className="bg-white border border-[var(--border)] rounded-[24px] p-6 shadow-sm">
                  <h3 className="text-xl font-bold mb-3">{title}</h3>
                  <p className="text-[var(--ink-soft)] leading-relaxed">{body}</p>
                </div>
                );
              })}
            </div>
          </div>
        </section>

        <ShowcaseSection locale={locale} />

        <section className="py-20 md:py-28 bg-[var(--paper)] border-t border-[var(--border)]">
          <div className="wrap grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-3xl md:text-5xl font-bold text-[var(--ink)] mb-5">{copy.visual.title}</h2>
              <p className="text-lg text-[var(--ink-soft)] leading-relaxed mb-8">{copy.visual.body}</p>
              <div className="flex flex-wrap gap-3">
                {copy.visual.items.map((item: string) => (
                  <span key={item} className="px-4 py-2 rounded-full bg-white border border-[var(--border)] text-sm font-bold text-[var(--ink)]">
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-[36px] border border-[var(--border)] p-5 md:p-8 bg-[linear-gradient(135deg,#ffffff_0%,#f2fbf8_42%,#fff1ee_100%)] shadow-sm">
              <div className="space-y-4">
                {copy.visual.demoLabels.map((label: string, index: number) => (
                  <div key={label} className="bg-white/90 border border-[rgba(20,35,31,0.10)] rounded-[22px] p-5 flex items-center justify-between shadow-sm">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted)]">{copy.visual.sectionLabel}</p>
                      <p className="text-xl font-bold text-[var(--ink)]">{label}</p>
                    </div>
                    <div className="w-11 h-11 rounded-full bg-[var(--teal-tint)] text-[var(--teal-deep)] flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 md:py-28 bg-white border-t border-[var(--border)]">
          <div className="wrap grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-10">
            <div>
              <h2 className="text-3xl md:text-5xl font-bold text-[var(--ink)] mb-5">{copy.saule.title}</h2>
              <p className="text-lg text-[var(--ink-soft)] leading-relaxed">{copy.saule.body}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {copy.saule.items.map((item: string) => (
                <div key={item} className="rounded-[24px] bg-[var(--paper)] border border-[var(--border)] p-6 font-bold text-[var(--ink)]">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 md:py-28 bg-[var(--paper)] border-t border-[var(--border)]">
          <div className="wrap">
            <h2 className="text-3xl md:text-5xl font-bold text-[var(--ink)] mb-10">{copy.setup.title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {copy.setup.items.map((item: string[]) => {
                const [title, body] = item;
                return (
                <div key={title} className="bg-white border border-[var(--border)] rounded-[28px] p-7 shadow-sm">
                  <h3 className="text-2xl font-bold mb-3">{title}</h3>
                  <p className="text-[var(--ink-soft)] leading-relaxed">{body}</p>
                </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-20 md:py-28 bg-white border-t border-[var(--border)]">
          <div className="wrap">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
              <div>
                <h2 className="text-3xl md:text-5xl font-bold text-[var(--ink)] mb-4">{copy.pricing.title}</h2>
                <p className="text-lg text-[var(--ink-soft)] max-w-2xl">{copy.pricing.body}</p>
              </div>
              <Link href="/pricing" className="btn btn-primary w-fit">{copy.pricing.cta}</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {PLANS.map((plan) => (
                <div key={plan.id} className="rounded-[24px] border border-[var(--border)] bg-[var(--paper)] p-5">
                  <p className="font-bold text-xl text-[var(--ink)]">{plan.name}</p>
                  <p className="text-3xl font-[800] text-[var(--ink)] mt-3">${plan.price}</p>
                  <p className="text-sm font-bold text-[var(--teal-deep)] mt-2">{plan.credits} {copy.pricing.credit}</p>
                </div>
              ))}
              <div className="rounded-[24px] border border-dashed border-[var(--muted)] bg-white p-5">
                <p className="font-bold text-xl text-[var(--ink)]">{copy.pricing.extra}</p>
                <p className="text-3xl font-[800] text-[var(--ink)] mt-3">${EXTRA_PACK.price}</p>
                <p className="text-sm font-bold text-[var(--teal-deep)] mt-2">{EXTRA_PACK.credits} {copy.pricing.credit}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 md:py-28 bg-[var(--paper)] border-t border-[var(--border)]">
          <div className="wrap">
            <h2 className="text-3xl md:text-5xl font-bold text-[var(--ink)] mb-10">{copy.faq.title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {copy.faq.items.map((item: string[]) => {
                const [question, answer] = item;
                return (
                <div key={question} className="bg-white border border-[var(--border)] rounded-[24px] p-6 shadow-sm">
                  <h3 className="text-xl font-bold mb-3">{question}</h3>
                  <p className="text-[var(--ink-soft)] leading-relaxed">{answer}</p>
                </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-20 md:py-28 bg-[var(--ink)] text-white">
          <div className="wrap text-center max-w-4xl">
            <h2 className="text-4xl md:text-6xl font-bold mb-5">{copy.final.title}</h2>
            <p className="text-white/70 text-xl mb-8">{copy.final.body}</p>
            <Link href={isLoggedIn ? '/dashboard/editor' : '/login'} className="btn" style={{ background: '#fff', color: 'var(--ink)', padding: '14px 28px' }}>
              {copy.final.cta}
            </Link>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <div className="footer-row">
            <LogoSVG />
            <div className="foot-links">
              <Link href="/pricing">{copy.nav.pricing}</Link>
              <Link href="/legal">{copy.footer.privacy}</Link>
            </div>
          </div>
          <div className="footer-bar" style={{ justifyContent: 'center', padding: '0' }}>
            <span>{copy.footer.brandLink}</span>
          </div>
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'var(--font-ibm-plex-mono)' }}>
              {copy.footer.rights} · <a href="mailto:info@talkinbio.com" style={{ color: 'inherit', textDecoration: 'underline' }}>info@talkinbio.com</a>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
