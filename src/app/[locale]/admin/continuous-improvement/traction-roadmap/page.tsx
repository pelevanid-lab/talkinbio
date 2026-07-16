'use client';

import AdminLayout from '@/components/AdminLayout';
import ContinuousImprovementTabs from '@/components/ContinuousImprovementTabs';
import {
  Target, CheckCircle2, Circle, Lock, AlertTriangle,
  FlaskConical, TrendingUp, Lightbulb, ArrowRight, BarChart2,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Types & Data                                                          */
/* ------------------------------------------------------------------ */

type StageStatus = 'active' | 'done' | 'locked';

interface Assumption {
  text: string;
  status: 'unvalidated' | 'validated' | 'invalidated';
}

interface Milestone {
  id: number;
  stage: string;
  question: string;
  description: string;
  status: StageStatus;
  timeHorizon: string;
  successCriteria: string;
  omtm: string;
  omtmNote: string;
  assumptions: Assumption[];
  experiments: string[];
  mauryaNote: string;
}

const milestones: Milestone[] = [
  {
    id: 1,
    stage: 'Problem / Çözüm Uyumu',
    question: 'Bu sorunu çözmeye değer mi?',
    description:
      'Yeterli talep olduğunu kanıtla. Ödeme yapan ilk müşterilerin "bu olmadan yaşayamam" dediğini duy. Ürün inşa etmeden önce sorunu sahiplen.',
    status: 'active',
    timeHorizon: '0 – 6. ay',
    successCriteria:
      '10 ödeme yapan müşteri + sorun görüşmelerinde tekrar eden acı nokta doğrulandı + iş modeli kârlı işleyebilecek fiyat noktası test edildi',
    omtm: 'Ödeme yapan müşteri sayısı',
    omtmNote:
      'Sadece kayıt veya deneme değil — gerçek ödeme. Tek rakamlı sayılar bile bu aşamada anlamlı sinyal.',
    assumptions: [
      {
        text: 'Hizmet sahipleri DM\'den kaçan lead için ödeme yapar',
        status: 'unvalidated',
      },
      {
        text: 'Saule\'nin kurulumu Beiwe ile 30 dakikadan kısa sürer',
        status: 'unvalidated',
      },
      {
        text: 'Kullanıcılar sayfayı paylaşmadan önce birkaç kez düzenler (viral imza döngüsü)',
        status: 'unvalidated',
      },
    ],
    experiments: [
      '20 hedef segment görüşmesi — problem interview scripti, çözüm gösterme yok',
      '10 kişilik ücretli pilot: Beiwe kurulumu + 30 gün Saule aktif → gerçek lead var mı?',
      'Fiyat hassasiyeti testi: $9 / $29 seçenekli soft-launch sayfası',
    ],
    mauryaNote:
      'Bu aşamada satmak utanç verici değil — zorunlu. Ödeme, söz değil, taahhüttür.',
  },
  {
    id: 2,
    stage: 'Ürün / Pazar Uyumu',
    question: 'İnsanların istediği bir şey inşa ettim mi?',
    description:
      'Niteliksel\'den niceliksel\'e geç. Müşteriler ürünü kullanıyor ve elde tutuluyor. Organik referans başlıyor. Churn düşüyor.',
    status: 'locked',
    timeHorizon: '6 – 18. ay',
    successCriteria:
      '340 ödeme yapan müşteri ($100K ARR eşiği) + aylık churn < %5 + NPS > 40 + referral kanalı organik trafik üretiyor',
    omtm: 'Aylık elde tutulan ödeme yapan müşteri (net MRR büyümesi)',
    omtmNote:
      'Müşteri kazanım hızı değil, kalanların oranı. Churn yüksekse ürün-pazar uyumu yoktur.',
    assumptions: [
      {
        text: 'Beiwe marketing agent (Faz 3) retention\'ı anlamlı artırır',
        status: 'unvalidated',
      },
      {
        text: 'Saule\'nin "Powered by talkinbio" imzası viral döngü yaratır',
        status: 'unvalidated',
      },
      {
        text: 'WhatsApp entegrasyonu olmadan $100K ARR\'a ulaşmak mümkün',
        status: 'unvalidated',
      },
    ],
    experiments: [
      'Cohort analizi: 1. ay müşterilerin 3. aydaki retention oranı nedir?',
      'NPS anketi: "talkinbio olmasaydı ne kullanırdın?" sorusu dahil',
      'Referral takibi: kayıtların kaçı mevcut müşteri tavsiyesiyle geliyor?',
      'Beiwe marketing agent çıktısı: haftalık e-posta açılma oranı + içerik öneri kabul oranı',
    ],
    mauryaNote:
      'Ürün/pazar uyumu bir his değil, bir metrik. Churn < %5 ve organik büyüme — ikisi birlikte.',
  },
  {
    id: 3,
    stage: 'Ölçek',
    question: 'Büyümeyi nasıl hızlandırırım?',
    description:
      'Tekrarlanabilir ve kârlı bir büyüme motoru inşa et. Bu aşamaya geldiğinde optimize edilecek bir şey var — erken optimizasyon değil.',
    status: 'locked',
    timeHorizon: '18 – 36. ay',
    successCriteria:
      '$1.2M ARR + öngörülebilir büyüme (CAC < LTV / 3) + WhatsApp & Instagram DM kanalları aktif + TR + MENA pazarında büyüme kanalları tekrarlanabilir',
    omtm: 'Net yeni MRR (yeni + expansion − churn)',
    omtmNote:
      'Büyüme motorunun sağlığı: yeni gelir mi, yoksa kaybı mı karşılıyor? İkinci soru: büyüme kanallarından hangisi en düşük CAC\'ı üretiyor?',
    assumptions: [
      {
        text: 'WhatsApp/IG DM entegrasyonu (v2) churn\'ü anlamlı düşürür',
        status: 'unvalidated',
      },
      {
        text: 'MENA pazarı TR ile aynı sorun yoğunluğuna sahip',
        status: 'unvalidated',
      },
      {
        text: 'Saule → Beiwe döngüsü ölçekte CAC\'ı düşürür (viral + içerik)',
        status: 'unvalidated',
      },
    ],
    experiments: [
      'AARRR hunisi optimizasyonu: en kırılgan adım hangisi?',
      'Kanal testi: içerik pazarlama vs. ücretli meta reklamı CAC karşılaştırması',
      'Expansion revenue: Pro → Growth geçişini tetikleyen özellik nedir?',
    ],
    mauryaNote:
      '"Pivot before product/market fit, optimize after." Bu aşamaya pivot yoktur — sadece büyüme.',
  },
];

const pivotLog = [
  {
    date: '2026-07-16',
    assumption: 'Meta entegrasyonları (WhatsApp + Instagram DM) v1\'de şart',
    result: 'Geliştirme karmaşıklığı + Meta evrak süreci v1 lansmanını bloklayacak',
    action: 'Kapsam kararı: Meta entegrasyonları v2\'ye alındı. v1 mevcut ig.me/wa.me handoff köprüsüyle çıkar.',
    type: 'scope',
  },
  {
    date: '2026-07-16',
    assumption: 'Saule:güncelleme:kurulum kredi oranı 1:3:10',
    result: 'Gerçek ölçüm: oran 1:4.6:5.6. Güncelleme, kurulumla neredeyse aynı maliyette.',
    action: 'Prompt caching (Faz 2.3) önceliklendirildi. Kredi çarpanları Faz 4\'te gerçek veriyle kalibre edilecek.',
    type: 'metric',
  },
];

/* ------------------------------------------------------------------ */
/* Sub-components                                                        */
/* ------------------------------------------------------------------ */

const statusConfig: Record<StageStatus, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  active: {
    label: 'Şu an bu aşamada',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    icon: <Target className="w-4 h-4 text-blue-600" />,
  },
  done: {
    label: 'Tamamlandı',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
  },
  locked: {
    label: 'Kilitli',
    color: 'text-slate-400',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    icon: <Lock className="w-4 h-4 text-slate-400" />,
  },
};

const assumptionConfig: Record<Assumption['status'], { color: string; dot: string; label: string }> = {
  unvalidated: { color: 'text-amber-700 bg-amber-50', dot: 'bg-amber-400', label: 'Doğrulanmadı' },
  validated: { color: 'text-emerald-700 bg-emerald-50', dot: 'bg-emerald-500', label: 'Doğrulandı' },
  invalidated: { color: 'text-red-700 bg-red-50', dot: 'bg-red-500', label: 'Çürütüldü' },
};

function MilestoneCard({ milestone }: { milestone: Milestone }) {
  const sc = statusConfig[milestone.status];
  const isLocked = milestone.status === 'locked';

  return (
    <div className={`rounded-2xl border-2 ${sc.border} ${sc.bg} p-6 flex flex-col gap-5 ${isLocked ? 'opacity-60' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-mono font-bold shrink-0">
              {milestone.id}
            </span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${sc.color} ${isLocked ? 'bg-slate-100' : 'bg-white/70'}`}>
              {sc.icon}{sc.label}
            </span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 leading-tight">{milestone.stage}</h3>
          <p className={`text-sm font-medium mt-0.5 ${sc.color}`}>{milestone.question}</p>
        </div>
        <span className="text-xs font-mono text-slate-400 shrink-0 mt-1">{milestone.timeHorizon}</span>
      </div>

      <p className="text-sm text-slate-600 leading-relaxed">{milestone.description}</p>

      {/* Success Criteria */}
      <div className="bg-white/70 rounded-xl p-4 border border-slate-100">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> Başarı Kriteri
        </p>
        <p className="text-sm text-slate-800 leading-relaxed">{milestone.successCriteria}</p>
      </div>

      {/* OMTM */}
      <div className="bg-slate-900 rounded-xl p-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
          <BarChart2 className="w-3.5 h-3.5" /> Tek Metrik (OMTM)
        </p>
        <p className="text-white font-bold text-sm">{milestone.omtm}</p>
        <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">{milestone.omtmNote}</p>
      </div>

      {/* Assumptions */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5" /> Riskli Varsayımlar
        </p>
        <ul className="space-y-2">
          {milestone.assumptions.map((a, i) => {
            const ac = assumptionConfig[a.status];
            return (
              <li key={i} className="flex items-start gap-2">
                <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${ac.dot}`} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-slate-700">{a.text}</span>
                  <span className={`ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${ac.color}`}>
                    {ac.label}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Experiments */}
      {!isLocked && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <FlaskConical className="w-3.5 h-3.5" /> Yapılacak Deneyler
          </p>
          <ul className="space-y-1.5">
            {milestone.experiments.map((e, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <ArrowRight className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Maurya Note */}
      <div className="border-t border-slate-200 pt-3">
        <p className="text-xs text-slate-400 italic flex items-start gap-1.5">
          <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
          <span>Ash Maurya: "{milestone.mauryaNote}"</span>
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

export default function TractionRoadmapPage() {
  const activeStage = milestones.find((m) => m.status === 'active')?.id ?? 1;

  return (
    <AdminLayout>
      <ContinuousImprovementTabs />

      <div className="mt-6 space-y-10">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-900">Çekim Gücü Yol Haritası</h1>
          </div>
          <p className="text-slate-500 text-sm">
            Ash Maurya · <em>Running Lean</em>, Bölüm 4 — Doğru zamanda doğru eylemi yap. Ürün/pazar uyumundan önce pivot et, sonra optimize et.
          </p>
          <p className="text-xs text-slate-400 mt-1 font-mono">V.1 · Oluşturulma: 2026-07-16 · Statik — yenilikler oldukça kod bazında güncellenir</p>
        </div>

        {/* Stage Progress */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-5">Şu Anki Pozisyon</p>
          <div className="flex items-center gap-0">
            {milestones.map((m, i) => {
              const isDone = m.status === 'done';
              const isActive = m.status === 'active';
              return (
                <div key={m.id} className="flex items-center flex-1 min-w-0">
                  <div className={`flex flex-col items-center gap-2 flex-1 ${i === milestones.length - 1 ? '' : ''}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 font-bold text-sm shrink-0 transition-all ${
                      isDone
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : isActive
                        ? 'bg-blue-600 border-blue-600 text-white ring-4 ring-blue-100'
                        : 'bg-slate-100 border-slate-200 text-slate-400'
                    }`}>
                      {isDone ? <CheckCircle2 className="w-5 h-5" /> : isActive ? m.id : <Lock className="w-4 h-4" />}
                    </div>
                    <div className="text-center px-1">
                      <p className={`text-xs font-semibold leading-tight ${isActive ? 'text-blue-700' : isDone ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {m.stage}
                      </p>
                      <p className={`text-[10px] font-mono mt-0.5 ${isActive ? 'text-blue-500' : 'text-slate-400'}`}>
                        {m.timeHorizon}
                      </p>
                    </div>
                  </div>
                  {i < milestones.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-1 rounded-full mb-6 ${isDone ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-sm text-slate-600">
              talkinbio şu an <span className="font-semibold text-blue-700">Aşama {activeStage}: {milestones[activeStage - 1].stage}</span> aşamasında.
              Bir sonraki eşik: <span className="font-mono font-semibold text-slate-900">10 ödeme yapan müşteri.</span>
            </p>
          </div>
        </section>

        {/* Destination */}
        <section className="bg-slate-900 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-blue-400" />
            <h2 className="font-bold text-lg">3 Yıllık Hedef — Varış Noktası</h2>
          </div>
          <p className="text-slate-400 text-sm mb-5">
            Maurya: "Geriye doğru çalış. Hedefini bilmeden yol haritası çizemezsin."
            Fermi Tahmini V.1 orta senaryosundan alındı.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'ARR Hedefi', value: '$1.2M', note: 'Orta senaryo' },
              { label: 'Müşteri Hedefi', value: '3.300', note: '%3 dönüşüm' },
              { label: 'Ort. ARPU', value: '$28/ay', note: 'Pro ağırlıklı mix' },
              { label: 'Zaman Ufku', value: '36 ay', note: 'v2 dahil' },
            ].map((item) => (
              <div key={item.label} className="bg-white/10 rounded-xl p-4">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">{item.label}</p>
                <p className="text-2xl font-bold text-white font-mono">{item.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{item.note}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Milestone Cards */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-mono">M</span>
            Milestone'lar
          </h2>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            {milestones.map((m) => (
              <MilestoneCard key={m.id} milestone={m} />
            ))}
          </div>
        </section>

        {/* OMTM Summary */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-mono">M</span>
            OMTM — Aşamaya Göre Tek Metrik
          </h2>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 bg-amber-50 border-b border-amber-100">
              <p className="text-xs text-amber-700 font-medium">
                ⚠ Maurya uyarısı: Yanlış metriği takip etmek, doğru kararı yanlış zamanda almanın en yaygın nedenidir.
                Her aşamada sadece bir metrik karar verir — diğerleri yalnızca bilgi içindir.
              </p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">Aşama</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">OMTM</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-700 hidden md:table-cell">Eşik</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-700 hidden lg:table-cell">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {milestones.map((m) => {
                  const sc = statusConfig[m.status];
                  const thresholds = ['10 ödeme yapan müşteri', '340 müşteri + churn < %5', '$1.2M ARR + CAC < LTV/3'];
                  return (
                    <tr key={m.id} className={m.status === 'active' ? 'bg-blue-50/40' : ''}>
                      <td className="px-5 py-3 font-medium text-slate-900">{m.stage}</td>
                      <td className="px-5 py-3 text-slate-700">{m.omtm}</td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-600 hidden md:table-cell">{thresholds[m.id - 1]}</td>
                      <td className="px-5 py-3 hidden lg:table-cell">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${sc.bg} ${sc.color}`}>
                          {sc.icon}{sc.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Pivot Log */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-mono">P</span>
            Pivot Günlüğü
          </h2>
          <p className="text-slate-500 text-sm mb-4">
            Hangi varsayım test edildi, ne öğrenildi, yol haritası nasıl değişti.
            Statik — yenilikler oldukça kod bazında güncellenir.
          </p>
          <div className="space-y-4">
            {pivotLog.map((entry, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-mono text-xs text-slate-400">{entry.date}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    entry.type === 'scope' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {entry.type === 'scope' ? 'Kapsam' : 'Metrik'}
                  </span>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-0.5">Varsayım</p>
                    <p className="text-sm text-slate-800">{entry.assumption}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-0.5">Sonuç</p>
                    <p className="text-sm text-slate-700">{entry.result}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-0.5">Karar / Eylem</p>
                    <p className="text-sm text-slate-800 font-medium">{entry.action}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </AdminLayout>
  );
}
