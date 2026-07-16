'use client';

import AdminLayout from '@/components/AdminLayout';
import ContinuousImprovementTabs from '@/components/ContinuousImprovementTabs';
import { TrendingUp, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Static data                                                          */
/* ------------------------------------------------------------------ */

const scenarios = [
  {
    id: 'pessimistic',
    label: 'Kötümser',
    color: 'red',
    conversionRate: '%1',
    customers: '1.200',
    arpu: '$25/ay',
    mrr: '$30.000',
    arr: '$360.000',
    comment:
      'Tek geliştirici için yaşanabilir ama "büyük fikir" değil. Bir SaaS olarak satılabilir, VC ilgisi çekmez.',
  },
  {
    id: 'middle',
    label: 'Orta',
    color: 'yellow',
    conversionRate: '%3',
    customers: '3.600',
    arpu: '$28/ay',
    mrr: '$100.800',
    arr: '~$1,2M',
    comment:
      '$1M ARR = SaaS olgunluk eşiği. Bootstrapped exit veya küçük round mümkün. Türkiye\'de iyi bir iş ama global ölçek yok.',
  },
  {
    id: 'optimistic',
    label: 'İyimser',
    color: 'green',
    conversionRate: '%2 (TR+MENA+Latam)',
    customers: '40.000',
    arpu: '$30/ay',
    mrr: '$1.200.000',
    arr: '~$14M',
    comment:
      'WhatsApp + Instagram DM (v2) devreye girince hedef evren genişliyor. VC ölçeği bu senaryoda. %2 dönüşüm için güçlü ürün-pazar uyumu ve agresif büyüme kanalları şart.',
  },
];

const comparables = [
  { name: 'Linktree', customers: '40M kullanıcı (çoğu ücretsiz)', arr: '~$30M ARR', note: 'Link in bio' },
  { name: 'ManyChat', customers: '~1M ödeme yapan', arr: '~$60M ARR', note: 'Chat otomasyonu' },
  { name: 'Tidio', customers: '~300K ödeme yapan', arr: '~$20M ARR', note: 'Web chat AI' },
  { name: 'Cal.com (bootstrapped)', customers: '~60K ödeme yapan', arr: '~$5M ARR', note: 'Randevu SaaS' },
];

const thresholds = [
  { target: '$100K ARR', what: '~340 ödeme yapan müşteri', note: 'Erken doğrulama eşiği — gerçekçi ve ulaşılabilir' },
  { target: '$1M ARR', what: '~3.300 müşteri', note: 'Türkiye\'de yapılabilir, 12-18 ay' },
  { target: '$10M ARR', what: 'WhatsApp/IG DM + bölgesel genişleme', note: '3-4 yıl, v2 zorunlu' },
];

const risks = [
  { actor: 'Linktree', threat: 'Bu segmenti fark ederse AI katmanı ekleyebilir', defense: 'Ürün kalitesi + hız avantajı' },
  { actor: 'ChatGPT / Claude', threat: 'Doğrudan "benim için bio sayfası kur" diyebilir', defense: 'Dağıtım + entegrasyon derinliği' },
  { actor: 'Churn', threat: 'AI SaaS\'ta genellikle yüksek', defense: 'Her ay yeni değer: Beiwe marketing agent (Faz 3)' },
];

/* ------------------------------------------------------------------ */
/* Sub-components                                                        */
/* ------------------------------------------------------------------ */

function ScenarioCard({ scenario }: { scenario: typeof scenarios[0] }) {
  const colors: Record<string, { bg: string; border: string; badge: string; text: string; icon: string }> = {
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      badge: 'bg-red-100 text-red-700',
      text: 'text-red-800',
      icon: 'text-red-500',
    },
    yellow: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      badge: 'bg-amber-100 text-amber-700',
      text: 'text-amber-800',
      icon: 'text-amber-500',
    },
    green: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      badge: 'bg-emerald-100 text-emerald-700',
      text: 'text-emerald-800',
      icon: 'text-emerald-500',
    },
  };
  const c = colors[scenario.color];

  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-5 flex flex-col gap-4`}>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.badge}`}>
          {scenario.label} Senaryo
        </span>
        <span className="text-xs text-slate-500 font-mono">{scenario.conversionRate} dönüşüm</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Müşteri" value={scenario.customers} />
        <Stat label="ARPU" value={scenario.arpu} />
        <Stat label="MRR" value={scenario.mrr} />
        <Stat label="ARR" value={scenario.arr} highlight />
      </div>
      <p className={`text-xs leading-relaxed ${c.text}`}>{scenario.comment}</p>
    </div>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-white/70 rounded-lg p-3 flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">{label}</span>
      <span className={`text-sm font-bold ${highlight ? 'text-slate-900' : 'text-slate-700'}`}>{value}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

export default function FermiEstimationPage() {
  return (
    <AdminLayout>
      <ContinuousImprovementTabs />

      <div className="mt-6 space-y-10">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-900">Fermi Tahmini <span className="text-blue-600">V.1</span></h1>
          </div>
          <p className="text-slate-500 text-sm">
            Fikrin yeterince büyük olup olmadığını sorgulamak için zincir çarpımı yöntemi.
            Veriler muhafazakâr tahminidir; kötümser senaryolar gerçeğe daha yakındır.
          </p>
          <p className="text-xs text-slate-400 mt-1 font-mono">Oluşturulma: 2026-07-16 · Revizyon: —</p>
        </div>

        {/* 1. Hedef Evren */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-mono">1</span>
            Hedef Evren — Türkiye
          </h2>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">Katman</th>
                  <th className="text-right px-5 py-3 font-semibold text-slate-700">Tahmin</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-700 hidden md:table-cell">Gerekçe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { layer: 'TR\'de aktif Instagram hesabı', est: '~20M', note: 'Meta raporları 2024' },
                  { layer: 'Hizmet/ürün satanlar (%15)', est: '~3M', note: 'Genel sektör tahmini' },
                  { layer: 'DM ile müşteri kabul edenler (%40)', est: '~1,2M', note: 'Konuşan biyoya potansiyel segment' },
                  { layer: 'AI aracı ödemeye hazır (%10)', est: '~120K', note: 'Erken adopter payı' },
                ].map((row, i) => (
                  <tr key={i} className={i === 3 ? 'bg-blue-50 font-semibold' : ''}>
                    <td className="px-5 py-3 text-slate-700">{row.layer}</td>
                    <td className="px-5 py-3 text-right font-mono font-bold text-slate-900">{row.est}</td>
                    <td className="px-5 py-3 text-slate-500 hidden md:table-cell">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-3 border-t border-blue-100 bg-blue-50">
              <p className="text-sm font-semibold text-blue-800">
                Adreslenebilir pazar (Türkiye başlangıç): <span className="font-mono">~120.000 potansiyel müşteri</span>
              </p>
            </div>
          </div>
        </section>

        {/* 2. Gelir Modeli */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-mono">2</span>
            Gelir Modeli — Kredi Bazlı Abonelik
          </h2>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">Plan</th>
                  <th className="text-right px-5 py-3 font-semibold text-slate-700">Fiyat</th>
                  <th className="text-right px-5 py-3 font-semibold text-slate-700">Kredi</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-700 hidden md:table-cell">Hedef Segment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { plan: 'Starter', price: '~$9 / ay', credits: '200', segment: 'Bireysel, denemek isteyenler' },
                  { plan: 'Pro', price: '~$29 / ay', credits: '800', segment: 'Aktif hizmet veren, düzenli güncelleyen' },
                  { plan: 'Growth', price: '~$79 / ay', credits: '3.000', segment: 'Yoğun kullanım, çok hizmet' },
                ].map((row, i) => (
                  <tr key={i}>
                    <td className="px-5 py-3 font-medium text-slate-900">{row.plan}</td>
                    <td className="px-5 py-3 text-right font-mono text-slate-700">{row.price}</td>
                    <td className="px-5 py-3 text-right font-mono text-slate-700">{row.credits}</td>
                    <td className="px-5 py-3 text-slate-500 hidden md:table-cell">{row.segment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
              <p className="text-sm text-slate-600">
                Ağırlıklı ortalama ARPU: <span className="font-mono font-bold text-slate-900">$25/ay</span>
                <span className="ml-2 text-slate-400">(Dağılım: %60 Starter, %30 Pro, %10 Growth)</span>
              </p>
            </div>
          </div>
        </section>

        {/* 3. Senaryo Analizi */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-mono">3</span>
            Senaryo Analizi
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {scenarios.map((s) => (
              <ScenarioCard key={s.id} scenario={s} />
            ))}
          </div>
        </section>

        {/* 4. Kıyaslama */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-mono">4</span>
            Kıyaslama — Benzer Ürünler
          </h2>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">Ürün</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">Müşteri</th>
                  <th className="text-right px-5 py-3 font-semibold text-slate-700">ARR</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-700 hidden md:table-cell">Benzerlik</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comparables.map((row, i) => (
                  <tr key={i}>
                    <td className="px-5 py-3 font-medium text-slate-900">{row.name}</td>
                    <td className="px-5 py-3 text-slate-600">{row.customers}</td>
                    <td className="px-5 py-3 text-right font-mono font-semibold text-slate-800">{row.arr}</td>
                    <td className="px-5 py-3 text-slate-500 hidden md:table-cell">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
              <p className="text-sm text-slate-600">
                TalkinBio'nun gerçekçi 3 yıllık hedefi:{' '}
                <span className="font-semibold text-slate-900">Tidio benzeri pozisyon → $5–20M ARR bandı</span>
                , niş ama savunulabilir pazar.
              </p>
            </div>
          </div>
        </section>

        {/* 5. Formül */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-mono">5</span>
            Kritik Çarpanlar
          </h2>
          <div className="bg-slate-900 rounded-xl p-5 text-center mb-4">
            <p className="font-mono text-slate-400 text-xs mb-1">Zincir formülü</p>
            <p className="font-mono text-white text-lg font-bold">
              ARR = Adreslenebilir Pazar × Dönüşüm × ARPU × 12
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { rank: '1', factor: 'Adreslenebilir Pazar', detail: 'v2 kanal genişlemesi olmadan Türkiye\'de tavan ~$2M ARR' },
              { rank: '2', factor: 'Dönüşüm Oranı', detail: 'Viral imza döngüsü (Saule\'nin alt imzası) burada kritik' },
              { rank: '3', factor: 'Churn Oranı', detail: 'Gerçek AI değeri yoksa aylık çıkış hızlı başlar' },
              { rank: '4', factor: 'ARPU', detail: 'Pro\'ya geçişi tetikleyecek net "ah-ha anı" gerekiyor' },
            ].map((item) => (
              <div key={item.rank} className="flex gap-3 bg-white border border-slate-200 rounded-xl p-4 items-start">
                <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {item.rank}
                </span>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{item.factor}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 6. Eşik Noktaları */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-mono">6</span>
            Eşik Noktaları
          </h2>
          <div className="space-y-3">
            {thresholds.map((t, i) => (
              <div key={i} className="flex items-start gap-4 bg-white border border-slate-200 rounded-xl p-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-2 items-baseline">
                    <span className="font-mono font-bold text-slate-900">{t.target}</span>
                    <span className="text-slate-500 text-sm">→ {t.what}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{t.note}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 7. Risk */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-mono">7</span>
            Risk Uyarıları
          </h2>
          <div className="space-y-3">
            {risks.map((r, i) => (
              <div key={i} className="flex items-start gap-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-900 text-sm">{r.actor}</p>
                  <p className="text-amber-700 text-xs mt-0.5">{r.threat}</p>
                  <p className="text-emerald-700 text-xs mt-1 font-medium">↳ Savunma: {r.defense}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Sonuç */}
        <section>
          <div className="bg-slate-900 rounded-xl p-6 text-white space-y-4">
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-400" />
              <h2 className="font-bold text-lg">Sonuç</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/10 rounded-lg p-4">
                <p className="text-emerald-400 font-semibold text-sm mb-1">✓ Türkiye'de bootstrapped</p>
                <p className="text-slate-300 text-sm">Fikir yeterince büyük. Tek geliştiriciyle sürdürülebilir ve kârlı bir iş mümkün.</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <p className="text-red-400 font-semibold text-sm mb-1">✕ VC ölçeği için</p>
                <p className="text-slate-300 text-sm">v2 kanal genişlemesi (WhatsApp + Instagram DM) olmadan Türkiye tavanı ~$2M ARR — VC büyümesi için yetersiz.</p>
              </div>
            </div>
            <p className="text-slate-400 text-xs border-t border-white/10 pt-4">
              En önemli eşik: <span className="text-white font-mono font-semibold">340 ödeme yapan müşteri = $100K ARR</span> — erken doğrulama hedefi olarak gerçekçi ve ulaşılabilir.
            </p>
          </div>
        </section>

      </div>
    </AdminLayout>
  );
}
