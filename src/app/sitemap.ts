import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

const baseUrl = 'https://www.talkinbio.com';
const locales = ['tr', 'en', 'ru'];

// Helper to generate hreflang alternates
function generateAlternates(path: string) {
  const languages: Record<string, string> = {};
  locales.forEach(locale => {
    languages[locale] = `${baseUrl}/${locale}${path}`;
  });
  // x-default goes to English
  languages['x-default'] = `${baseUrl}/en${path}`;
  
  return { languages };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 1. Static Routes
  const staticRoutes = ['', '/legal', '/stakeholders'].map(route => ({
    url: `${baseUrl}/en${route}`, // Use 'en' as the default canonical for the base URL in the sitemap listing
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : 0.8,
    alternates: generateAlternates(route)
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
    url: `${baseUrl}/en/${business.username}`,
    lastModified: business.updated_at ? new Date(business.updated_at) : new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.9,
    alternates: generateAlternates(`/${business.username}`)
  }));

  return [...staticRoutes, ...dynamicRoutes];
}
