'use client';

import React, { useState } from 'react';

type TabType = 'hakkimda' | 'hizmetlerim' | 'paketler' | 'calismalarim' | 'sss' | 'iletisim';

interface InteractivePhoneMockupProps {
  locale: 'tr' | 'en' | 'ru';
}

const personas = {
  tr: {
    name: 'Selin Aydın',
    subtitle: 'İçerik Üreticisi & Eğitmen',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80', // Beautiful smiling professional woman/instructor
    location: 'İstanbul, Türkiye',
    languages: 'Türkçe - English',
    experience: '5+ Yıl Deneyim',
    clients: '100+ Mutlu Müşteri',
    about: 'Merhaba Ben Selin. İçerik üretimi, sosyal medya stratejisi ve dijital eğitimler konularında içerik üreticilerine ve markalara destek oluyorum. Amacım, ilham veren içeriklerle etkili iletişim kurmanızı sağlamak.'
  },
  en: {
    name: 'Sophia Miller',
    subtitle: 'Content Creator & Coach',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    location: 'London, UK',
    languages: 'English - Spanish',
    experience: '5+ Yrs Experience',
    clients: '100+ Happy Clients',
    about: 'Hello, I am Sophia. I support content creators and brands in content production, social media strategy, and digital training. My goal is to enable effective communication with inspiring content.'
  },
  ru: {
    name: 'Анна Козлова',
    subtitle: 'Создатель контента и коуч',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    location: 'Москва, Россия',
    languages: 'Русский - English',
    experience: '5+ лет опыта',
    clients: '100+ клиентов',
    about: 'Привет, я Анна. Я помогаю создателям контента и брендам в создании контента, стратегии в социальных сетях и цифровом обучении. Моя цель — обеспечить эффективную коммуникацию.'
  }
};

export default function InteractivePhoneMockup({ locale }: InteractivePhoneMockupProps) {
  const [activeTab, setActiveTab] = useState<TabType>('hakkimda');
  const [isCardOpen, setIsCardOpen] = useState<boolean>(true);
  const [activeWorksTab, setActiveWorksTab] = useState<'tumu' | 'sosyal' | 'marka'>('tumu');
  const [openFaqIndex, setOpenFaqIndex] = useState<number>(0);
  
  const persona = personas[locale] || personas.tr;
  const firstName = persona.name.split(' ')[0];

  const handleTabClick = (tab: TabType) => {
    setActiveTab(tab);
    setIsCardOpen(true);
  };

  // Content localized based on current active tab, fully matching Format 4 (Cevap / Yönlendirme)
  const getTabContent = () => {
    switch (activeTab) {
      case 'hakkimda':
        return {
          userQuestion: locale === 'tr' 
            ? `${firstName} kimdir? Hakkında bilgi alabilir miyim?` 
            : locale === 'ru' 
              ? `Кто такая ${firstName}? Могу я узнать о вас?` 
              : `Who is ${firstName}? Can I get some info?`,
          sauleAnswer: locale === 'tr'
            ? `Harika bir seçim! ${firstName}, sosyal medya stratejisi ve dijital eğitimler konularında içerik üreticilerine ve markalara profesyonel destek sunan deneyimli bir eğitmendir.`
            : locale === 'ru'
              ? `Отличный выбор! ${firstName} — опытный коуч, который помогает создателям контента и брендам в сфере стратегии социальных сетей.`
              : `Great choice! ${firstName} is an experienced coach providing professional support for content creators and brands in social media strategy.`,
          cardIcon: '📍',
          cardTitle: locale === 'tr' ? 'Hakkında Özet Bilgiler' : locale === 'ru' ? 'Коротко обо мне' : 'Quick Bio Highlights',
          cardBullets: locale === 'tr' 
            ? [
                `Konum: ${persona.location}`,
                `Deneyim: ${persona.experience}`,
                `Portföy: ${persona.clients}`,
                `Diller: ${persona.languages}`
              ]
            : locale === 'ru'
              ? [
                  `Локация: ${persona.location}`,
                  `Опыт: ${persona.experience}`,
                  `Клиенты: ${persona.clients}`,
                  `Языки: ${persona.languages}`
                ]
              : [
                  `Location: ${persona.location}`,
                  `Experience: ${persona.experience}`,
                  `Portfolio: ${persona.clients}`,
                  `Languages: ${persona.languages}`
                ],
          cardBtnText: locale === 'tr' ? 'Özgeçmişi İncele →' : locale === 'ru' ? 'Посмотреть резюме →' : 'View Full Bio →',
          relatedQuestions: [
            { 
              text: locale === 'tr' ? 'Hangi hizmetleri sunuyorsun?' : locale === 'ru' ? 'Какие услуги вы предлагаете?' : 'What services do you offer?', 
              tab: 'hizmetlerim' as TabType 
            },
            { 
              text: locale === 'tr' ? 'Hizmet paketleri ve fiyatlar neler?' : locale === 'ru' ? 'Какие есть тарифы и цены?' : 'What are the packages and pricing?', 
              tab: 'paketler' as TabType 
            }
          ]
        };

      case 'hizmetlerim':
        return {
          userQuestion: locale === 'tr' 
            ? 'Hangi alanlarda hizmet veriyorsun?' 
            : locale === 'ru' 
              ? 'Какие услуги вы предоставляете?' 
              : 'What services do you provide?',
          sauleAnswer: locale === 'tr'
            ? 'İçerik üretiminden hesap yönetimine kadar geniş bir yelpazede hizmet sunuyorum. Hedefim sosyal medyadaki görünürlüğünüzü ve etkileşiminizi artırmak.'
            : locale === 'ru'
              ? 'Я предлагаю широкий спектр услуг — от создания контента до ведения аккаунтов. Моя цель — увеличить ваши охваты.'
              : 'I offer a wide range of services from content production to account management, aimed at boosting your reach and engagement.',
          cardIcon: '💼',
          cardTitle: locale === 'tr' ? 'Hizmet Detayları' : locale === 'ru' ? 'Детали услуг' : 'Service Details',
          cardBullets: locale === 'tr'
            ? [
                'Sosyal Medya Yönetimi: Profil planlama, günlük paylaşım ve analiz.',
                'İçerik Üretimi: Özgün video, Reels, post fikirleri ve prodüksiyonu.',
                'Kişisel Marka Danışmanlığı: Birebir büyüme stratejisi seansları.',
                'Marka İşbirlikleri: Kreatif kampanya projeleri ve ortaklıklar.'
              ]
            : locale === 'ru'
              ? [
                  'Управление соцсетями: Планирование профиля, ежедневные посты и аналитика.',
                  'Создание контента: Оригинальные идеи видео, Reels, фото и продакшн.',
                  'Консультации по бренду: Сессии один на один по стратегии роста.',
                  'Коллаборации с брендами: Креативные кампании и спецпроекты.'
                ]
              : [
                  'Social Media Management: Profile planning, daily posting, and analytics.',
                  'Content Production: Original video, Reels, post ideas, and production.',
                  'Personal Brand Coaching: 1-on-1 growth strategy sessions.',
                  'Brand Collaborations: Creative campaign projects and sponsorships.'
                ],
          cardBtnText: locale === 'tr' ? 'Hemen Başvur →' : locale === 'ru' ? 'Подать заявку →' : 'Apply Now →',
          relatedQuestions: [
            { 
              text: locale === 'tr' ? 'Örnek çalışmalarını görebilir miyim?' : locale === 'ru' ? 'Могу я увидеть примеры работ?' : 'Can I see your portfolio of works?', 
              tab: 'calismalarim' as TabType 
            },
            { 
              text: locale === 'tr' ? 'Süreciniz nasıl işliyor?' : locale === 'ru' ? 'Как устроен рабочий процесс?' : 'How does your process work?', 
              tab: 'sss' as TabType 
            }
          ]
        };

      case 'paketler':
        return {
          userQuestion: locale === 'tr' 
            ? 'Fiyat listenizi ve paketlerinizi görebilir miyim?' 
            : locale === 'ru' 
              ? 'Могу я посмотреть прайс-лист и пакеты?' 
              : 'Can I see your price list and packages?',
          sauleAnswer: locale === 'tr'
            ? 'Tabii ki! Sosyal medyanızı profesyonel düzeye taşıyacak, bütçe ve ihtiyaçlarınıza uygun 3 farklı paket seçeneği hazırladım:'
            : locale === 'ru'
              ? 'Конечно! Я подготовила 3 различных пакета под разные бюджеты и задачи для вашего продвижения:'
              : 'Of course! I have prepared 3 distinct package options designed to scale your social media, matching different budgets:',
          cardIcon: '💎',
          cardTitle: locale === 'tr' ? 'Fiyat ve İçerik Paketleri' : locale === 'ru' ? 'Пакеты услуг и цены' : 'Pricing & Content Packages',
          customCardBody: (
            <div className="space-y-2">
              <div className="p-2.5 rounded-xl border border-[rgba(20,35,31,0.08)] bg-[var(--paper)]">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-extrabold text-[var(--ink)]">{locale === 'tr' ? 'Başlangıç Paketi' : 'Starter Pack'}</span>
                  <span className="text-[10px] font-extrabold text-[var(--coral)]">1.500 TL</span>
                </div>
                <p className="text-[9px] text-[var(--ink-soft)] leading-normal mt-0.5 m-0">
                  {locale === 'tr' ? 'Haftalık 3 gönderi + hikaye paylaşımları + temel raporlama.' : 'Weekly 3 posts + story sharing + basic reporting.'}
                </p>
              </div>
              <div className="p-2.5 rounded-xl border border-[rgba(20,35,31,0.08)] bg-white shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-extrabold text-[var(--ink)]">{locale === 'tr' ? 'Standart Paket' : 'Standard Pack'}</span>
                  <span className="text-[10px] font-extrabold text-[var(--coral)]">2.500 TL</span>
                </div>
                <p className="text-[9px] text-[var(--ink-soft)] leading-normal mt-0.5 m-0">
                  {locale === 'tr' ? 'Haftalık 6 gönderi + reels + hikaye + detaylı raporlama.' : 'Weekly 6 posts + reels + story + detailed reporting.'}
                </p>
              </div>
              <div className="p-2.5 rounded-xl border border-[rgba(20,35,31,0.08)] bg-[var(--paper)]">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-extrabold text-[var(--ink)]">{locale === 'tr' ? 'Premium Paket' : 'Premium Pack'}</span>
                  <span className="text-[10px] font-extrabold text-[var(--coral)]">4.000 TL</span>
                </div>
                <p className="text-[9px] text-[var(--ink-soft)] leading-normal mt-0.5 m-0">
                  {locale === 'tr' ? 'Günlük içerik + reels + reklam yönetimi + strateji.' : 'Daily content + reels + ad management + strategy.'}
                </p>
              </div>
            </div>
          ),
          cardBtnText: locale === 'tr' ? 'Hemen Satın Al →' : locale === 'ru' ? 'Купить пакет →' : 'Buy Package →',
          relatedQuestions: [
            { 
              text: locale === 'tr' ? 'Ödemeler nasıl yapılıyor?' : locale === 'ru' ? 'Как производится оплата?' : 'How are payments made?', 
              tab: 'sss' as TabType 
            },
            { 
              text: locale === 'tr' ? 'Bizimle iletişime geçmek ister misin?' : locale === 'ru' ? 'Хотите связаться напрямую?' : 'Want to contact directly?', 
              tab: 'iletisim' as TabType 
            }
          ]
        };

      case 'calismalarim':
        return {
          userQuestion: locale === 'tr' 
            ? 'Daha önce yaptığın örnek çalışmaları görebilir miyim?' 
            : locale === 'ru' 
              ? 'Могу я посмотреть примеры ваших работ?' 
              : 'Can I see your previous works?',
          sauleAnswer: locale === 'tr'
            ? 'Tabii ki! Bugüne kadar hazırladığım, yüksek etkileşim alan kreatif kampanya ve içerik tasarımlarından bazı örnekler:'
            : locale === 'ru'
              ? 'С удовольствием! Вот несколько примеров креативных постов и кейсов, которые собрали высокие охваты:'
              : 'Certainly! Here are some of the high-performance creative campaigns and content designs I generated for brands:',
          cardIcon: '🎨',
          cardTitle: locale === 'tr' ? 'Öne Çıkan Portfolyo' : locale === 'ru' ? 'Избранное портфолио' : 'Featured Portfolio',
          customCardBody: (
            <div className="space-y-3">
              <div className="flex gap-1.5 border-b border-[rgba(20,35,31,0.05)] pb-1.5 mb-1.5">
                <button 
                  onClick={(e) => { e.stopPropagation(); setActiveWorksTab('tumu'); }} 
                  className={`text-[8px] font-bold px-2 py-0.5 rounded transition-colors ${activeWorksTab === 'tumu' ? 'bg-[var(--coral)] text-white' : 'bg-[var(--paper)] text-[var(--ink-soft)]'}`}
                >
                  {locale === 'tr' ? 'Tümü' : 'All'}
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setActiveWorksTab('sosyal'); }} 
                  className={`text-[8px] font-bold px-2 py-0.5 rounded transition-colors ${activeWorksTab === 'sosyal' ? 'bg-[var(--coral)] text-white' : 'bg-[var(--paper)] text-[var(--ink-soft)]'}`}
                >
                  {locale === 'tr' ? 'Sosyal' : 'Social'}
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setActiveWorksTab('marka'); }} 
                  className={`text-[8px] font-bold px-2 py-0.5 rounded transition-colors ${activeWorksTab === 'marka' ? 'bg-[var(--coral)] text-white' : 'bg-[var(--paper)] text-[var(--ink-soft)]'}`}
                >
                  {locale === 'tr' ? 'Marka' : 'Brand'}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                {[
                  { url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=150&auto=format&fit=crop&q=80', type: 'sosyal' },
                  { url: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=150&auto=format&fit=crop&q=80', type: 'marka' },
                  { url: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=150&auto=format&fit=crop&q=80', type: 'sosyal' },
                  { url: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=150&auto=format&fit=crop&q=80', type: 'marka' },
                  { url: 'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?w=150&auto=format&fit=crop&q=80', type: 'sosyal' },
                  { url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=150&auto=format&fit=crop&q=80', type: 'marka' }
                ].filter(w => activeWorksTab === 'tumu' || w.type === activeWorksTab).map((work, i) => (
                  <div key={i} className="aspect-square rounded-lg border border-[var(--border)] relative overflow-hidden group">
                    <img 
                      src={work.url} 
                      alt={`Mockup Work ${i+1}`} 
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors"></div>
                  </div>
                ))}
              </div>
            </div>
          ),
          cardBtnText: locale === 'tr' ? 'Tüm Çalışmaları Gör →' : locale === 'ru' ? 'Все работы →' : 'See All Works →',
          relatedQuestions: [
            { 
              text: locale === 'tr' ? 'Hangi platformlarda çalışıyorsunuz?' : locale === 'ru' ? 'С какими платформами работаете?' : 'Which platforms do you support?', 
              tab: 'sss' as TabType 
            },
            { 
              text: locale === 'tr' ? 'Nasıl iletişime geçebilirim?' : locale === 'ru' ? 'Как можно с вами связаться?' : 'How do I contact you?', 
              tab: 'iletisim' as TabType 
            }
          ]
        };

      case 'sss':
        return {
          userQuestion: locale === 'tr' 
            ? 'Çalışma süreci ve teslimat süreleri hakkında sorum var.' 
            : locale === 'ru' 
              ? 'У меня вопрос по поводу процесса работы и сроков.' 
              : 'I have a question about process and delivery times.',
          sauleAnswer: locale === 'tr'
            ? 'Sorularınız çok değerli! Çalışma modelimiz, iptal hakları ve süreçlerle ilgili tüm merak edilenleri derledim:'
            : locale === 'ru'
              ? 'Важный вопрос! Я собрала самые частые вопросы о процессе, оплате и сроках сдачи материалов:'
              : 'Very important questions! I compiled the most frequently asked questions regarding payments, process, and revisions:',
          cardIcon: '❓',
          cardTitle: locale === 'tr' ? 'Sıkça Sorulan Sorular' : locale === 'ru' ? 'Часто задаваемые вопросы' : 'Frequently Asked Questions',
          customCardBody: (
            <div className="space-y-1.5 max-h-[190px] overflow-y-auto pr-1">
              {[
                { 
                  q: locale === 'tr' ? 'Çalışma süreci nasıl ilerliyor?' : 'How does the process work?', 
                  a: locale === 'tr' ? 'İlk olarak ihtiyaçlarınızı konuşuyoruz. Ardından strateji oluşturuyor ve içerikleri planlayarak üretime başlıyoruz.' : 'First we talk about your needs, then we build a custom strategy and plan content.' 
                },
                { 
                  q: locale === 'tr' ? 'Ödemeler nasıl yapılıyor?' : 'How are payments made?', 
                  a: locale === 'tr' ? 'EFT veya online kredi kartı ile güvenli ödeme bağlantısı üzerinden tahsil edilir.' : 'Via secure bank transfer or online payment link.' 
                },
                { 
                  q: locale === 'tr' ? 'İçerik teslim süresi ne kadar?' : 'What is the delivery time?', 
                  a: locale === 'tr' ? 'Seçtiğiniz pakete bağlı olarak genellikle 5-10 iş günü arasında ilk taslaklar paylaşılır.' : 'Generally 5-10 business days depending on selected plan.' 
                },
                { 
                  q: locale === 'tr' ? 'Hangi platformlarda çalışıyorsunuz?' : 'Which platforms do you support?', 
                  a: locale === 'tr' ? 'Instagram, TikTok, YouTube Shorts ve LinkedIn ağırlıklı çalışıyoruz.' : 'Primarily Instagram, TikTok, YouTube Shorts, and LinkedIn.' 
                }
              ].map((faq, idx) => (
                <div key={idx} className="border-b border-[rgba(20,35,31,0.05)] pb-1">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setOpenFaqIndex(openFaqIndex === idx ? -1 : idx); }}
                    className="w-full flex justify-between items-center text-left text-[9px] font-bold text-[var(--ink)] py-0.5 focus:outline-none"
                  >
                    <span>{faq.q}</span>
                    <span className="text-[8px] text-[var(--muted)]">{openFaqIndex === idx ? '▲' : '▼'}</span>
                  </button>
                  {openFaqIndex === idx && (
                    <p className="text-[9px] text-[var(--ink-soft)] leading-normal mt-0.5 pl-0.5 m-0">
                      {faq.a}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ),
          cardBtnText: locale === 'tr' ? 'Tüm Soruları Gör →' : locale === 'ru' ? 'Все вопросы →' : 'View All FAQ →',
          relatedQuestions: [
            { 
              text: locale === 'tr' ? 'Fiyat listesini görebilir miyim?' : locale === 'ru' ? 'Могу я увидеть прайс-лист?' : 'Can I see the price list?', 
              tab: 'paketler' as TabType 
            },
            { 
              text: locale === 'tr' ? 'Hakkında daha fazla bilgi alabilir miyim?' : locale === 'ru' ? 'Можно узнать больше о вас?' : 'Can I get more info about you?', 
              tab: 'hakkimda' as TabType 
            }
          ]
        };

      case 'iletisim':
        const emailSlug = locale === 'ru' ? 'anna' : firstName.toLowerCase();
        const handleSlug = locale === 'tr' ? 'selinaydin' : locale === 'ru' ? 'annakozlova' : 'sophiamiller';
        return {
          userQuestion: locale === 'tr' 
            ? 'Seninle nasıl iletişime geçebilirim?' 
            : locale === 'ru' 
              ? 'Как я могу с вами связаться?' 
              : 'How can I contact you?',
          sauleAnswer: locale === 'tr'
            ? 'Bana dilediğiniz an aşağıdaki resmi kanallardan ulaşabilirsiniz. Genellikle gün içinde hızlıca dönüş sağlıyorum:'
            : locale === 'ru'
              ? 'Вы можете связаться со мной в любое время через официальные каналы. Обычно я отвечаю в тот же день:'
              : 'You can contact me anytime via the following official channels. I usually respond within a few hours:',
          cardIcon: '✉️',
          cardTitle: locale === 'tr' ? 'Resmi İletişim Kanalları' : locale === 'ru' ? 'Официальные контакты' : 'Official Contact Channels',
          cardBullets: locale === 'tr'
            ? [
                `E-posta: ${emailSlug}@example.com`,
                'WhatsApp: +90 555 123 45 67',
                `Instagram DM: @${handleSlug}`,
                `LinkedIn: linkedin.com/in/${handleSlug}`
              ]
            : locale === 'ru'
              ? [
                  `Email: ${emailSlug}@example.com`,
                  'WhatsApp: +90 555 123 45 67',
                  `Instagram DM: @${handleSlug}`,
                  `LinkedIn: linkedin.com/in/${handleSlug}`
                ]
              : [
                  `E-mail: ${emailSlug}@example.com`,
                  'WhatsApp: +90 555 123 45 67',
                  `Instagram DM: @${handleSlug}`,
                  `LinkedIn: linkedin.com/in/${handleSlug}`
                ],
          cardBtnText: locale === 'tr' ? 'WhatsApp ile Sor →' : locale === 'ru' ? 'Задать вопрос в WhatsApp →' : 'Ask on WhatsApp →',
          relatedQuestions: [
            { 
              text: locale === 'tr' ? 'Hangi hizmetleri sunuyorsun?' : locale === 'ru' ? 'Какие услуги вы предоставляете?' : 'What services do you offer?', 
              tab: 'hizmetlerim' as TabType 
            },
            { 
              text: locale === 'tr' ? 'Hakkında bilgi alabilir miyim?' : locale === 'ru' ? 'Могу я узнать о вас?' : 'Can I get some info about you?', 
              tab: 'hakkimda' as TabType 
            }
          ]
        };
    }
  };

  const cardContent = getTabContent();

  return (
    <div className="phone-container relative flex items-center md:items-start justify-center gap-6">
      {/* Phone Frame */}
      <div className="phone-mockup">
        <div className="phone-screen-inner">
          <div className="phone-notch"></div>
          
          <div className="phone-profile">
            <div className="phone-avatar" style={{ backgroundImage: `url(${persona.avatar})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
            <h2 className="phone-title">{persona.name}</h2>
            <p className="phone-subtitle">{persona.subtitle}</p>
            <div className="phone-socials">
              <svg className="phone-social-icon" fill="currentColor" viewBox="0 0 24 24" width="16" height="16"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.79.073 7.151.014 8.43 0 8.839 0 12s.014 3.77.072 5.049c.2 4.363 2.615 6.88 6.975 7.08 1.28.058 1.688.072 4.953.072s3.673-.014 4.953-.072c4.354-.2 6.782-2.718 6.975-7.08.058-1.28.072-1.687.072-5.049s-.014-3.77-.072-5.049c-.2-4.364-2.615-6.88-6.975-7.08C15.673.014 15.264 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.88z"/></svg>
              <svg className="phone-social-icon" fill="currentColor" viewBox="0 0 24 24" width="16" height="16"><path d="M23.498 6.163a3.003 3.003 0 00-2.11-2.11C19.517 3.545 12 3.545 12 3.545s-7.517 0-9.388.507a3.003 3.003 0 00-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 002.11 2.11c1.871.507 9.388.507 9.388.507s7.517 0 9.388-.507a3.003 3.003 0 002.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.455L15.818 12l-6.273 3.568z"/></svg>
              <svg className="phone-social-icon" fill="currentColor" viewBox="0 0 24 24" width="16" height="16"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
            </div>
          </div>

          <div className="phone-blocks">
            <button 
              onClick={() => handleTabClick('hakkimda')}
              className="phone-block-btn" 
              style={activeTab === 'hakkimda' ? { borderColor: 'var(--coral)', borderWidth: '1px', background: 'var(--coral-tint)' } : {}}
            >
              {locale === 'tr' ? 'Hakkımda' : locale === 'ru' ? 'Обо мне' : 'About Me'}
            </button>
            <button 
              onClick={() => handleTabClick('hizmetlerim')}
              className="phone-block-btn"
              style={activeTab === 'hizmetlerim' ? { borderColor: 'var(--coral)', borderWidth: '1px', background: 'var(--coral-tint)' } : {}}
            >
              {locale === 'tr' ? 'Hizmetlerim' : locale === 'ru' ? 'Мои услуги' : 'My Services'}
            </button>
            <button 
              onClick={() => handleTabClick('paketler')}
              className="phone-block-btn" 
              style={activeTab === 'paketler' ? { borderColor: 'var(--coral)', borderWidth: '1px', background: 'var(--coral-tint)' } : {}}
            >
              {locale === 'tr' ? 'Paketler & Fiyatlar' : locale === 'ru' ? 'Пакеты и Цены' : 'Packages & Prices'}
            </button>
            <button 
              onClick={() => handleTabClick('calismalarim')}
              className="phone-block-btn"
              style={activeTab === 'calismalarim' ? { borderColor: 'var(--coral)', borderWidth: '1px', background: 'var(--coral-tint)' } : {}}
            >
              {locale === 'tr' ? 'Çalışmalarım' : locale === 'ru' ? 'Портфолио' : 'My Works'}
            </button>
            <button 
              onClick={() => handleTabClick('sss')}
              className="phone-block-btn"
              style={activeTab === 'sss' ? { borderColor: 'var(--coral)', borderWidth: '1px', background: 'var(--coral-tint)' } : {}}
            >
              {locale === 'tr' ? 'S.S.S.' : 'FAQ'}
            </button>
            <button 
              onClick={() => handleTabClick('iletisim')}
              className="phone-block-btn"
              style={activeTab === 'iletisim' ? { borderColor: 'var(--coral)', borderWidth: '1px', background: 'var(--coral-tint)' } : {}}
            >
              {locale === 'tr' ? 'İletişim' : locale === 'ru' ? 'Контакты' : 'Contact'}
            </button>
          </div>
          
          <div className="text-[8px] text-[var(--muted)] text-center mt-2 font-semibold">
            powered by <span className="font-extrabold text-[var(--ink)]">talkinbio</span>
          </div>
        </div>
      </div>

      {/* Floating Active Details Card - Rendered on Desktop beside Phone, and on Mobile as a Premium Overlapping Slide-up Sheet */}
      {isCardOpen && (
        <div className="interactive-details-card animate-fade-in-quick">
          {/* Format 4 Step Header */}
          <div className="flex justify-between items-center border-b border-[rgba(20,35,31,0.05)] pb-3 mb-3.5">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--teal)] text-white text-[10px] font-extrabold font-mono">4</span>
              <span className="text-[10px] font-bold text-[var(--teal)] uppercase tracking-wider font-mono">
                {locale === 'tr' ? 'Cevap / Yönlendirme' : locale === 'ru' ? 'Ответ / Направление' : 'Answer / Redirection'}
              </span>
            </div>
            <button 
              onClick={() => setIsCardOpen(false)}
              className="w-5 h-5 rounded-full hover:bg-[rgba(20,35,31,0.05)] flex items-center justify-center text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)] transition-colors focus:outline-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          
          {/* Conversational Layout (Format 4) */}
          <div className="interactive-card-body overflow-y-auto max-h-[460px] pr-1 flex flex-col gap-4">
            {/* 1. User Question Bubble */}
            <div className="self-end max-w-[90%] bg-[var(--coral-tint)] text-[var(--ink)] px-3.5 py-2 rounded-[18px_20px_4px_20px] border border-[rgba(255,106,92,0.12)] shadow-sm">
              <p className="text-[11px] font-semibold leading-relaxed m-0">{cardContent.userQuestion}</p>
            </div>

            {/* 2. Saule AI Text Reply */}
            <div className="text-[11px] text-[var(--ink-soft)] leading-relaxed font-medium max-w-[95%]">
              {cardContent.sauleAnswer}
            </div>

            {/* 3. Interactive Content Card */}
            <div className="p-3.5 rounded-[20px] border border-[rgba(20,35,31,0.08)] bg-white shadow-sm flex flex-col gap-3 transition-all hover:border-[var(--teal)]">
              {/* Card Title with Icon */}
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-[var(--paper)] text-sm">
                  {cardContent.cardIcon}
                </div>
                <h4 className="text-[11px] font-extrabold text-[var(--ink)] m-0 leading-tight">
                  {cardContent.cardTitle}
                </h4>
              </div>

              {/* Card Body */}
              {cardContent.customCardBody ? (
                cardContent.customCardBody
              ) : (
                <ul className="list-none p-0 m-0 space-y-1.5 pl-1">
                  {cardContent.cardBullets?.map((bullet: string, i: number) => (
                    <li key={i} className="flex items-start gap-1.5 text-[10px] text-[var(--ink-soft)] leading-relaxed">
                      <span className="text-[var(--teal)] font-bold text-[10px]">•</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Action Button inside Card */}
              <button 
                onClick={() => handleTabClick(cardContent.relatedQuestions[0]?.tab || 'hizmetlerim')}
                className="w-full text-center py-2 px-4 bg-[#FF6A5C] hover:bg-[#E85B4E] text-white rounded-full font-bold text-[10px] transition-colors focus:outline-none shadow-sm flex items-center justify-center gap-1 mt-1"
              >
                <span>{cardContent.cardBtnText}</span>
              </button>
            </div>

            {/* 4. Related Questions Section */}
            <div className="mt-1 flex flex-col gap-1.5">
              <span className="text-[9px] font-extrabold text-[var(--ink-soft)] uppercase tracking-wider pl-1 font-mono">
                {locale === 'tr' ? 'İlgili diğer sorular' : locale === 'ru' ? 'Другие вопросы по теме' : 'Related questions'}
              </span>
              
              {cardContent.relatedQuestions.map((q: any, i: number) => (
                <button 
                  key={i}
                  onClick={() => handleTabClick(q.tab)}
                  className="w-full text-left py-2 px-3 bg-white hover:bg-[var(--paper)] border border-[rgba(20,35,31,0.06)] hover:border-[var(--coral)] rounded-xl text-[10px] font-bold text-[var(--ink)] transition-all flex justify-between items-center shadow-sm focus:outline-none group"
                >
                  <span className="group-hover:text-[var(--coral)] transition-colors">{q.text}</span>
                  <span className="text-[var(--muted)] group-hover:text-[var(--coral)] transition-colors">›</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Reopen floating trigger button if user closed the details card */}
      {!isCardOpen && (
        <button 
          onClick={() => setIsCardOpen(true)}
          className="absolute -right-6 md:right-[-60px] top-[40%] transform translateY(-50%) bg-[var(--coral)] text-white font-bold text-[10px] py-2 px-3 rounded-l-xl shadow-lg border border-r-0 border-[rgba(255,255,255,0.15)] flex items-center gap-1.5 animate-bounce-horizontal"
        >
          <span>💬</span>
          <span>{locale === 'tr' ? 'Detayları Aç' : 'Show Details'}</span>
        </button>
      )}
    </div>
  );
}
