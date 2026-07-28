import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

// Next's built-in htmlLimitedBots list (see node_modules/next/dist/shared/lib/router/utils/html-bots.js)
// forces a blocking (non-streamed) render so link-preview crawlers see og:image tags in the
// initial HTML. It does NOT include TelegramBot, so Telegram link previews on dynamic pages
// could hit a streamed response and miss the metadata. Setting this option *replaces* Next's
// list rather than extending it, so we copy the default set here and add Telegram to it.
const nextConfig: NextConfig = {
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
