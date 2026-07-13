import { notFound } from 'next/navigation';
import ChatWidget from '@/components/ChatWidget';
import BlocksRenderer from '@/components/BlocksRenderer';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { createClient } from '@/utils/supabase/server';

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
  const { username } = await params;
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
  const { data: blocks } = await supabase
    .from('blocks')
    .select('*')
    .eq('business_id', business.id)
    .eq('is_visible', true)
    .order('order', { ascending: true });

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[var(--paper)] relative">
      {!business.is_published && isOwner && (
        <div className="w-full bg-[var(--coral)] text-white text-center py-2 text-sm font-medium shadow-sm z-50">
          Profiliniz henüz ziyaretçilere kapalı. Yayınlamak için eksikleri tamamlayın.
        </div>
      )}
      
      {/* Top 70% Content Area */}
      <main className="flex-1 overflow-y-auto pb-[35dvh]">
        <div className="max-w-md mx-auto w-full px-4 pt-6 pb-8">
          
          <div className="flex justify-end mb-6">
            <LanguageSwitcher />
          </div>

          {/* Header */}
          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-24 h-24 bg-[var(--coral-tint)] text-[var(--coral)] rounded-full flex items-center justify-center text-3xl font-bold mb-4 shadow-sm">
              {business.name.charAt(0).toUpperCase()}
            </div>
            <h1 className="text-2xl font-bold text-[var(--ink)] font-bricolage">{business.name}</h1>
            <p className="text-[var(--ink-soft)] font-medium">{business.category}</p>
          </div>

          {/* Blocks */}
          <div className="space-y-4">
            {blocks && blocks.length > 0 && (
              <BlocksRenderer blocks={blocks} />
            )}
          </div>

        </div>
      </main>

      {/* Bottom 30% Chat Widget */}
      <div className="fixed bottom-0 left-0 right-0 h-[30dvh] bg-transparent z-50 pointer-events-none">
        <div className="max-w-md mx-auto w-full h-full relative pointer-events-auto">
          <ChatWidget businessId={business.id} businessName={business.name} />
        </div>
      </div>
    </div>
  );
}
