'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/utils/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const t = useTranslations('AuthCallback');
  const router = useRouter();
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuth = async () => {
      try {
        // --- PKCE flow: ?code= in URL (password reset, magic link) ---
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;

          // After exchanging the code we have a session — go to editor to set new password
          router.replace('/dashboard/editor?reset_password=true');
          return;
        }

        // --- Implicit flow: #access_token= in hash (legacy / magic link) ---
        const hash = window.location.hash;
        if (hash && hash.includes('access_token')) {
          const params = new URLSearchParams(hash.replace('#', ''));
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');

          if (access_token && refresh_token) {
            const { error: setSessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (setSessionError) throw setSessionError;
          }
        }

        // Check if we ended up with a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (session) {
          router.replace('/dashboard/editor');
        } else {
          router.replace('/login');
        }
      } catch (err: any) {
        console.error('Auth callback error:', err);
        setError(err.message || t('genericError'));
      }
    };

    handleAuth();
  }, [router, supabase, t]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-red-100">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">!</div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">{t('errorTitle')}</h1>
          <p className="text-slate-500 mb-6">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="bg-slate-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-slate-800"
          >
            {t('retryButton')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center">
        <Loader2 className="w-10 h-10 text-[var(--coral)] animate-spin mb-4" />
        <h1 className="text-xl font-medium text-slate-900">{t('loadingTitle')}</h1>
        <p className="text-slate-500 mt-2">{t('loadingSubtitle')}</p>
      </div>
    </div>
  );
}
