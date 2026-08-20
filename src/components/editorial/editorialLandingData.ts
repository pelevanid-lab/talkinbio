import type { RoutingLocale } from '@/i18n/locales';

export const editorialLandingPaths = {
  holistic: {
    en: '/holistic-marketing',
    tr: '/holistik-pazarlama',
    ru: '/holistic-marketing',
  },
  cases: {
    en: '/ad-reviews',
    tr: '/reklam-incelemeleri',
    ru: '/ad-reviews',
  },
  library: {
    en: '/library',
    tr: '/kutuphane',
    ru: '/library',
  },
} satisfies Record<string, Record<RoutingLocale, string>>;

export const editorialLandingCopy = {
  tr: {
    eyebrow: 'PAZARLAMA · SAHA · DENEYİM',
    title: 'Pazarlamayı üç ayrı pencereden keşfet.',
    sectionsLabel: 'Talkinbio ana bölümleri',
    open: 'Aç',
    panels: [
      {
        number: '01',
        kicker: 'OKUMA VE UYGULAMA',
        title: 'Holistik Pazarlama',
        description: 'Pazarı anlamaktan ilişkiyi büyütmeye uzanan bütünsel pazarlama haritası.',
      },
      {
        number: '02',
        kicker: 'REKLAMI AYRI GÖR',
        title: 'Reklam İncelemeleri',
        description: 'Reklamların ihtiyacı, iknayı ve marka kararını nasıl kurduğunu çözümleyen okumalar.',
      },
      {
        number: '03',
        kicker: 'KÜTÜPHANE',
        title: 'Yazılar ve İncelemeler',
        description: 'Dört pazarlama yazısı ve iki reklam incelemesini tek rafta oku.',
      },
    ],
  },
  en: {
    eyebrow: 'MARKETING · FIELDWORK · EXPERIENCE',
    title: 'Explore marketing through three distinct lenses.',
    sectionsLabel: 'Talkinbio main sections',
    open: 'Open',
    panels: [
      {
        number: '01',
        kicker: 'READ AND PRACTICE',
        title: 'Holistic Marketing',
        description: 'A complete marketing map, from understanding the market to growing the relationship.',
      },
      {
        number: '02',
        kicker: 'READ THE AD',
        title: 'Ad Reviews',
        description: 'Readings that unpack how advertising constructs need, persuasion, and brand choice.',
      },
      {
        number: '03',
        kicker: 'LIBRARY',
        title: 'Articles and Reviews',
        description: 'Four marketing articles and two ad reviews gathered on one shelf.',
      },
    ],
  },
  ru: {
    eyebrow: 'МАРКЕТИНГ · ПРАКТИКА · ОПЫТ',
    title: 'Посмотрите на маркетинг через три разных ракурса.',
    sectionsLabel: 'Основные разделы Talkinbio',
    open: 'Открыть',
    panels: [
      {
        number: '01',
        kicker: 'ИЗУЧАТЬ И ПРИМЕНЯТЬ',
        title: 'Целостный маркетинг',
        description: 'Полная карта маркетинга: от понимания рынка до развития отношений.',
      },
      {
        number: '02',
        kicker: 'РАЗБЕРИТЕ РЕКЛАМУ',
        title: 'Разбор рекламы',
        description: 'Материалы о том, как реклама формирует потребность, убеждение и выбор бренда.',
      },
      {
        number: '03',
        kicker: 'БИБЛИОТЕКА',
        title: 'Статьи и разборы',
        description: 'Четыре статьи о маркетинге и два разбора рекламы на одной странице.',
      },
    ],
  },
} as const;
