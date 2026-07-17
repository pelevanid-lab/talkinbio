'use client';

import AdminLayout from '@/components/AdminLayout';
import ContinuousImprovementTabs from '@/components/ContinuousImprovementTabs';

/* ------------------------------------------------------------------ */
/* Static data — Yalın Kanvas V.1                                     */
/* Fermi Tahmini (V.1.1) ve Çekim Gücü Yol Haritası (V.1.1) ile hizalı. */
/* Statik — yenilikler oldukça kod bazında güncellenir.                */
/* ------------------------------------------------------------------ */

const canvas = {
  problem: [
    'Küçük işletmeler ve serbest çalışanlar bio linklerine trafik alıyor ama trafik ölü: Linktree tarzı sayfalar statik — soru cevaplamaz, randevu talebi almaz, lead toplamaz.',
    'Ziyaretçi soruları (fiyat, uygunluk, süre, "grup mu bireysel mi?") DM\'yi dolduruyor; işletme sahibi mesajlara yetişemiyor, geç cevap müşteri kaybettiriyor.',
    'Formlar yüksek terk oranıyla çalışıyor; ziyaretçi form doldurmak değil, soru sormak istiyor.',
  ],
  existingAlternatives: [
    'Linktree, Bio.fm gibi statik link toplama araçları (ücretsiz ama etkileşimsiz)',
    'DM/WhatsApp üzerinden manuel cevaplama (ölçeklenmiyor; geç cevap = kayıp müşteri)',
    "Intercom, Tidio gibi chatbot widget'ları (kurumsal, pahalı, web sitesi gerektiriyor — bio ekosistemine yabancı)",
  ],
  solution: [
    "Saule — bio linkinde 7/24 konuşan asistan: soruları YALNIZCA işletmenin doğrulanmış verisinden cevaplar (uydurmaz), lead toplar, yapılandırılmış randevu talebi alır (Faz 1.5'te eklendi: tercih edilen gün/saat alanı; gerçek takvim entegrasyonu v2).",
    "Beiwe — kurulum sohbetle: işletme sahibiyle röportaj yapar, bloklar halinde kurar, içeriği 3 dilde üretir, işletmeye özgün tema tasarlar. (Yol haritası: hizmet şemasına süre/kontenjan/grup-bireysel alanları eklenecek — kanvasın vaadiyle kod henüz eşit değil.)",
    'Sayfa ürün ambalajı, asistan ürünün kendisi: profil sayfası asistan etrafında otomatik oluşur.',
    '(v2) Saule gerçek DM kanallarına taşınır — önce WhatsApp, sonra Instagram: sohbet, müşterinin zaten olduğu yerde gerçekleşir.',
  ],
  keyMetrics: [
    'Aylık aktif işletme (MAU) ve kurulum tamamlama oranı',
    "Ziyaretçi→sohbet etkileşim oranı; sohbet→lead dönüşümü; ilk lead'e geçen süre (landing demo hunisi admin/analytics'te canlı ölçülüyor — Faz 1.6)",
    'MRR, churn, LTV/CAC',
    "Birim maliyet — GERÇEK ÖLÇÜM (2026-07-16, Sonnet 4.5): Saule mesajı $0,026 | Beiwe güncelleme $0,121 | Beiwe tam kurulum $0,147. Beiwe'nin ~18-19K token'lık sabit sistem prompt yükü, küçük güncellemeleri tam kurulum kadar maliyetli kılıyor — kredi çarpanları (1:3:10) uyuşmuyor, Faz 4'te yeniden kalibre edilecek.",
    'Kredi çarpanlarının doğrulanması (Saule 1 / Beiwe güncelleme 3 / kurulum 10) — usage_events ölçümüyle, ilk 100 kullanıcıda haftalık takip; ilk çarpanların yanlış olduğu zaten gösterildi (bkz. yukarı)',
    'Kredi tüketim dağılımı (kullanıcılar krediyi neye harcıyor?) ve devir bakiyesi toplamı (kredi borcu riski)',
  ],
  uniqueValueProposition:
    "Bio linkin artık cevap veriyor. Linktree ziyaretçiye liste gösterir; Talkinbio'da Saule ziyaretçiyle konuşur, sorusunu işletmenin doğrulanmış bilgisiyle cevaplar ve onu lead'e/randevu talebine dönüştürür.",
  highLevelConcept:
    '"Linktree + resepsiyonist" — ya da: "Bio\'ndaki 7/24 çalışan asistan."',
  unfairAdvantage: [
    "Katman 1 (bugün, Faz 1.8'de tamamlandı — 2026-07-17'de yayında): her Saule widget'ının altında \"Saule ile konuşuyorsunuz — talkinbio.com\" imzası; müşterinin her ziyaretçisi potansiyel müşteri, ürün kullanıldıkça kendini pazarlar. Dürüst not: bu kopyalanabilir bir döngü, tek başına haksız avantaj değil — Linktree aynı modele büyüdü. Dönüşüm etkisi henüz doğrulanmadı (Faz S UTM'leriyle ölçülecek).",
    'Katman 2 — Gerçek hendek (zamanla birikir): işletme başına konuşma geçmişi + Saule bilgi tabanı (Faz 1.4, yayında) + konuşmalardan öğrenen sayfa geliştirme öneri döngüsü (Faz 3). Asistan her sohbette işletmeye daha akıllanır; rakibe geçmek sıfırdan demek — geçiş maliyeti burada yatıyor.',
    "Katman 3 — Konumlanma: \"konuşarak kurulan + konuşan sayfa\" bütünlüğü; Linktree'nin sayfası var ama konuşmuyor, Intercom'un botu var ama bio ekosisteminde değil.",
  ].join('\n\n'),
  channels: [
    'Ana kanal: ürün içi viral döngü (Saule imzası — Faz 1.8, yayında) + niş topluluklar (koç/eğitmen Facebook grupları, Discord)',
    '"Linktree alternatifi", "konuşan bio linki" içerikleri + yayınlanan her müşteri profili domain\'e çalışan indekslenebilir sayfa (teknik temel: Faz S, henüz yapılmadı)',
    'Product Hunt lansmanı (erken benimseyici dalgası — Faz 4 sonrası)',
    'Ücretli reklam yok (LTV/CAC kanıtlanana kadar)',
  ],
  customerSegments: [
    'Randevu bazlı çalışan profesyoneller (koç, terapist, eğitmen, güzellik uzmanı) — birincil kama',
    'Serbest çalışanlar ve danışmanlar',
    'Küçük yerel işletmeler (kuaför, butik, kafe)',
    "İçerik üreticileri ve mikro-influencer'lar (ikincil — değer önerisi farklı, ayrıca doğrulanmalı)",
  ],
  earlyAdopters: [
    'Instagram/TikTok\'tan müşteri kazanan, DM yükünden bunalan, randevuyla çalışan 25-40 yaş profesyoneller',
    'Halihazırda Linktree kullanan ama "statik" bulanlar',
    "Gerçek ilk dogfooding vakası: Talkinbio'nun kendi demo işletmesi (Faz 1.6, landing'de canlı) — Saule kendi ürününü satıyor. \"Uliana Studio\", landing mockup'ındaki hayali örnek profildir, gerçek bir müşteri değildir; karıştırılmamalı.",
  ],
  costStructure: [
    "Claude API: Sonnet 4.5 (Saule sohbetleri + Beiwe standart görevleri); daha güçlü model yalnız Beiwe ağır görevlerinde (AI SDK güncellemesi sonrası — Faz 2). GERÇEK ÖLÇÜM: Saule $0,026/mesaj, Beiwe güncelleme $0,121, Beiwe kurulum $0,147 — Beiwe'nin sabit ~18-19K token sistem prompt yükü küçük işlemleri de pahalı kılıyor, prompt caching + bağlam diyeti (Faz 2.3) bu yüzden öncelikli.",
    'Kredisiz onboarding\'in API maliyeti müşteri edinme maliyetine (CAC) yazılır.',
    "Altyapı: Vercel + Supabase; ödeme komisyonu ~%3. Sağlayıcı kararı (iyzico/Stripe) hâlâ açık — dolar-sabit fiyat kararı (2026-07-17) TR/USD fiyat çelişkisini kapattı, artık net gereksinim: dolar fiyat + TL tahsilatı birlikte destekleyen sağlayıcı seçilmeli.",
    'Geliştirme/destek — tek kurucu bant genişliği (bkz. ROADMAP riskler).',
  ],
  revenueStreams: [
    'Starter $9/ay → 200 kredi (yıllık %20 indirim: $7,2/ay)',
    'Pro $29/ay → 700 kredi (yıllık %20 indirim: $23,2/ay)',
    'Business $79/ay → 1.800 kredi (yıllık %20 indirim: $63,2/ay)',
    'Fiyatlar dolara sabit; TL tahsilat güncel kur üzerinden yapılır, lokal sabit TL fiyat yoktur (karar 2026-07-17 — girdi maliyetleri dolar).',
    'Ek kredi paketi: $5 → 100 kredi (birim pahalı — plana yükseltme teşviki)',
    'Kredi devri: kullanılmayan krediler devreder, bakiye tavanı 2 aylık kota',
    'Kredi bitince asistan kapanmaz — sayfa + "mesaj bırakın" modu yaşar (fiili ücretsiz katman etkisi)',
    "Birim ekonomi: $0,045/kredi; Starter marjı tipik kullanımda %69, en dar senaryoda (yalnızca güncelleme) %11 — kredi tavanı doğal zarar-durdurucu.",
  ],
};

/* ------------------------------------------------------------------ */
/* Sub-components                                                        */
/* ------------------------------------------------------------------ */

function Cell({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="p-4 flex-1 flex flex-col">
      <h3 className="font-bold text-slate-900 leading-tight mb-1">{title}</h3>
      <p className="text-xs text-slate-500 mb-2">{desc}</p>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function ListCell({ title, desc, items }: { title: string; desc: string; items: string[] }) {
  return (
    <Cell title={title} desc={desc}>
      <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-700">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </Cell>
  );
}

function TextCell({ title, desc, text }: { title: string; desc: string; text: string }) {
  return (
    <Cell title={title} desc={desc}>
      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{text}</p>
    </Cell>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

export default function LeanCanvasPage() {
  return (
    <AdminLayout>
      <ContinuousImprovementTabs />
      <div className="mb-6 mt-6">
        <h1 className="text-3xl font-bold text-slate-900">Yalın Kanvas</h1>
        <p className="text-slate-500 mt-1">Sürekli Gelişim</p>
        <p className="text-xs text-slate-400 mt-1 font-mono">
          V.1 · 2026-07-17 — statik anlık görüntü; Fermi Tahmini V.1.1 ve Çekim Gücü Yol Haritası V.1.1 ile hizalı.
          Yenilikler oldukça kod bazında güncellenir.
        </p>
      </div>

      {/* Lean Canvas Grid */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {/* Top Section: 5 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 border-b border-slate-200 lg:min-h-[450px]">

          <div className="flex flex-col divide-y divide-slate-200">
            <ListCell title="Sorun" desc="Müşterilerinizin en büyük 3 sorununu yazın" items={canvas.problem} />
            <ListCell title="Mevcut Alternatifler" desc="Bu sorunların bugün nasıl çözüldüğünü listeleyin" items={canvas.existingAlternatives} />
          </div>

          <div className="flex flex-col divide-y divide-slate-200">
            <ListCell title="Çözüm" desc="Her sorun için olası çözümleri ana hatlarıyla yazın" items={canvas.solution} />
            <ListCell title="Önemli Metrikler" desc="İşin bugün nasıl olduğunu ifade eden önemli sayıları listeleyin" items={canvas.keyMetrics} />
          </div>

          <div className="flex flex-col divide-y divide-slate-200">
            <TextCell title="Benzersiz Değer Teklifi" desc="Habersiz bir ziyaretçiyi ilgili bir müşteriye dönüştürecek sade, açık ve ikna edici mesaj" text={canvas.uniqueValueProposition} />
            <TextCell title="Üst Düzey Konsept" desc="X için Y analojilerini listeleyin" text={canvas.highLevelConcept} />
          </div>

          <div className="flex flex-col divide-y divide-slate-200">
            <TextCell title="Haksız Avantaj" desc="Kolaylıkla kopyalanamayacak ya da satın alınamayacak bir şey" text={canvas.unfairAdvantage} />
            <ListCell title="Kanallar" desc="Müşterilerinize ulaşma yollarınızı listeleyin" items={canvas.channels} />
          </div>

          <div className="flex flex-col divide-y divide-slate-200">
            <ListCell title="Müşteri Segmentleri" desc="Hedef müşterilerinizi ve kullanıcılarınızı listeleyin" items={canvas.customerSegments} />
            <ListCell title="Erken Benimseyenler" desc="İdeal müşterinizin karakteristik özelliklerini listeleyin" items={canvas.earlyAdopters} />
          </div>

        </div>

        {/* Bottom Section: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 min-h-[200px]">
          <ListCell title="Maliyet Yapısı" desc="Sabit ve değişken maliyetlerinizi listeleyin" items={canvas.costStructure} />
          <ListCell title="Gelir Kalemleri" desc="Gelir kaynaklarınızı listeleyin" items={canvas.revenueStreams} />
        </div>
      </div>
    </AdminLayout>
  );
}
