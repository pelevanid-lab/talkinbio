const fs = require('fs');
const path = require('path');

const locales = ['tr', 'en', 'ru'];

const newData = {
  tr: {
    hero: {
      subtitle: "İşletmeniz için eksiksiz yapay zeka platformu. Ziyaretçilerinizle 7/24 etkileşim kuran <strong className=\"text-[var(--ink)] font-semibold\">Saule Assistant</strong>'tan, içeriğinizi saniyeler içinde kuran <strong className=\"text-[var(--ink)] font-semibold\">Beiwe Creative</strong>'e kadar.",
      btnEarly: "Erken erişim",
      btnHow: "Nasıl çalışır?",
      btnPricing: "Fiyatlandırma"
    },
    nasil: {
      title: "Aynı temele dayalı iki yapay zeka platformu",
      sauleDesc: "Konuşkan yapay zeka ajanınızı yapılandırın, canlıya alın ve anında müşteri ilişkilerinizi yönetin.",
      beiweDesc: "İşletmeniz için içerik oluşturun. <br/>Kelimelerinizi anında profesyonel bir web sitesine dönüştürür."
    },
    deepSaule: {
      title: "Saule Assistant",
      desc: "İşletmenizi tanıyan, soruları cevaplayan ve potansiyel müşterileri satışa yönlendiren yapay zeka asistanınızı saniyeler içinde yapılandırın ve sitenize ekleyin.",
      btn: "Hemen Başla",
      f1Title: "7/24 Kesintisiz İletişim",
      f1Desc: "Ziyaretçileriniz günün her saati soru sorabilir, Saule işletmenizi tanıyarak anında ve doğal dilde cevap verir.",
      f2Title: "Talep Yönetimi & Analitik",
      f2Desc: "İlgilenen her ziyaretçinin adı, iletişim bilgisi ve özel talebi otomatik olarak toplanır ve size raporlanır.",
      f3Title: "Çoklu Dil Desteği",
      f3Desc: "Ziyaretçi hangi dilde yazarsa asistanınız o dilde cevap verir, siz sadece kendi dilinizde yönetirsiniz.",
      f4Title: "Hemen Yayında",
      f4Desc: "Karmaşık diyalog akışları kurmanıza gerek yok. İşletmenizi anlatın, asistanınız saniyeler içinde öğrenip göreve başlasın."
    },
    deepBeiwe: {
      title: "Beiwe Creative",
      desc1: "İçeriğinizi ve sayfanızı saniyeler içinde kurgulayan yapay zeka.",
      desc2: "Sadece işletmenizi anlatarak profesyonel web siteleri, sosyal medya bağlantı sayfaları ve zengin içerikler oluşturun. Tek bir AI platformunda her şey hazır.",
      btn: "Hemen Başla",
      f1Title: "Otomatik Tasarım",
      f1Desc: "Tema, şablon veya düzen seçmekle vakit kaybetmeyin. Web sayfanız, içeriğinize ve markanıza göre otomatik olarak tasarlanır.",
      f2Title: "Tek Merkezden Yönetim",
      f2Desc: "Fiyatlar, saatler ve hizmetler... Beiwe ile yaptığınız sade bir sohbet, anında web sitenize bilgi olarak yansır.",
      f3Title: "Tüm Platformlara Hazır",
      f3Desc: "Instagram, WhatsApp, TikTok. Oluşturduğunuz tek bağlantı profili tüm sosyal medya platformlarına kusursuz uyum sağlar.",
      f4Title: "Zengin Medya Desteği",
      f4Desc: "Hizmetlerinizi sadece metinle değil, fotoğraf ve videolarla zenginleştirerek ziyaretçilerinize yüksek kaliteli bir deneyim sunun."
    }
  },
  en: {
    hero: {
      subtitle: "The complete AI platform for your business. From <strong className=\"text-[var(--ink)] font-semibold\">Saule Assistant</strong> engaging your visitors 24/7, to <strong className=\"text-[var(--ink)] font-semibold\">Beiwe Creative</strong> building your content in seconds.",
      btnEarly: "Early access",
      btnHow: "How it works?",
      btnPricing: "Pricing"
    },
    nasil: {
      title: "Two AI platforms built on the same foundation",
      sauleDesc: "Configure your conversational AI agent, deploy it, and manage your customer relations instantly.",
      beiweDesc: "Create content for your business. <br/>Turns your words into a professional website instantly."
    },
    deepSaule: {
      title: "Saule Assistant",
      desc: "Configure and add an AI assistant to your site in seconds that knows your business, answers questions, and converts potential customers.",
      btn: "Get Started",
      f1Title: "24/7 Seamless Communication",
      f1Desc: "Your visitors can ask questions any time of the day, and Saule answers instantly and naturally by understanding your business.",
      f2Title: "Lead Management & Analytics",
      f2Desc: "The name, contact information, and specific request of every interested visitor are automatically collected and reported to you.",
      f3Title: "Multi-language Support",
      f3Desc: "No matter what language the visitor uses, your assistant replies in that language, while you manage it in your own language.",
      f4Title: "Live in Seconds",
      f4Desc: "No need to build complex dialog flows. Just describe your business, and your assistant will learn and start working in seconds."
    },
    deepBeiwe: {
      title: "Beiwe Creative",
      desc1: "The AI that builds your content and page in seconds.",
      desc2: "Create professional websites, social media link pages, and rich content just by describing your business. Everything is ready in a single AI platform.",
      btn: "Get Started",
      f1Title: "Automated Design",
      f1Desc: "Don't waste time choosing themes, templates, or layouts. Your web page is automatically designed according to your content and brand.",
      f2Title: "Centralized Management",
      f2Desc: "Prices, hours, and services... A simple chat with Beiwe instantly updates the information on your website.",
      f3Title: "Ready for All Platforms",
      f3Desc: "Instagram, WhatsApp, TikTok. The single link profile you create seamlessly adapts to all social media platforms.",
      f4Title: "Rich Media Support",
      f4Desc: "Provide your visitors with a high-quality experience by enriching your services not only with text but also with photos and videos."
    }
  },
  ru: {
    hero: {
      subtitle: "Полная платформа ИИ для вашего бизнеса. От <strong className=\"text-[var(--ink)] font-semibold\">Saule Assistant</strong>, общающегося с посетителями 24/7, до <strong className=\"text-[var(--ink)] font-semibold\">Beiwe Creative</strong>, создающего ваш контент за секунды.",
      btnEarly: "Ранний доступ",
      btnHow: "Как это работает?",
      btnPricing: "Цены"
    },
    nasil: {
      title: "Две ИИ-платформы на одной основе",
      sauleDesc: "Настройте своего ИИ-агента, запустите его и мгновенно управляйте отношениями с клиентами.",
      beiweDesc: "Создавайте контент для своего бизнеса. <br/>Мгновенно превращает ваши слова в профессиональный сайт."
    },
    deepSaule: {
      title: "Saule Assistant",
      desc: "Настройте и добавьте на сайт ИИ-ассистента за секунды, который знает ваш бизнес, отвечает на вопросы и конвертирует потенциальных клиентов.",
      btn: "Начать",
      f1Title: "Круглосуточная поддержка",
      f1Desc: "Ваши посетители могут задавать вопросы в любое время, и Saule отвечает мгновенно и естественно, зная ваш бизнес.",
      f2Title: "Управление лидами и аналитика",
      f2Desc: "Имя, контактная информация и конкретный запрос каждого заинтересованного посетителя автоматически собираются и отправляются вам.",
      f3Title: "Многоязычная поддержка",
      f3Desc: "На каком бы языке ни писал посетитель, ваш ассистент отвечает на том же языке, а вы управляете им на своем.",
      f4Title: "Запуск за секунды",
      f4Desc: "Нет необходимости создавать сложные схемы диалогов. Просто опишите свой бизнес, и ассистент научится и начнет работать за секунды."
    },
    deepBeiwe: {
      title: "Beiwe Creative",
      desc1: "ИИ, который создает ваш контент и страницу за секунды.",
      desc2: "Создавайте профессиональные сайты, страницы ссылок для соцсетей и богатый контент, просто описав свой бизнес. Все готово на одной ИИ-платформе.",
      btn: "Начать",
      f1Title: "Автоматический дизайн",
      f1Desc: "Не тратьте время на выбор тем, шаблонов или макетов. Ваша веб-страница автоматически оформляется в соответствии с контентом и брендом.",
      f2Title: "Централизованное управление",
      f2Desc: "Цены, часы работы и услуги... Простой чат с Beiwe мгновенно обновляет информацию на вашем сайте.",
      f3Title: "Готовность ко всем платформам",
      f3Desc: "Instagram, WhatsApp, TikTok. Единый профиль ссылок безупречно адаптируется ко всем социальным сетям.",
      f4Title: "Поддержка медиафайлов",
      f4Desc: "Предоставьте посетителям высококачественный опыт, обогащая свои услуги не только текстом, но и фото, и видео."
    }
  }
};

locales.forEach(loc => {
  const file = path.join(__dirname, '..', 'messages', `${loc}.json`);
  let content = JSON.parse(fs.readFileSync(file, 'utf8'));
  
  content.Landing.heroTexts = newData[loc].hero;
  content.Landing.nasil = newData[loc].nasil;
  content.Landing.deepSaule = newData[loc].deepSaule;
  content.Landing.deepBeiwe = newData[loc].deepBeiwe;
  
  fs.writeFileSync(file, JSON.stringify(content, null, 2), 'utf8');
  console.log(`Updated ${loc}.json`);
});
