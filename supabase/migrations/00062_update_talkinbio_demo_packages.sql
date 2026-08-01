-- Refresh the reserved talkinbio demo page after the product positioning and credit-package update.
-- The public page reads these rows directly, so this keeps the dogfood profile in sync with pricing.

update public.businesses
set
  category = 'Ziyaretçiye Göre Açılan Web Sitesi',
  contact_method = 'email',
  contact_value = '{"whatsapp":"","instagram":"","email":"info@talkinbio.com","telegram":""}'
where id = '11111111-1111-1111-1111-111111111111'::uuid;

update public.blocks
set content = $${
  "tr": {
    "title": "Hakkında",
    "text": "[[Talkinbio|#14231F]], sosyal medya bio linkinizi ziyaretçinin sorusuna göre açılan premium bir web sitesine dönüştürür. Ziyaretçi bir hizmeti, fiyatı, randevu sürecini veya iletişim kanalını sorduğunda sayfa sadece sohbet cevabı vermez; cevabın olduğu bölümü açar ve gerekiyorsa bilgiyi yazılı olarak gösterir.\n\nSağ alttaki asistan gerçek ürünün kendisidir. Bir şey sorun; sayfanın sizi cevabın olduğu yere nasıl götürdüğünü deneyin."
  },
  "en": {
    "title": "About",
    "text": "[[Talkinbio|#14231F]] turns your social bio link into a premium website that opens around each visitor's question. When someone asks about a service, price, booking flow, or contact channel, the page does not only answer in chat; it opens the part of the site where the answer lives and shows written details when needed.\n\nThe assistant in the bottom-right corner is the real product. Ask something and see how the page takes you to the right place."
  },
  "ru": {
    "title": "О нас",
    "text": "[[Talkinbio|#14231F]] превращает ссылку в био в премиальный сайт, который открывается под вопрос посетителя. Когда человек спрашивает об услуге, цене, записи или способе связи, страница не просто отвечает в чате; она открывает нужный раздел сайта и при необходимости показывает информацию письменно.\n\nАссистент в правом нижнем углу — настоящий продукт. Задайте вопрос и посмотрите, как страница ведет вас к нужному месту."
  },
  "mediaUrl": "https://spjylpncgisogfxuiodl.supabase.co/storage/v1/object/public/media/5n2rov9g41x_1784833158547.svg",
  "layoutVariant": "standard",
  "mediaPosition": "top",
  "backgroundImage": "",
  "backgroundOverlay": "light"
}$$::jsonb
where business_id = '11111111-1111-1111-1111-111111111111'::uuid
  and type = 'about';

update public.blocks
set content = $${
  "tr": {"title": "Neler Yapabilir"},
  "en": {"title": "What It Can Do"},
  "ru": {"title": "Что умеет"},
  "layoutVariant": "list",
  "items": [
    {
      "id": "adaptive-page",
      "tr": {"title": "1. Ziyaretçiye göre sayfayı açar", "description": "Ziyaretçi ne sorarsa sayfa ilgili hizmeti, paketi, bağlantıyı veya iletişim bölümünü açar."},
      "en": {"title": "1. Opens the page around the visitor", "description": "Whatever the visitor asks, the page opens the relevant service, package, link, or contact section."},
      "ru": {"title": "1. Открывает страницу под посетителя", "description": "Что бы ни спросил посетитель, страница открывает нужную услугу, пакет, ссылку или контактный раздел."},
      "mediaUrl": "https://spjylpncgisogfxuiodl.supabase.co/storage/v1/object/public/media/njjimpcxtx_1785362502692.jpg"
    },
    {
      "id": "written-answer",
      "tr": {"title": "2. Cevabı yazılı gösterir", "description": "Kritik bilgiler sesle uzatılmaz; asistan kısa yönlendirir, detaylı cevap ekranda yazılı kalır."},
      "en": {"title": "2. Shows the answer in writing", "description": "Critical details are not spoken at length; the assistant gives a short cue and the full answer stays on screen."},
      "ru": {"title": "2. Показывает ответ письменно", "description": "Важные детали не проговариваются длинно; ассистент кратко направляет, а полный ответ остается на экране."},
      "mediaUrl": "https://spjylpncgisogfxuiodl.supabase.co/storage/v1/object/public/media/9fc82fphv6r_1785362532984.jpg"
    },
    {
      "id": "lead-routing",
      "tr": {"title": "3. Lead veya doğru kanala yönlendirir", "description": "Lead yakalama açıksa iletişim bilgisi toplar; kapalıysa ziyaretçiyi tercih edilen kanala yönlendirir."},
      "en": {"title": "3. Captures leads or routes to the right channel", "description": "If lead capture is on, it collects contact info; if it is off, it routes visitors to the preferred channel."},
      "ru": {"title": "3. Собирает лиды или ведет в нужный канал", "description": "Если сбор лидов включен, он собирает контакты; если выключен, направляет посетителя в выбранный канал."},
      "mediaUrl": "https://spjylpncgisogfxuiodl.supabase.co/storage/v1/object/public/media/up5iieohdn_1785362569136.png"
    },
    {
      "id": "creative-studio",
      "tr": {"title": "4. Sayfa ve içerik üretimini hızlandırır", "description": "Beiwe ile sayfanızı kurar, Creative Studio ile görsel açıdan zengin içerikler üretirsiniz."},
      "en": {"title": "4. Speeds up page and content creation", "description": "Build your page with Beiwe and create richer visual content with Creative Studio."},
      "ru": {"title": "4. Ускоряет создание страницы и контента", "description": "Создавайте страницу с Beiwe и визуально более богатый контент в Creative Studio."},
      "mediaUrl": "https://spjylpncgisogfxuiodl.supabase.co/storage/v1/object/public/media/km8iijnuyhg_1784832883177.png"
    }
  ]
}$$::jsonb
where business_id = '11111111-1111-1111-1111-111111111111'::uuid
  and type = 'services';

update public.blocks
set "order" = case type
  when 'faq' then 4
  when 'links' then 5
  else "order"
end
where business_id = '11111111-1111-1111-1111-111111111111'::uuid
  and type in ('faq', 'links');

update public.blocks
set
  title = 'Paketler',
  content = $${
    "tr": {"title": "Paketler"},
    "en": {"title": "Packages"},
    "ru": {"title": "Пакеты"},
    "layoutVariant": "grid-cards",
    "items": [
      {
        "id": "trial",
        "tr": {"title": "Deneme", "description": "Yeni kayıtta bir kereye mahsus. Sayfayı ve asistan deneyimini küçük ölçekte denemek için.", "price": "$0"},
        "en": {"title": "Trial", "description": "One-time grant on signup. A small balance to try the page and assistant experience.", "price": "$0"},
        "ru": {"title": "Пробный", "description": "Единоразово при регистрации. Небольшой баланс, чтобы попробовать страницу и ассистента.", "price": "$0"},
        "price": "$0"
      },
      {
        "id": "starter",
        "tr": {"title": "Starter", "description": "200 kredi. Tek sayfayı yayına almak ve ilk ziyaretçi sorularını karşılamak için.", "price": "$15"},
        "en": {"title": "Starter", "description": "200 credits. For launching one page and answering first visitor questions.", "price": "$15"},
        "ru": {"title": "Starter", "description": "200 кредитов. Для запуска одной страницы и первых вопросов посетителей.", "price": "$15"},
        "price": "$15"
      },
      {
        "id": "pro",
        "tr": {"title": "Pro", "description": "600 kredi. Düzenli trafik, sayfa güncellemeleri ve daha yoğun asistan kullanımı için.", "price": "$40"},
        "en": {"title": "Pro", "description": "600 credits. For steady traffic, page updates, and heavier assistant use.", "price": "$40"},
        "ru": {"title": "Pro", "description": "600 кредитов. Для стабильного трафика, обновлений страницы и более активного использования ассистента.", "price": "$40"},
        "price": "$40"
      },
      {
        "id": "business",
        "tr": {"title": "Business", "description": "1.500 kredi. Birden fazla hizmet hattı, yoğun üretim ve ekip kullanımı için en avantajlı paket.", "price": "$90"},
        "en": {"title": "Business", "description": "1,500 credits. Best value for multiple service lines, heavier production, and team usage.", "price": "$90"},
        "ru": {"title": "Business", "description": "1500 кредитов. Самый выгодный пакет для нескольких услуг, активного производства и команды.", "price": "$90"},
        "price": "$90"
      },
      {
        "id": "extra",
        "tr": {"title": "Ek Kredi", "description": "100 kredi. Mevcut bakiyenizin üstüne eklenir; abonelik değildir.", "price": "$5"},
        "en": {"title": "Extra Credits", "description": "100 credits. Added on top of your current balance; not a subscription.", "price": "$5"},
        "ru": {"title": "Дополнительные кредиты", "description": "100 кредитов. Добавляется к текущему балансу; это не подписка.", "price": "$5"},
        "price": "$5"
      }
    ]
  }$$::jsonb,
  "order" = 3,
  is_visible = true
where business_id = '11111111-1111-1111-1111-111111111111'::uuid
  and type = 'pricing';

insert into public.blocks (business_id, type, title, content, "order", is_visible)
select
  '11111111-1111-1111-1111-111111111111'::uuid,
  'pricing',
  'Paketler',
  $${
    "tr": {"title": "Paketler"},
    "en": {"title": "Packages"},
    "ru": {"title": "Пакеты"},
    "layoutVariant": "grid-cards",
    "items": [
      {
        "id": "trial",
        "tr": {"title": "Deneme", "description": "Yeni kayıtta bir kereye mahsus. Sayfayı ve asistan deneyimini küçük ölçekte denemek için.", "price": "$0"},
        "en": {"title": "Trial", "description": "One-time grant on signup. A small balance to try the page and assistant experience.", "price": "$0"},
        "ru": {"title": "Пробный", "description": "Единоразово при регистрации. Небольшой баланс, чтобы попробовать страницу и ассистента.", "price": "$0"},
        "price": "$0"
      },
      {
        "id": "starter",
        "tr": {"title": "Starter", "description": "200 kredi. Tek sayfayı yayına almak ve ilk ziyaretçi sorularını karşılamak için.", "price": "$15"},
        "en": {"title": "Starter", "description": "200 credits. For launching one page and answering first visitor questions.", "price": "$15"},
        "ru": {"title": "Starter", "description": "200 кредитов. Для запуска одной страницы и первых вопросов посетителей.", "price": "$15"},
        "price": "$15"
      },
      {
        "id": "pro",
        "tr": {"title": "Pro", "description": "600 kredi. Düzenli trafik, sayfa güncellemeleri ve daha yoğun asistan kullanımı için.", "price": "$40"},
        "en": {"title": "Pro", "description": "600 credits. For steady traffic, page updates, and heavier assistant use.", "price": "$40"},
        "ru": {"title": "Pro", "description": "600 кредитов. Для стабильного трафика, обновлений страницы и более активного использования ассистента.", "price": "$40"},
        "price": "$40"
      },
      {
        "id": "business",
        "tr": {"title": "Business", "description": "1.500 kredi. Birden fazla hizmet hattı, yoğun üretim ve ekip kullanımı için en avantajlı paket.", "price": "$90"},
        "en": {"title": "Business", "description": "1,500 credits. Best value for multiple service lines, heavier production, and team usage.", "price": "$90"},
        "ru": {"title": "Business", "description": "1500 кредитов. Самый выгодный пакет для нескольких услуг, активного производства и команды.", "price": "$90"},
        "price": "$90"
      },
      {
        "id": "extra",
        "tr": {"title": "Ek Kredi", "description": "100 kredi. Mevcut bakiyenizin üstüne eklenir; abonelik değildir.", "price": "$5"},
        "en": {"title": "Extra Credits", "description": "100 credits. Added on top of your current balance; not a subscription.", "price": "$5"},
        "ru": {"title": "Дополнительные кредиты", "description": "100 кредитов. Добавляется к текущему балансу; это не подписка.", "price": "$5"},
        "price": "$5"
      }
    ]
  }$$::jsonb,
  3,
  true
where not exists (
  select 1 from public.blocks
  where business_id = '11111111-1111-1111-1111-111111111111'::uuid
    and type = 'pricing'
);

update public.blocks
set content = $${
  "tr": {"title": "Sıkça Sorulanlar"},
  "en": {"title": "FAQ"},
  "ru": {"title": "Часто задаваемые вопросы"},
  "layoutVariant": "accordion",
  "items": [
    {
      "question": {"tr": "Talkinbio tam olarak nedir?", "en": "What exactly is Talkinbio?", "ru": "Что такое Talkinbio?"},
      "answer": {
        "tr": "Talkinbio, bio linkinizi ziyaretçiye göre açılan bir web sitesine dönüştürür. Ziyaretçi soru sorduğunda asistan ilgili bölümü açar, cevabı yazılı gösterir ve gerekirse lead ya da iletişim yönlendirmesi yapar.",
        "en": "Talkinbio turns your bio link into a website that opens around each visitor. When someone asks a question, the assistant opens the right section, shows the answer in writing, and captures a lead or routes to contact when needed.",
        "ru": "Talkinbio превращает ссылку в био в сайт, который открывается под каждого посетителя. Когда человек задает вопрос, ассистент открывает нужный раздел, показывает ответ письменно и при необходимости собирает лид или направляет к контакту."
      }
    },
    {
      "question": {"tr": "Fiyatlar ve kredi paketleri nedir?", "en": "What are the prices and credit packages?", "ru": "Какие цены и кредитные пакеты?"},
      "answer": {
        "tr": "Deneme $0 → 20 kredi; Starter $15 → 200 kredi; Pro $40 → 600 kredi; Business $90 → 1.500 kredi; Ek Kredi $5 → 100 kredi. Paketler abonelik değil, süresi bitmeyen kredi bakiyesidir.",
        "en": "Trial $0 → 20 credits; Starter $15 → 200 credits; Pro $40 → 600 credits; Business $90 → 1,500 credits; Extra Credits $5 → 100 credits. Packages are not subscriptions; they are non-expiring credit balances.",
        "ru": "Пробный $0 → 20 кредитов; Starter $15 → 200 кредитов; Pro $40 → 600 кредитов; Business $90 → 1500 кредитов; дополнительные кредиты $5 → 100 кредитов. Пакеты не являются подпиской; это бессрочный кредитный баланс."
      }
    },
    {
      "question": {"tr": "Kredi ne zaman düşer?", "en": "When are credits charged?", "ru": "Когда списываются кредиты?"},
      "answer": {
        "tr": "Yazılı Assistant Agent oturumu 50 mesaja kadar 1 kredi; mikrofonla soru oturumu STT dahil 5 kredi; tek alanı AI ile güncelleme 6 kredi; çok bölümlü sayfa kurulumu 10 kredi. Hazır ses cue paketleri yalnız oluşturulurken kredi harcar.",
        "en": "A written Assistant Agent session costs 1 credit for up to 50 messages; a voice-input session with STT costs 5 credits; updating one field with AI costs 6 credits; building a multi-section page costs 10 credits. Ready-made voice cue packs are charged only when created.",
        "ru": "Письменная сессия Assistant Agent стоит 1 кредит до 50 сообщений; голосовой ввод с STT — 5 кредитов; обновление одного поля через AI — 6 кредитов; создание многораздельной страницы — 10 кредитов. Готовые голосовые подсказки списывают кредиты только при создании."
      }
    },
    {
      "question": {"tr": "Kurulum ne kadar sürer?", "en": "How long does setup take?", "ru": "Сколько занимает настройка?"},
      "answer": {
        "tr": "Temel sayfa kurulumu yaklaşık 10 dakika sürer. Beiwe ile konuşarak bilgilerinizi girersiniz; bloklar, sayfa dili ve ilk asistan bilgisi oluşturulur.",
        "en": "A basic page setup takes about 10 minutes. You chat with Beiwe, enter your details, and the blocks, page language, and first assistant knowledge are created.",
        "ru": "Базовая настройка страницы занимает около 10 минут. Вы общаетесь с Beiwe, вводите данные, и создаются блоки, язык страницы и первые знания ассистента."
      }
    }
  ]
}$$::jsonb
where business_id = '11111111-1111-1111-1111-111111111111'::uuid
  and type = 'faq';

update public.saule_knowledge
set
  content = 'Fiyat sorulduğunda güncel paketleri net söyle: Deneme $0 → 20 kredi (yeni kayıtta tek seferlik), Starter $15 → 200 kredi, Pro $40 → 600 kredi, Business $90 → 1.500 kredi, Ek Kredi $5 → 100 kredi. Paketler abonelik değil, süresi bitmeyen kredi bakiyesidir. Yazılı Assistant Agent oturumu 50 mesaja kadar 1 kredi; mikrofonla soru oturumu STT dahil 5 kredi; tek alanı AI ile güncelleme 6 kredi; çok bölümlü sayfa kurulumu 10 kredi. Ziyaretçiyi Paketler bölümüne yönlendir.',
  is_active = true
where business_id = '11111111-1111-1111-1111-111111111111'::uuid
  and title = 'Fiyatlandırma';

insert into public.saule_knowledge (business_id, title, content, is_active)
select
  '11111111-1111-1111-1111-111111111111'::uuid,
  'Fiyatlandırma',
  'Fiyat sorulduğunda güncel paketleri net söyle: Deneme $0 → 20 kredi (yeni kayıtta tek seferlik), Starter $15 → 200 kredi, Pro $40 → 600 kredi, Business $90 → 1.500 kredi, Ek Kredi $5 → 100 kredi. Paketler abonelik değil, süresi bitmeyen kredi bakiyesidir. Yazılı Assistant Agent oturumu 50 mesaja kadar 1 kredi; mikrofonla soru oturumu STT dahil 5 kredi; tek alanı AI ile güncelleme 6 kredi; çok bölümlü sayfa kurulumu 10 kredi. Ziyaretçiyi Paketler bölümüne yönlendir.',
  true
where not exists (
  select 1 from public.saule_knowledge
  where business_id = '11111111-1111-1111-1111-111111111111'::uuid
    and title = 'Fiyatlandırma'
);

update public.saule_knowledge
set
  content = 'Talkinbio iki ana ajan sunar: Beiwe sayfa kurulum ve güncelleme asistanıdır; Saule ziyaretçi karşılama ve yönlendirme asistanıdır. Ürün artık sadece link-in-bio listesi değil; ziyaretçinin sorusuna göre ilgili blok, paket, hizmet veya iletişim bölümünü açan web sitesi deneyimidir. WhatsApp/Instagram DM otomasyonu yol haritasındadır; bugünkü canlı ürün web sayfası ve yönlendirme deneyimidir.',
  is_active = true
where business_id = '11111111-1111-1111-1111-111111111111'::uuid
  and title = 'Ürün Kapsamı';
