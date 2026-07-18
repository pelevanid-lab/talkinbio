'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Mail, Phone } from 'lucide-react';

const PLAN_CREDITS: Record<string, number> = { starter: 200, pro: 700, business: 1800 };

type BusinessRow = { id: string; name: string; username: string; ownerEmail: string | null; creditBalance: number; plan: string | null };
type InquiryRow = { id: string; email: string; phone: string; plan_interest: string | null; message: string | null; status: string; created_at: string };

export default function AdminSubscriptionsClient({ initialBusinesses, initialInquiries }: { initialBusinesses: BusinessRow[]; initialInquiries: InquiryRow[] }) {
  const router = useRouter();
  const [businesses, setBusinesses] = useState(initialBusinesses);
  const [inquiries, setInquiries] = useState(initialInquiries);
  const [planDraft, setPlanDraft] = useState<Record<string, string>>({});
  const [creditsDraft, setCreditsDraft] = useState<Record<string, string>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const onPlanChange = (businessId: string, plan: string) => {
    setPlanDraft((prev) => ({ ...prev, [businessId]: plan }));
    setCreditsDraft((prev) => ({ ...prev, [businessId]: plan ? String(PLAN_CREDITS[plan] || '') : '' }));
  };

  const grantPlan = async (businessId: string) => {
    const plan = planDraft[businessId];
    const credits = Number(creditsDraft[businessId]);
    if (!plan || !credits || credits <= 0) return;
    setLoadingId(businessId);
    try {
      const res = await fetch(`/api/admin/businesses/${businessId}/grant-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, credits }),
      });
      if (!res.ok) throw new Error('Action failed');
      setBusinesses((prev) => prev.map((b) => (b.id === businessId ? { ...b, plan, creditBalance: b.creditBalance + credits } : b)));
      router.refresh();
    } catch (err) {
      alert('İşlem başarısız oldu.');
      console.error(err);
    } finally {
      setLoadingId(null);
    }
  };

  const markContacted = async (id: string) => {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/admin/pricing-inquiries/${id}/mark-contacted`, { method: 'POST' });
      if (!res.ok) throw new Error('Action failed');
      setInquiries((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'contacted' } : i)));
      router.refresh();
    } catch (err) {
      alert('İşlem başarısız oldu.');
      console.error(err);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">İşletmeler — Plan &amp; Kredi</h2>
          <p className="text-sm text-slate-500 mt-1">Ödeme sağlayıcı hazır olana kadar plan/kredi manuel tahsilat sonrası elle atanır.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="p-4 font-medium">İşletme</th>
                <th className="p-4 font-medium">Sahip</th>
                <th className="p-4 font-medium">Plan</th>
                <th className="p-4 font-medium text-right">Kredi Bakiyesi</th>
                <th className="p-4 font-medium">Plan Ata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {businesses.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="p-4 text-slate-900">{b.name} <span className="text-slate-400">@{b.username}</span></td>
                  <td className="p-4 text-slate-600">{b.ownerEmail || '—'}</td>
                  <td className="p-4 text-slate-600">{b.plan || '—'}</td>
                  <td className="p-4 text-right font-medium text-slate-900">{b.creditBalance.toLocaleString('tr-TR')}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <select
                        value={planDraft[b.id] || ''}
                        onChange={(e) => onPlanChange(b.id, e.target.value)}
                        className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
                      >
                        <option value="">Plan seç</option>
                        <option value="starter">Starter</option>
                        <option value="pro">Pro</option>
                        <option value="business">Business</option>
                      </select>
                      <input
                        type="number"
                        min={1}
                        value={creditsDraft[b.id] || ''}
                        onChange={(e) => setCreditsDraft((prev) => ({ ...prev, [b.id]: e.target.value }))}
                        className="w-20 border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
                        placeholder="Kredi"
                      />
                      <button
                        onClick={() => grantPlan(b.id)}
                        disabled={loadingId === b.id || !planDraft[b.id]}
                        className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium disabled:opacity-50 flex-shrink-0"
                      >
                        {loadingId === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Planı Ata'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {businesses.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">İşletme yok.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Fiyat Talepleri</h2>
          <p className="text-sm text-slate-500 mt-1">/pricing sayfasından gelen &quot;bize ulaşın&quot; talepleri.</p>
        </div>
        <div className="divide-y divide-slate-100">
          {inquiries.map((inq) => (
            <div key={inq.id} className="p-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-slate-900 flex items-center gap-1.5 flex-wrap">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> {inq.email}
                  <Phone className="w-3.5 h-3.5 text-slate-400 ml-2" /> {inq.phone}
                </p>
                {inq.plan_interest && <p className="text-xs text-slate-500 mt-1">İlgilendiği plan: {inq.plan_interest}</p>}
                {inq.message && <p className="text-xs text-slate-500 mt-1">{inq.message}</p>}
                <p className="text-xs text-slate-400 mt-1">{new Date(inq.created_at).toLocaleString('tr-TR')}</p>
              </div>
              {inq.status === 'new' ? (
                <button
                  onClick={() => markContacted(inq.id)}
                  disabled={loadingId === inq.id}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200 disabled:opacity-50 flex-shrink-0"
                >
                  {loadingId === inq.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Arandı olarak işaretle'}
                </button>
              ) : (
                <span className="text-xs text-teal-600 font-medium flex-shrink-0">Arandı</span>
              )}
            </div>
          ))}
          {inquiries.length === 0 && (
            <div className="p-8 text-center text-slate-500">Fiyat talebi yok.</div>
          )}
        </div>
      </div>
    </div>
  );
}
