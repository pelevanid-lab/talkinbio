import { getTranslations } from 'next-intl/server';
import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { revalidatePath } from 'next/cache';

export async function generateMetadata({ params }: any) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: post } = await supabase.from('updates_posts').select('title, excerpt').eq('slug', slug).single();

  if (!post) return { title: 'Not Found' };

  return {
    title: `${post.title} | Talkinbio Gelişmeler`,
    description: post.excerpt,
  };
}

export default async function UpdatesPostPage({ params }: any) {
  const { locale, slug } = await params;
  const supabase = await createClient();

  const { data: post } = await supabase
    .from('updates_posts')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!post) {
    notFound();
  }

  // Fetch comments
  const { data: comments } = await supabase
    .from('updates_comments')
    .select('*, user:user_id(email)')
    .eq('post_id', post.id)
    .order('created_at', { ascending: true });

  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  async function addComment(formData: FormData) {
    'use server';
    const content = formData.get('content') as string;
    if (!content || !content.trim()) return;

    const supabaseServer = await createClient();
    const { data: { user } } = await supabaseServer.auth.getUser();
    
    if (user) {
      await supabaseServer.from('updates_comments').insert({
        post_id: post.id,
        user_id: user.id,
        content: content.trim()
      });
      revalidatePath(`/${locale}/updates/${slug}`);
    }
  }

  return (
    <div className="bg-[var(--paper)] min-h-screen pt-24 pb-32">
      <div className="wrap max-w-3xl">
        <Link href="/updates" className="inline-flex items-center text-[var(--ink-soft)] hover:text-[var(--ink)] font-medium mb-8 transition-colors">
          &larr; Gelişmelere Dön
        </Link>
        
        <article className="bg-white rounded-3xl p-8 md:p-12 border border-[var(--border)] shadow-sm mb-12">
          <div className="mb-6">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-[var(--coral-tint)] text-[var(--coral)]" style={{ fontFamily: 'var(--font-ibm-plex-mono)' }}>
              {post.category}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-[var(--ink)] mb-6 leading-tight" style={{ fontFamily: 'var(--font-bricolage)', letterSpacing: '-0.02em' }}>
            {post.title}
          </h1>
          <div className="text-sm font-medium text-[var(--muted)] mb-10 pb-6 border-b border-[var(--border)]">
            {new Date(post.published_at).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </div>
          
          <div className="prose prose-lg prose-slate max-w-none text-[var(--ink)] leading-relaxed">
            {/* For now, just rendering plain text content, but it could be markdown/html */}
            {post.content.split('\n').map((paragraph: string, idx: number) => (
              <p key={idx} className="mb-4">{paragraph}</p>
            ))}
          </div>
        </article>

        {/* Comments Section */}
        <div className="bg-white rounded-3xl p-8 md:p-12 border border-[var(--border)] shadow-sm">
          <h3 className="text-2xl font-bold text-[var(--ink)] mb-8" style={{ fontFamily: 'var(--font-bricolage)' }}>
            Yorumlar ({comments?.length || 0})
          </h3>
          
          {isLoggedIn ? (
            <form action={addComment} className="mb-12">
              <textarea 
                name="content"
                rows={3} 
                placeholder="Düşüncelerinizi paylaşın..."
                className="w-full bg-[var(--paper)] border border-[var(--border)] rounded-2xl p-4 text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--coral)] focus:border-transparent transition-shadow mb-4 resize-none"
                required
              />
              <button type="submit" className="btn btn-primary">
                Yorum Yap
              </button>
            </form>
          ) : (
            <div className="bg-[var(--paper)] border border-[var(--border)] rounded-2xl p-6 text-center mb-12">
              <p className="text-[var(--ink-soft)] mb-4">Yorum yapabilmek için giriş yapmalısınız.</p>
              <Link href="/login" className="btn btn-primary inline-flex">
                Giriş Yap
              </Link>
            </div>
          )}

          <div className="space-y-6">
            {comments && comments.map((comment: any) => (
              <div key={comment.id} className="pb-6 border-b border-[var(--border)] last:border-0 last:pb-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-[var(--coral-tint)] flex items-center justify-center text-[var(--coral)] font-bold text-sm" style={{ fontFamily: 'var(--font-ibm-plex-mono)' }}>
                    {comment.user?.email ? comment.user.email.substring(0, 2).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <div className="font-semibold text-[var(--ink)] text-sm">
                      {comment.user?.email ? comment.user.email.split('@')[0] : 'Kullanıcı'}
                    </div>
                    <div className="text-xs text-[var(--muted)]">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <p className="text-[var(--ink-soft)] text-sm mt-2">
                  {comment.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
