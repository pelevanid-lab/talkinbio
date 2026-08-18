import type { RoutingLocale } from '@/i18n/locales';

type Block =
  | { type: 'paragraph'; text: string; conclusion?: boolean }
  | { type: 'diagram'; text: string }
  | { type: 'list'; items: { label: string; text: string }[] }
  | { type: 'table'; headers: string[]; rows: string[][] };

type ArticleContent = {
  standfirst: string;
  intro?: string;
  sections: { label: string; heading: string; blocks: Block[] }[];
};

export type AdReviewKey = 'fuseTea' | 'oppoHamam';

export const adReviewArticleContent = {
  fuseTea: {
    tr: {
      standfirst: 'Fusetea’nın “Budur” temalı şeftali reklamı; Kotler ve Keller’ın Değer Önerisi, Christensen’in Jobs-to-be-Done ve Friestad ile Wright’ın İkna Bilgisi Modeli yaklaşımlarını tek potada eriten çok katmanlı bir vaka örneğidir.',
      intro: 'Reklam, ürünü izleyicinin gözüne zorla sokan satış miyopluğuna düşmek yerine tüketici şüphesini bir meta-reklam hamlesiyle silahsızlandırır ve saf ürün deneyimine odaklanır.',
      sections: [
        { label: '01 · İHTİYAÇ VE GERİLİM', heading: 'İhtiyaç, istek ve içsel gerilim', blocks: [
          { type: 'paragraph', text: 'Kurgu, temel biyolojik ihtiyaç ile bu ihtiyacın kültürel ve duyusal tatmini arasında bir köprü kurar.' },
          { type: 'diagram', text: 'TEMEL İHTİYAÇ\nHararet, susuzluk ve enerji düşüşü\n          ↓\nSEKTÖREL TAVİZ\nSu ferahlatır ama lezzetsizdir. Gazlı içecek lezzetlidir ama ağırdır.\n          ↓\nFUSETEA ÇÖZÜMÜ\nÇay ve meyvenin hafif füzyonu: “Budur!”' },
          { type: 'paragraph', text: 'İlk yudumdaki rahatlama, “Tam olarak aradığım hafif ferahlama buydu” onayını görünür kılar.' },
        ] },
        { label: '02 · JOBS-TO-BE-DONE', heading: 'Çözülmesi gereken iş', blocks: [
          { type: 'paragraph', text: 'Tüketici soğuk çayı yalnızca sıvı almak için tüketmez; ürünü üç ayrı ilerleme için işe alır.' },
          { type: 'list', items: [
            { label: 'Fonksiyonel iş', text: 'Sıcak havada veya yoğun tempoda harareti kesmek.' },
            { label: 'Duygusal iş', text: 'Ağır içeceklerin suçluluk hissi olmadan kendini ödüllendirmek.' },
            { label: 'Sosyal iş', text: 'Enerjik ve güncel bir tercihle molanın tadını çıkarmak.' },
          ] },
        ] },
        { label: '03 · KIRILMA ANI', heading: '“Boşver sen bu reklamı” ve savunma kalkanını indirmek', blocks: [
          { type: 'paragraph', text: 'Karakterin kameraya dönüp dördüncü duvarı yıkması rastgele bir espri değil, tüketici direncini hedefleyen stratejik bir sıçramadır.' },
          { type: 'diagram', text: 'GELENEKSEL REKLAM\nCilalı prodüksiyon → “Beni kandırıyorlar” şüphesi → Direnç\n\nFUSETEA META-REKLAMI\n“Boşver reklamı” → İkna filtresini baypas et → Ürün gerçeği' },
          { type: 'list', items: [
            { label: 'İkna bilgisini nötrleme', text: 'Reklam kendi yapaylığını ifşa ederek tüketicinin gardını düşürür.' },
            { label: 'Ürün gerçeğine güven', text: 'Marka, prodüksiyondan çok ilk yudumun deneyimine güvenir.' },
            { label: 'Postmodern samimiyet', text: 'Kendisiyle dalga geçebilen marka dili, aşırı cilalı anlatıya mesafeli tüketiciyle bağ kurar.' },
          ] },
        ] },
        { label: '04 · POP VE POD', heading: 'Eşitlik ve farklılaşma noktaları', blocks: [
          { type: 'table', headers: ['Stratejik unsur', 'Reklamdaki karşılığı', 'Zihindeki etkisi'], rows: [
            ['POP', 'Buz gibi kutu, şeftali ve ferahlatıcı içecek formatı.', '“Susadığımda bunu da seçebilirim.”'],
            ['Ürün POD’si', 'Çay yaprakları ile şeftali aromasının dengeli füzyonu.', 'Ne meyve suyu kadar ağır ne de sade çay kadar kuru.'],
            ['İletişim POD’si', '“Boşver reklamı” tavrı ve “Budur!” nidası.', 'Kararsızlık anında çalışan kısa bir zihinsel refleks.'],
          ] },
        ] },
        { label: '05 · CBBE PİRAMİDİ', heading: 'Belirginlikten rezonansa', blocks: [
          { type: 'diagram', text: 'REZONANS       “Benim ferahlama tercihim Fusetea”\n     ↑\nTEPKİ & HİSLER Samimiyet, rahatlama, hafiflik\n     ↑\nYARGI & İMAJ   Doğal çay, meyve tazeliği, dürüst marka\n     ↑\nBELİRGİNLİK    Sıcak ve kararsızlık anı: “Budur!”' },
          { type: 'paragraph', text: 'Kutunun açılış sesi, terleyen yüzey ve şeftalinin canlılığı susuzluk anıyla eşleşir; sokak dilindeki “Budur” ise anlık tatmini kalıcı bir marka işaretine dönüştürür.' },
        ] },
        { label: 'SONUÇ', heading: 'Reklamın illüzyonunu bozup kararı hızlandırmak', blocks: [
          { type: 'paragraph', conclusion: true, text: 'Kampanya, gazlı içeceklerin ağırlığı ile suyun tatsızlığı arasındaki ferahlama gerilimini teşhis eder. Reklam kendi illüzyonunu bozarak tüketiciyle dürüst bir bağ kurar ve kararı hızlı, sezgisel zihnin refleksine bırakır.' },
        ] },
      ],
    },
    en: {
      standfirst: 'Fusetea’s peach-flavoured “Budur” commercial brings together Kotler and Keller’s value proposition, Christensen’s Jobs-to-be-Done, and Friestad and Wright’s Persuasion Knowledge Model in one layered case.',
      intro: 'Instead of forcing the product into view, the film disarms scepticism through a meta-advertising move and redirects attention to the product experience itself.',
      sections: [
        { label: '01 · NEED AND TENSION', heading: 'Need, desire, and inner tension', blocks: [
          { type: 'paragraph', text: 'The story connects a basic physiological need with the cultural and sensory form through which people want it satisfied.' },
          { type: 'diagram', text: 'BASIC NEED\nHeat, thirst, and an afternoon energy dip\n          ↓\nCATEGORY TRADE-OFF\nWater refreshes but lacks flavour. Soda tastes good but feels heavy.\n          ↓\nFUSETEA SOLUTION\nA light fusion of tea and fruit: “That’s it.”' },
          { type: 'paragraph', text: 'The relief in the first sip turns an unspoken judgement into a visible one: this is precisely the light refreshment I was looking for.' },
        ] },
        { label: '02 · JOBS-TO-BE-DONE', heading: 'The job that needs doing', blocks: [
          { type: 'paragraph', text: 'People do not hire iced tea merely to consume liquid. The ad frames three kinds of progress.' },
          { type: 'list', items: [
            { label: 'Functional job', text: 'Cool down quickly in hot weather or during a demanding day.' },
            { label: 'Emotional job', text: 'Enjoy a fruity reward without the heaviness associated with sugary drinks.' },
            { label: 'Social job', text: 'Make the break feel energetic, current, and expressive.' },
          ] },
        ] },
        { label: '03 · THE TURN', heading: '“Forget the ad” lowers the shield', blocks: [
          { type: 'paragraph', text: 'When the character looks into the camera and breaks the fourth wall, the joke becomes a deliberate piece of persuasion design.' },
          { type: 'diagram', text: 'CONVENTIONAL AD\nPolished production → “They are trying to sell me” → Resistance\n\nFUSETEA META-AD\n“Forget the ad” → Bypass the persuasion filter → Product truth' },
          { type: 'list', items: [
            { label: 'Neutralising persuasion knowledge', text: 'By admitting its own artifice, the ad places the brand and viewer on the same side.' },
            { label: 'Confidence in the product', text: 'The brand trusts the first sip more than the spectacle around it.' },
            { label: 'Postmodern sincerity', text: 'A brand willing to mock itself feels more credible to audiences wary of polished corporate language.' },
          ] },
        ] },
        { label: '04 · POP AND POD', heading: 'Points of parity and difference', blocks: [
          { type: 'table', headers: ['Strategic element', 'Expression in the ad', 'Effect in the mind'], rows: [
            ['POP', 'A cold can, peach cues, and a refreshing drink format.', '“This is another option when I am thirsty.”'],
            ['Product POD', 'A balanced fusion of tea leaves and peach flavour.', 'Neither as heavy as juice nor as dry as plain tea.'],
            ['Communication POD', 'The “forget the ad” attitude and the “Budur” exclamation.', 'A fast mental shortcut at the moment of choice.'],
          ] },
        ] },
        { label: '05 · CBBE PYRAMID', heading: 'From salience to resonance', blocks: [
          { type: 'diagram', text: 'RESONANCE      “Fusetea is my refreshment choice”\n     ↑\nFEELINGS        Sincerity, relief, lightness\n     ↑\nJUDGEMENT       Natural tea, fresh fruit, an honest brand\n     ↑\nSALIENCE        Heat and indecision: “Budur”' },
          { type: 'paragraph', text: 'The can opening, condensation, and vivid peach cues attach the brand to thirst, while the colloquial “Budur” turns immediate satisfaction into a lasting memory device.' },
        ] },
        { label: 'CONCLUSION', heading: 'Breaking the illusion to speed up the decision', blocks: [
          { type: 'paragraph', conclusion: true, text: 'The campaign identifies the tension between heavy carbonated drinks and flavourless water. By exposing the illusion of advertising, it builds an unusually candid relationship and lets the fast, intuitive mind complete the choice.' },
        ] },
      ],
    },
    ru: {
      standfirst: 'Персиковая кампания Fusetea «Budur» объединяет ценностное предложение Котлера и Келлера, Jobs-to-be-Done Кристенсена и модель знания об убеждении Фристад и Райта.',
      intro: 'Вместо того чтобы навязывать продукт, ролик обезоруживает скепсис приемом метарекламы и возвращает внимание к самому опыту потребления.',
      sections: [
        { label: '01 · ПОТРЕБНОСТЬ И НАПРЯЖЕНИЕ', heading: 'Потребность, желание и внутреннее напряжение', blocks: [
          { type: 'paragraph', text: 'Сюжет соединяет базовую физиологическую потребность с культурной и чувственной формой ее удовлетворения.' },
          { type: 'diagram', text: 'БАЗОВАЯ ПОТРЕБНОСТЬ\nЖара, жажда и спад энергии\n          ↓\nКОМПРОМИСС КАТЕГОРИИ\nВода освежает, но безвкусна. Газировка вкусная, но тяжелая.\n          ↓\nРЕШЕНИЕ FUSETEA\nЛегкое сочетание чая и фруктов: «Вот оно».' },
          { type: 'paragraph', text: 'Облегчение после первого глотка делает видимым внутреннее подтверждение: это именно та легкая свежесть, которую я искал.' },
        ] },
        { label: '02 · JOBS-TO-BE-DONE', heading: 'Работа, которую должен выполнить продукт', blocks: [
          { type: 'paragraph', text: 'Холодный чай нанимают не просто ради жидкости. Реклама показывает три вида желаемого прогресса.' },
          { type: 'list', items: [
            { label: 'Функциональная работа', text: 'Быстро освежиться в жару или во время напряженного дня.' },
            { label: 'Эмоциональная работа', text: 'Порадовать себя фруктовым вкусом без ощущения тяжести.' },
            { label: 'Социальная работа', text: 'Сделать перерыв энергичным, современным и выразительным.' },
          ] },
        ] },
        { label: '03 · ПОВОРОТ', heading: '«Забудь про рекламу» снимает защиту', blocks: [
          { type: 'paragraph', text: 'Взгляд героя в камеру и разрушение четвертой стены — не случайная шутка, а продуманная механика убеждения.' },
          { type: 'diagram', text: 'ОБЫЧНАЯ РЕКЛАМА\nГлянцевая постановка → «Мне что-то продают» → Сопротивление\n\nМЕТАРЕКЛАМА FUSETEA\n«Забудь про рекламу» → Обойти фильтр убеждения → Правда продукта' },
          { type: 'list', items: [
            { label: 'Нейтрализация знания об убеждении', text: 'Признав собственную искусственность, реклама ставит бренд и зрителя по одну сторону.' },
            { label: 'Уверенность в продукте', text: 'Бренд доверяет первому глотку больше, чем зрелищу вокруг него.' },
            { label: 'Постмодернистская искренность', text: 'Самоирония убедительнее отполированного корпоративного языка.' },
          ] },
        ] },
        { label: '04 · POP И POD', heading: 'Точки паритета и отличия', blocks: [
          { type: 'table', headers: ['Элемент', 'Воплощение', 'Эффект'], rows: [
            ['POP', 'Холодная банка, персик и освежающий формат.', '«Это еще один вариант, когда хочется пить».'],
            ['POD продукта', 'Баланс чайных листьев и персикового вкуса.', 'Не такой тяжелый, как сок, и не такой сухой, как чай.'],
            ['POD коммуникации', 'Фраза «забудь про рекламу» и возглас «Budur».', 'Быстрая ментальная подсказка в момент выбора.'],
          ] },
        ] },
        { label: '05 · ПИРАМИДА CBBE', heading: 'От заметности к резонансу', blocks: [
          { type: 'diagram', text: 'РЕЗОНАНС       «Fusetea — мой выбор для свежести»\n     ↑\nЧУВСТВА         Искренность, облегчение, легкость\n     ↑\nОБРАЗ           Натуральный чай, свежие фрукты, честный бренд\n     ↑\nЗАМЕТНОСТЬ      Жара и сомнение: «Budur»' },
          { type: 'paragraph', text: 'Звук открывающейся банки, конденсат и персик связывают бренд с жаждой, а разговорное «Budur» превращает мгновенное удовольствие в устойчивый знак памяти.' },
        ] },
        { label: 'ВЫВОД', heading: 'Разрушить иллюзию и ускорить решение', blocks: [
          { type: 'paragraph', conclusion: true, text: 'Кампания точно находит напряжение между тяжелой газировкой и безвкусной водой. Раскрывая иллюзию рекламы, она строит честную связь и передает выбор быстрому, интуитивному мышлению.' },
        ] },
      ],
    },
  },
  oppoHamam: {
    tr: {
      standfirst: 'OPPO’nun hamam temalı reklamı, ihtiyacı görmek yerine ürünü yapay bir bağlama dayatmanın ve kültürel yerelleştirmeyi klişeyle karıştırmanın öğretici bir negatif vaka örneğidir.',
      intro: 'Fusetea’nın organik içgörüsünün aksine bu film, Keller, Kotler ve Christensen modelleri açısından dört temel noktada stratejik tıkanıklık yaşar.',
      sections: [
        { label: '01 · CBBE MODELİ', heading: '“Gürültü” ile “marka değeri”ni karıştırmak', blocks: [
          { type: 'paragraph', text: 'Bir teknoloji markası güvenilirlik, inovasyon, estetik ve mühendislik algısı inşa etmelidir. Hamam klişesi dikkat üretir, fakat ürünün premium anlamını beslemez.' },
          { type: 'diagram', text: 'REZONANS       Oluşmuyor: izleyici tiplemeyle kalıcı bağ kuramıyor\n     ↑\nYARGI / İMAJ   Zedeleniyor: premium teknoloji algısı sulanıyor\n     ↑\nBELİRGİNLİK    Yüzeysel dikkat: akılda kalan hamam şakası' },
          { type: 'list', items: [
            { label: 'Yapay yerelleştirme', text: 'Hamam, tellak ve göbek taşı kültürel yakınlık yerine kolaycı bir Türkiye dekoruna dönüşüyor.' },
            { label: 'İmaj aşınması', text: 'İzleyici gülebilir; ancak ciddi bir teknoloji yatırımında aradığı itibar ve uzmanlık sinyalini alamaz.' },
          ] },
        ] },
        { label: '02 · JOBS-TO-BE-DONE', heading: 'Bağlamsal absürtlük', blocks: [
          { type: 'paragraph', text: 'Tüketici telefonu gündelik hayatındaki somut bir işi çözmek için işe alır. Hamamda köpükler arasında selfie çekmek ise yaygın ve inandırıcı bir kullanım bağlamı değildir.' },
          { type: 'diagram', text: 'GERÇEK İŞLER\nAz ışıkta net fotoğraf çekmek; kısa sürede şarj olup toplantıya yetişmek\n\n                 VS.\n\nKURGUSAL BAĞLAM\nGöbek taşında kese yapılırken buhar içinde selfie çekmek' },
          { type: 'paragraph', text: 'Kamera, dayanıklılık veya hızlı şarj gösterilse bile sahne tüketicinin gerçek sürtünmesiyle eşleşmediği için fayda gündelik hayata taşınamaz.' },
        ] },
        { label: '03 · VAMPİR ETKİSİ', heading: 'Mizahın ürünü yutması', blocks: [
          { type: 'paragraph', text: 'Skeç ve kültürel tipleme ürünün değer önerisinden daha baskın hale geldiğinde mizah dikkati markaya taşımak yerine onu emer.' },
          { type: 'table', headers: ['Hatırlanan', 'Unutulan değer'], rows: [
            ['Tellak ve hamam esprileri', 'Telefonun model adı'],
            ['Göbek taşı ve köpük şakası', 'Kameranın teknik üstünlüğü'],
            ['Skeç formatı', 'Fiyat-fayda ve tasarım vaadi'],
          ] },
        ] },
        { label: '04 · POP VE POD', heading: 'Standart özellikleri farklılık sanmak', blocks: [
          { type: 'paragraph', text: 'Fotoğraf çekmek, şarj olmak ve parlak ekran kategori eşitlik noktalarıdır. Reklam bunları güçlü bir farklılaşma noktasına çevirmek yerine hamam metaforuyla daha yüksek sesle sunar.' },
          { type: 'paragraph', text: 'Bu, üründe ayırt edici bir tüketici değeri bulunamadığında iletişimin gösteriye sığındığı klasik satış miyopluğudur.' },
        ] },
        { label: '05 · VAKA KARŞILAŞTIRMASI', heading: 'Fusetea ve OPPO arasındaki stratejik fark', blocks: [
          { type: 'table', headers: ['Kriter', 'Fusetea', 'OPPO'], rows: [
            ['Tüketici içgörüsü', 'Organik: hararet ve hafiflik', 'Yapay: hamamda telefon ihtiyacı'],
            ['Yaklaşım', 'Samimi ve şeffaf', 'Klişe ve zorlama yerelleştirme'],
            ['Ürün bağlantısı', 'İlk yudumdaki ferahlama', 'Skeç arkasına sıkışan donanım'],
            ['Zihinde kalan', '“Budur” ve Fusetea', 'Tellak ve hamam esprisi'],
            ['Pazarlama yaklaşımı', 'Değer ve algı inşası', 'Gürültü ve skeç pazarlaması'],
          ] },
        ] },
        { label: 'SONUÇ', heading: 'Dikkat çekmek, değer kurmak değildir', blocks: [
          { type: 'paragraph', conclusion: true, text: 'OPPO filmi izlenirlik ve kısa süreli sosyal konuşma yaratabilir; fakat ihtiyacı doğru okuma, sürdürülebilir marka değeri ve stratejik konumlandırma sınavında ürünü yapay bağlama dayatan zayıf bir strateji olarak kalır.' },
        ] },
      ],
    },
    en: {
      standfirst: 'OPPO’s hammam-themed commercial is a useful negative case: it forces a product into an invented context instead of uncovering a real need, and mistakes cultural localisation for cliché.',
      intro: 'Unlike Fusetea’s organic insight, the film runs into four strategic dead ends when viewed through Keller, Kotler, and Christensen.',
      sections: [
        { label: '01 · THE CBBE MODEL', heading: 'Mistaking noise for brand equity', blocks: [
          { type: 'paragraph', text: 'A technology brand must build reliability, innovation, aesthetics, and engineering authority. The hammam cliché creates attention but contributes little to premium brand meaning.' },
          { type: 'diagram', text: 'RESONANCE      Missing: no lasting bond with the caricature\n     ↑\nJUDGEMENT      Weakened: premium technology is diluted\n     ↑\nSALIENCE       Shallow attention: the bathhouse joke survives' },
          { type: 'list', items: [
            { label: 'Forced localisation', text: 'The hammam, attendant, and marble slab become an easy costume for “Turkey” rather than a meaningful cultural connection.' },
            { label: 'Image erosion', text: 'The audience may laugh, yet receives little of the status or expertise expected from a serious technology purchase.' },
          ] },
        ] },
        { label: '02 · JOBS-TO-BE-DONE', heading: 'Contextual absurdity', blocks: [
          { type: 'paragraph', text: 'People hire a phone to make progress in concrete situations. Taking a steamy selfie while being scrubbed in a hammam is neither a common nor a credible job.' },
          { type: 'diagram', text: 'REAL JOBS\nCapture a clear low-light group photo; gain enough charge to reach a meeting\n\n                 VS.\n\nINVENTED CONTEXT\nTake a selfie through steam while lying on a hammam slab' },
          { type: 'paragraph', text: 'Even if the scene intends to demonstrate camera quality, durability, or fast charging, the benefit cannot travel into everyday life because the context does not match real friction.' },
        ] },
        { label: '03 · THE VAMPIRE EFFECT', heading: 'When humour consumes the product', blocks: [
          { type: 'paragraph', text: 'Once the sketch and cultural character become stronger than the value proposition, humour stops transferring attention to the brand and begins draining it.' },
          { type: 'table', headers: ['Remembered', 'Lost value'], rows: [
            ['The attendant and hammam jokes', 'The phone model'],
            ['Foam and marble-slab humour', 'The camera’s technical advantage'],
            ['The sketch format', 'The price-value and design promise'],
          ] },
        ] },
        { label: '04 · POP AND POD', heading: 'Presenting standard features as difference', blocks: [
          { type: 'paragraph', text: 'Taking photos, charging, and screen brightness are category points of parity. The film does not turn them into a meaningful point of difference; it merely amplifies them through a hammam metaphor.' },
          { type: 'paragraph', text: 'This is classic marketing myopia: when no distinctive customer value is found in the product, communication retreats into spectacle.' },
        ] },
        { label: '05 · CASE COMPARISON', heading: 'The strategic gap between Fusetea and OPPO', blocks: [
          { type: 'table', headers: ['Criterion', 'Fusetea', 'OPPO'], rows: [
            ['Consumer insight', 'Organic: heat and lightness', 'Invented: a phone need in a hammam'],
            ['Approach', 'Candid and transparent', 'Clichéd, forced localisation'],
            ['Product connection', 'Refreshment in the first sip', 'Hardware trapped behind the sketch'],
            ['What remains', '“Budur” and Fusetea', 'The attendant and bathhouse joke'],
            ['Marketing logic', 'Building value and perception', 'Noise and sketch marketing'],
          ] },
        ] },
        { label: 'CONCLUSION', heading: 'Attention is not the same as value', blocks: [
          { type: 'paragraph', conclusion: true, text: 'The film may earn views and brief social chatter. Yet on the harder tests of reading need, building durable brand equity, and positioning strategically, it remains a weak strategy that forces the product into an artificial setting.' },
        ] },
      ],
    },
    ru: {
      standfirst: 'Реклама OPPO в турецкой бане — показательный негативный кейс: продукт помещают в искусственный контекст вместо поиска реальной потребности, а культурную локализацию подменяют клише.',
      intro: 'В отличие от органичного инсайта Fusetea, этот ролик упирается в четыре стратегических тупика с точки зрения Келлера, Котлера и Кристенсена.',
      sections: [
        { label: '01 · МОДЕЛЬ CBBE', heading: 'Путать шум с капиталом бренда', blocks: [
          { type: 'paragraph', text: 'Технологический бренд должен укреплять надежность, инновационность, эстетику и инженерную компетентность. Клише хаммама привлекает внимание, но не создает премиального смысла.' },
          { type: 'diagram', text: 'РЕЗОНАНС       Нет устойчивой связи с карикатурным образом\n     ↑\nОЦЕНКА / ОБРАЗ Ослаблены: премиальность размывается\n     ↑\nЗАМЕТНОСТЬ     Поверхностна: остается шутка про баню' },
          { type: 'list', items: [
            { label: 'Насильственная локализация', text: 'Хаммам, банщик и каменная лежанка превращаются в простой костюм «Турции», а не в содержательную культурную связь.' },
            { label: 'Эрозия образа', text: 'Зритель может улыбнуться, но не получает сигнала статуса и экспертизы, ожидаемого от серьезной покупки.' },
          ] },
        ] },
        { label: '02 · JOBS-TO-BE-DONE', heading: 'Абсурдность контекста', blocks: [
          { type: 'paragraph', text: 'Телефон нанимают для прогресса в реальных ситуациях. Селфи в пару во время банной процедуры — не распространенная и не убедительная работа.' },
          { type: 'diagram', text: 'РЕАЛЬНЫЕ ЗАДАЧИ\nСнять четкое фото при слабом свете; быстро зарядиться перед встречей\n\n                 ПРОТИВ\n\nВЫДУМАННЫЙ КОНТЕКСТ\nСделать селфи в пару, лежа на камне в хаммаме' },
          { type: 'paragraph', text: 'Даже если авторы хотели показать камеру, надежность или быструю зарядку, польза не переносится в повседневность: сцена не совпадает с реальным затруднением.' },
        ] },
        { label: '03 · ЭФФЕКТ ВАМПИРА', heading: 'Когда юмор поглощает продукт', blocks: [
          { type: 'paragraph', text: 'Если скетч и культурный персонаж сильнее ценностного предложения, юмор перестает передавать внимание бренду и начинает высасывать его.' },
          { type: 'table', headers: ['Запомнилось', 'Потерянная ценность'], rows: [
            ['Банщик и шутки про хаммам', 'Модель телефона'],
            ['Пена и каменная лежанка', 'Техническое преимущество камеры'],
            ['Формат скетча', 'Обещание дизайна и выгоды'],
          ] },
        ] },
        { label: '04 · POP И POD', heading: 'Выдавать стандартные функции за отличие', blocks: [
          { type: 'paragraph', text: 'Фото, зарядка и яркий экран — точки паритета категории. Реклама не превращает их в значимое отличие, а лишь усиливает метафорой хаммама.' },
          { type: 'paragraph', text: 'Это классическая маркетинговая близорукость: не найдя особой потребительской ценности, коммуникация прячется в зрелище.' },
        ] },
        { label: '05 · СРАВНЕНИЕ КЕЙСОВ', heading: 'Стратегическая разница между Fusetea и OPPO', blocks: [
          { type: 'table', headers: ['Критерий', 'Fusetea', 'OPPO'], rows: [
            ['Инсайт', 'Органичный: жара и легкость', 'Вымышленный: телефон нужен в хаммаме'],
            ['Подход', 'Открытый и искренний', 'Клише и натянутая локализация'],
            ['Связь с продуктом', 'Свежесть первого глотка', 'Функции спрятаны за скетчем'],
            ['Что остается', '«Budur» и Fusetea', 'Банщик и шутка про баню'],
            ['Логика маркетинга', 'Создание ценности и восприятия', 'Шум и скетч'],
          ] },
        ] },
        { label: 'ВЫВОД', heading: 'Внимание еще не означает ценность', blocks: [
          { type: 'paragraph', conclusion: true, text: 'Ролик способен собрать просмотры и короткое обсуждение. Но в чтении потребности, создании устойчивого капитала бренда и позиционировании он остается слабой стратегией, которая навязывает продукт искусственному контексту.' },
        ] },
      ],
    },
  },
} satisfies Record<AdReviewKey, Record<RoutingLocale, ArticleContent>>;
