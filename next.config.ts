import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const legacyTopicSlugs: Record<string, string> = {
  'musteri-ve-pazar-icgorusu': 'customer-and-market-insights',
  segmentasyon: 'segmentation',
  hedefleme: 'targeting',
  konumlandirma: 'positioning',
  'marka-ve-deger-onerisi': 'brand-and-value-proposition',
  'urun-hizmet-ve-fiyat': 'product-service-and-pricing',
  'kanallar-ve-deneyim': 'channels-and-experience',
  'iletisim-ve-icerik': 'communication-and-content',
  'sadakat-ve-musteri-degeri': 'loyalty-and-customer-value',
  'olcum-ve-buyume': 'measurement-and-growth',
};

const legacyArticleSlugs: Record<string, string> = {
  'arama-trafik-degildir': 'search-is-not-traffic',
  'arama-kelimesinden-ihtiyaca': 'from-search-term-to-customer-need',
  'her-ihtiyac-bir-segment-midir': 'is-every-need-a-segment',
  'konumlandirma-tercih-sebebidir': 'positioning-is-a-reason-to-choose',
};

const legacyExploreSlugs: Record<string, string> = {
  'arama-ve-kesif': 'search-and-discovery',
  'sosyal-medya-kesfi': 'social-media-discovery',
  pazaryerleri: 'marketplaces',
  'topluluklar-ve-yorumlar': 'communities-and-reviews',
  'acikhava-ve-geleneksel-medya': 'outdoor-and-traditional-media',
  'magaza-ve-raf': 'store-and-shelf',
  'agizdan-agiza': 'word-of-mouth',
  'is-ortakliklari': 'partnerships',
};

function localizedLegacyRedirects(sourceSection: string, destinationSection: string, slugs: Record<string, string>) {
  return Object.entries(slugs).flatMap(([legacySlug, canonicalSlug]) => [
    {
      source: `/${sourceSection}/${legacySlug}`,
      destination: `/${destinationSection}/${canonicalSlug}`,
      permanent: true,
    },
    {
      source: `/:locale(en|tr|ru)/${sourceSection}/${legacySlug}`,
      destination: `/:locale/${destinationSection}/${canonicalSlug}`,
      permanent: true,
    },
  ]);
}

// Next's built-in htmlLimitedBots list (see node_modules/next/dist/shared/lib/router/utils/html-bots.js)
// forces a blocking (non-streamed) render so link-preview crawlers see og:image tags in the
// initial HTML. It does NOT include TelegramBot, so Telegram link previews on dynamic pages
// could hit a streamed response and miss the metadata. Setting this option *replaces* Next's
// list rather than extending it, so we copy the default set here and add Telegram to it.
const nextConfig: NextConfig = {
  async redirects() {
    return [
      ...localizedLegacyRedirects('konular', 'topics', legacyTopicSlugs),
      ...localizedLegacyRedirects('yazilar', 'articles', legacyArticleSlugs),
      ...localizedLegacyRedirects('kesfet', 'explore', legacyExploreSlugs),
      {
        source: '/konular/:slug',
        destination: '/topics/:slug',
        permanent: true,
      },
      {
        source: '/:locale(en|tr|ru)/konular/:slug',
        destination: '/:locale/topics/:slug',
        permanent: true,
      },
      {
        source: '/yazilar/:slug',
        destination: '/articles/:slug',
        permanent: true,
      },
      {
        source: '/:locale(en|tr|ru)/yazilar/:slug',
        destination: '/:locale/articles/:slug',
        permanent: true,
      },
      {
        source: '/kesfet/:slug',
        destination: '/explore/:slug',
        permanent: true,
      },
      {
        source: '/:locale(en|tr|ru)/kesfet/:slug',
        destination: '/:locale/explore/:slug',
        permanent: true,
      },
      {
        source: '/ilk-temas',
        destination: '/first-contact',
        permanent: true,
      },
      {
        source: '/:locale(en|tr|ru)/ilk-temas',
        destination: '/:locale/first-contact',
        permanent: true,
      },
    ];
  },
  htmlLimitedBots:
    /[\w-]+-Google|Google-[\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight|TelegramBot/i,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'spjylpncgisogfxuiodl.supabase.co',
      },
    ],
  },
};

export default withNextIntl(nextConfig);
