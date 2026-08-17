import type { Metadata } from 'next';
import type { RoutingLocale } from '@/i18n/locales';

type AboutChapter = {
  number: string;
  title: string;
  eyebrow: string;
  paragraphs: string[];
};

type AboutContent = {
  metadata: Pick<Metadata, 'title' | 'description'>;
  back: string;
  curator: string;
  hero: string;
  portraitAlt: string;
  chaptersLabel: string;
  chapters: AboutChapter[];
  compass: string;
  principlesTitle: string;
  principlesLead: string;
  principles: string[];
  footer: string;
};

export const aboutPaths: Record<RoutingLocale, string> = {
  en: '/about',
  tr: '/hakkimda',
  ru: '/about',
};

export const aboutContent: Record<RoutingLocale, AboutContent> = {
  tr: {
    metadata: {
      title: 'Enes Pehlivan | Pazarlama Okumaları',
      description: 'Enes Pehlivan’ın sahadaki sürtünmeden doğan pazarlama hikâyesi.',
    },
    back: 'Pazarlama okumalarına dön',
    curator: 'DERLEYİCİ',
    hero: 'Sahadaki sürtünmeden doğan pazarlama: müşterinin en çıplak gerçeğini dinleyerek, operasyonu optimize ederek ve bunun üzerine marka stratejileri inşa ederek devam eden bir yolculuk.',
    portraitAlt: 'Enes Pehlivan portresi',
    chaptersLabel: 'Kariyer hikâyesi',
    chapters: [
      {
        number: '01',
        title: 'Empatinin Çıraklığı: Değerin Nerede Kırıldığını Görmek',
        eyebrow: 'DHL Yılları',
        paragraphs: [
          'Pek çok pazarlamacı kariyerine ajans sunumlarıyla veya marka planlarıyla başlar. Ben ise pazarlamanın en saf hammaddesiyle başladım: müşterinin hayal kırıklığı ve çözülmeyi bekleyen acısı.',
          'DHL Express’te geçen 9 yıllık serüvenim; gümrük masalarından çağrı merkezine, şikâyet yönetiminden Türkiye’nin dev holdinglerinin kritik lojistik operasyonlarına uzanan bir okul oldu.',
          'Çağrı merkezinde saniyelerle yarışırken ve müşteri şikâyetlerini yönetirken öğrendiğim ilk ilke şuydu: müşteri hiçbir zaman haksız yere bağırmaz; süreçte görünmeyen bir sürtünme vardır.',
          'Özel Müşteriler Masası Şefliğim döneminde, İtalya’da farklı bir amaçla kullanılan bir sistemi keşfederek yerel IT ekipleriyle Türkiye operasyonuna uyarladığım KART takip sistemi ile sorunlu gönderileri kriz çıkmadan önce otomatik tespit eden kurallar geliştirdik.',
          'Bu dönem bana Kotler’in ilişki pazarlaması ilkesinin kalbini öğretti: bir markanın vaadi ile teslimatı arasındaki fark sıfırlandığında, gerçek sadakat başlar.',
        ],
      },
      {
        number: '02',
        title: 'Köprü Kurmak: Müşteri Deneyiminden Global Ürüne',
        eyebrow: 'TECNO CX',
        paragraphs: [
          '2021 yılında TECNO’ya adım attığımda önümde duran tablo, klasik bir satış odaklı büyüme sancısıydı: pazar payı artıyordu ancak kullanıcı deneyimi geriden geliyordu.',
          'Müşteri Deneyimi Müdürü olarak, 1 milyon kullanıcıya dokunan destek operasyonunu sıfırdan kurdum. Ancak müşteri hizmetleri sadece sorun çözen bir yangın söndürücü değildir; Ar-Ge’yi besleyen en stratejik istihbarat merkezidir.',
          'Biri Çin’den görevlendirilen mühendis olmak üzere 3 kişilik Kullanıcı Deneyimi Geliştirme Ekibini kurdum. Türkiye’deki kullanıcıların kamera, ses ve arayüz şikâyetlerini doğrudan global yazılım ve ürün ekiplerine entegre ettik.',
          'Yazılım hatalarının düzeltilme süresini 60 günden 20 güne indirdik. Ekibimin kurduğu erken uyarı mekanizması, Malezya kaynaklı küresel bir siber güvenlik açığı ihtimalini daha gerçekleşmeden Türkiye cihazlarına olası etkileri üzerinden tespit etti.',
          'Sonuçta markayı 18 ay gibi kısa bir sürede Şikâyetvar kategori sıralamasında son sıradan 1. sıraya taşıdık. Piyasa araştırmalarında kullanıcılarımızın %70’i ürünlerimizi yakınlarının tavsiyesi ile edindiğini söylüyordu.',
        ],
      },
      {
        number: '03',
        title: 'Bütünsel Pazarlama ve Stratejik Büyüme',
        eyebrow: 'TECNO Direktörlüğü',
        paragraphs: [
          'Müşteri deneyimindeki bu radikal dönüşümün ardından, Şubat 2023’te TECNO Mobile Türkiye’nin Pazarlama Direktörlüğü görevini üstlendim.',
          'Markanın Türkiye’deki ilk fiziksel ürün lansmanını uçtan uca tasarlayıp hayata geçirdik. Hepsiburada ve Vodafone ile ortak pazarlama modelleri kurgulayarak pazar penetrasyonunu hızlandırdık.',
          'Türkiye’nin ilk sosyal medya hack organizasyonlarından birini kurgulayarak markayı Z kuşağının radarına soktuk.',
          'Pazarlama direktörlüğüm boyunca ajans yönetiminden medya planlamaya, dijital performanstan e-ticarete kadar tüm kanalları tek bir amaca kilitledim: müşteriye verilen söz ile ürünün yaşattığı deneyim arasındaki uyumu kusursuz kılmak.',
        ],
      },
      {
        number: '04',
        title: 'Meydan Okuyan Bir Kült Markanın Doğuşu',
        eyebrow: 'Nothing & Toprak Razgatlıoğlu',
        paragraphs: [
          'Aralık 2024’te Evofone çatısı altında, tüketici elektroniğinde küresel bir tasarım devrimi yaratan Nothing Technology’nin Türkiye pazarına giriş sürecini yönetmek üzere yola çıktım.',
          'PR ve kreatif ajansları yönetirken odağım çok netti: sermaye yoğun dev rakiplerin arasında bir challenger brand nasıl konumlandırılır?',
          'Dünya şampiyonu milli motosikletçimiz Toprak Razgatlıoğlu ile Nothing’in Türkiye lansmanını birleştiren, maliyet verimliliği yüksek stratejik bir marka iş birliğine imza attım.',
          'Reklam filminin stratejisinden yaratıcı konseptine, prodüksiyon yönetiminden sosyal medya yayılımına kadar her adımı bizzat kurguladım. Hız, cesaret, şeffaflık ve özgün tasarım kodlarını pazarla buluşturduk.',
        ],
      },
    ],
    compass: 'PAZARLAMA PUSULAM',
    principlesTitle: 'Sahadan öğrenilen dört ilke',
    principlesLead: 'Ben pazarlamayı sadece yönetmiyorum; onu sahadaki her temas noktasında hissederek, ölçerek ve değere dönüştürerek yaşıyorum.',
    principles: [
      'Ürün müşterinin masasında başlar, fabrikada değil.',
      'CX pazarlamanın görünmeyen omurgasıdır.',
      'Bütçe değil, anlam fark yaratır.',
      'Bütünsel bakış; operasyon, ürün, marka ve kreatif vizyonu aynı anda okumaktır.',
    ],
    footer: 'Okumalara dön',
  },
  en: {
    metadata: {
      title: 'Enes Pehlivan | Marketing Readings',
      description: 'Enes Pehlivan’s journey through marketing shaped by friction in the field.',
    },
    back: 'Back to marketing readings',
    curator: 'CURATOR',
    hero: 'Marketing shaped by friction in the field: an ongoing journey of listening to the customer’s most unfiltered reality, optimizing the operation, and building brand strategies on that foundation.',
    portraitAlt: 'Portrait of Enes Pehlivan',
    chaptersLabel: 'Career story',
    chapters: [
      {
        number: '01',
        title: 'Learning Empathy: Seeing Where Value Breaks Down',
        eyebrow: 'The DHL Years',
        paragraphs: [
          'Many marketers begin with agency decks or brand plans. I began with marketing’s rawest material: customer disappointment and pain waiting to be resolved.',
          'My nine years at DHL Express became an education that stretched from customs desks and call centers to complaint management and mission-critical logistics for some of Türkiye’s largest business groups.',
          'Racing against the clock in the call center and handling complaints taught me my first principle: customers never raise their voices without a reason; somewhere in the process, an unseen point of friction exists.',
          'While leading the Key Accounts Desk, I discovered a system used for a different purpose in Italy and adapted it with local IT teams for Türkiye. The resulting KART tracking system used automated rules to identify troubled shipments before they became crises.',
          'That period taught me the heart of Kotler’s relationship-marketing principle: genuine loyalty begins when the gap between a brand’s promise and its delivery disappears.',
        ],
      },
      {
        number: '02',
        title: 'Building the Bridge: From Customer Experience to Global Product',
        eyebrow: 'TECNO CX',
        paragraphs: [
          'When I joined TECNO in 2021, the company was experiencing a familiar sales-led growth tension: market share was rising, but the user experience was falling behind.',
          'As Customer Experience Director, I built a support operation serving one million users from the ground up. Customer service, however, is more than a function that puts out fires; it is the most strategic intelligence center feeding R&D.',
          'I formed a three-person User Experience Development Team, including an engineer assigned from China. We created a direct line from Turkish users’ camera, audio, and interface issues to the global software and product teams.',
          'We reduced software issue resolution time from 60 days to 20. The early-warning mechanism built by my team also identified the possible impact on devices in Türkiye of a global cybersecurity vulnerability originating in Malaysia before it materialized.',
          'Within 18 months, we moved the brand from last place to first in its Şikâyetvar category. Market research showed that 70% of our users had chosen our products on the recommendation of someone they knew.',
        ],
      },
      {
        number: '03',
        title: 'Holistic Marketing and Strategic Growth',
        eyebrow: 'TECNO Marketing Leadership',
        paragraphs: [
          'Following this radical transformation in customer experience, I became Marketing Director of TECNO Mobile Türkiye in February 2023.',
          'We designed and delivered the brand’s first physical product launch in Türkiye from end to end. Joint marketing models with Hepsiburada and Vodafone helped accelerate market penetration.',
          'We put the brand on Gen Z’s radar by creating one of Türkiye’s first social media hack events.',
          'Throughout my time as Marketing Director, I aligned every channel, from agency management and media planning to digital performance and e-commerce, around one objective: making the brand promise and the product experience work as one.',
        ],
      },
      {
        number: '04',
        title: 'The Making of a Challenger Cult Brand',
        eyebrow: 'Nothing & Toprak Razgatlıoğlu',
        paragraphs: [
          'In December 2024, under Evofone, I set out to lead Nothing Technology’s entry into Türkiye, bringing a global design disruptor in consumer electronics to the market.',
          'While managing PR and creative agencies, my focus was precise: how do you position a challenger brand among capital-rich global giants?',
          'I developed a cost-efficient strategic partnership that brought Nothing’s Türkiye launch together with world champion Turkish motorcycle racer Toprak Razgatlıoğlu.',
          'I shaped every step, from the commercial strategy and creative concept to production management and social distribution. We translated speed, courage, transparency, and distinctive design into a language the market could feel.',
        ],
      },
    ],
    compass: 'MY MARKETING COMPASS',
    principlesTitle: 'Four principles learned in the field',
    principlesLead: 'I do more than manage marketing. I experience it at every point of contact, measuring what happens and turning it into value.',
    principles: [
      'The product begins at the customer’s table, not in the factory.',
      'Customer experience is marketing’s invisible backbone.',
      'Meaning, not budget, creates distinction.',
      'A holistic view means reading operations, product, brand, and creative vision at the same time.',
    ],
    footer: 'Back to the readings',
  },
  ru: {
    metadata: {
      title: 'Энес Пехливан | Материалы о маркетинге',
      description: 'Путь Энеса Пехливана в маркетинге, рожденном из реального трения в работе.',
    },
    back: 'Вернуться к материалам о маркетинге',
    curator: 'АВТОР ПОДБОРКИ',
    hero: 'Маркетинг, рожденный из трения в реальной работе: продолжающийся путь, на котором я слушаю неприукрашенную правду клиента, оптимизирую процессы и на этой основе выстраиваю стратегии бренда.',
    portraitAlt: 'Портрет Энеса Пехливана',
    chaptersLabel: 'Профессиональный путь',
    chapters: [
      {
        number: '01',
        title: 'Школа эмпатии: увидеть, где разрушается ценность',
        eyebrow: 'Годы в DHL',
        paragraphs: [
          'Многие маркетологи начинают карьеру с агентских презентаций или бренд-планов. Я начал с самого чистого сырья маркетинга: разочарования клиента и боли, которая ждет решения.',
          'Девять лет в DHL Express стали для меня школой: от таможенных операций и колл-центра до работы с жалобами и критически важной логистики крупнейших холдингов Турции.',
          'Работа в колл-центре, где счет шел на секунды, научила меня первому принципу: клиент никогда не повышает голос без причины; в процессе всегда есть невидимое трение.',
          'Руководя отделом ключевых клиентов, я нашел систему, которую в Италии применяли для другой задачи, и вместе с локальной IT-командой адаптировал ее для Турции. Так появилась система KART, автоматически выявлявшая проблемные отправления до того, как они превращались в кризис.',
          'Именно тогда я понял суть принципа маркетинга отношений Котлера: настоящая лояльность начинается, когда исчезает разрыв между обещанием бренда и тем, что он действительно дает.',
        ],
      },
      {
        number: '02',
        title: 'Построить мост: от клиентского опыта к глобальному продукту',
        eyebrow: 'TECNO CX',
        paragraphs: [
          'Когда я пришел в TECNO в 2021 году, компания столкнулась с классическим напряжением роста, ориентированного на продажи: доля рынка увеличивалась, а пользовательский опыт отставал.',
          'В роли директора по клиентскому опыту я с нуля создал службу поддержки для миллиона пользователей. Но клиентский сервис не просто тушит пожары; это стратегический центр информации, который питает исследования и разработку.',
          'Я собрал команду развития пользовательского опыта из трех человек, включая инженера, направленного из Китая. Мы напрямую связали жалобы пользователей в Турции на камеру, звук и интерфейс с глобальными командами разработки и продукта.',
          'Срок исправления программных ошибок сократился с 60 до 20 дней. Созданная командой система раннего предупреждения также заранее выявила возможное влияние на устройства в Турции глобальной киберугрозы, исходившей из Малайзии.',
          'За 18 месяцев мы подняли бренд с последнего на первое место в своей категории на Şikâyetvar. Исследования показывали, что 70% пользователей выбрали наши продукты по рекомендации близких.',
        ],
      },
      {
        number: '03',
        title: 'Целостный маркетинг и стратегический рост',
        eyebrow: 'Руководство маркетингом TECNO',
        paragraphs: [
          'После этой радикальной трансформации клиентского опыта в феврале 2023 года я занял должность директора по маркетингу TECNO Mobile Türkiye.',
          'Мы полностью спроектировали и провели первый офлайн-запуск продукта бренда в Турции. Совместные маркетинговые модели с Hepsiburada и Vodafone ускорили проникновение на рынок.',
          'Мы привлекли внимание поколения Z, организовав один из первых в Турции хакатонов в социальных сетях.',
          'На посту директора по маркетингу я объединил управление агентствами, медиапланирование, digital performance и электронную коммерцию вокруг одной цели: добиться полного соответствия между обещанием бренда и реальным опытом от продукта.',
        ],
      },
      {
        number: '04',
        title: 'Рождение культового бренда-претендента',
        eyebrow: 'Nothing & Toprak Razgatlıoğlu',
        paragraphs: [
          'В декабре 2024 года в структуре Evofone я возглавил выход Nothing Technology, глобального новатора в дизайне потребительской электроники, на рынок Турции.',
          'Управляя PR- и креативными агентствами, я сосредоточился на конкретном вопросе: как позиционировать бренд-претендент среди глобальных конкурентов с огромными ресурсами?',
          'Я разработал эффективное стратегическое партнерство, объединив выход Nothing в Турции с чемпионом мира по мотоспорту Топраком Разгатлыоглу.',
          'Я выстроил весь процесс: от стратегии ролика и креативной концепции до продакшена и распространения в социальных сетях. Скорость, смелость, прозрачность и самобытный дизайн обрели понятный рынку язык.',
        ],
      },
    ],
    compass: 'МОЙ МАРКЕТИНГОВЫЙ КОМПАС',
    principlesTitle: 'Четыре принципа, которым научило поле',
    principlesLead: 'Я не просто управляю маркетингом. Я проживаю его в каждой точке контакта, измеряю происходящее и превращаю его в ценность.',
    principles: [
      'Продукт начинается за столом клиента, а не на фабрике.',
      'Клиентский опыт — невидимый каркас маркетинга.',
      'Отличие создает смысл, а не бюджет.',
      'Целостный взгляд — это способность одновременно видеть операции, продукт, бренд и креативное видение.',
    ],
    footer: 'Вернуться к материалам',
  },
};
