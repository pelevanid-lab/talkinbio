'use client';

import AdminLayout from '@/components/AdminLayout';
import ContinuousImprovementTabs from '@/components/ContinuousImprovementTabs';
import { useState } from 'react';
import {
  Mic, Users, TrendingUp, Lightbulb, Briefcase,
  ChevronRight, ChevronLeft, LayoutGrid, Quote,
  AlertTriangle, Target, DollarSign, Rocket, BarChart2,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Data                                                                  */
/* ------------------------------------------------------------------ */

const elevatorPitch = {
  tr: `Instagram veya WhatsApp'tan müşteri alan her hizmet sahibinin ortak bir sorunu var: DM'ler çoğalıyor, takip edilemiyor ve lead'ler kayboluyor.

talkinbio, bu sorunu çözen konuşan bio sayfasıdır. Saule — yapay zeka destekli müşteri hizmetleri asistanınız — sayfanızı ziyaret eden her potansiyel müşteriyle 7/24 konuşur, randevu toplar ve lead listesi oluşturur. Beiwe ise tüm bu veriyi haftalık içerik önerisine ve pazarlama içgörüsüne dönüştürür.

Sonuç: işletme sahibi uyurken, sayfası çalışır.`,
  en: `Every service provider who gets clients through Instagram or WhatsApp shares the same problem: DMs pile up, follow-ups slip through, and leads are lost.

talkinbio is a talking bio page that solves this. Saule — your AI-powered customer service assistant — engages every visitor 24/7, collects appointments, and builds your lead list. Beiwe then turns all that data into weekly content suggestions and marketing insights.

The result: your page works while you sleep.`,
};

const perspectives = [
  {
    id: 'customer',
    label: 'Müşteri',
    icon: Users,
    color: 'blue',
    hook: '"Kaç tane DM gelip cevap vermeden geçti bu hafta?"',
    problem: 'Instagram veya WhatsApp üzerinden iş yapan hizmet sahipleri, potansiyel müşteri sorularını zamanında yanıtlayamıyor. Bir soruya saatlerce cevap gelmeyince müşteri başka birine gidiyor — lead kayboldu.',
    solution: 'talkinbio sayfanı canlı bir asistana dönüştürür. Ziyaretçi istediği soruyu sorar, Saule cevaplar, randevu alır, lead kaydeder. Sen sabah kalkınca hazır bir liste bulursun.',
    cta: '"Ücretsiz 30 günlük deneme — kurulum 10 dakika."',
    objection: '"Neden bir chatbot kurmayayım ?" → Chatbot kurulumu teknik bilgi ister. Saule\'yi Beiwe ile 10 dakikada konuşturmaya başlarsın — kod yok, form yok.',
  },
  {
    id: 'investor',
    label: 'Yatırımcı',
    icon: DollarSign,
    color: 'emerald',
    hook: '"Micro-SaaS olarak TR\'de $400K, v2 Global ile $800K+ ARR tavanı olan, kredi modeliyle yönetilen maliyetleri olan bir iş modeli."',
    problem: '150M+ sosyal medya üzerinden iş yapan bireysel hizmet sağlayıcısından 30M\'i DM ile müşteri kabul ediyor. Bu segment bugün ne büyük CRM\'lerin ne de Linktree\'nin çözdüğü bir acı noktasında kalmış.',
    solution: 'talkinbio bu segmentin ilk dikey SaaS\'ı. Ürün: web widget (Saule) + marketing agent (Beiwe). Gelir: kredi modeli, $9/$29/$79 planlar, dolar-sabit fiyat. Birim ekonomi: $15 efektif ARPU, LTV ~$300, CAC hedefi <$100.',
    cta: 'TR\'de Ürün/Pazar Uyumu (550 müşteri, $100K ARR) → v2 ile MENA+LatAm (~$800K baz ARR). Tek kurucu, bootstrapped başlangıç, VC gereksinimi ileriki aşamada.',
    objection: '"Pazar çok küçük değil mi?" → TR tavanı kasıtlı muhafazakâr modellendi ($400K). Asıl büyüme v2\'de (WA+IG DM) ve Faz 7 dil genişlemesinde — Türkiye sadece başlangıç noktası.',
  },
  {
    id: 'advisor',
    label: 'Danışman',
    icon: Lightbulb,
    color: 'purple',
    hook: '"Ash Maurya\'nın metodolojisini uygulayarak ilerleyen, erken doğrulama aşamasında bir bootstrapped SaaS."',
    problem: 'Bireysel hizmet sahipleri için mevcut araçlar iki uçta: ya çok basit (Linktree — sadece link) ya çok karmaşık (CRM — hem pahalı hem öğrenmesi zor). Ara katman boş.',
    solution: 'Aşama 1 (P/Ç Uyumu) bitmeden kod yazmamak için müşteri görüşmeleri + ücretli pilot önce geldi. Şu an Aşama 1\'deyiz: ilk 10 ödeme yapan müşteri hedefindeviz. OMTM: ödeme yapan müşteri sayısı.',
    cta: 'İhtiyaç duyduğumuz danışmanlık: (a) Türkiye\'de $9/ay dolar-sabit ödeme iste yabancı mı kalır? (b) Viral imza döngüsü organik CAC\'ı gerçekten $100 altında tutabilir mi? (c) v2 için Meta evrak sürecinde deneyim.',
    objection: '"Tek kurucu riski?" → Evet, en büyük kırılma noktası bu. Faz 3 (Beiwe marketing agent) modüler tasarlandı; gecikmesi lansman için bloke değil.',
  },
  {
    id: 'pitch',
    label: 'İş Modeli Konuşması',
    icon: Briefcase,
    color: 'amber',
    hook: '"Bireysel hizmet sahiplerinin sosyal medyadan yaptığı satışı, şu ana kadar hiç görmediğiniz bir şekilde otomatize ediyoruz."',
    problem: 'Türkiye\'de 1,5M+ sosyal medya üzerinden aktif satan bireysel hizmet sağlayıcısı var. Bunların %40\'ı müşterisiyle DM üzerinden iş yapıyor. Bu 600K satıcı için ödeme yapabilir araç: neredeyse sıfır.',
    solution: 'talkinbio = Saule (konuşan bio widget) + Beiwe (marketing agent). Sayfana gelen ziyaretçi Saule ile konuşuyor, sen lead listeni buluyorsun. Beiwe bu konuşmaları içerik ve pazarlama önerisine çeviriyor.',
    cta: 'Gelir modeli: kredi aboneliği ($9-$79/ay, dolar-sabit). İlk 10 müşteri manuel satış + pilot. Ölçek: viral imza döngüsü (Saule imzası → organik büyüme). Dönüm noktası: 550 müşteri → $100K ARR.',
    objection: '"Rakipler?" → Linktree link paylaşır, CRM\'ler karmaşık. talkinbio aralarındaki boşluğu — "konuşan bio" kategorisini — sahipleniyor.',
  },
];

const slides = [
  {
    num: 1,
    title: 'Vizyon & Değer Teklifi',
    icon: Rocket,
    content: 'Sosyal medya üzerinden iş yapan hizmet sahiplerinin müşteri görüşmelerini otomatize eden agentic çözüm.',
    detail: 'Tek cümle. Habersiz bir ziyaretçiyi anında ilgilendirmeli. "Konuşan bio" kategorisini tanımla.',
    maurya: '"Ziyaretçiyi değer teklifini anlayıp anlamadığını test etmenin en hızlı yolu landingteki bounce rate."',
  },
  {
    num: 2,
    title: 'Sorun',
    icon: AlertTriangle,
    content: 'DM\'ler çoğalıyor → takip edilemiyor → lead kayboluyor. Günde ortalama 5-20 DM soran, cevap beklemeyi bırakıp giden potansiyel müşteri.',
    detail: 'Müşteri görüşmelerinden gelen gerçek alıntılar. "Para kaybı" çerçevesinde sun — kaçan lead\'in maliyeti = kaybedilen iş.',
    maurya: '"Sorun gerçekse müşteri zaten alternatifler arıyor. Onları listele — bunlar gerçek rakiplerinden."',
  },
  {
    num: 3,
    title: 'Müşteri Segmenti',
    icon: Users,
    content: 'TR Instagram üzerinden aktif satan ~1,5M bireysel hizmet sağlayıcısı. Filtre: müşterisiyle DM üzerinden iş yapan (~%40 = 600K). Ödeme yapabilir: ~30K.',
    detail: 'Erken benimseyenler: koç, özel ders, güzellik, pet hizmetleri, serbest çalışanlar. DM\'den lead alan, takibini kaybeden hizmet sahipleri.',
    maurya: '"Herkes için bir ürün, kimse için ürün değildir. Erken benimseyenini bir kişi kadar net tanımla."',
  },
  {
    num: 4,
    title: 'Benzersiz Değer Teklifi',
    icon: Target,
    content: '"Sosyal medya sayfan uyurken çalışsın" — 10 dakikada kur, 7/24 müşteri karşıla, sabah hazır lead listesiyle uyan.',
    detail: 'Rakiplerden fark: Linktree link paylaşır, büyük CRM\'ler karmaşık. talkinbio bu ikisi arasındaki "konuşan bio" kategorisini açıyor.',
    maurya: '"UVP, müşterinin ürün hakkındaki ilk izlenimdir. Açık, sade, somut — şiirsel değil."',
  },
  {
    num: 5,
    title: 'Çözüm',
    icon: Mic,
    content: 'Saule: AI widget — ziyaretçiyle konuşur, randevu alır, lead kaydeder. Beiwe: marketing agent — konuşmaları içerik önerisine çevirir, haftalık özet sunar.',
    detail: 'Kurulum 10 dk, kod yok. v1: web widget. v2: WhatsApp + Instagram DM doğrudan entegrasyon.',
    maurya: '"Çözümü üç özellikle sınırla. Çok özellik = odaksızlık. Her özellik bir sorunu çözmeli."',
  },
  {
    num: 6,
    title: 'Gelir Modeli',
    icon: DollarSign,
    content: 'Kredi aboneliği: Starter $9/ay (200 kredi) | Pro $29/ay (700) | Business $79/ay (1.800). Yıllık %20 indirim. Dolar-sabit fiyat.',
    detail: 'Birim ekonomi: $15 efektif ARPU, LTV=$300 (%5 churn), CAC hedefi <$100. Starter %69 marj (tipik kullanım). Kredi bitince blokaj yok — "mesaj bırak" modu.',
    maurya: '"Fiyatı müşteriden saklamak yerine göster. Fiyat, değer teklifinin testleşmesidir."',
  },
  {
    num: 7,
    title: 'Pazar Boyutu',
    icon: BarChart2,
    content: 'TR adreslenebilir: ~30K. Teorik tavan: ~$400K ARR. v2 Global (MENA+LatAm): +120K adreslenebilir → ~$810K ARR (baz) / ~$1,6M (stretch).',
    detail: 'Fermi zinciri: 62M IG → %2 satıcı (1,5M) → %40 DM kullanan (600K) → %5 ödeyebilen (30K). Aynı zincir MENA/LatAm için ek 120K.',
    maurya: '"Pazar boyutu tahminini zincirleme çarpanla türet — tek büyük rakam değil. Her adımı savunabilmelisin."',
  },
  {
    num: 8,
    title: 'Çekim Gücü & Metrikler',
    icon: TrendingUp,
    content: 'Şu an Aşama 1 (P/Ç Uyumu). OMTM: ödeme yapan müşteri sayısı. Hedef: 10 ödeme → 550 müşteri ($100K ARR). Faz 1.8 viral imza döngüsü canlı.',
    detail: 'Doğrulanmış varsayımlar: prompt caching maliyet testi (gerçek ölçüm), manuel tahsilat akışı, konuşma başı maliyet ($0,026/mesaj). Doğrulanmamış: viral imza dönüşüm oranı, kur-churn etkisi.',
    maurya: '"Çekim = tahmin değil, kanıt. Bir müşterinin parasını ödemesi, 1.000 kullanıcının beğenmesinden daha değerlidir."',
  },
  {
    num: 9,
    title: 'Haksız Avantaj',
    icon: Lightbulb,
    content: '1. Saule imzası → viral döngü (her widget organik büyüme kanalı). 2. Konuşma verisi → Beiwe\'nin içerik motoru (ne kadar kullanılırsa o kadar akıllanır). 3. Türkçe-ilk, yerel dil derinliği (MENA/LatAm için çok dilli genişleme modeli hazır).',
    detail: 'Kopyalanamayan şey: ürünün kendisi değil, her kullanıcının ürettiği konuşma verisi ile viral büyüme döngüsünün birleşimi.',
    maurya: '"Haksız avantaj, bugün sahip olduğun şey değil — başkalarının yarın sahip olamayacağı şey."',
  },
  {
    num: 10,
    title: 'Çağrı',
    icon: Target,
    content: 'Ürün/Pazar Uyumu için 10 ödeme yapan müşteri arıyoruz. İlk 30 gün ücretsiz pilot — Beiwe ile sayfanı kur, Saule ile lead topla, veri gör.',
    detail: 'Yatırımcıya: $100K ARR doğrulamasında sizi bilgilendiririz — v2 öncesi konuşalım. Danışmana: ödeme bariyer testi ve Meta evrak sürecinde deneyiminize ihtiyacımız var.',
    maurya: '"Her sunumun sonunda net bir adım ol. \'Sizi haberdar ederiz\' bir çağrı değil — somut, yapılabilir, tarihli."',
  },
];

/* ------------------------------------------------------------------ */
/* Sub-components                                                        */
/* ------------------------------------------------------------------ */

const colorMap: Record<string, { bg: string; border: string; badge: string; icon: string; quote: string }> = {
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
    icon: 'text-blue-600',
    quote: 'text-blue-700 bg-blue-50 border-blue-200',
  },
  emerald: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700',
    icon: 'text-emerald-600',
    quote: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    badge: 'bg-purple-100 text-purple-700',
    icon: 'text-purple-600',
    quote: 'text-purple-700 bg-purple-50 border-purple-200',
  },
  amber: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-700',
    icon: 'text-amber-600',
    quote: 'text-amber-700 bg-amber-50 border-amber-200',
  },
};

function PerspectiveCard({ p }: { p: typeof perspectives[0] }) {
  const c = colorMap[p.color];
  const Icon = p.icon;

  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} p-6 flex flex-col gap-4`}>
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-white border ${c.border}`}>
          <Icon className={`w-4 h-4 ${c.icon}`} />
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.badge}`}>{p.label}</span>
      </div>

      {/* Hook */}
      <blockquote className={`text-sm italic leading-relaxed border-l-2 pl-3 ${c.quote} border rounded-r-lg p-3`}>
        {p.hook}
      </blockquote>

      {/* Problem → Çözüm → CTA */}
      <div className="space-y-3">
        <div className="bg-white/70 rounded-xl p-4 border border-white">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Problem</p>
          <p className="text-sm text-slate-700 leading-relaxed">{p.problem}</p>
        </div>
        <div className="bg-white/70 rounded-xl p-4 border border-white">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Çözüm / Konuşma</p>
          <p className="text-sm text-slate-700 leading-relaxed">{p.solution}</p>
        </div>
        <div className="bg-white/90 rounded-xl p-4 border border-white">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Çağrı / Sonraki Adım</p>
          <p className="text-sm font-medium text-slate-800 leading-relaxed">{p.cta}</p>
        </div>
      </div>

      {/* İtiraz */}
      <div className="bg-slate-900/5 rounded-xl p-3 border border-slate-200/50">
        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Yaygın İtiraz & Cevap</p>
        <p className="text-xs text-slate-600 leading-relaxed">{p.objection}</p>
      </div>
    </div>
  );
}

function SlideCard({ slide, isActive, onClick }: {
  slide: typeof slides[0];
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = slide.icon;
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
        isActive
          ? 'border-slate-900 bg-slate-900 text-white'
          : 'border-slate-200 bg-white hover:border-slate-400 text-slate-700'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className={`font-mono text-xs font-bold ${isActive ? 'text-slate-400' : 'text-slate-400'}`}>
          {String(slide.num).padStart(2, '0')}
        </span>
        <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-300' : 'text-slate-400'}`} />
      </div>
      <p className={`text-xs font-semibold leading-tight ${isActive ? 'text-white' : 'text-slate-700'}`}>
        {slide.title}
      </p>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

export default function LeanPitchPage() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [pitchLang, setPitchLang] = useState<'tr' | 'en'>('tr');
  const slide = slides[activeSlide];
  const SlideIcon = slide.icon;

  return (
    <AdminLayout>
      <ContinuousImprovementTabs />

      <div className="mt-6 space-y-12">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Mic className="w-5 h-5 text-slate-600" />
            <h1 className="text-3xl font-bold text-slate-900">Yalın Satış Konuşması</h1>
          </div>
          <p className="text-slate-500 text-sm">
            Ash Maurya · <em>Running Lean</em>, Bölüm 5 — Hikâyeni net anlat. Her izleyici farklı duyar; iş modeli aynı kalır.
          </p>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            V.1 · 2026-07-17 · Fermi V.1.1 ve Çekim Gücü Yol Haritası V.1.1 ile uyumlu. Statik.
          </p>
        </div>

        {/* 1. Asansör Konuşması */}
        <section>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-mono">1</span>
              Asansör Konuşması
              <span className="text-xs font-normal text-slate-400 font-mono ml-1">~60 saniye</span>
            </h2>
            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
              {(['tr', 'en'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setPitchLang(lang)}
                  className={`px-3 py-1.5 text-xs font-semibold uppercase transition-colors ${
                    pitchLang === lang
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-5">
              <Quote className="w-5 h-5 text-slate-300 mb-3" />
              <p className="text-slate-800 leading-relaxed whitespace-pre-line text-sm">
                {elevatorPitch[pitchLang]}
              </p>
            </div>
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                <strong>Yapı:</strong> Sorun → Çözüm → Kanıt → Çağrı.
                Maurya: "İlk 30 saniye izleyiciyi kaybedebilir veya kazanabilir — sorunla aç."
              </p>
            </div>
          </div>
        </section>

        {/* 2. Perspektifler */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-mono">2</span>
            İzleyici Perspektifleri
          </h2>
          <p className="text-xs text-slate-500 mb-5">
            Aynı iş modeli, farklı izleyiciler için farklı vurgulanır.
            Maurya: <em>"Müşteri ürününü satın alır, yatırımcı büyüme hikâyesini, danışman metodolojini."</em>
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {perspectives.map((p) => (
              <PerspectiveCard key={p.id} p={p} />
            ))}
          </div>
        </section>

        {/* 3. 10 Slayt */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-mono">3</span>
            10 Slaytlık İş Modeli Sunumu
          </h2>
          <p className="text-xs text-slate-500 mb-5">
            Ash Maurya&#39;nın Lean Canvas&#39;a dayalı sunum çerçevesi. Her slayt tek bir soruyu yanıtlar.
            Sıraya dokuna — detaylar sağda açılır.
          </p>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Sol: Slayt Listesi */}
            <div className="xl:col-span-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-2 gap-2">
                {slides.map((s, i) => (
                  <SlideCard
                    key={s.num}
                    slide={s}
                    isActive={i === activeSlide}
                    onClick={() => setActiveSlide(i)}
                  />
                ))}
              </div>
            </div>

            {/* Sağ: Aktif Slayt Detayı */}
            <div className="xl:col-span-2">
              <div className="bg-white border-2 border-slate-900 rounded-2xl overflow-hidden shadow-md h-full flex flex-col">
                {/* Header */}
                <div className="bg-slate-900 px-6 pt-6 pb-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                      <SlideIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs font-mono mb-0.5">
                        Slayt {String(slide.num).padStart(2, '0')} / 10
                      </p>
                      <h3 className="text-xl font-bold text-white leading-tight">{slide.title}</h3>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="flex-1 p-6 flex flex-col gap-5">
                  {/* Ana İçerik */}
                  <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2">Slayt İçeriği</p>
                    <p className="text-slate-800 text-sm leading-relaxed font-medium">{slide.content}</p>
                  </div>

                  {/* Sunum Notu */}
                  <div className="bg-white rounded-xl p-4 border border-slate-100">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">Sunum Notu</p>
                    <p className="text-slate-600 text-sm leading-relaxed">{slide.detail}</p>
                  </div>

                  {/* Maurya Alıntısı */}
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 italic leading-relaxed">{slide.maurya}</p>
                  </div>

                  {/* Gezinme */}
                  <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setActiveSlide(Math.max(0, activeSlide - 1))}
                      disabled={activeSlide === 0}
                      className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" /> Önceki
                    </button>
                    <div className="flex gap-1">
                      {slides.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveSlide(i)}
                          className={`w-1.5 h-1.5 rounded-full transition-colors ${
                            i === activeSlide ? 'bg-slate-900' : 'bg-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => setActiveSlide(Math.min(slides.length - 1, activeSlide + 1))}
                      disabled={activeSlide === slides.length - 1}
                      className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 disabled:opacity-30 transition-colors"
                    >
                      Sonraki <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Maurya Notu */}
        <section className="bg-slate-900 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-2 mb-4">
            <LayoutGrid className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-lg">Running Lean Bölüm 5 — Temel Prensipler</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                title: 'Hikâye Önce, Ürün Sonra',
                body: 'Hikâyeni net anlatamıyorsan, ürünün de net değildir. Sunum pratiği, ürünü netleştirir.',
              },
              {
                title: 'İzleyiciyi Önce Anla',
                body: 'Müşteri satın almak ister. Yatırımcı büyümek ister. Danışman katkı yapmak ister. Aynı slaytla hepsine hitap etmeye çalışma.',
              },
              {
                title: 'Çekim Olmadan Hikâye Boş',
                body: '"Traction is the best story you can tell." — İlk 10 ödeme yapan müşteri, 10.000 satırlık sunumdan daha güçlüdür.',
              },
            ].map((item) => (
              <div key={item.title} className="bg-white/10 rounded-xl p-4 border border-white/10">
                <p className="text-amber-400 font-semibold text-sm mb-2">{item.title}</p>
                <p className="text-slate-300 text-sm leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

      </div>
    </AdminLayout>
  );
}
