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
    const handleAuth = async () => {
      try {
        // createBrowserClient automatically parses the hash fragment and sets the session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }

        if (session) {
          // Successfully logged in, redirect to dashboard
          router.push('/dashboard/leads');
        } else {
          // No session found, redirect to login
          router.push('/login');
        }
      } catch (err: any) {
        console.error('Auth callback error:', err);
        setError(err.message || 'Giriş yapılırken bir hata oluştu.');
      }
    };

    handleAuth();
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
