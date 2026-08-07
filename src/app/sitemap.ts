import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';
import { localizedUrl, hreflangUrls } from '@/utils/localizedUrl';

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
  const staticRoutes = ['', '/legal', '/stakeholders', '/pricing'].map(route => ({
    url: localizedUrl('en', route), // Use 'en' as the default canonical for the base URL in the sitemap listing
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : 0.8,
    alternates: { languages: hreflangUrls(route) }
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

  return [...staticRoutes, ...dynamicRoutes];
}
