'use client';

import AdminLayout from '@/components/AdminLayout';
import ContinuousImprovementTabs from '@/components/ContinuousImprovementTabs';
import { TrendingUp, AlertTriangle, CheckCircle2, Info, ShieldAlert } from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Static data — V.2 muhafazakâr revizyon (2026-07-17)                 */
/* ------------------------------------------------------------------ */

/*
  ARPU düzeltmesi (V.1'de hatalıydı):
  %60×$9 + %30×$29 + %10×$79 = $5,40 + $8,70 + $7,90 = $22,00
  V.1'de $25 yazıyordu; zincir çarpımında %12 sapma yaratıyordu.

  Pazar düzeltmesi:
  - Taban: ~55M (tüm sosyal medya kullanıcısı, sadece Instagram değil)
  - Satıcı tanımı daraltıldı: %2-3 → ~1,25M
  - Ödeme istekliliği: %10 → %5 (TL'nin alım gücü, dolar kur bariyeri)
  - Adreslenebilir pazar: ~55K (V.1'de 120K yazıyordu)

  Dönüşüm oranı notu:
  "TAM'in %X'ini çevir" ifadesi yanıltıcı. Gerçekte ulaşabildiğin
  kitlenin bir yüzdesini çevirirsin, teorik pazarın değil.
  Senaryolarda oran = adreslenebilir pazarın yakalanma yüzdesi.
*/

const scenarios = [
  {
    id: 'pessimistic',
    label: 'Kötümser',
    color: 'red',
    captureRate: 'Adreslenebilir pazarın %0,5\'i',
    customers: '~275',
    arpu: '$22/ay',
    mrr: '~$6.000',
    arr: '~$72K',
    comment:
      'Erken dönem ürün-pazar uyumsuzluğu. Churn yüksek, büyüme yavaş. ' +
      'Sahibi geçindirmez; pivot kararı için veri topla.',
  },
  {
    id: 'middle',
    label: 'Orta',
    color: 'yellow',
    captureRate: 'Adreslenebilir pazarın %1,5\'i',
    customers: '~825',
    arpu: '$22/ay',
    mrr: '~$18.000',
    arr: '~$218K',
    comment:
      'Türkiye\'de sürdürülebilir bir iş. Bootstrapped geçim sağlar. ' +
      'VC için çok küçük; tek başına ölçeklenebilir bir motor değil.',
  },
  {
    id: 'optimistic-tr',
    label: 'İyimser (Sadece TR)',
    color: 'blue',
    captureRate: 'Adreslenebilir pazarın %4\'ü',
    customers: '~2.200',
    arpu: '$22/ay',
    mrr: '~$48.000',
    arr: '~$580K',
    comment:
      'Türkiye\'de güçlü bir pazar pozisyonu. Bu senaryo bile zorlu: ' +
      '55K\'lık pazarın %4\'ünü yakalamak ciddi bir pazarlama motoru gerektirir.',
  },
  {
    id: 'optimistic-global',
    label: 'v2 Global (TR+MENA)',
    color: 'green',
    captureRate: 'Global adreslenebilirin %0,5\'i',
    customers: '~10.000',
    arpu: '$22/ay',
    mrr: '~$220.000',
    arr: '~$2,6M',
    comment:
      'WhatsApp+IG DM (v2) + bölgesel genişleme varsayımıyla. Benzer ülkelerde ' +
      'aynı ödeme bariyerleri geçerli — %0,5 yakalama bile agresif bir hedef. ' +
      'Bu senaryo 3-4 yıl ve çalışan v2 kanallarını gerektiriyor.',
  },
];

const comparables = [
  {
    name: 'Linktree',
    customers: '~40M kullanıcı (büyük çoğunluk ücretsiz)',
    arr: '~$30M ARR',
    note: 'Link in bio — ödeme yapan çok az',
    caveat: false,
  },
  {
    name: 'ManyChat',
    customers: '"1M+ işletme" (ödeme yapan bilinmiyor)',
    arr: '~$60M ARR?',
    note: 'Chat otomasyonu',
    caveat: true,
  },
  {
    name: 'Tidio',
    customers: '~300K ödeme yapan',
    arr: '~$20M ARR',
    note: 'Web chat AI — en gerçekçi karşılaştırma',
    caveat: false,
  },
  {
    name: 'Cal.com (bootstrapped)',
    customers: '~60K ödeme yapan',
    arr: '~$5M ARR',
    note: 'Randevu SaaS — ölçek için referans',
    caveat: false,
  },
];

const thresholds = [
  {
    target: '$100K ARR',
    what: '~380 ödeme yapan müşteri',
    note: 'Erken doğrulama eşiği — gerçekçi ve ulaşılabilir. (V.1\'de 340 yazıyordu; $22 ARPU ile 380.)',
    achievable: true,
  },
  {
    target: '$500K ARR',
    what: '~1.900 müşteri',
    note: 'Türkiye\'de mümkün; adreslenebilir pazarın %3,5\'ini gerektirir.',
    achievable: true,
  },
  {
    target: '~$1M ARR',
    what: '~3.800 müşteri',
    note: 'Türkiye\'nin teorik tavanı. Adreslenebilir pazarın %7\'si — çok zorlu.',
    achievable: false,
  },
  {
    target: '$10M+ ARR',
    what: 'v2 kanal genişlemesi + bölgesel büyüme zorunlu',
    note: 'Türkiye tek başına bu ölçeği vermez. v2 olmadan senaryo yok.',
    achievable: false,
  },
];

const risks = [
  {
    actor: 'TL / Kur Bariyeri',
    threat: '$9/ay (~370 TL) mikro satıcı için ciddi bariyer. Kur kötüleşirse müşteri kaybı hızlanır.',
    defense: 'TL fiyatlama + yerel ödeme yöntemi (iyzico) — hem zorunlu hem savunma. Faz 4\'te netleşmeli.',
    severity: 'high',
  },
  {
    actor: 'Linktree / Rakip AI Katmanı',
    threat: 'Büyük oyuncular bu segmenti fark ederse hızla kopyalayabilir.',
    defense: 'Hız ve niş derinliği: kurulum deneyimi + yerel dil + TR ödeme altyapısı.',
    severity: 'medium',
  },
  {
    actor: 'Churn',
    threat: 'AI SaaS\'ta aylık churn yüksek seyreder. %5 churn → yılda %46 müşteri kaybı.',
    defense: 'Beiwe marketing agent (Faz 3) her ay yeni değer üretmeli — aksi hâlde retention kırılır.',
    severity: 'high',
  },
  {
    actor: 'Dönüşüm Bariyeri',
    threat: '"Ürün ücretsiz denenemeden ödeme yapılmaz" — freemium baskısı.',
    defense: 'Mevcut ücretsiz katman (kredi bitince sayfa + mesaj bırakın modu) bu bariyeri yumuşatıyor.',
    severity: 'medium',
  },
];

/* ------------------------------------------------------------------ */
/* Sub-components                                                        */
/* ------------------------------------------------------------------ */

function ScenarioCard({ scenario }: { scenario: typeof scenarios[0] }) {
  const colors: Record<string, { bg: string; border: string; badge: string; text: string }> = {
    red: { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700', text: 'text-red-800' },
    yellow: { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700', text: 'text-amber-800' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700', text: 'text-blue-800' },
    green: { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', text: 'text-emerald-800' },
  };
  const c = colors[scenario.color];

  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-5 flex flex-col gap-4`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.badge}`}>
          {scenario.label}
        </span>
        <span className="text-[10px] text-slate-500 font-mono leading-tight text-right">{scenario.captureRate}</span>
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
            <h1 className="text-3xl font-bold text-slate-900">
              Fermi Tahmini <span className="text-blue-600">V.2</span>
            </h1>
          </div>
          <p className="text-slate-500 text-sm">
            Muhafazakâr revizyon — gerçek zorluğu görmek için, canımızın istediğini değil.
          </p>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            V.1: 2026-07-16 · V.2 (bu): 2026-07-17 — ARPU, pazar tabanı ve senaryo oranları düzeltildi
          </p>
        </div>

        {/* V.1 Hataları — öne çıkar */}
        <section className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            <h2 className="font-bold text-amber-900">V.1'den Düzeltilen Hatalar</h2>
          </div>
          <ul className="space-y-2.5">
            {[
              {
                error: 'ARPU $25 yazıyordu',
                fix: '%60×$9 + %30×$29 + %10×$79 = $22,00. Zincir çarpımında %12 sapma yaratıyordu.',
              },
              {
                error: 'Adreslenebilir pazar 120K yazıyordu',
                fix: 'Satıcı tanımı daraltıldı (%2-3), ödeme istekliliği %10 → %5 (TL kur bariyeri). Gerçekçi: ~55K.',
              },
              {
                error: '"Orta senaryo: TAM\'in %3\'ü" ifadesi yanıltıcıydı',
                fix: 'TAM\'in %3\'ünü müşteriye çevirmek SaaS\'ta "orta" değil, son derece iddialı. Senaryolar adreslenebilir pazarın yakalanma yüzdesi olarak yeniden yazıldı.',
              },
              {
                error: 'ManyChat "1M ödeme yapan" olarak geçiyordu',
                fix: '"1M+ işletme kullanıyor" → ödeme yapan sayısı bilinmiyor; kıyaslamaya şüpheyle bakılmalı.',
              },
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-red-500 text-xs font-mono shrink-0 mt-0.5">✕</span>
                <div>
                  <span className="text-xs font-semibold text-amber-900 line-through">{item.error}</span>
                  <p className="text-xs text-amber-800 mt-0.5">→ {item.fix}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* 1. Hedef Evren */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-mono">1</span>
            Hedef Evren — Türkiye (Muhafazakâr)
          </h2>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">Katman</th>
                  <th className="text-right px-5 py-3 font-semibold text-slate-700">Tahmin</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-700 hidden md:table-cell">Gerekçe / Değişim</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  {
                    layer: 'TR\'de aktif sosyal medya kullanıcısı',
                    est: '~55M',
                    note: 'V.1\'de 20M (yalnız Instagram) yazıyordu; geniş taban doğrusu bu.',
                  },
                  {
                    layer: 'Bireysel hizmet/ürün satan (%2-3) — dar tanım',
                    est: '~1,25M',
                    note: 'V.1\'de %15 → 3M. %15 çok geniş; "herhangi bir satış" değil, "aktif hizmet satıcısı".',
                  },
                  {
                    layer: 'Dolar bazlı AI aracı için ödeme yapabilir (%5)',
                    est: '~62K',
                    note: 'V.1\'de %10. $9/ay ≈ 370 TL — mikro satıcı için ciddi bariyer. %5 bile iyimser.',
                  },
                  {
                    layer: 'Gerçekçi adreslenebilir pazar (TL fiyatlama dahil)',
                    est: '~55K',
                    note: 'Kur riski ve satın alma gücü nedeniyle %10 indirim uygulandı.',
                  },
                ].map((row, i) => (
                  <tr key={i} className={i === 3 ? 'bg-blue-50 font-semibold' : ''}>
                    <td className="px-5 py-3 text-slate-700">{row.layer}</td>
                    <td className="px-5 py-3 text-right font-mono font-bold text-slate-900">{row.est}</td>
                    <td className="px-5 py-3 text-slate-500 text-xs hidden md:table-cell">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-3 border-t border-blue-100 bg-blue-50">
              <p className="text-sm font-semibold text-blue-800">
                Adreslenebilir pazar (Türkiye, muhafazakâr):{' '}
                <span className="font-mono">~55.000 potansiyel müşteri</span>
                <span className="text-blue-600 font-normal text-xs ml-2">(V.1'de 120K yazıyordu — yarıdan az)</span>
              </p>
            </div>
          </div>

          {/* Spekülatif çarpan uyarısı */}
          <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">En spekülatif çarpan: ödeme istekliliği (%5)</p>
              <p className="text-xs text-red-700 mt-0.5">
                Bu oran %3'e düşerse tüm adreslenebilir pazar ~33K olur — tüm senaryolar %40 daha küçülür.
                TL/dolar kuru, enflasyon ve rakip ücretsiz araçların varlığı bu oranı baskılar.
                TL fiyatlama kaçınılmaz; Faz 4 ödeme kararı bu riski doğrudan etkiler.
              </p>
            </div>
          </div>
        </section>

        {/* 2. Gelir Modeli */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-mono">2</span>
            Gelir Modeli — Düzeltilmiş ARPU
          </h2>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">Plan</th>
                  <th className="text-right px-5 py-3 font-semibold text-slate-700">Fiyat</th>
                  <th className="text-right px-5 py-3 font-semibold text-slate-700">Katkı</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-700 hidden md:table-cell">Karışım</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { plan: 'Starter', price: '$9', contribution: '$5,40', mix: '%60 müşteri' },
                  { plan: 'Pro', price: '$29', contribution: '$8,70', mix: '%30 müşteri' },
                  { plan: 'Growth', price: '$79', contribution: '$7,90', mix: '%10 müşteri' },
                ].map((row, i) => (
                  <tr key={i}>
                    <td className="px-5 py-3 font-medium text-slate-900">{row.plan}</td>
                    <td className="px-5 py-3 text-right font-mono text-slate-700">{row.price}/ay</td>
                    <td className="px-5 py-3 text-right font-mono text-slate-600">{row.contribution}</td>
                    <td className="px-5 py-3 text-slate-500 hidden md:table-cell">{row.mix}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-3 border-t border-red-50 bg-red-50">
              <p className="text-sm text-slate-800">
                Ağırlıklı ortalama ARPU:{' '}
                <span className="font-mono font-bold text-slate-900">$22,00/ay</span>
                <span className="ml-2 text-red-600 text-xs font-medium">
                  (V.1'de $25 yazıyordu — hatalıydı. $5,40+$8,70+$7,90=$22,00)
                </span>
              </p>
            </div>
          </div>
        </section>

        {/* 3. Senaryo Analizi */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-mono">3</span>
            Senaryo Analizi
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Oranlar teorik TAM'in değil, <strong>adreslenebilir pazarın yakalanma yüzdesidir.</strong>{' '}
            Ulaşabildiğin kitleyi çevirmek — tüm teorik pazarı değil.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {scenarios.map((s) => (
              <ScenarioCard key={s.id} scenario={s} />
            ))}
          </div>

          {/* Turkey ceiling callout */}
          <div className="mt-4 bg-slate-900 rounded-xl p-4 text-white flex items-start gap-3">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Türkiye teorik tavanı: ~$1M ARR</p>
              <p className="text-slate-400 text-xs mt-1">
                55K adreslenebilir müşterinin %7'sini (%7!) yakalamak gerekir.
                Hiçbir senaryo bu tavanı doğrudan hedeflemiyor — doğru olan bu.
                Türkiye tek başına VC ölçeği vermez; v2 kanal genişlemesi şart.
              </p>
            </div>
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
                  <th className="text-left px-5 py-3 font-semibold text-slate-700 hidden md:table-cell">Not</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comparables.map((row, i) => (
                  <tr key={i} className={row.caveat ? 'bg-amber-50/50' : ''}>
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {row.name}
                      {row.caveat && (
                        <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">
                          şüpheli
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-600 text-xs">{row.customers}</td>
                    <td className="px-5 py-3 text-right font-mono font-semibold text-slate-800">{row.arr}</td>
                    <td className="px-5 py-3 text-slate-500 text-xs hidden md:table-cell">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
              <p className="text-sm text-slate-600">
                Gerçekçi 3 yıllık hedef:{' '}
                <span className="font-semibold text-slate-900">Cal.com benzeri pozisyon → $500K–$2M ARR</span>,
                v2 kanallarla. Tidio/ManyChat ölçeği TR tek başına mümkün değil.
              </p>
            </div>
          </div>
        </section>

        {/* 5. Kritik Çarpanlar */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-mono">5</span>
            Kritik Çarpanlar
          </h2>
          <div className="bg-slate-900 rounded-xl p-5 text-center mb-4">
            <p className="font-mono text-slate-400 text-xs mb-1">Zincir formülü</p>
            <p className="font-mono text-white text-base font-bold">
              ARR = Adreslenebilir Pazar × Yakalanma Oranı × ARPU × 12
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              {
                rank: '1',
                factor: 'Ödeme İstekliliği (%5)',
                detail: 'En spekülatif çarpan. %3\'e düşerse pazar %40 küçülür. TL fiyatlama zorunlu.',
                danger: true,
              },
              {
                rank: '2',
                factor: 'Yakalanma Oranı',
                detail: 'Adreslenebilir pazarın %7\'sini yakalamak TR tavanı. Başlangıç hedefi: %0,5-1,5.',
                danger: false,
              },
              {
                rank: '3',
                factor: 'Churn',
                detail: "Aylık %5 churn = yılda %46 müşteri kaybı. ARPU'yu geçersiz kılar.",
                danger: true,
              },
              {
                rank: '4',
                factor: 'v2 Kanal Genişlemesi',
                detail: 'TR tavanı ~$1M ARR. $2M+ için WhatsApp/IG DM şart — v2 olmadan VC ölçeği yok.',
                danger: false,
              },
            ].map((item) => (
              <div key={item.rank} className={`flex gap-3 bg-white border rounded-xl p-4 items-start ${item.danger ? 'border-red-200' : 'border-slate-200'}`}>
                <span className={`w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 ${item.danger ? 'bg-red-500' : 'bg-blue-600'}`}>
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
              <div key={i} className={`flex items-start gap-4 bg-white border rounded-xl p-4 ${t.achievable ? 'border-slate-200' : 'border-slate-100'}`}>
                {t.achievable
                  ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  : <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                }
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
              <div key={i} className={`flex items-start gap-4 rounded-xl p-4 border ${r.severity === 'high' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${r.severity === 'high' ? 'text-red-500' : 'text-amber-500'}`} />
                <div>
                  <p className={`font-semibold text-sm ${r.severity === 'high' ? 'text-red-900' : 'text-amber-900'}`}>{r.actor}</p>
                  <p className={`text-xs mt-0.5 ${r.severity === 'high' ? 'text-red-700' : 'text-amber-700'}`}>{r.threat}</p>
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
              <h2 className="font-bold text-lg">Sonuç — V.2 Muhafazakâr Okuma</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/10 rounded-lg p-4">
                <p className="text-emerald-400 font-semibold text-sm mb-1">✓ Bootstrapped iş mümkün</p>
                <p className="text-slate-300 text-sm">
                  380 müşteri = $100K ARR eşiği Türkiye'de ulaşılabilir. Cal.com benzeri bir pozisyon
                  ($500K–$2M ARR) 3 yılda gerçekçi.
                </p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <p className="text-red-400 font-semibold text-sm mb-1">✕ Türkiye tek başına VC ölçeği vermez</p>
                <p className="text-slate-300 text-sm">
                  Tavan ~$1M ARR. Bu bile adreslenebilir pazarın %7'sini gerektirir.
                  v2 (WhatsApp+IG DM) ve bölgesel genişleme olmadan $10M+ ARR senaryo dışı.
                </p>
              </div>
            </div>
            <p className="text-slate-400 text-xs border-t border-white/10 pt-4">
              En önemli eşik:{' '}
              <span className="text-white font-mono font-semibold">380 ödeme yapan müşteri = $100K ARR</span>
              {' '}— gerçekçi ve ulaşılabilir. Bu düzeltilmiş sayılarla bile sağlam kalıyor.
            </p>
          </div>
        </section>

      </div>
    </AdminLayout>
  );
}
