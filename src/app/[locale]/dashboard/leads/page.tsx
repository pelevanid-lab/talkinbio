import { createClient } from '@supabase/supabase-js';
import { notFound, redirect } from 'next/navigation';
import { createClient as createServerClient } from '@/utils/supabase/server';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { CheckCircle2, Clock, Phone, User as UserIcon } from 'lucide-react';

export default async function LeadsDashboardPage() {
  const supabase = await createServerClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData?.user) {
    redirect('/login');
  }

  // Fetch business of user
  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, username')
    .eq('owner_id', userData.user.id)
    .single();

  if (!business) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Henüz bir işletme kurmamışsınız</h1>
        <p className="text-slate-500 mb-6">Müşteri taleplerini görebilmek için önce profilinizi oluşturun.</p>
        <a href="/onboarding" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700">Profili Oluştur</a>
      </div>
    );
  }

  // Fetch leads
  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('business_id', business.id)
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Talepler & Müşteriler</h1>
            <p className="text-sm text-slate-500">{business.name}</p>
          </div>
          <a href={`/${business.username}`} className="text-sm text-blue-600 font-medium bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100">
            Profilimi Gör
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!leads || leads.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mb-4">
              <UserIcon className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Henüz hiç talep almadınız</h2>
            <p className="text-slate-500 max-w-sm">Ziyaretçileriniz asistanınızla konuşup bir hizmet talep ettiğinde burada görünecekler.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {leads.map((lead: any) => (
              <div key={lead.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg">
                      {lead.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{lead.name}</h3>
                      <div className="flex items-center text-sm text-slate-500 mt-0.5">
                        <Clock className="w-3.5 h-3.5 mr-1" />
                        {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: tr })}
                      </div>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                    lead.status === 'new' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                    lead.status === 'seen' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    'bg-green-50 text-green-700 border-green-200'
                  }`}>
                    {lead.status === 'new' ? 'Yeni' : lead.status === 'seen' ? 'İncelendi' : 'Tamamlandı'}
                  </span>
                </div>
                
                <div className="bg-slate-50 rounded-xl p-4 mb-4">
                  <p className="text-slate-700 text-sm">{lead.summary}</p>
                </div>
                
                <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                  <a href={lead.contact.includes('@') ? `mailto:${lead.contact}` : `https://wa.me/${lead.contact.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center text-sm font-medium text-slate-700 hover:text-blue-600">
                    <Phone className="w-4 h-4 mr-2 text-slate-400" />
                    {lead.contact}
                  </a>
                  
                  {lead.status === 'new' && (
                    <button className="text-sm font-medium text-blue-600 bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition flex items-center">
                      <CheckCircle2 className="w-4 h-4 mr-1.5" />
                      İşaretle
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
