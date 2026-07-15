import { notFound } from 'next/navigation';
import ChatWidget from '@/components/ChatWidget';
import ProfilePageBody from '@/components/ProfilePageBody';
import { createClient } from '@/utils/supabase/server';
import { DEFAULT_THEME } from '@/config/archetypes';
import { googleFontsHref } from '@/utils/googleFonts';

export async function generateMetadata({ params }: any) {
  const { username } = await params;
  
  // Use anon client for metadata
  const { createClient: createAnonClient } = await import('@supabase/supabase-js');
  const supabase = createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: business } = await supabase.from('businesses').select('name, category').eq('username', username).single();
  
  if (!business) return { title: 'Not Found' };

  return {
    title: `${business.name} | Talkinbio`,
    description: business.category,
    openGraph: {
      title: `${business.name} | Talkinbio`,
      description: `Sohbet et, randevu al, bilgi al.`,
    }
  };
}

export default async function BusinessProfilePage({ params }: any) {
  const { username, locale } = await params;
  const supabase = await createClient();

  // 1. Fetch Business
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('username', username)
    .single();

  if (!business) {
    notFound();
  }

  // Check publication status
  const { data: userData } = await supabase.auth.getUser();
  const isOwner = userData?.user?.id === business.owner_id;

  if (!business.is_published && !isOwner) {
    notFound();
  }

  // 2. Fetch Blocks
  // Note: fetch all blocks (not just is_visible) — the invisible `settings` block carries
  // layoutMode, which ArchetypeRenderer needs to decide website vs. linktree rendering.
  // ArchetypeRenderer itself filters out settings + is_visible:false blocks before display.
  const { data: blocks } = await supabase
    .from('blocks')
    .select('*')
    .eq('business_id', business.id)
    .order('order', { ascending: true });

  const theme = business.theme || DEFAULT_THEME;

  return (
    <div className="flex flex-col min-h-[100dvh] relative">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href={googleFontsHref(theme.headingFont, theme.bodyFont)} rel="stylesheet" />
      {!business.is_published && isOwner && (
        <div className="w-full bg-[var(--coral)] text-white text-center py-2 text-sm font-medium shadow-sm z-50">
          Profiliniz henüz ziyaretçilere kapalı. Yayınlamak için eksikleri tamamlayın.
        </div>
      )}
      
      {/* Top 70% Content Area */}
      <main className="flex-1 overflow-y-auto pb-[35dvh]">
        <div className="max-w-md mx-auto w-full px-4 pt-6 pb-8">
          
          <ProfilePageBody
            blocks={blocks || []}
            theme={theme}
            businessName={business.name}
            pageTitle={business.page_title || business.name}
          />

        </div>
      </main>

      {/* Bottom 30% Chat Widget */}
      <div className="fixed bottom-0 left-0 right-0 h-[30dvh] bg-transparent z-50 pointer-events-none">
        <div className="max-w-md mx-auto w-full h-full relative pointer-events-auto">
          <ChatWidget businessId={business.id} businessName={business.name} locale={locale} />
        </div>
      </div>
    </div>
  );
}
