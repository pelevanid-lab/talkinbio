import { articleTranslationsEn, normalizeEditorialLocale, topicTranslations } from './editorialTranslations';

export type EditorialTopic = {
  slug: string;
  number: string;
  title: string;
  shortTitle: string;
  question: string;
  thesis: string;
  points: string[];
  nextSlugs: string[];
};

export type EditorialArticle = {
  slug: string;
  eyebrow: string;
  title: string;
  standfirst: string;
  readingTime: string;
  topicSlugs: string[];
  sections: Array<{ title: string; paragraphs: string[] }>;
  takeaway: string;
  published?: boolean;
};

export const articleLocalizedSlugs = {
  'ihtiyaci-gormek': { tr: 'ihtiyaci-gormek', en: 'seeing-the-need', ru: 'seeing-the-need' },
  'masadaki-urun-sahadaki-gercek': { tr: 'masadaki-urun-sahadaki-gercek', en: 'product-on-the-table-reality-in-the-field', ru: 'product-on-the-table-reality-in-the-field' },
  'ihtiyac-temelli-segmentasyon': { tr: 'ihtiyac-temelli-segmentasyon', en: 'needs-based-segmentation', ru: 'needs-based-segmentation' },
  'urunu-segmente-dayatmak': { tr: 'urunu-segmente-dayatmak', en: 'forcing-product-onto-segments', ru: 'forcing-product-onto-segments' },
  'positioning-is-a-reason-to-choose': { tr: 'konumlandirma-tercih-sebebidir', en: 'positioning-is-a-reason-to-choose', ru: 'positioning-is-a-reason-to-choose' },
} as const;

const articleSlugAliases = new Map<string, string>(
  Object.entries(articleLocalizedSlugs).flatMap(([canonicalSlug, localized]) =>
    Object.values(localized).map((slug) => [slug, canonicalSlug] as const)
  )
);

export function resolveEditorialArticleSlug(slug: string) {
  return articleSlugAliases.get(slug) || slug;
}

export function getLocalizedArticleSlug(slug: string, locale = 'tr') {
  const normalized = normalizeEditorialLocale(locale);
  const canonicalSlug = resolveEditorialArticleSlug(slug);
  return articleLocalizedSlugs[canonicalSlug as keyof typeof articleLocalizedSlugs]?.[normalized] || canonicalSlug;
}

export function getEditorialArticlePath(slug: string, locale = 'tr') {
  return `/articles/${getLocalizedArticleSlug(slug, locale)}`;
}

export const editorialTopics: EditorialTopic[] = [
  {
    slug: 'customer-and-market-insights',
    number: '01',
    title: 'Müşteri ve Pazar İçgörüsü',
    shortTitle: 'Pazarı dinle',
    question: 'İnsanlar ne söylüyor; davranışları ne anlatıyor?',
    thesis: 'Pazarlama, çözüm üretmeden önce pazarı doğru okuma disiplinidir.',
    points: ['İhtiyaç ve talep arasındaki fark', 'Davranıştan içgörü çıkarma', 'Arama, konuşma ve geri bildirim sinyalleri'],
    nextSlugs: ['segmentation', 'targeting'],
  },
  {
    slug: 'segmentation',
    number: '02',
    title: 'Segmentasyon',
    shortTitle: 'Anlamlı grupları gör',
    question: 'Pazar hangi ortak ihtiyaçlar etrafında ayrışıyor?',
    thesis: 'İyi segmentasyon insanları etiketlemez; farklı karar bağlamlarını görünür kılar.',
    points: ['İhtiyaç temelli segmentler', 'Davranış ve bağlam', 'Segmentin kullanılabilirliği'],
    nextSlugs: ['targeting', 'positioning'],
  },
  {
    slug: 'targeting',
    number: '03',
    title: 'Hedefleme',
    shortTitle: 'Değeri seç',
    question: 'Hangi müşteriye hizmet etmek için özellikle iyi bir nedenimiz var?',
    thesis: 'Hedefleme yalnızca kimi seçtiğimizi değil, kimi seçmediğimizi de belirler.',
    points: ['Segment çekiciliği', 'Marka–pazar uyumu', 'Öncelik ve vazgeçiş'],
    nextSlugs: ['positioning', 'brand-and-value-proposition'],
  },
  {
    slug: 'positioning',
    number: '04',
    title: 'Konumlandırma',
    shortTitle: 'Bir tercih nedeni kur',
    question: 'Müşterinin zihninde hangi açık ve değerli yeri üstleniyoruz?',
    thesis: 'Konumlandırma bir slogan değil, müşterinin tercih yapmasını kolaylaştıran karardır.',
    points: ['Referans çerçevesi', 'Farklılık ve benzerlik noktaları', 'Kanıtlanabilir marka vaadi'],
    nextSlugs: ['brand-and-value-proposition', 'communication-and-content'],
  },
  {
    slug: 'brand-and-value-proposition',
    number: '05',
    title: 'Marka ve Değer Önerisi',
    shortTitle: 'Değeri kur',
    question: 'Müşteri neden bizi seçsin ve buna neden inansın?',
    thesis: 'Değer önerisi, müşterinin kazancı ile markanın bunu sağlama biçimini aynı cümlede buluşturur.',
    points: ['Müşteri faydası', 'Marka vaadi', 'Güven ve kanıt'],
    nextSlugs: ['product-service-and-pricing', 'channels-and-experience'],
  },
  {
    slug: 'product-service-and-pricing',
    number: '06',
    title: 'Ürün, Hizmet ve Fiyat',
    shortTitle: 'Teklifi biçimlendir',
    question: 'Verdiğimiz söz, teklifin içinde gerçekten karşılık buluyor mu?',
    thesis: 'Ürün ve fiyat, konumlandırmanın müşterinin karşısına çıkan en somut ifadeleridir.',
    points: ['Teklif mimarisi', 'Hizmet tasarımı', 'Fiyatın değer sinyali'],
    nextSlugs: ['channels-and-experience', 'communication-and-content'],
  },
  {
    slug: 'channels-and-experience',
    number: '07',
    title: 'Kanallar ve Deneyim',
    shortTitle: 'Değeri sun',
    question: 'Müşteri markaya nerede ulaşıyor ve sonra ne yaşıyor?',
    thesis: 'Kanal yalnızca dağıtım yolu değil, marka vaadinin deneyime dönüştüğü yerdir.',
    points: ['İlk temas noktaları', 'Kanal uyumu', 'Temastan deneyime geçiş'],
    nextSlugs: ['communication-and-content', 'loyalty-and-customer-value'],
  },
  {
    slug: 'communication-and-content',
    number: '08',
    title: 'İletişim ve İçerik',
    shortTitle: 'Değeri anlat',
    question: 'Doğru kişiye, doğru bağlamda, hangi cevabı vermeliyiz?',
    thesis: 'İletişim mesaj göndermekten önce müşterinin bağlamına uygun bir cevap üretmektir.',
    points: ['Bütünleşik iletişim', 'İçerik ve müşteri niyeti', 'Mesaj–deneyim tutarlılığı'],
    nextSlugs: ['loyalty-and-customer-value', 'measurement-and-growth'],
  },
  {
    slug: 'loyalty-and-customer-value',
    number: '09',
    title: 'Sadakat ve Müşteri Değeri',
    shortTitle: 'İlişki kur',
    question: 'Tek bir temas nasıl devam eden bir ilişkiye dönüşür?',
    thesis: 'Sadakat tekrar satın almadan fazlasıdır; markanın müşterinin hayatında kalıcı değer üretmesidir.',
    points: ['Müşteri yaşam boyu değeri', 'Elde tutma', 'Güven ve tavsiye'],
    nextSlugs: ['measurement-and-growth', 'customer-and-market-insights'],
  },
  {
    slug: 'measurement-and-growth',
    number: '10',
    title: 'Ölçüm ve Büyüme',
    shortTitle: 'Öğren ve yenile',
    question: 'Hangi davranış gerçekten değer yarattığımızı gösteriyor?',
    thesis: 'Ölçüm raporlama değil, bir sonraki pazarlama kararını daha iyi verme sistemidir.',
    points: ['Anlamlı talep', 'Davranış ve sonuç metrikleri', 'Öğrenme döngüsü'],
    nextSlugs: ['customer-and-market-insights', 'segmentation'],
  },
];

export const editorialArticles: EditorialArticle[] = [
  {
    slug: 'ihtiyaci-gormek',
    eyebrow: 'İHTİYACI ANLA',
    title: 'İhtiyacı Görmek: Pazarlamanın Görünmeyen Haritası ve Değer Yaratma Sanatı',
    standfirst: 'Pazarlamanın gerçek başlangıç noktası üretilmiş ürünü satmak değil, insanın henüz tam adını koyamadığı eksikliği görebilmektir.',
    readingTime: '14 dk',
    published: true,
    topicSlugs: ['customer-and-market-insights'],
    sections: [
      {
        title: 'İhtiyaç, istek ve talep üçgeni',
        paragraphs: [
          'Modern iş dünyasında pazarlamanın yalnızca üretilmiş bir mal veya hizmeti ikna yöntemleriyle elden çıkarma sanatı olarak görülmesi en yaygın ve en maliyetli yanılgılardan biridir. Oysa pazarlamanın gerçek doğuş noktası satış ofisleri ya da reklam ajansları değil; bireyin, toplumun ve kurumların henüz adını koyamadığı veya tam olarak gideremediği eksikliklerin keşfedildiği zihinsel eşiktir.',
          'Kotler ve Keller’in pazarlamayı “ihtiyaçları karlı bir şekilde karşılamak” olarak tanımlaması bu yüzden basit ama derin bir stratejik düğüm taşır. İhtiyaç insanın varoluşsal, biyolojik ve psikolojik gereksinimidir. İstek, bu ihtiyacın kültür, deneyim ve kişisel tercihle aldığı görünür biçimdir. Talep ise satın alma gücü ve seçim koşullarıyla desteklenen istektir.',
          'Pazarlamacılar ihtiyaç yaratmaz; ihtiyaçlar zaten oradadır. Pazarlamacının görevi, mevcut ihtiyacı doğru analiz etmek, bu ihtiyacı karşılayacak çekici istek biçimleri geliştirmek ve bunları hedef kitlenin erişebileceği bir değere dönüştürmektir.',
        ],
      },
      {
        title: 'Söylenen ihtiyacın altındaki katmanlar',
        paragraphs: [
          'Müşteri ne istediğini söylediğinde çoğu zaman buzdağının yalnızca görünen kısmını tarif eder. Açık ihtiyaç müşterinin kelimelere döktüğü ilk ifadedir. Gerçek ihtiyaç bu ifadenin ardındaki işlevsel beklentidir. Belirtilmemiş ihtiyaç, müşterinin doğal kabul ettiği standartlardır. Zevk veya sürpriz ihtiyaçları, beklenmediği halde sunulduğunda yüksek memnuniyet yaratan katma değerlerdir. Gizli ihtiyaçlar ise statü, aidiyet, onaylanma veya özgüven gibi çoğu zaman dillendirilmeyen psikolojik dürtülerdir.',
          '“Ekonomik bir otomobil istiyorum” diyen müşteri yalnızca düşük etiket fiyatı aramıyor olabilir. Yakıt tüketimi, bakım maliyeti, ikinci el değeri, garanti deneyimi ve çevresinde rasyonel bir tüketici olarak görünme arzusu aynı kararın içinde çalışabilir. Görünmeyeni görmek, açıkça söylenenin ötesine geçip gerçek, belirtilmemiş ve gizli ihtiyaçları aynı anda okuyabilmektir.',
        ],
      },
      {
        title: 'Pazarlama miyopluğu ve çözülmesi gereken iş',
        paragraphs: [
          'İhtiyacı görememenin en ölümcül sonucu, şirketlerin kendilerini çözdükleri problem yerine ürettikleri fiziksel ürünle tanımlamalarıdır. Theodore Levitt’in pazarlama miyopluğu kavramı tam olarak bunu anlatır: İnsanlar matkap ucu değil, duvarda açılmış deliğin sağlayacağı ilerlemeyi ister.',
          'Demiryolu şirketleri kendilerini ulaşım ihtiyacı üzerinden değil, demiryolu ürünü üzerinden tanımladığında otomobil, kamyon ve uçak gibi alternatifler karşısında zayıfladı. Aynı mantık bugün her sektörde geçerlidir. Bir işletme kendini fiziksel ürünle tanımladığında o ürünün teknolojik ömrüne mahkum olur; karşıladığı temel insani ihtiyaçla tanımladığında ise teknolojiler değişse bile dönüşerek yaşamaya devam eder.',
          'Jobs-to-be-Done yaklaşımı bu bakışı operasyonel hale getirir. Müşteriler ürün veya hizmetleri satın almaz; hayatlarının belirli bir anında karşılaştıkları bir problemi çözmek veya bir ilerleme kaydetmek için ürünleri işe alırlar. Meşhur milkshake örneğinde asıl ihtiyaç tatlı bir içecek değil, sabah trafiğinde tek elle tüketilebilen, oyalanma sağlayan ve öğlene kadar tok tutan bir çözümdür.',
        ],
      },
      {
        title: 'Davranışın psikolojik ve pazar boyutu',
        paragraphs: [
          'Pazarlamada ihtiyacı tespit etmek yalnızca rasyonel bir denklem çözmek değildir. Maslow’un ihtiyaçlar hiyerarşisi, Kahneman’ın Sistem 1 ve Sistem 2 ayrımı ve davranışsal iktisat, satın alma kararlarının işlevsel fayda kadar duygu, sosyal onay, güvenlik ve statüyle de biçimlendiğini gösterir.',
          'Tüketiciye “Bu ürünü neden aldınız?” diye sormak çoğu zaman karar sonrasında üretilmiş rasyonel bir açıklama getirir. Gerçek ihtiyaç ise korkularda, konfor arayışında, sosyal onay beklentisinde veya zihinsel yükü azaltma isteğinde saklı olabilir.',
          'Mavi okyanus stratejisi de buradan beslenir. Rekabetin boğucu olduğu pazarlarda yalnızca mevcut talebi paylaşmak yerine, müşterinin katlanmak zorunda kaldığı tavizleri ortadan kaldırmak yeni talep alanları açabilir. İhtiyacı görmek, sadece mevcut müşterinin sesini değil, sektörün karmaşık çözümleri yüzünden ürünü hiç kullanmayanların sessizliğini de dinlemektir.',
        ],
      },
      {
        title: 'İhtiyacı keşfetmenin uygulama disiplini',
        paragraphs: [
          'Geleneksel anketler ve standart odak grupları çoğu zaman yüzeysel veri üretir. Daha güçlü bir okuma için empati görüşmeleri, derinlemesine mülakatlar, etnografik ve netnografik gözlem, müşteri yolculuk haritaları ve davranışsal telemetri birlikte kullanılmalıdır.',
          'Müşteriye doğrudan “Ne istiyorsun?” diye sormak yerine, son yaşadığı sürtünmeyi, vakit kaybettiği adımı, endişesini ve mevcut çözümün yetmediği anı konuşturmak gerekir. Web sitesinde terk edilen sepetler, arama motoruna yazılan spesifik ifadeler veya bir uygulamada en çok takılınan ekran da açıkça söylenmeyen ihtiyacın dijital izleridir.',
          'Uygulamada beş soru pazarlamacıya pusula olur: Müşteri hangi bağlamda hangi engelle karşılaşıyor? Fonksiyonel, duygusal ve sosyal olarak hangi işi çözmeye çalışıyor? Açık, gerçek, belirtilmemiş ve gizli ihtiyaç katmanları neler? Hangi sürtünmeler kaldırılmalı? Değer önerisi müşterinin hayatında hangi dönüşümü net biçimde vaat ediyor?',
        ],
      },
      {
        title: 'Değer yaratmanın değişmeyen özü',
        paragraphs: [
          'Pazarlama dünyası dijitalleşme, yapay zeka, büyük veri ve değişen iletişim kanallarıyla hızla evrilse de merkezdeki temel dinamik değişmez: insan ve onun çözülmeyi bekleyen ihtiyaçları.',
          'Yalnızca ürün özelliklerine, reklam bütçelerine veya dönemsel algoritma hilelerine odaklanan markalar pazarın ilk çalkantısında yönünü kaybeder. Gerçek pazarlama ustalığı, müşterinin görünmeyen gerçeğine bakabilmek, söylenmeyeni işitebilmek ve bu ihtiyacı sürdürülebilir bir değer zincirine dönüştürebilmektir.',
          'İhtiyacı görmek bir defalık araştırma projesi değil, kurumun DNA’sına işlemesi gereken kesintisiz bir empati ve gözlem disiplinidir. Bu disiplini koruyabilenler için pazar hiçbir zaman tamamen doymuş değildir.',
        ],
      },
    ],
    takeaway: 'Ürünü değil, müşterinin çözmeye çalıştığı işi merkeze al; değer orada görünür hale gelir.',
  },
  {
    slug: 'masadaki-urun-sahadaki-gercek',
    eyebrow: 'PAZARI DİNLE',
    title: 'Masadaki Ürün, Sahadaki Gerçek: Üretilmiş Bir Yanılgıyı Pazarlamak ve Değer Dönüşümü Vakası',
    standfirst: 'Pazarlama liderliği, bitmiş bir ürünü körü körüne satmak değil; onu sahanın gerçekleriyle yüzleştirip değer dönüşümüne rehberlik etmektir.',
    readingTime: '12 dk',
    published: true,
    topicSlugs: ['customer-and-market-insights', 'positioning', 'brand-and-value-proposition'],
    sections: [
      {
        title: 'Masaya bırakılan ürün krizi',
        paragraphs: [
          'Pazarlama dünyasında en öğretici anlardan biri, şirketin aylarca kapalı kapılar ardında geliştirdiği ürünün cilalı bir sunumla pazarlama ekibinin masasına bırakılmasıdır: “Harika bir ürün yaptık. Şimdi bunu paketleyin, ikna edin ve satın.”',
          'Ürünü incelediğinizde pazar gerçeği hızla görünür olur. Ürün müşterinin gerçek acısını dindirmiyor, alternatiflerden daha karmaşık veya pahalı kalıyor ve çözülmesi gerekmeyen bir probleme odaklanıyordur. Üretim sürecine dahil edilmemişsinizdir; ama ürün satmadığında faturanın kesileceği ilk adres pazarlama ekibidir.',
          'Gerçek pazarlama liderliği, kapalı kapılar ardında üretilen bir yanılgıyı körü körüne satmaya çalışmak değil; o ürünü sahanın gerçekleriyle yüzleştirip radikal bir değer dönüşümüne rehberlik etmektir.',
        ],
      },
      {
        title: 'Satış konsepti ve pazarlama konsepti',
        paragraphs: [
          'Bu kriz, satış konsepti ile pazarlama konsepti arasındaki yapısal uçurumdan doğar. Satış konsepti içeriden dışarıya bakar: fabrika veya Ar-Ge mevcut ürünü üretir, satış ve promosyon onu pazara iter, kâr satış hacmiyle aranır.',
          'Pazarlama konsepti ise dışarıdan içeriye bakar: hedef pazar, müşteri ihtiyacı, entegre pazarlama ve müşteri tatmini üzerinden karlılık kurulur. Masaya bırakılan bitmiş ürün, organizasyonun pazarlamayı değerin mutfağı değil, vitrin temizleyicisi olarak gördüğünün işaretidir.',
          'Eğer bir ürünün satılması için olağanüstü manipülasyon, aşırı indirim veya agresif ikna gerekiyorsa, orada pazarlama yapılmıyordur. Orada kötü bir ürün tasarımı satış baskısıyla örtülmeye çalışılıyordur.',
        ],
      },
      {
        title: 'Saha gerçeğiyle yüzleşmek',
        paragraphs: [
          'Tipik bir B2B teknoloji vakasında ürün ekibi, yöneticilerin her detayı tek ekranda görmek isteyeceği varsayımıyla 30 farklı analitik modül içeren devasa bir raporlama paneli geliştirir. Pazarlama ekibine görev basittir: demo topla, ürünü anlat, satışa lead gönder.',
          'İlk müşteri temaslarında gerçek tablo ortaya çıkar. Yöneticilerin 30 grafiği analiz edecek zamanı yoktur; onlar sadece hangi müşterilerini kaybetmek üzere olduklarını bilmek ister. Kurulum üç hafta sürüyorsa BT ekipleri bu yükü almak istemez. Ürün müşterinin ihtiyacını çözmek yerine müşteriye yeni bir iş çıkarıyordur.',
          'Bu noktada pazarlamacının yapması gereken reklam bütçesini büyütmek değil, hipotez çürütme masası kurmaktır. Yönetimin inançları müşteri görüşmeleri, ekran kayıtları, rakip tercihleri, fiyat hassasiyeti ve kullanım verileriyle yan yana getirilmelidir.',
        ],
      },
      {
        title: 'Ürünü çöpe atmadan değeri dönüştürmek',
        paragraphs: [
          'Ürün kodlanmış, bütçe harcanmış ve zaman tükenmiş olabilir. Pazarlamacının ustalığı burada başlar: eldeki ürünü gerçek ihtiyacın hizmetine sunacak bir dönüşüm protokolü kurmak.',
          'İlk strateji Jobs-to-be-Done pivotudur. Müşteriler ürünü tasarımcıların hayal ettiği iş için işe almayacaksa, hangi iş için işe alabilir? Play-Doh’un duvar kağıdı temizleyicisinden oyun hamuruna, Slack’in başarısız bir oyunun iç iletişim aracından kurumsal mesajlaşma ürününe dönüşmesi bu bakışın klasik örnekleridir.',
          'Raporlama paneli örneğinde 30 grafiği öne çıkarmak yerine, müşterinin gerçekten acı duyduğu tek soruya odaklanmak gerekir: “Hangi müşterimi kaybetmek üzereyim?” Ürün “karmaşık veri analiz platformu” olmaktan çıkıp “müşteri kaybetmesini engelleyen erken uyarı radarı”na dönüşebilir.',
        ],
      },
      {
        title: 'Genişletilmiş ürün ve dar hedef kitle',
        paragraphs: [
          'Ürünün çekirdeği zayıfsa pazarlamacının müdahale alanı genişletilmiş ürün katmanıdır. Kurulum desteği, danışmanlık, eğitim, garanti, topluluk ve hizmet deneyimi, eksik çekirdeği müşterinin kullanabileceği bir değere çevirebilir.',
          'Karmaşık ürünü tek başına yazılım olarak satmak yerine, “bu yazılımı sizin yerinize kuruyor, haftalık analizleri uzman ekibimizle yapıp tek sayfa rapor sunuyoruz” modeline geçmek algılanan değeri değiştirir. Sıfır kurulum maliyeti, koşulsuz iade ve birebir entegrasyon mentörlüğü müşterinin risk algısını düşürür.',
          'Aynı zamanda hedef kitleyi aşırı daraltmak gerekir. “Tüm şirketler” yerine “abonelik modeliyle çalışan, son üç ayda müşteri kaybı belirgin artmış B2B e-ticaret şirketleri” gibi canı gerçekten yanan mikro segmentler bulunmalıdır. Vasat bir ürün bile doğru mikro acıda tek çare gibi görünebilir.',
        ],
      },
      {
        title: 'Kurumu satış baskısından pazar odağına çekmek',
        paragraphs: [
          'Pazarlamacının son görevi, sahadan toplanan veriyi yönetim ve üretim ekiplerinin masasına taşımaktır. Bu toplantı hesaplaşma değil, kurumu kurtarma toplantısıdır. Önce geliştirilmiş teknolojik altyapının değeri teslim edilir, sonra müşterinin bu altyapıyı hangi amaçla kullanmadığı ve hangi amaçla kullanabileceği kanıtlarla gösterilir.',
          'Yönetim kurulu hislerle değil, metriklerle konuşur. Tıklama yerine müşteri edinme maliyeti, indirme yerine aktivasyon ve tutundurma, eklenen özellik sayısı yerine özellik kullanım oranı konuşulmalıdır. Böylece mesele pazarlamacının kişisel fikri olmaktan çıkar ve pazarın inkar edilemez gerçeğine dönüşür.',
          'Bu krizden sonra kalıcı çözüm, süreci baştan tasarlamaktır. Eski doğrusal modelde fikir geliştirilir, aylarca üretim yapılır, sonra pazarlamaya teslim edilir ve pazar şoku yaşanır. Yeni döngüde müşteri ihtiyacı keşfedilir, hızlı prototip çıkarılır, pazarlama ve saha testi yapılır, doğrulanmayan varsayım geri döner.',
        ],
      },
      {
        title: 'Satış baskısından değer mimarlığına',
        paragraphs: [
          'Pazarlama mesleğinin gerçek onuru, kusursuz ürünleri kolayca parlatmakta değil; üretim yanılgılarıyla sakatlanmış projeleri sahanın gerçekleriyle yüzleştirip onları yaşayan, değer üreten çözümlere dönüştürme cesaretinde yatar.',
          '“Bunu ürettik, git ve ikna et” dendiğinde yapılacak en büyük hata müşteriyi manipüle edebileceğine inanmaktır. İzlenecek yol ikna çabasını ikiye katlamak değil, dinleme ve anlama çabasını beşe katlamaktır.',
          'Çözülecek gerçek işi bulduğunuzda, hedef kitleyi çaresiz nişlere kadar daralttığınızda ve eksik ürünü samimi bir hizmet katmanıyla sarmaladığınızda, yalnızca masadaki ürünü kurtarmazsınız; şirketi satış miyopluğundan çıkarıp gerçek pazarlama vizyonuna taşırsınız.',
        ],
      },
    ],
    takeaway: 'Bitmiş ürünü savunmak yerine, sahadaki ihtiyacı kanıtla; pazarlama değerin son cilası değil, yön bulma sistemidir.',
  },
  {
    slug: 'ihtiyac-temelli-segmentasyon',
    eyebrow: 'ANLAMLI GRUPLARI GÖR',
    title: 'İhtiyaç Temelli Segmentasyon: Demografinin Yanılgısından Değerin Anatomisine',
    standfirst: 'Müşteriyi kim olduğuna göre değil, hangi ihtiyacını gidermek ve hayatındaki hangi sürtünmeyi ortadan kaldırmak için çözüm aradığına göre okumak.',
    readingTime: '16 dk',
    published: true,
    topicSlugs: ['segmentation'],
    sections: [
      {
        title: 'Demografinin yanılgısı',
        paragraphs: [
          'Pazarlama dünyasında bütçelerin ve yaratıcı enerjinin en çok israf edildiği alanların başında müşteriyi yanlış kriterlerle kümelemek gelir. Geleneksel yaklaşım insanları yaş, cinsiyet, şehir veya gelir düzeyine göre böler ve bu grupların benzer satın alma davranışları göstereceğini varsayar.',
          'Bu varsayımın ne kadar yanıltıcı olduğunu gösteren klasik örnekte, İngiltere’de yaşayan, aynı yıl doğmuş, iki kez evlenmiş, çocuk sahibi, yüksek gelir grubundaki ve şatolarda vakit geçiren iki erkek aynı demografik segmente düşer. Oysa bu kişilerden biri Kral III. Charles, diğeri Ozzy Osbourne’dur. Aynı profil; gelenek ve prestij ile aykırılık ve bireysellik arasında bütünüyle farklı dünyalar barındırabilir.',
          'Demografi insanların kim ve nerede olduğunu tarif edebilir; fakat bir ürünü neden aradığını açıklayamaz. İhtiyaç temelli segmentasyon bu yüzden “Kime satıyoruz?” sorusundan önce “Bu insan hangi ihtiyacını gidermek ve hayatındaki hangi sürtünmeyi ortadan kaldırmak için çözüm arıyor?” sorusunu sorar.',
        ],
      },
      {
        title: 'Segmentasyon hiyerarşisi: yüzeyden derine',
        paragraphs: [
          'Müşteriyi anlama çabası katmanlıdır. En kolay erişilen veri çoğu zaman en az açıklayıcı olandır; ulaşılması zor ihtiyaç verisi ise markaya daha güçlü bir farklılaşma alanı açar.',
          'Demografik ve coğrafi veri yaş, cinsiyet, gelir ve konumu gösterir. Pazarın boyutunu hesaplamak için yararlıdır fakat satın alma motivasyonunu açıklayamaz. Psikografik veri yaşam tarzını, kişiliği ve sosyal değerleri gösterir; yine de belirli bir ürün kategorisindeki beklentiyi tek başına açıklamayabilir.',
          'Davranışsal veri kullanım sıklığını, sadakati ve kanal tercihini gösterir. Müşterinin ne yaptığını görünür kılar ama neden yaptığını açıklamakta eksik kalır. En derindeki ihtiyaç ve fayda verisi ise müşterinin aradığı fonksiyonel, duygusal ve sosyal kazanımları; yani satın alma gerekçesini ortaya çıkarır.',
        ],
      },
      {
        title: 'İhtiyaçla başlayıp pazarlama karmasına uzanan yedi adım',
        paragraphs: [
          'Roger Best tarafından geliştirilen ve Kotler-Keller yaklaşımında stratejik pazarlamanın merkezinde yer alan süreç, demografiyle başlayıp ihtiyaç aramak yerine ihtiyaçla başlar ve demografiyi daha sonra tanımlayıcı olarak kullanır.',
          'Birinci adım ihtiyaç gruplarıdır: Tüketiciler demografilerine bakılmadan, bir problem karşısında aradıkları benzer ihtiyaçlar ve temel faydalar etrafında kümelenir. İkinci adım segment kimliğidir: Oluşan ihtiyaç grubunu pazarda görünür ve erişilebilir kılacak davranış, yaşam tarzı, kullanım ve demografik işaretler belirlenir. Demografi burada bölme aracı değil, adres pusulasıdır.',
          'Üçüncü adım segment çekiciliğidir: Büyüme, rekabet, giriş engelleri ve ölçeklenebilirlik değerlendirilir. Dördüncü adım kârlılıktır: Edinme maliyeti, yaşam boyu değer ve operasyonel maliyetler incelenir. Her ihtiyaç grubu ticari olarak hedeflemeye değmeyebilir.',
          'Beşinci adım konumlandırmadır: Hedef segmentin ihtiyaç profiline özel değer önerisi ve fiyat-fayda dengesi kurulur. Altıncı adım sağlamlık testidir: Storyboard, pilot kampanya veya prototiple müşterinin “Tam olarak beni anlatıyor” tepkisi sınanır. Yedinci adım pazarlama karmasıdır: Ürün, fiyat, dağıtım ve iletişim dahil bütün temaslar segmente göre uyarlanır.',
        ],
      },
      {
        title: 'İhtiyacın üç boyutu: fonksiyonel, duygusal ve sosyal',
        paragraphs: [
          'İhtiyacı tek boyutlu bir eksiklik olarak görmek segmentasyonu sığlaştırır. Jobs-to-be-Done yaklaşımıyla birlikte düşünüldüğünde her ihtiyaç grubunun altında üç katman bulunur.',
          'Fonksiyonel ihtiyaç müşterinin bir işi en hızlı ve sorunsuz biçimde nasıl çözeceğini açıklar. Akıllı telefon örneğinde uzun pil ömrü, güçlü kamera ve akıcı çalışma bu katmana girer. Duygusal ihtiyaç müşterinin ürünü kullanırken nasıl hissetmek istediğini gösterir; güvenlik, rahatlık ve arıza kaygısından kurtulma buna örnektir.',
          'Sosyal ihtiyaç ise ürünün başkalarına hangi kimliği göstereceğiyle ilgilidir: teknolojiyi yakından izleyen, vizyoner veya zevk sahibi biri olarak algılanmak gibi. Segmentasyon yalnızca fonksiyonel ihtiyaçta kalırsa ürün metalaşır; farklılaşma ve fiyatlama gücü çoğu zaman duygusal ve sosyal katmanların doğru teşhisinden doğar.',
        ],
      },
      {
        title: 'Tüketici elektroniğinde ihtiyaç temelli dönüşüm',
        paragraphs: [
          'Geleneksel yaklaşım akıllı telefon pazarını öğrenciler, beyaz yakalı profesyoneller ve ileri yaştaki kullanıcılar gibi demografik gruplara ayırabilir. Oysa bir yöneticiyle bir öğrenci aynı yaratıcı araçlara ihtiyaç duyabilir; demografik ayrım ürün ve iletişim kararına yeterli içgörüyü vermez.',
          'İhtiyaç temelli yaklaşımda “Kusursuz Verimlilik Arayanlar” günlük iş akışını tek cihazdan kesintisiz yönetmek ister; işlem gücü, çoklu ekran, pil ömrü ve hızlı servis bekler. “Yaratıcı Kendini İfade Edenler” görsel hikâye anlatmak ve estetik standart oluşturmak ister; güçlü kamera, düzenleme araçları ve özgün tasarım arar.',
          '“Güvenli ve Sade Yaşam İsteyenler” karmaşık teknolojiyle boğuşmadan iletişimde kalmak ve verilerini korumak ister; sade arayüz, güvenlik ve dayanıklılık bekler. “Aykırı ve Statü Odaklı Öncüler” sıradan kalıplardan ayrışmak ve ilk kullanan olmak ister; radikal tasarım, sınırlı üretim ve özel topluluklara değer verir.',
          'Bu ihtiyaç kümeleri hazır olduğunda ürün ekibi hangi özellikleri önceliklendireceğini, iletişim ekibi hangi dili kullanacağını ve medya ekibi kime nerede ulaşacağını daha açık biçimde görebilir.',
        ],
      },
      {
        title: 'Segmentin sağlamlık testi: beş filtre',
        paragraphs: [
          'Her ihtiyaç grubu yaşayabilir bir pazar segmenti değildir. Kullanılabilir bir segment beş temel filtreden geçmelidir: ölçülebilirlik, yeterlilik, erişilebilirlik, ayrıştırılabilirlik ve uygulanabilirlik.',
          'Ölçülebilirlik, ihtiyaca sahip grubun büyüklüğünün ve satın alma gücünün veriyle tahmin edilebilmesidir. Yeterlilik, segmentin kârlı bir operasyonu destekleyecek hacme veya değere sahip olmasıdır. Erişilebilirlik, bu insanlara belirli medya, topluluk, satış noktası veya içerik biçimleriyle ulaşılabilmesidir.',
          'Ayrıştırılabilirlik, segmentlerin farklı teklif ve mesajlara gerçekten farklı tepki vermesidir. İki grup aynı pazarlama programına aynı tepkiyi veriyorsa ayrı segmentler olmayabilir. Uygulanabilirlik ise şirketin bu segmente özel ürün, hizmet ve pazarlama programını hayata geçirecek kaynak ve yetkinliğe sahip olmasıdır.',
        ],
      },
      {
        title: 'Dört yaygın segmentasyon hatası',
        paragraphs: [
          'Birinci hata persona ayrıntılarını stratejinin yerine koymaktır. Bir kişinin kahve tercihini veya burcunu bilmek, ürünü neden satın alacağını açıklamıyorsa kullanılabilir bir ayrım üretmez.',
          'İkinci hata segmentleri statik kabul etmektir. İhtiyaçlar krizler, teknoloji ve yaşam koşullarıyla değişebilir. Üçüncü hata aşırı segmentasyondur; pazarı yönetilemeyecek kadar küçük parçalara ayırmak operasyon ve iletişim maliyetlerini büyütür.',
          'Dördüncü hata ürünü segmente dayatmaktır. Önce ürünü üretip sonra “Bu ürün kime uyar?” diye sormak, ihtiyaç temelli yaklaşımın yönünü tersine çevirir. Süreç ürünle değil, müşterinin çözülmemiş meselesiyle başlamalıdır.',
        ],
      },
      {
        title: 'Pusulayı ihtiyaca çevirmek',
        paragraphs: [
          'Gürültülü pazarlarda müşteriye ulaşmanın en etkili yolu onun kim olduğunu tahmin etmek değil, içinde taşıdığı çözülmemiş meselenin adını koyabilmektir.',
          'İhtiyaç temelli segmentasyon markayı soyut varsayımların konforundan çıkarıp sahanın gerçek sürtünmeleriyle yüzleştirir. Müşteriyi doğum yılıyla değil aradığı faydayla tanımladığınızda iletişim bir reklam olmaktan çıkar ve müşterinin hayatındaki problemin doğal cevabına dönüşür.',
        ],
      },
    ],
    takeaway: 'İhtiyaçla grupla, kimlik işaretleriyle bul, beş filtreyle sınat ve yalnızca yaşayan segmentleri pazarlama karmasına taşı.',
  },
  {
    slug: 'urunu-segmente-dayatmak',
    eyebrow: 'ANLAMLI GRUPLARI GÖR',
    title: 'Ürünü Segmente Dayatmak: Bir Çözümün Kendine Problem Araması Yanılgısı',
    standfirst: 'Ürünü önce üretip ardından ona uygun bir hedef kitle uydurmak, segmentasyonu pazarın gerçeğinden koparıp satış baskısının aracına dönüştürür.',
    readingTime: '17 dk',
    published: true,
    topicSlugs: ['segmentation'],
    sections: [
      {
        title: 'Ters yüz edilmiş STP',
        paragraphs: [
          'Pazarlama tarihinin en pahalı kurumsal yanılgıları genellikle tek bir ters soruyla başlar: “Elimizde böyle bir ürün var; peki biz bunu kime satabiliriz?” Masum bir ticari arayış gibi görünen bu soru, pazarın ihtiyaçlarından kopuşun ilk işaretidir.',
          'Modern pazarlama mimarisinde ürün pazardan sonra gelir. Önce pazarın dinamikleri anlaşılır ve ihtiyaçlar segmentlere ayrılır. Ardından şirketin hizmet edeceği grup seçilir, bu gruba özgü konumlandırma kurulur ve ürün bu değer vaadinin somut karşılığı olarak tasarlanır.',
          'Organizasyonlar bu sırayı tersine çevirdiğinde, müşteri dünyasından kopuk bir ürün geliştirir ve pazarlama ekibinden bitmiş nesneye uygun hedef kitle bulmasını ister. Bu durum geriye dönük segmentasyon, yani ürünü segmente dayatma yanılgısıdır.',
          'STP bir kavram listesi değil, nedensellik zinciridir. Segmentasyon pazardaki farklı acı ve beklentileri gösterir. Hedefleme şirketin hangi gruba üstün değer sunabileceğini seçer. Konumlandırma bu grubun zihninde üstlenilecek benzersiz faydayı belirler. Ürün ise bu üç kararın sonucunda oluşur.',
          'Ürünü önce üretmek, ilacı üretip sonra iyi gelebileceği bir hastalık aramaya benzer. İşletme odağını müşterinin ihtiyacından kendi nesnesine çevirdiğinde tüketiciye hizmet eden organizasyon olmaktan çıkar ve üretim hattını finanse etmeye çalışan bir satış makinesine dönüşür.',
        ],
      },
      {
        title: 'Hayalet persona sendromu',
        paragraphs: [
          'Geriye dönük segmentasyon yapmaya zorlanan ekiplerin en büyük tuzağı, ürünü haklı çıkaracak hayalet personalar yaratmaktır. Özellikler değiştirilemediği için pazarlamacı, birbiriyle ilgisiz bütün özellikleri aynı anda isteyecek hayalî bir profil kurgular.',
          'Gerçek segmentasyon sahadaki gözlemden gerçek sürtünmeye, oradan ortak ihtiyaç kümesine ilerler. Hayalet persona ise üründeki alakasız özelliklerden başlar ve bu özellikleri meşrulaştıracak bir insan tipi icat eder. Bu profil sahada yaşayan müşteri değil, ürün kararlarının savunma metnidir.',
          'Böyle bir kurgu müşteri edinme maliyetini yükseltir; çünkü gerçekte var olmayan veya dağınık bir kitleyi bulmak için bütçe harcanır. Mesaj kimsenin ihtiyacına tam olarak dokunmadığı için dönüşüm zayıflar. Değer oluşmayınca geriye fiyat kırmak ve agresif promosyon yapmak kalır.',
        ],
      },
      {
        title: 'Batık maliyet ve mühendislik aşkı',
        paragraphs: [
          'Rasyonel görünen kurumların bu hatada ısrar etmesinin arkasında davranışsal mekanizmalar bulunur. Bir projeye yatırılan zaman, para ve prestij arttıkça yönetim projenin hatalı olduğunu kabul etmekte zorlanır. Batık maliyet “Artık geri dönemeyiz, pazarlama bir yolunu bulmalı” baskısına dönüşür.',
          'Ürünü geliştiren ekipler kendi çözümlerine duygusal bağ kurabilir. Teknik karmaşıklık veya üretimde harcanan zihinsel çaba, müşterinin algıladığı değerle karıştırılır. Ürün teknik olarak kusursuz olduğu için pazarın onu istemesi gerektiği varsayılır.',
          'Ağır yatırım batık maliyet psikolojisini, bu psikoloji mühendislik aşkını, mühendislik aşkı da pazarlama üzerindeki hedef kitle bulma ve ikna baskısını besler. Böylece saha kanıtları ürün kararını değiştirmek yerine ürünün neden anlaşılmadığını açıklamak için kullanılır.',
        ],
      },
      {
        title: 'Çözümünü arayan iki ürün: Segway ve Iridium',
        paragraphs: [
          'Segway tanıtıldığında şehir ulaşımını değiştirecek bir teknoloji olarak sunuldu. Ürün önce tasarlanmış, ardından kimin kullanacağı aranmıştı. Yayalar için hızlı ve ağır, araç trafiği için yavaş, otomobilde taşımak için hantal ve geniş kitle için pahalı kaldı. Sonunda güvenlik ve turizm gibi dar kullanım alanlarına sıkıştı.',
          'Sorun teknolojinin çalışmaması değil, çözümün pazarın altyapı ve ulaşım ihtiyacından doğmamasıydı. Denge mekanizmasının yapılabilir olması, insanların günlük hayatında yeterince güçlü bir ilerlemeye karşılık gelmiyordu.',
          'Iridium dünyanın farklı noktalarından iletişim sağlamayı amaçlayan büyük bir uydu ağı kurdu. Varsayılan segment, sürekli küresel iletişim isteyen iş insanlarıydı. Fakat cihazlar ağır, bina içinde kullanışsız ve iletişim maliyeti yüksekti. Aynı dönemde yerel mobil ağlar ve dolaşım anlaşmaları şehirlerdeki gerçek ihtiyacı daha kolay biçimde çözüyordu.',
          'Her iki vaka da teknolojik gücün pazar ihtiyacının yerine geçemeyeceğini gösterir. Ürünün yetenekleri müşterinin yaşadığı gerçek sürtünmeyle kesişmiyorsa, sonradan yazılan segment tanımı yalnızca yatırım kararını rasyonalize eder.',
        ],
      },
      {
        title: 'Dört aşamalı kurtarma ve dönüştürme protokolü',
        paragraphs: [
          'Masaya müşteri ihtiyacından kopuk, bitmiş bir ürün geldiğinde pazarlamacı teslim olmak veya hayalet persona üretmek zorunda değildir. İlk adım çözüm sökümüdür: Ürün teknik terimlerinden ve broşür dilinden arındırılır, gerçekte ürettiği en yalın fonksiyonel çıktı yazılır.',
          'İkinci adım gerçek sürtünme taramasıdır. Bu fonksiyonel çıktı olmasaydı kim zaman, para veya itibar kaybederdi? Kimse anlamlı bir kayıp yaşamıyorsa ürünün pazar karşılığı zayıftır. Belirli bir grup ciddi bir bedel ödüyorsa gerçek problem yakalanmış olabilir.',
          'Üçüncü adım radikal özellik budamasıdır. Geriye dönük ürünler çoğu zaman gereksiz özelliklerle doludur. Gerçek acıyı çözen çekirdek parça öne çıkarılır, diğer özellikler ikincil hale getirilir ve ürün belirli probleme odaklanan daha sade bir çözüm olarak yeniden paketlenir.',
          'Dördüncü adım çaresiz segmenti izole etmektir. Ürünü genel kitleye sevdirmeye çalışmak yerine, problemin acısını en yoğun yaşayan ve yeterli alternatifi bulunmayan küçük grup aranır. Bu grup çözümü “olsa iyi olur” diye değil, gerçek bir kaybı önlemek için ister.',
        ],
      },
      {
        title: 'Pazar odaklı ürün geliştirme kültürü',
        paragraphs: [
          'Aynı yanılgının tekrarlanmaması için pazarlamanın kurum içindeki rolü ürün tamamlandıktan sonra iletişim yapmakla sınırlı kalmamalıdır. Pazarlama, sahadan doğrulanmış ihtiyaç ve fırsatı getirerek ürün geliştirme sürecini başlatan işlev olmalıdır.',
          'Kapalı devre ve uzun geliştirme dönemleri yerine çekirdek hipotez, minimum uygulanabilir ürünlerle erkenden sınanmalıdır. Ürün ve araştırma ekipleri sürekli müşteri geri bildirimiyle birlikte çalışmalı; kanıtlanmayan varsayımlar üretim kararına dönüşmemelidir.',
          'Müşteri içgörüsü taşımayan ve yalnızca teknik olarak yapılabildiği için başlatılan projelerde pazarlama liderliği kurumsal bir filtre görevi görmelidir. Doğru yapı fikirden üretime doğrusal ilerlemez; ihtiyaç, prototip, saha öğrenmesi ve yeniden tasarım arasında döngü kurar.',
        ],
      },
      {
        title: 'İhtiyacın emrinde bir ürün tasarımı',
        paragraphs: [
          'Pazarlama, üretilmiş bir kusuru retorikle örtbas etme mesleği değildir. En büyük israf, müşterinin umursamadığı bir nesneyi satmak için büyük ikna kampanyaları kurmaktır.',
          'Ürünü segmente dayatmak pazarın çekim gücünü görmezden gelmektir. Gerçek pazarlama ustalığı pazardaki boşluğu, acıyı ve karşılanmamış beklentiyi belirlemek; ardından bu boşluğa oturan çözümü tasarlamaktır.',
          'Doğru ihtiyaç bulunup doğru segmente odaklanıldığında ürünün kimseye dayatılması gerekmez. Çözüm, insanların hayatlarında eksikliğini hissettikleri parçanın doğal karşılığına dönüşür.',
        ],
      },
    ],
    takeaway: 'Ürün için segment uydurma; ihtiyacı kanıtla, çözümü söküp yeniden odakla ve ürünü pazarın gerçek sürtünmesinin emrine ver.',
  },
  {
    slug: 'positioning-is-a-reason-to-choose',
    eyebrow: 'DEĞERİ KUR',
    title: 'Konumlandırma slogan değil, tercih sebebidir.',
    standfirst: 'İyi bir konumlandırma markanın ne söylediğini değil, müşterinin neden onu seçebildiğini açıklar.',
    readingTime: '7 dk',
    topicSlugs: ['positioning', 'brand-and-value-proposition'],
    sections: [
      {
        title: 'Zihinde bir yer edinmek yetmez',
        paragraphs: [
          'Hatırlanmak ile tercih edilmek aynı sonuç değildir. Konumlandırma, markayı doğru referans çerçevesine yerleştirirken anlamlı ve savunulabilir bir farklılık sunmalıdır.',
        ],
      },
      {
        title: 'Söz, kanıt ve deneyim aynı çizgide olmalı',
        paragraphs: [
          'İletişimde verilen vaat ürün, fiyat, kanal ve hizmet deneyiminde karşılık bulmuyorsa konumlandırma yalnızca bir metin çalışması olarak kalır.',
        ],
      },
    ],
    takeaway: 'Konumlandırmayı tek cümleyle değil; seçim, vaat, kanıt ve deneyim tutarlılığıyla değerlendir.',
  },
];

export function getEditorialTopics(locale = 'tr') {
  const normalized = normalizeEditorialLocale(locale);
  return editorialTopics.map((topic) => {
    if (normalized === 'tr') return topic;
    return { ...topic, ...(topicTranslations[normalized][topic.slug] || {}) };
  });
}

export function getEditorialTopic(slug: string, locale = 'tr') {
  return getEditorialTopics(locale).find((topic) => topic.slug === slug);
}

export function getEditorialArticle(slug: string, locale = 'tr') {
  const canonicalSlug = resolveEditorialArticleSlug(slug);
  const article = editorialArticles.find((item) => item.slug === canonicalSlug);
  if (!article) return undefined;
  const normalized = normalizeEditorialLocale(locale);
  if (normalized === 'tr') return { ...article, slug: getLocalizedArticleSlug(article.slug, normalized) };
  if (normalized === 'ru') return undefined;
  const translation = articleTranslationsEn[canonicalSlug];
  return translation ? { ...article, ...translation, slug: getLocalizedArticleSlug(article.slug, normalized) } : undefined;
}

export function getPublishedEditorialArticles(locale = 'tr') {
  return editorialArticles
    .filter((article) => article.published)
    .map((article) => getEditorialArticle(article.slug, locale))
    .filter((article) => article !== undefined);
}
