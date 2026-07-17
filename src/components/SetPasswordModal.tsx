'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, Lock } from 'lucide-react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

export default function SetPasswordModal({ hasPassword, businessId }: { hasPassword: boolean, businessId: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const isResetPassword = searchParams.get('reset_password') === 'true';

  const [isOpen, setIsOpen] = useState(!hasPassword || isResetPassword);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  // If URL has reset_password, force open
  useEffect(() => {
    if (isResetPassword) {
      setIsOpen(true);
    }
  }, [isResetPassword]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Şifreniz en az 6 karakter olmalıdır.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Update password in Supabase Auth
      const { error: authError } = await supabase.auth.updateUser({
        password: password
      });

      if (authError) throw authError;

      // 2. Update has_password flag in businesses table
      const { error: dbError } = await supabase
        .from('businesses')
        .update({ has_password: true })
        .eq('id', businessId);

      if (dbError) throw dbError;

      setIsOpen(false);
      
      // Remove reset_password from URL if present
      if (isResetPassword) {
        const newSearchParams = new URLSearchParams(searchParams.toString());
        newSearchParams.delete('reset_password');
        const newUrl = pathname + (newSearchParams.toString() ? `?${newSearchParams.toString()}` : '');
        router.replace(newUrl);
      }
    } catch (err: any) {
      setError(err.message || 'Şifre güncellenirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-[var(--coral-tint)] text-[var(--coral)] rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Hesap Şifrenizi Belirleyin</h2>
          <p className="text-sm text-slate-500">
            Hesabınızı güvene almak ve sonraki girişlerinizde e-posta ve şifre kullanabilmek için lütfen bir şifre belirleyin.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-6 text-sm border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Yeni Şifre</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[var(--coral)] focus:border-transparent focus:outline-none"
              placeholder="••••••••"
              minLength={6}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Şifre (Tekrar)</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[var(--coral)] focus:border-transparent focus:outline-none"
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !password || !confirmPassword}
            className="w-full bg-[var(--coral)] text-white rounded-lg px-4 py-2 font-medium hover:bg-[#E55A4D] disabled:opacity-50 flex items-center justify-center transition mt-6"
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isLoading ? 'Kaydediliyor...' : 'Şifreyi Kaydet ve Devam Et'}
          </button>
        </form>
      </div>
    </div>
  );
}
