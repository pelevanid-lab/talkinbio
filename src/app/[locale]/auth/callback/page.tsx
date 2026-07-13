'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Listen for auth state changes (this is triggered when the hash is parsed)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || session) {
        router.push('/dashboard/leads');
      } else if (event === 'SIGNED_OUT') {
        router.push('/login');
      }
    });

    // Also check the current session just in case it's already there
    const checkSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (session) {
          router.push('/dashboard/leads');
        } else {
          // Only redirect to login if there is NO hash fragment.
          // If there is a hash fragment, wait for onAuthStateChange to process it.
          if (!window.location.hash.includes('access_token')) {
            router.push('/login');
          }
        }
      } catch (err: any) {
        console.error('Auth callback error:', err);
        setError(err.message || 'Giriş yapılırken bir hata oluştu.');
      }
    };

    checkSession();

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-red-100">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">!</div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Giriş Başarısız</h1>
          <p className="text-slate-500 mb-6">{error}</p>
          <button 
            onClick={() => router.push('/login')}
            className="bg-slate-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-slate-800"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <h1 className="text-xl font-medium text-slate-900">Giriş yapılıyor...</h1>
        <p className="text-slate-500 mt-2">Lütfen bekleyin, yönlendiriliyorsunuz.</p>
      </div>
    </div>
  );
}
