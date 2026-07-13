import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import ChatWidget from '@/components/ChatWidget';
import BlocksRenderer from '@/components/BlocksRenderer';

// We fetch data server-side using the service role to bypass RLS for public viewing if needed, 
// though we set RLS for public to view businesses and blocks, so anon key is fine too.
// Using anon key:
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function generateMetadata({ params }: any) {
  const { username } = await params;
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

  // 1. Fetch Business
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('username', username)
    .single();

  if (!business) {
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
    <div className="flex flex-col min-h-[100dvh] bg-slate-50 relative">
      {/* Top 70% Content Area */}
      <main className="flex-1 overflow-y-auto pb-[35dvh]">
        <div className="max-w-md mx-auto w-full px-4 pt-12 pb-8">
          
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-3xl font-bold mb-4 shadow-sm">
              {business.name.charAt(0).toUpperCase()}
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{business.name}</h1>
            <p className="text-slate-500 font-medium">{business.category}</p>
          </div>

          {/* Blocks */}
          <div className="space-y-4">
            {blocks && blocks.length > 0 ? (
              <BlocksRenderer blocks={blocks} />
            ) : (
              <div className="text-center p-6 bg-white rounded-2xl shadow-sm border border-slate-100 text-slate-500">
                Henüz içerik eklenmemiş. Ancak aşağıdaki asistanla sohbet edebilirsiniz.
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Bottom 30% Chat Widget */}
      <div className="fixed bottom-0 left-0 right-0 h-[30dvh] bg-white border-t border-slate-200 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-50">
        <ChatWidget businessId={business.id} businessName={business.name} />
      </div>
    </div>
  );
}
