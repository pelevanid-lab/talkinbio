'use client';

type Locale = 'tr' | 'en' | 'ru';

const copy = {
  tr: {
    title: 'Her sektörde aynı mantık: soru gelir, doğru bölüm açılır.',
    sectionLabel: 'Açılan bölüm',
    items: [
      { sector: 'Güzellik merkezi', question: 'Paketleriniz neler?', opens: 'Paketler', note: 'Fiyatlar ve hizmet seçenekleri öne çıkar.' },
      { sector: 'Diyetisyen', question: 'Online danışmanlık nasıl işliyor?', opens: 'Hizmet detayı', note: 'Süreç, kapsam ve başvuru adımı açılır.' },
      { sector: 'Danışman', question: 'Randevu alabilir miyim?', opens: 'İletişim', note: 'Lead açıksa talep alınır, kapalıysa seçili kanala gidilir.' },
      { sector: 'Atölye / kurs', question: 'Program nerede?', opens: 'Program', note: 'Ziyaretçi takvim veya açıklama bölümüne iner.' },
    ],
  },
  en: {
    title: 'Same logic across every category: a question arrives, the right section opens.',
    sectionLabel: 'Opened section',
    items: [
      { sector: 'Beauty studio', question: 'What are your packages?', opens: 'Packages', note: 'Prices and service options move into focus.' },
      { sector: 'Dietitian', question: 'How does online consulting work?', opens: 'Service detail', note: 'Process, scope and request step open together.' },
      { sector: 'Consultant', question: 'Can I book a call?', opens: 'Contact', note: 'Collect a lead or route to the selected channel.' },
      { sector: 'Workshop / course', question: 'Where is the program?', opens: 'Program', note: 'The visitor lands on schedule or explanation details.' },
    ],
  },
  ru: {
    title: 'Во всех сферах один принцип: вопрос приходит, нужный раздел открывается.',
    sectionLabel: 'Открытый раздел',
    items: [
      { sector: 'Студия красоты', question: 'Какие есть пакеты?', opens: 'Пакеты', note: 'Цены и варианты услуг выходят на первый план.' },
      { sector: 'Диетолог', question: 'Как проходит онлайн-консультация?', opens: 'Детали услуги', note: 'Открываются процесс, состав услуги и заявка.' },
      { sector: 'Консультант', question: 'Можно записаться?', opens: 'Контакт', note: 'Собирается заявка или открывается выбранный канал.' },
      { sector: 'Курс / мастерская', question: 'Где программа?', opens: 'Программа', note: 'Посетитель попадает к расписанию или описанию.' },
    ],
  },
} satisfies Record<Locale, any>;

export default function ShowcaseSection({ locale }: { locale: string }) {
  const texts = copy[(locale === 'en' || locale === 'ru' ? locale : 'tr') as Locale];

  return (
    <section className="py-20 md:py-28 bg-white border-t border-[var(--border)]">
      <div className="wrap">
        <h2 className="text-3xl md:text-5xl font-bold text-[var(--ink)] mb-10 max-w-4xl">{texts.title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {texts.items.map((item: any) => (
            <div key={item.sector} className="rounded-[30px] border border-[var(--border)] bg-[var(--paper)] p-5 md:p-6 shadow-sm">
              <div className="bg-white border border-[var(--border)] rounded-[24px] p-5 mb-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-2">{item.sector}</p>
                <p className="text-xl font-bold text-[var(--ink)]">“{item.question}”</p>
              </div>
              <div className="rounded-[24px] bg-[linear-gradient(135deg,#ffffff_0%,#eaf8f4_100%)] border border-[#BFE9DD] p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--teal-deep)] mb-2">{texts.sectionLabel}</p>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-2xl font-[800] text-[var(--ink)]">{item.opens}</p>
                    <p className="text-sm text-[var(--ink-soft)] mt-2">{item.note}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-white border border-[var(--border)] flex items-center justify-center text-[var(--teal-deep)] font-bold shrink-0">
                    →
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
