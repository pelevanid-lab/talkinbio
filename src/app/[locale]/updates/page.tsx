import { getTranslations } from 'next-intl/server';
import { createClient } from '@/utils/supabase/server';
import { Link } from '@/i18n/routing';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gelişmeler | Talkinbio',
  description: 'Talkinbio hakkında en son haberler, güncellemeler ve rehberler.',
};

export default async function UpdatesPage({ params }: any) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const supabase = await createClient();

  const { data: posts, error } = await supabase
    .from('updates_posts')
    .select('id, slug, title, excerpt, category, published_at')
    .order('published_at', { ascending: false });

  return (
    <div className="bg-[var(--paper)] min-h-screen pt-24 pb-20">
      <div className="wrap max-w-5xl">
        <div className="mb-16">
          <h1 className="text-5xl font-bold text-[var(--ink)] mb-4" style={{ fontFamily: 'var(--font-bricolage)', letterSpacing: '-0.02em' }}>
            Haberler & Gelişmeler
          </h1>
          <p className="text-xl text-[var(--ink-soft)]">
            Talkinbio hakkında en son haberler, güncellemeler ve rehberler.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts && posts.map((post) => (
            <Link key={post.id} href={`/updates/${post.slug}`} className="group block h-full">
              <div className="bg-white rounded-3xl p-6 border border-[var(--border)] h-full flex flex-col transition-all hover:shadow-md">
                <div className="mb-4">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-[var(--coral-tint)] text-[var(--coral)]" style={{ fontFamily: 'var(--font-ibm-plex-mono)' }}>
                    {post.category}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-[var(--ink)] mb-3 group-hover:text-[var(--coral)] transition-colors line-clamp-2" style={{ fontFamily: 'var(--font-bricolage)' }}>
                  {post.title}
                </h3>
                <p className="text-[var(--ink-soft)] mb-6 flex-1 line-clamp-3">
                  {post.excerpt}
                </p>
                <div className="text-sm font-medium text-[var(--muted)]">
                  {new Date(post.published_at).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </div>
              </div>
            </Link>
          ))}
          {(!posts || posts.length === 0) && (
            <div className="col-span-full text-center py-12 text-[var(--ink-soft)]">
              Henüz bir yazı bulunmuyor. Lütfen daha sonra tekrar kontrol edin.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
