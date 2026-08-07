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
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: businesses } = await supabase
    .from('businesses')
    .select('username, updated_at')
    .eq('is_published', true);

  const dynamicRoutes = (businesses || []).map(business => ({
    url: localizedUrl('en', `/${business.username}`),
    lastModified: business.updated_at ? new Date(business.updated_at) : new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.9,
    alternates: { languages: hreflangUrls(`/${business.username}`) }
  }));

  return [...staticRoutes, ...dynamicRoutes];
}
