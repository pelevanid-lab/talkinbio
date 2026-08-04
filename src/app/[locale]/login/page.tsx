'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { createClient } from '@/utils/supabase/client';
import { Loader2, Mail, Lock } from 'lucide-react';

export default function LoginPage() {
  const t = useTranslations('Login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'login' | 'forgot_password'>('login');
  const [rememberMe, setRememberMe] = useState(false);
  const [searchParamsStr, setSearchParamsStr] = useState('');
  const supabase = createClient();

  useEffect(() => {
    // Read error from URL if present (e.g. from auth callback)
    if (typeof window !== 'undefined') {
      setSearchParamsStr(window.location.search);
      const urlParams = new URLSearchParams(window.location.search);
      const urlError = urlParams.get('error');
      if (urlError) {
        setError(urlError === 'Invalid or expired code' ? t('resetLinkInvalid') : urlError);
      }

      const savedEmail = localStorage.getItem('talkinbio_remembered_email');
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    }
  }, [t]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (rememberMe) {
        localStorage.setItem('talkinbio_remembered_email', email);
      } else {
        localStorage.removeItem('talkinbio_remembered_email');
      }

      // Refresh to update server components and let middleware handle redirect.
      // Panel (leads/conversations) is the daily-use landing; the editor is a
      // secondary action reached via the nav link, except on first-time setup
      // (invite/password-reset flows, which intentionally land on the editor).
      const nextPath = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('next') || '/dashboard/leads' : '/dashboard/leads';
      window.location.href = nextPath;
    } catch (err: any) {
      setError(err.message === 'Invalid login credentials' ? t('invalidCredentials') : err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setError('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      });

      if (error) throw error;
      
      setMessage(t('resetLinkSent'));
      setMode('login');
    } catch (err: any) {
      setError(err.message || t('genericError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            {mode === 'login' ? t('loginTitle') : t('forgotTitle')}
          </h1>
          <p className="text-slate-500">
            {mode === 'login'
              ? t('loginSubtitle')
              : t('forgotSubtitle')}
          </p>
        </div>

        {message && (
          <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-6 text-sm border border-green-200">
            {message}
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 text-sm border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={mode === 'login' ? handleLogin : handleResetPassword} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">{t('emailLabel')}</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="h-5 w-5" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[var(--coral)] focus:border-transparent focus:outline-none"
                placeholder={t('emailPlaceholder')}
              />
            </div>
          </div>

          {mode === 'login' && (
            <>
              <button
                type="button"
                onClick={async () => {
                  const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                      redirectTo: `${window.location.origin}/api/auth/callback?next=${typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('next') || '/dashboard/leads' : '/dashboard/leads'}`,
                    },
                  });
                  if (error) setError(error.message);
                }}
                className="w-full bg-white border border-slate-300 text-slate-700 rounded-lg px-4 py-2.5 font-medium hover:bg-slate-50 transition flex items-center justify-center gap-2 mb-4"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  <path d="M1 1h22v22H1z" fill="none"/>
                </svg>
                {t('googleLogin')}
              </button>
              
              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-slate-500">Veya</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700">{t('passwordLabel')}</label>
                  <button
                    type="button"
                    onClick={() => setMode('forgot_password')}
                    className="text-sm text-[var(--coral)] hover:underline font-medium"
                  >
                    {t('forgotPasswordLink')}
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[var(--coral)] focus:border-transparent focus:outline-none"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex items-center mt-2">
                <input
                  id="remember_me"
                  name="remember_me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-[var(--coral)] focus:ring-[var(--coral)] border-slate-300 rounded cursor-pointer"
                />
                <label htmlFor="remember_me" className="ml-2 block text-sm text-slate-700 cursor-pointer">
                  {t('rememberMe')}
                </label>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={isLoading || !email || (mode === 'login' && !password)}
            className="w-full bg-[var(--coral)] text-white rounded-lg px-4 py-2 mt-4 font-medium hover:bg-[#E55A4D] disabled:opacity-50 flex items-center justify-center transition"
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {mode === 'login'
              ? (isLoading ? t('loginButtonLoading') : t('loginButton'))
              : (isLoading ? t('sendLinkButtonLoading') : t('sendLinkButton'))}
          </button>

          {mode === 'forgot_password' && (
            <button
              type="button"
              onClick={() => setMode('login')}
              className="w-full text-slate-500 hover:text-slate-700 text-sm font-medium mt-4 transition"
            >
              {t('backToLogin')}
            </button>
          )}

          {mode === 'login' && (
            <Link
              href={`/register${searchParamsStr}`}
              className="block text-center w-full text-slate-500 hover:text-[var(--coral)] text-sm font-medium mt-4 transition"
            >
              {t('registerLink')}
            </Link>
          )}
        </form>
      </div>
    </div>
  );
}

