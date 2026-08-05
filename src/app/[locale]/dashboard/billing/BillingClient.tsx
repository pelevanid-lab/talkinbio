'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { format, type Locale } from 'date-fns';
import { tr, enUS, ru } from 'date-fns/locale';
import { Coins, MessageCircle, Wrench, BarChart3 } from 'lucide-react';
import { CREDIT_PACKAGES } from '@/config/plans';
import DashboardShell from '@/components/dashboard/DashboardShell';

const DATE_FNS_LOCALES: Record<string, Locale> = { tr, en: enUS, ru };
const NUMBER_LOCALES: Record<string, string> = { tr: 'tr-TR', en: 'en-US', ru: 'ru-RU' };

const AGENT_ICON: Record<string, typeof MessageCircle> = {
  saule: MessageCircle,
  analysis: BarChart3,
};

const AGENT_LABEL_KEY: Record<string, string> = {
  saule: 'agent.saule',
  beiwe: 'agent.beiwe',
  analysis: 'agent.analysis',
};

type Transaction = {
  id: string;
  type: 'usage' | 'reload';
  agent?: string;
  planName?: string;
  amount: number;
  created_at: string;
};

type Business = {
  id: string;
  name: string;
  username: string;
  credit_balance: number;
};

export default function BillingClient({ business, transactions, ownerEmail }: { business: Business; transactions: Transaction[]; ownerEmail: string }) {
  const t = useTranslations('Billing');
  const tPricing = useTranslations('Pricing');
  const locale = useLocale();
  const dateLocale = DATE_FNS_LOCALES[locale] || tr;
  const numberLocale = NUMBER_LOCALES[locale] || NUMBER_LOCALES.tr;

  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTopUpCta = (planId: string) => {
    setSelectedPlan(planId);
    document.getElementById('billing-request-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!phone.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/pricing-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: ownerEmail,
          phone: phone.trim(),
          planInterest: selectedPlan || null,
          message: message.trim(),
          businessId: business.id,
        }),
      });
      if (!res.ok) throw new Error('failed');
      setSubmitted(true);
    } catch {
      setError(t('formErrorGeneric'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckout = async () => {
    if (!selectedPlan || checkingOut) return;
    setCheckingOut(true);
    setError(null);
    try {
      const res = await fetch('/api/checkout/shopier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan,
          businessId: business.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout failed');
      
      if (data.fastPayHtml) {
        // Create a temporary div, append HTML, and submit the form
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = data.fastPayHtml;
        document.body.appendChild(tempDiv);
        const form = tempDiv.querySelector('form');
        if (form) {
          form.target = '_blank';
          form.submit();
        }
        setCheckingOut(false);
      } else if (data.url) {
        window.open(data.url, '_blank');
        setCheckingOut(false);
      }
    } catch (err: any) {
      console.error(err);
      setError('Ödeme sayfasına yönlendirilirken bir hata oluştu.');
      setCheckingOut(false);
    }
  };

  return (
    <DashboardShell business={business} active="billing">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6 font-['Inter']">
        <div>
          <h1 className="text-xl font-[800] tracking-[-0.02em] text-[#14231F] flex items-center gap-2">
            <Coins className="w-5 h-5" /> {t('pageTitle')}
          </h1>
          <p className="text-sm text-[#4B5A55] font-['Inter']">{business.name}</p>
        </div>

        {/* Balance */}
        <div className="bg-white rounded-[20px] border border-[rgba(20,35,31,0.10)] p-6 flex items-center gap-4">
          <div className="w-14 h-14 bg-[#FFEDE9] text-[#FF6A5C] rounded-full flex items-center justify-center shrink-0">
            <Coins className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm text-[#8A8880] font-medium">{t('balanceLabel')}</p>
            <p className="text-3xl font-[800] text-[#14231F] font-['Bricolage_Grotesque']">
              {business.credit_balance.toLocaleString(numberLocale)} <span className="text-base font-medium text-[#8A8880]">{t('creditsUnit')}</span>
            </p>
          </div>
        </div>

        {/* Top-up / plan request */}
        <div className="bg-white rounded-[20px] border border-[rgba(20,35,31,0.10)] p-6">
          <h2 className="text-lg font-[800] text-[#14231F] font-['Bricolage_Grotesque'] mb-1">{t('topUpTitle')}</h2>
          <p className="text-sm text-[#4B5A55] mb-5">{t('topUpSubtitle')}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {CREDIT_PACKAGES.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => handleTopUpCta(pkg.id)}
                className={`text-left border rounded-xl p-5 flex flex-col gap-2 transition ${
                  selectedPlan === pkg.id
                    ? 'border-[#FF6A5C] bg-[#FFEDE9]'
                    : 'border-[rgba(20,35,31,0.10)] hover:border-[rgba(20,35,31,0.25)]'
                }`}
              >
                <div>
                  <span className="text-3xl font-[800] text-[#14231F] font-['Bricolage_Grotesque'] leading-none">
                    {pkg.credits.toLocaleString(numberLocale)}
                  </span>
                  <span className="block text-[10px] font-[700] text-[#2B6F5C] uppercase tracking-wide mt-1">
                    {tPricing('creditsUnit')}
                  </span>
                </div>
                <p className="text-xl font-[800] text-[#14231F] font-['Bricolage_Grotesque']">${pkg.price}</p>
                <p className="text-xs text-[#4B5A55] leading-relaxed">
                  {tPricing(`desc_${pkg.id}` as any)}
                </p>
              </button>
            ))}
          </div>

          {submitted ? (
            <p id="billing-request-form" className="text-sm text-[#14231F] bg-[#F4F2ED] rounded-xl p-4">{t('formSuccess')}</p>
          ) : (
            <form id="billing-request-form" onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-md">
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('formPhone')}
                className="w-full p-2.5 rounded-lg border border-[rgba(20,35,31,0.10)] focus:outline-none focus:border-[#FF6A5C] text-sm text-[#14231F] bg-white"
              />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('formMessage')}
                rows={2}
                className="w-full p-2.5 rounded-lg border border-[rgba(20,35,31,0.10)] focus:outline-none focus:border-[#FF6A5C] text-sm text-[#14231F] bg-white resize-none"
              />
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={submitting || checkingOut}
                  className="bg-[#FF6A5C] text-white rounded-full px-5 py-2.5 text-sm font-[700] hover:opacity-90 transition disabled:opacity-60 flex-1 w-full sm:w-auto text-center"
                >
                  {checkingOut ? 'Yönlendiriliyor...' : 'Kredi Kartı ile Satın Al'}
                </button>
                <span className="text-sm text-[#8A8880] font-medium hidden sm:inline">veya</span>
                <button
                  type="submit"
                  disabled={submitting || checkingOut}
                  className="bg-[#14231F] text-white rounded-full px-5 py-2.5 text-sm font-[700] hover:opacity-90 transition disabled:opacity-60 flex-1 w-full sm:w-auto text-center"
                >
                  {submitting ? t('formSubmitting') : t('formSubmit')}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Usage history */}
        <div className="bg-white rounded-[20px] border border-[rgba(20,35,31,0.10)] p-6">
          <h2 className="text-lg font-[800] text-[#14231F] font-['Bricolage_Grotesque'] mb-4">İşlem & Kullanım Geçmişi</h2>
          {transactions.length === 0 ? (
            <p className="text-sm text-[#8A8880]">{t('usageEmpty')}</p>
          ) : (
            <div className="space-y-1">
              {transactions.map((event) => {
                const isReload = event.type === 'reload';
                const Icon = isReload ? Coins : (AGENT_ICON[event.agent || ''] || MessageCircle);
                const title = isReload ? `Kredi Yükleme (${event.planName})` : t(AGENT_LABEL_KEY[event.agent || ''] || 'agent.saule');
                
                return (
                  <div key={event.id} className="flex items-center justify-between py-2.5 border-b border-[rgba(20,35,31,0.06)] last:border-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isReload ? 'bg-[#E6F9F3] text-[#14231F]' : 'bg-[#F4F2ED] text-[#4B5A55]'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#14231F] truncate">{title}</p>
                        <p className="text-xs text-[#8A8880] font-mono">{format(new Date(event.created_at), 'd MMM yyyy, HH:mm', { locale: dateLocale })}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold shrink-0 ml-3 ${isReload ? 'text-[#059669]' : 'text-[#14231F]'}`}>
                      {isReload ? `+${event.amount.toLocaleString(numberLocale)}` : (event.amount !== 0 ? event.amount.toLocaleString(numberLocale) : t('freeLabel'))}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </DashboardShell>
  );
}
