'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, Mail, Lock } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'login' | 'forgot_password'>('login');
  const supabase = createClient();

  useEffect(() => {
    // Read error from URL if present (e.g. from auth callback)
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlError = urlParams.get('error');
      if (urlError) {
        setError(urlError === 'Invalid or expired code' ? 'Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş. Lütfen yeni bir bağlantı isteyin.' : urlError);
      }
    }
  }, []);

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

      // Refresh to update server components and let middleware handle redirect
      window.location.href = '/dashboard/editor';
    } catch (err: any) {
      setError(err.message === 'Invalid login credentials' ? 'E-posta veya şifre hatalı' : err.message);
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
        redirectTo: `${window.location.origin}/auth/callback`,
      });

      if (error) throw error;
      
      setMessage('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Lütfen kutunuzu kontrol edin.');
      setMode('login');
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            {mode === 'login' ? "Talkinbio'ya Giriş Yap" : "Şifremi Unuttum"}
          </h1>
          <p className="text-slate-500">
            {mode === 'login' 
              ? "İşletmenizi yönetmek için giriş yapın." 
              : "E-posta adresinizi girin, size şifre sıfırlama bağlantısı gönderelim."}
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
            <label className="block text-sm font-medium text-slate-700 mb-1">E-posta Adresi</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="h-5 w-5" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[var(--coral)] focus:border-transparent focus:outline-none"
                placeholder="ornek@sirket.com"
              />
            </div>
          </div>

          {mode === 'login' && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-slate-700">Şifre</label>
                <button 
                  type="button" 
                  onClick={() => setMode('forgot_password')}
                  className="text-sm text-[var(--coral)] hover:underline font-medium"
                >
                  Şifremi Unuttum
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[var(--coral)] focus:border-transparent focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !email || (mode === 'login' && !password)}
            className="w-full bg-[var(--coral)] text-white rounded-lg px-4 py-2 mt-4 font-medium hover:bg-[#E55A4D] disabled:opacity-50 flex items-center justify-center transition"
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {mode === 'login' 
              ? (isLoading ? 'Giriş Yapılıyor...' : 'Giriş Yap') 
              : (isLoading ? 'Gönderiliyor...' : 'Bağlantıyı Gönder')}
          </button>

          {mode === 'forgot_password' && (
            <button 
              type="button"
              onClick={() => setMode('login')}
              className="w-full text-slate-500 hover:text-slate-700 text-sm font-medium mt-4 transition"
            >
              Giriş ekranına dön
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
