'use client';

import AdminLayout from '@/components/AdminLayout';
import ContinuousImprovementTabs from '@/components/ContinuousImprovementTabs';
import { TrendingUp, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Static data — Fermi V.1                                            */
/* ------------------------------------------------------------------ */

/*
  Fiyatlama kararı (2026-07-17, Enes): fiyatlar DOLARA SABİTTİR; TL tahsilat
  güncel kur üzerinden yapılır, lokal sabit TL fiyat yoktur. Birim ekonomi
  ($0,045/kredi, ROADMAP 4.3) dolar bazında geçerliliğini korur.

  ARPU: $22 teorik blended ARPU, Starter-ağırlıklı erken dönem plan karması
  + %20 yıllık ödeme indirimi nedeniyle ~$15 efektif ARPU'ya indirilmiştir.

  Pazar: Sadece "sosyal medya kullanıcısı" değil, "müşterisiyle DM'den
  iş yapan satıcı" spesifik filtresiyle modellenmiştir.
*/

const scenarios = [
  {
    id: 'pessimistic',
    label: 'Kötümser',
    color: 'red',
    captureRate: 'TR adreslenebilirin %1\'i',
    customers: '~300',
    arpu: '$15/ay (efektif)',
    mrr: '~$4.500',
    arr: '~$54K',
    comment:
      'Erken dönem ürün-pazar uyumsuzluğu veya yüksek churn. ' +
      'Tek kurucu için ancak hayatta kalma çizgisi.',
  },
  {
    id: 'middle',
    label: 'Orta',
    color: 'yellow',
    captureRate: 'TR adreslenebilirin %3\'ü',
    customers: '~900',
    arpu: '$15/ay (efektif)',
    mrr: '~$13.500',
    arr: '~$162K',
    comment:
      'Türkiye\'de sağlıklı, sürdürülebilir bir bootstrapped iş. ' +
      'SaaS metrikleri oturmuş ancak pazar sınırlarına yaklaşılmış.',
  },
  {
    id: 'optimistic-tr',
    label: 'İyimser (TR Tavanı)',
    color: 'blue',
    captureRate: 'TR adreslenebilirin %7\'si',
    customers: '~2.100',
    arpu: '$15/ay (efektif)',
    mrr: '~$31.500',
    arr: '~$378K',
    comment:
      'Türkiye için teorik tavan (~$400K ARR). Pazarın %7\'sini yakalamak ' +
      'SaaS için ciddi bir doygunluk noktasıdır. VC ölçeği için yetersiz.',
  },
  {
    id: 'optimistic-global',
    label: 'v2 Global (Baz)',
    color: 'green',
    captureRate: 'Global adreslenebilirin %3\'ü',
    customers: '~4.500',
    arpu: '$15/ay (Efektif)',
    mrr: '~$67.500',
    arr: '~$810K',
    comment:
      'WhatsApp+IG DM (v2) aktif. MENA/LatAm pazarlarına giriş. ' +
      'Aynı muhafazakâr yakalama oranı (%3) ve alım gücü bariyerleriyle. ' +
      'Bu hedefin stretch/iyimser versiyonu ise ~$1,6M ARR (%6 yakalama) civarındadır.',
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
    customers: '"1M+ işletme kullanıyor"',
    arr: 'Bilinmiyor',
    note: 'Chat otomasyonu — ödeyen müşteri sayısı açıklanmıyor',
    caveat: true,
  },
  {
    name: 'Tidio',
    customers: '~300K (ödeme yapan sayısı DOĞRULANMADI — kullanıcı sayısı olabilir)',
    arr: '~$20M ARR',
    note: 'Web chat AI — kategori olarak en yakın karşılaştırma, ama rakam teyit edilene kadar kalibrasyon çapası olarak kullanma',
    caveat: true,
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
    what: '~550 ödeme yapan müşteri ($15 ARPU)',
    note: 'Erken doğrulama eşiği — TR adreslenebilir pazarının %1,8\'i. Ulaşılabilir.',
    achievable: true,
  },
  {
    target: '~$400K ARR',
    what: '~2.200 müşteri',
    note: 'Türkiye\'nin teorik tavanı. Adreslenebilir pazarın %7\'si — çok zorlu.',
    achievable: true,
  },
  {
    target: '$810K – $1,6M ARR',
    what: 'v2 Global (Baz: 4.5K müşteri / Stretch: 9K)',
    note: 'Türkiye tek başına bu ölçeği vermez. v2 kanallar (WA+IG DM) ve Faz 7 dil genişlemesi olmadan senaryo dışı.',
    achievable: false,
  },
];

const risks = [
  {
    actor: 'Kur Bariyeri (Dolar-Sabit Fiyat)',
    threat: 'Fiyat dolara sabit: kur yükseldikçe TL karşılığı fiyat da yükselir. $9/ay bugün ~370 TL; devalüasyonda bariyer büyür, churn hızlanır. Risk gelir tarafında değil, müşteri tutma tarafındadır.',
    defense: 'Gelir dolar bazında korunur (karar 2026-07-17). Yıllık ödeme (%20 indirim) fiyatı 12 ay kilitler; değer iletişimi "kaçan lead\'in maliyeti" üzerinden yapılır.',
    severity: 'high',
  },
  {
    actor: 'Linktree / Rakip AI Katmanı',
    threat: 'Büyük oyuncular bu segmenti fark ederse hızla kopyalayabilir.',
    defense: 'Hız ve niş derinliği: DM otomasyonu odaklı kurulum deneyimi + yerel dil.',
    severity: 'medium',
  },
  {
    actor: 'Churn & CAC (LTV Bağlantısı)',
    threat: 'Aylık %5 churn ile LTV = $15 / 0,05 = $300. CAC < LTV/3 kuralı gereği edinim maliyeti <$100 olmalı.',
    defense: 'Ücretli kanallarla <$100 CAC TR\'de zordur. Faz 1.8 viral imza döngüsü (2026-07-17\'de yayında) ve Faz 3 "Beiwe" çalışmazsa model kırılır; imza dönüşümü Faz S UTM\'leriyle ölçülecek.',
    severity: 'high',
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
              Fermi Tahmini
            </h1>
          </div>
          <p className="text-slate-500 text-sm">
            Muhafazakâr yaklaşım — canımızın istediğini değil, işin gerektirdiği zorluğu görmek için.
          </p>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            V.1.1 · 2026-07-17 — DM katmanı aktif; fiyat dolara sabit, efektif ARPU plan karmasından
          </p>
        </div>

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
                  <th className="text-left px-5 py-3 font-semibold text-slate-700 hidden md:table-cell">Gerekçe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  {
                    layer: 'TR Instagram reklam erişimi',
                    est: '~62M',
                    note: 'Geniş sosyal medya tabanı yerine ürünün asıl platformu.',
                  },
                  {
                    layer: 'Bireysel hizmet/ürün satan (%2-3)',
                    est: '~1,5M',
                    note: '"Herhangi bir satış" değil, aktif hizmet/mikro satıcı.',
                  },
                  {
                    layer: 'Müşterisiyle DM üzerinden iş yapan (%40)',
                    est: '~600K',
                    note: 'Yapısal filtre: talkinbio\'nun çözeceği asıl problemi yaşayan segment.',
                  },
                  {
                    layer: 'AI aracı için ödeme yapabilir (%5)',
                    est: '~30K',
                    note: 'TR alım gücü ve kur bariyeri nedeniyle çok dar bir ödeme hunisi.',
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
                <span className="font-mono">~30.000 potansiyel müşteri</span>
              </p>
            </div>
          </div>

          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>Hata payı dürüstlüğü (2026-07-17):</strong> Zincirdeki her çarpan tahmindir ve tek başına
              2× yanılabilir; çarpımları bileşik hata üretir — 30K nokta tahmini değil, kabaca
              <strong> 4K–240K aralığının orta bandıdır</strong>. Bu tablodaki hiçbir sayı henüz tek bir gerçek
              müşteri kohortuyla doğrulanmadı. Karar testi: adreslenebilir pazar 4K bile çıksa "TR'de başla,
              kanıtla, globale genişle" stratejisi değişmez — Fermi'nin görevi bu kararı vermektir, kesinlik değil.
              İlk 20 problem görüşmesi + ücretli pilot dönüşümü geldiğinde çarpanlar gerçek veriyle güncellenecek.
            </p>
          </div>

          <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-700 leading-relaxed">
              <strong>Global (MENA+LatAm) Ekstrapolasyonu:</strong> Benzer ödeme bariyerlerine sahip MENA ve LatAm bölgelerinde
              yaklaşık 300M+ IG kullanıcısı var. Aynı zincir (~%2 satıcı → ~%40 DM kullanan → ~%5 ödeyebilen) uygulandığında
              kabaca <strong>~120.000 adreslenebilir müşteri</strong> eklenir. Global toplam adreslenebilir pazar: ~150K.
              <br /><br />
              <strong>Ön koşul — dil genişlemesi:</strong> Ürün bugün 3 dile gömülü (tr/en/ru); MENA+LatAm hedefi
              Arapça/İspanyolca/Portekizce locale desteği olmadan gerçekleşemez (ROADMAP v2 Faz 7).
              <strong> Modellenmemiş yukarı yön:</strong> Halihazırda desteklenen Rusça segmenti
              (TR'deki Rusça konuşan hizmet verenler + BDT) bu modelde ayrıca sayılmadı.
            </p>
          </div>
        </section>

        {/* 2. Gelir Modeli */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-mono">2</span>
            Gelir Modeli — Efektif ARPU (Dolar-Sabit Fiyat)
          </h2>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-5">
              <p className="text-sm text-slate-700 mb-4">
                <strong>Fiyatlama kararı (2026-07-17):</strong> Fiyatlar dolara sabittir ($9 / $29 / $79);
                TL tahsilat güncel kur üzerinden yapılır, lokal sabit TL fiyat yoktur — girdi maliyetleri
                dolar olduğu için başka yolu yok. Bu sayede birim ekonomi (ROADMAP 4.3, $0,045/kredi)
                dolar bazında geçerliliğini korur. Teorik blended ARPU ~$22'dir; ancak erken dönemde
                plan karması Starter'a yaslanır ve yıllık ödeme %20 indirimlidir — muhafazakâr
                efektif ARPU bu yüzden ~$15 alınır.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-2">
                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Teorik Blended ARPU</p>
                  <p className="text-xl font-bold font-mono text-slate-400 line-through decoration-slate-400/50">$22.00</p>
                </div>
                <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-xs text-blue-600 uppercase tracking-wider mb-1 font-semibold">Efektif ARPU (Starter-ağırlıklı karma + yıllık indirim)</p>
                  <p className="text-xl font-bold font-mono text-blue-900">~$15.00</p>
                </div>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
              <p className="text-xs text-slate-600">
                Kur riski gelir tarafında değil, müşteri tutma tarafındadır: kur yükseldikçe TL karşılığı
                fiyat artar, churn baskısı büyür. Finansal hedefler bu efektif ARPU üzerinden hesaplanmalıdır.
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
            Oranlar teorik TAM'in değil, <strong>adreslenebilir pazarın yakalanma yüzdesidir.</strong>
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {scenarios.map((s) => (
              <ScenarioCard key={s.id} scenario={s} />
            ))}
          </div>
        </section>

        {/* 4. Kritik Çarpanlar & Eşikler */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-mono">4</span>
              Eşik Noktaları
            </h2>
            <div className="space-y-3">
              {thresholds.map((t, i) => (
                <div key={i} className={`flex items-start gap-3 bg-white border rounded-xl p-4 ${t.achievable ? 'border-slate-200' : 'border-slate-100'}`}>
                  {t.achievable
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    : <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  }
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono font-bold text-slate-900">{t.target}</span>
                      <span className="text-slate-600 text-sm font-medium">{t.what}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{t.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-mono">5</span>
              Sonuç: Global v2 Zorunluluğu
            </h2>
            <div className="bg-slate-900 rounded-xl p-6 text-white h-full flex flex-col">
              <p className="text-sm leading-relaxed text-slate-300 mb-4 flex-1">
                Türkiye pazarı (~30K adreslenebilir, $15 ARPU) kendi başına bir VC ölçeği veya devasa bir çıkış yaratmaz. 
                Pazarın %7'sini yakalamak gibi uçuk bir senaryoda bile <strong>tavan ~$400K-500K ARR</strong> civarındadır.
              </p>
              <div className="bg-white/10 rounded-lg p-4 border border-white/10">
                <p className="text-emerald-400 font-semibold text-sm mb-1 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Stratejik Çıktı
                </p>
                <p className="text-slate-200 text-sm">
                  Ana hedef "v2 Kanal Genişlemesi" (WhatsApp & IG DM) ve bu sayede MENA+LatAm pazarlarına açılmaktır. 
                  v2 opsiyonel bir büyüme taktiği değil, <strong>iş modelinin kendisidir.</strong>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Karşılaştırılabilirler */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-mono">6</span>
            Karşılaştırılabilirler — Beklenti Kalibrasyonu
          </h2>
          <p className="text-xs text-slate-500 mb-3">
            Referans şirketler gerçekçi hedef belirleme içindir — rakip analizi değil.
            Ödeme yapan müşteri sayısı açıklanmayan rakamlar yanıltıcı olabilir.
          </p>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">Şirket</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">Müşteri Tabanı</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">ARR</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-700 hidden md:table-cell">Not</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comparables.map((c, i) => (
                  <tr key={i} className={c.caveat ? 'bg-amber-50/40' : ''}>
                    <td className="px-5 py-3 font-semibold text-slate-900">{c.name}</td>
                    <td className="px-5 py-3 text-slate-700">{c.customers}</td>
                    <td className="px-5 py-3 text-mono font-bold text-slate-900">{c.arr}</td>
                    <td className="px-5 py-3 text-slate-500 text-xs hidden md:table-cell">
                      {c.caveat && <span className="text-amber-600 font-medium mr-1">⚠</span>}
                      {c.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
              <p className="text-xs text-slate-500">
                ⚠ Sarı satırlar: ödeme yapan müşteri sayısı açıklanmamış — "1M+ işletme kullanıyor" ifadesi ücretsiz plan egemenliğini gizleyebilir. Cal.com (bootstrapped, ekiple) en gerçekçi tempo referansıdır.
              </p>
            </div>
          </div>
        </section>

      </div>
    </AdminLayout>
  );
}
