import type { RoutingLocale } from '@/i18n/locales';

export const adReviewPaths = {
  index: { en: '/ad-reviews', tr: '/reklam-incelemeleri', ru: '/ad-reviews' },
  fuseTea: { en: '/ad-reviews/fuse-tea-budur', tr: '/reklam-incelemeleri/fuse-tea-budur', ru: '/ad-reviews/fuse-tea-budur' },
  oppoHamam: { en: '/ad-reviews/oppo-tellaktan-tertemiz', tr: '/reklam-incelemeleri/oppo-tellaktan-tertemiz', ru: '/ad-reviews/oppo-tellaktan-tertemiz' },
} satisfies Record<string, Record<RoutingLocale, string>>;

export const adReviewArchiveCopy = {
  tr: {
    back: 'Ana sayfaya dön', eyebrow: 'REKLAM İNCELEMELERİ',
    title: 'Reklamın ne söylediğini değil, kararı nasıl kurduğunu oku.',
    lead: 'Strateji, tüketici gerilimi ve ikna mekanizması üzerinden yakın okumalar.',
    action: 'İncelemeyi oku', articleBack: 'Reklam incelemelerine dön',
  },
  en: {
    back: 'Back to home', eyebrow: 'AD REVIEWS',
    title: 'Read not only what an ad says, but how it constructs the decision.',
    lead: 'Close readings through strategy, consumer tension, and persuasion mechanics.',
    action: 'Read the review', articleBack: 'Back to ad reviews',
  },
  ru: {
    back: 'Вернуться на главную', eyebrow: 'РАЗБОР РЕКЛАМЫ',
    title: 'Читайте не только то, что говорит реклама, но и то, как она формирует решение.',
    lead: 'Внимательный разбор стратегии, напряжения потребителя и механики убеждения.',
    action: 'Читать разбор', articleBack: 'Вернуться к разборам рекламы',
  },
} as const;

export const adReviewEntries = [
  {
    key: 'fuseTea',
    videoId: '5_4WlEo_W9E',
    path: adReviewPaths.fuseTea,
    copy: {
      tr: { category: 'İÇECEK · META-REKLAM', duration: '12 DK OKUMA', title: 'Fuse Tea “Budur”: Reklamı Bozarak Ürünü Gerçek Kılmak', lead: 'Değer önerisi, Jobs-to-be-Done ve İkna Bilgisi Modeli üzerinden bir reklam çözümlemesi.', videoTitle: 'Fuse Tea Budur şeftali reklamı' },
      en: { category: 'BEVERAGE · META-ADVERTISING', duration: '12 MIN READ', title: 'Fuse Tea “Budur”: Making the Product Real by Breaking the Ad', lead: 'An analysis through value proposition, Jobs-to-be-Done, and the Persuasion Knowledge Model.', videoTitle: 'Fuse Tea Budur peach commercial' },
      ru: { category: 'НАПИТКИ · МЕТА-РЕКЛАМА', duration: '12 МИН ЧТЕНИЯ', title: 'Fuse Tea “Budur”: сделать продукт реальным, разрушив рекламу', lead: 'Анализ через ценностное предложение, Jobs-to-be-Done и модель знания об убеждении.', videoTitle: 'Реклама Fuse Tea Budur со вкусом персика' },
    },
  },
  {
    key: 'oppoHamam',
    videoId: 'szjiE3aFnvQ',
    path: adReviewPaths.oppoHamam,
    copy: {
      tr: { category: 'TEKNOLOJİ · NEGATİF VAKA', duration: '10 DK OKUMA', title: 'OPPO “Tellaktan Tertemiz”: Yerelleştirme Ürünün Önüne Geçtiğinde', lead: 'CBBE, Jobs-to-be-Done, Vampir Etkisi ve POP–POD üzerinden eleştirel bir reklam çözümlemesi.', videoTitle: 'OPPO Reno13 F 5G Tellaktan Tertemiz reklamı' },
      en: { category: 'TECHNOLOGY · NEGATIVE CASE', duration: '10 MIN READ', title: 'OPPO “Tellaktan Tertemiz”: When Localization Overshadows the Product', lead: 'A critical reading through CBBE, Jobs-to-be-Done, the Vampire Effect, and POP–POD.', videoTitle: 'OPPO Reno13 F 5G Tellaktan Tertemiz commercial' },
      ru: { category: 'ТЕХНОЛОГИИ · НЕГАТИВНЫЙ КЕЙС', duration: '10 МИН ЧТЕНИЯ', title: 'OPPO “Tellaktan Tertemiz”: когда локализация затмевает продукт', lead: 'Критический разбор через CBBE, Jobs-to-be-Done, эффект вампира и POP–POD.', videoTitle: 'Реклама OPPO Reno13 F 5G Tellaktan Tertemiz' },
    },
  },
] as const;
