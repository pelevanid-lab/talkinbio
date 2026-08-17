import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';
import { localizedUrl, hreflangUrls } from '@/utils/localizedUrl';
import { editorialArticles, editorialTopics } from '@/components/editorial/editorialData';
import { touchpointPages } from '@/components/home/homeData';

// sitemap.ts is a cached Route Handler by default in Next 16 (see node_modules/next/dist/docs/
// .../metadata/sitemap.md) — without a revalidate/dynamic config it snapshots once at build time
// and never re-queries Supabase again. That's exactly what happened in production: the sitemap
// was frozen with 0 published businesses (built before any went live) and never picked up new
// ones since, including this business — Search Console's "4 pages discovered" matched the 4
// static routes exactly, with every business page silently missing. Revalidate hourly so newly
// published businesses reach the live sitemap without needing a fresh deploy.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 1. Static Routes
  const editorialRoutes = [
    '/first-contact',
    ...editorialTopics.map(({ slug }) => `/topics/${slug}`),
    ...editorialArticles.map(({ slug }) => `/articles/${slug}`),
    ...Object.keys(touchpointPages).map((slug) => `/explore/${slug}`),
  ];
  const staticRoutes = ['', '/legal', '/stakeholders', '/pricing', ...editorialRoutes].map(route => ({
    url: localizedUrl('en', route), // Use 'en' as the default canonical for the base URL in the sitemap listing
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : 0.8,
    alternates: { languages: hreflangUrls(route) }
  }));
  const aboutRoute = {
    url: localizedUrl('en', '/about'),
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
    alternates: {
      languages: {
        en: localizedUrl('en', '/about'),
        tr: localizedUrl('tr', '/hakkimda'),
        ru: localizedUrl('ru', '/about'),
        'x-default': localizedUrl('en', '/about'),
      },
    },
  };
  const sectionRoutes = [
    {
      en: '/holistic-marketing',
      tr: '/holistik-pazarlama',
      ru: '/holistic-marketing',
    },
    {
      en: '/ad-reviews',
      tr: '/reklam-incelemeleri',
      ru: '/ad-reviews',
    },
  ].map((paths) => ({
    url: localizedUrl('en', paths.en),
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.9,
    alternates: {
      languages: {
        en: localizedUrl('en', paths.en),
        tr: localizedUrl('tr', paths.tr),
        ru: localizedUrl('ru', paths.ru),
        'x-default': localizedUrl('en', paths.en),
      },
    },
  }));
  const adReviewRoutes = ['fuse-tea-budur', 'oppo-tellaktan-tertemiz'].map((slug) => ({
    url: localizedUrl('en', `/ad-reviews/${slug}`),
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
    alternates: {
      languages: {
        en: localizedUrl('en', `/ad-reviews/${slug}`),
        tr: localizedUrl('tr', `/reklam-incelemeleri/${slug}`),
        ru: localizedUrl('ru', `/ad-reviews/${slug}`),
        'x-default': localizedUrl('en', `/ad-reviews/${slug}`),
      },
    },
  }));

  // 2. Dynamic Routes (Published Businesses)
  // The real bug (found by testing live): `businesses` has no `updated_at` column at all
  // (see supabase/migrations/00001_initial_schema.sql — only `created_at`). This select was
  // erroring with "column businesses.updated_at does not exist" on every single request,
  // silently — `const { data: businesses } = await ...` never checked `error`, so it just
  // fell through to `(businesses || [])` → an empty array. That's why the sitemap stayed
  // frozen at 4 static routes even after adding `revalidate` above and confirming (via fresh
  // `age`/`x-vercel-cache` response headers) that the route really was re-executing — the
  // query itself never succeeded, caching was never the issue. `businesses` is also fully
  // public-readable via RLS ("Public can view businesses"), so the anon key is enough here —
  // no need for the service-role key. Log on error now so a future schema drift like this is
  // visible instead of silently emptying the sitemap again.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: businesses, error: businessesError } = await supabase
    .from('businesses')
    .select('username, created_at')
    .eq('is_published', true);

  if (businessesError) {
    console.error('sitemap.ts: failed to load published businesses', businessesError);
  }

  const dynamicRoutes = (businesses || []).map(business => ({
    url: localizedUrl('en', `/${business.username}`),
    lastModified: business.created_at ? new Date(business.created_at) : new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.9,
    alternates: { languages: hreflangUrls(`/${business.username}`) }
  }));

  return [...staticRoutes, aboutRoute, ...sectionRoutes, ...adReviewRoutes, ...dynamicRoutes];
}
