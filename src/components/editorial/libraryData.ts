import type { RoutingLocale } from '@/i18n/locales';

export const libraryPaths = {
  en: '/library',
  tr: '/kutuphane',
  ru: '/library',
} satisfies Record<RoutingLocale, string>;

export const libraryCopy = {
  tr: {
    back: 'Ana sayfaya dön',
    eyebrow: 'KÜTÜPHANE',
    title: 'Yazıları ve reklam incelemelerini tek rafta oku.',
    lead: 'Holistik pazarlama haritasındaki yazılar ile reklam çözümlemeleri burada birlikte duruyor.',
    articles: 'YAZILAR',
    reviews: 'REKLAM İNCELEMELERİ',
    articleCount: '4 yazı',
    reviewCount: '2 inceleme',
    readArticle: 'Yazıyı oku',
    readReview: 'İncelemeyi oku',
  },
  en: {
    back: 'Back to home',
    eyebrow: 'LIBRARY',
    title: 'Read the articles and ad reviews from one shelf.',
    lead: 'The holistic marketing articles and advertising close readings are gathered here.',
    articles: 'ARTICLES',
    reviews: 'AD REVIEWS',
    articleCount: '4 articles',
    reviewCount: '2 reviews',
    readArticle: 'Read article',
    readReview: 'Read review',
  },
  ru: {
    back: 'Вернуться на главную',
    eyebrow: 'БИБЛИОТЕКА',
    title: 'Читайте статьи и разборы рекламы на одной странице.',
    lead: 'Материалы по целостному маркетингу и подробные разборы рекламы собраны здесь.',
    articles: 'СТАТЬИ',
    reviews: 'РАЗБОР РЕКЛАМЫ',
    articleCount: '4 статьи',
    reviewCount: '2 разбора',
    readArticle: 'Читать статью',
    readReview: 'Читать разбор',
  },
} as const;
