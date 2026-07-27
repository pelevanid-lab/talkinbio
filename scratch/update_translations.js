const fs = require('fs');
const path = require('path');

const locales = ['tr', 'en', 'ru'];

const newData = {
  tr: {
    twoPlatforms: {
      title: "Aynı temele dayalı iki yapay zeka platformu",
      sauleTitle: "Müşterilerinizle Konuşur",
      sauleDesc: "Saule Assistant, sayfanıza gelen ziyaretçilerin sorularını yanıtlar, fiyat verir, randevu ayarlar ve iletişim bilgilerini alarak size potansiyel müşteriler (lead) yaratır. 7/24 uyanık bir dijital çalışandır.",
      beiweTitle: "Sayfanızı Yönetir",
      beiweDesc: "Beiwe Creative, işletmenizle ilgili detayları arka planda sizden öğrenen ve bu bilgileri profesyonel bir web sayfasına dönüştüren yaratıcı bir ajandır. İçerik ve tasarım tamamen otomatiktir."
    },
    showcase: {
      title: "Yapay zekanın işletmelere<br />kattığı gücü keşfedin",
      sauleTab: "Saule Assistant",
      beiweTab: "Beiwe Creative",
      saule: {
        kuafor: {
          title: "Kuaför & Güzellik Merkezi",
          desc: "Saniyeler içinde randevu sistemi oluşturun ve portfolyo sayfanızla sosyal medyadan doğrudan müşteri kazanın."
        },
        spa: {
          title: "Masaj Spa",
          desc: "Yoğunlukta çağrıları kaçırmayın; asistanınız sizin yerinize randevuları ayarlasın, fiyat versin."
        },
        antrenor: {
          title: "Kişisel Antrenör",
          desc: "Öğrencilerinize beslenme listelerini ve antrenman programlarını anında yollayan, sorularını yanıtlayan akıllı asistanınız."
        },
        diyet: {
          title: "Diyet & Sağlıklı Yaşam",
          desc: "Saule sizin için yüzlerce sağlıklı yaşam sorusunu önceki paylaşımlarınızdan ve sayfanızdan bilgi alarak anında yanıtlasın."
        }
      },
      beiwe: {
        store: {
          title: "Ürün ve Hizmet Vitrini",
          desc: "Sosyal medya hesaplarınıza ekleyeceğiniz tek bir bağlantıyla tüm ürün ve hizmetlerinizi profesyonelce sergileyin."
        },
        portfolio: {
          title: "Saniyeler İçinde Web Tasarımı",
          desc: "Kod veya şablonlarla uğraşmayın. Sadece işletmenizi anlatın, Beiwe anında premium bir portfolyo oluştursun."
        },
        booking: {
          title: "Merkezi Yönetim Sistemi",
          desc: "Fiyatlarınızı, çalışma saatlerinizi ve randevu takviminizi yapay zekayla sohbet ederek saniyeler içinde güncelleyin."
        },
        gallery: {
          title: "Zengin Medya Galerisi",
          desc: "İşlerinizi en iyi şekilde yansıtmak için sayfanıza dilediğiniz an fotoğraf, video ve görsel galeriler ekleyin."
        }
      }
    },
    updates: {
      title: "Haberler & Gelişmeler",
      allPosts: "Tüm yazılar",
      post1: {
        badge: "Talkinbio V2 Yayında",
        title: "Talkinbio V2 ile yepyeni bir altyapı ve gelişmiş yapay zeka özellikleri",
        meta: "Ürün · 28 Temmuz 2026"
      },
      post2: {
        badge: "Saule Eğitimi",
        title: "Asistanınızı sadece 5 dakikada nasıl eğitirsiniz? Yeni rehber yayında.",
        meta: "Kılavuz · 15 Temmuz 2026"
      },
      post3: {
        badge: "Gelişmiş Analitik",
        title: "Müşteri taleplerini veriye dönüştürün: Gelişmiş analitik paneli artık kullanımda.",
        meta: "Özellik · 02 Temmuz 2026"
      }
    }
  },
  en: {
    twoPlatforms: {
      title: "Two AI platforms built on the same foundation",
      sauleTitle: "Talks to your customers",
      sauleDesc: "Saule Assistant answers visitors' questions on your page, gives pricing, books appointments, and captures leads. A 24/7 digital employee.",
      beiweTitle: "Manages your page",
      beiweDesc: "Beiwe Creative learns your business details in the background and transforms them into a professional web page. Content and design are fully automatic."
    },
    showcase: {
      title: "Discover the power of AI<br />for your business",
      sauleTab: "Saule Assistant",
      beiweTab: "Beiwe Creative",
      saule: {
        kuafor: {
          title: "Hair & Beauty Salon",
          desc: "Create an appointment system in seconds and win clients directly from social media with your portfolio page."
        },
        spa: {
          title: "Massage Spa",
          desc: "Don't miss calls during busy hours; let your assistant schedule appointments and give prices for you."
        },
        antrenor: {
          title: "Personal Trainer",
          desc: "A smart assistant that instantly sends diet lists and workout programs to your students, and answers their questions."
        },
        diyet: {
          title: "Diet & Wellness",
          desc: "Let Saule instantly answer hundreds of wellness questions by extracting knowledge from your past posts and page."
        }
      },
      beiwe: {
        store: {
          title: "Product & Service Showcase",
          desc: "Professionally display all your products and services with a single link in your social media bio."
        },
        portfolio: {
          title: "Web Design in Seconds",
          desc: "No coding or templates. Just describe your business, and Beiwe creates a premium portfolio instantly."
        },
        booking: {
          title: "Central Management System",
          desc: "Update your prices, working hours, and appointment calendar in seconds just by chatting with AI."
        },
        gallery: {
          title: "Rich Media Gallery",
          desc: "Add photos, videos, and visual galleries to your page anytime to showcase your work in the best light."
        }
      }
    },
    updates: {
      title: "Latest Updates",
      allPosts: "All posts",
      post1: {
        badge: "Talkinbio V2 is Live",
        title: "A brand new infrastructure and advanced AI features with Talkinbio V2",
        meta: "Product · Jul 28, 2026"
      },
      post2: {
        badge: "Saule Training",
        title: "How to train your assistant in just 5 minutes? New guide is out.",
        meta: "Guide · Jul 15, 2026"
      },
      post3: {
        badge: "Advanced Analytics",
        title: "Turn customer requests into data: Advanced analytics dashboard is now available.",
        meta: "Feature · Jul 02, 2026"
      }
    }
  },
  ru: {
    twoPlatforms: {
      title: "Две ИИ-платформы на одной основе",
      sauleTitle: "Общается с клиентами",
      sauleDesc: "Saule Assistant отвечает на вопросы посетителей вашей страницы, называет цены, записывает на прием и собирает лиды. Ваш круглосуточный цифровой сотрудник.",
      beiweTitle: "Управляет вашей страницей",
      beiweDesc: "Beiwe Creative изучает детали вашего бизнеса в фоновом режиме и превращает их в профессиональную веб-страницу. Контент и дизайн полностью автоматизированы."
    },
    showcase: {
      title: "Откройте силу ИИ<br />для вашего бизнеса",
      sauleTab: "Saule Assistant",
      beiweTab: "Beiwe Creative",
      saule: {
        kuafor: {
          title: "Салон красоты",
          desc: "Создайте систему записи за секунды и привлекайте клиентов прямо из социальных сетей с вашей страницей-портфолио."
        },
        spa: {
          title: "Массажный SPA",
          desc: "Не пропускайте звонки в часы пик; позвольте ассистенту записывать клиентов и называть цены."
        },
        antrenor: {
          title: "Персональный тренер",
          desc: "Умный ассистент, который мгновенно отправляет диеты и программы тренировок вашим ученикам и отвечает на их вопросы."
        },
        diyet: {
          title: "Диета и Здоровье",
          desc: "Позвольте Saule мгновенно отвечать на сотни вопросов о здоровье, извлекая знания из ваших прошлых публикаций и страницы."
        }
      },
      beiwe: {
        store: {
          title: "Витрина товаров и услуг",
          desc: "Профессионально демонстрируйте все ваши продукты и услуги с помощью одной ссылки в соцсетях."
        },
        portfolio: {
          title: "Веб-дизайн за секунды",
          desc: "Без кода и шаблонов. Просто опишите свой бизнес, и Beiwe мгновенно создаст премиум-портфолио."
        },
        booking: {
          title: "Централизованное управление",
          desc: "Обновляйте цены, часы работы и календарь записей за секунды, просто общаясь с ИИ."
        },
        gallery: {
          title: "Галерея медиа",
          desc: "Добавляйте фото, видео и визуальные галереи на страницу в любое время, чтобы показать свою работу в лучшем свете."
        }
      }
    },
    updates: {
      title: "Последние новости",
      allPosts: "Все статьи",
      post1: {
        badge: "Talkinbio V2 запущен",
        title: "Совершенно новая инфраструктура и продвинутые ИИ-функции в Talkinbio V2",
        meta: "Продукт · 28 Июл 2026"
      },
      post2: {
        badge: "Обучение Saule",
        title: "Как обучить вашего ассистента всего за 5 минут? Вышло новое руководство.",
        meta: "Руководство · 15 Июл 2026"
      },
      post3: {
        badge: "Продвинутая аналитика",
        title: "Превращайте запросы клиентов в данные: доступна продвинутая панель аналитики.",
        meta: "Функция · 02 Июл 2026"
      }
    }
  }
};

locales.forEach(loc => {
  const file = path.join(__dirname, '..', 'messages', `${loc}.json`);
  let content = JSON.parse(fs.readFileSync(file, 'utf8'));
  
  content.Landing.twoPlatforms = newData[loc].twoPlatforms;
  content.Landing.showcase = newData[loc].showcase;
  content.Landing.updates = newData[loc].updates;
  
  fs.writeFileSync(file, JSON.stringify(content, null, 2), 'utf8');
  console.log(`Updated ${loc}.json`);
});
