import { createClient as createServerClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import ContentClient from './ContentClient';

export default async function ContentDashboardPage() {
  const supabase = await createServerClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData?.user) {
    redirect('/login');
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, username, category')
    .eq('owner_id', userData.user.id)
    .single();

  if (!business) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Henüz bir işletme kurmamışsınız</h1>
        <p className="text-slate-500 mb-6">İçerik üretebilmek için önce profilinizi oluşturun.</p>
        <a href="/onboarding" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700">Profili Oluştur</a>
      </div>
    );
  }

  const { data: blocks } = await supabase
    .from('blocks')
    .select('type, content')
    .eq('business_id', business.id)
    .in('type', ['services', 'gallery', 'testimonials']);

  return <ContentClient business={business} blocks={blocks || []} />;
}
