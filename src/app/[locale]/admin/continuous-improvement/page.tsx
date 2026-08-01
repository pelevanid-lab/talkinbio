'use client';

import AdminLayout from '@/components/AdminLayout';
import ContinuousImprovementTabs from '@/components/ContinuousImprovementTabs';

/* ------------------------------------------------------------------ */
/* Static data — Yalın Kanvas V.2                                     */
/* Fermi Tahmini (V.2) ve Çekim Gücü Yol Haritası (V.2) ile hizalı.    */
/* Statik — yenilikler oldukça kod bazında güncellenir.                */
/*                                                                      */
/* V.2 (2026-08-01) — konumlanma değişti: ürün artık "DM'e cevap veren  */
/* chatbot" değil, "ziyaretçinin sorusuna göre doğru sahneyi açan       */
/* sayfa". Fiyatlandırma gerçek koda (src/config/plans.ts) hizalandı — */
/* eski V.1'in $9/$29/$79 aylık abonelik rakamları kurgusaldı, koddaki  */
/* gerçek model tek seferlik kredi paketidir. Tek-segment (solo         */
/* diyetisyen) beachhead kısıtı kaldırıldı — kurucu kararı 2026-08-01.  */
/* ------------------------------------------------------------------ */

const canvas = {
  problem: [
    'İşletmeler ve serbest çalışanlar bio linklerine trafik alıyor ama trafik ölü: Linktree tarzı sayfalar statik bir link listesi — ziyaretçi ne aradığını bulmak için sayfada dolaşmak zorunda, sayfa ona göre açılmıyor.',
    'Ziyaretçi soruları (fiyat, uygunluk, süre, "online mı yüz yüze mi?") DM\'yi dolduruyor; işletme sahibi mesajlara yetişemiyor, geç cevap müşteri kaybettiriyor.',
    'Formlar yüksek terk oranıyla çalışıyor; ziyaretçi form doldurmak değil, sorusuna karşılığında somut bir sayfa (süreç, fiyat, randevu) görmek istiyor.',
  ],
  existingAlternatives: [
    'Linktree, Bio.fm gibi statik link toplama araçları (ücretsiz ama sayfa herkese aynı görünür, kimseye göre açılmaz)',
    'DM/WhatsApp üzerinden manuel cevaplama (ölçeklenmiyor; geç cevap = kayıp müşteri)',
    "Intercom, Tidio gibi chatbot widget'ları (kurumsal, pahalı; soruyu uzun metinle cevaplar ama ziyaretçiyi sayfanın ilgili bölümüne GÖTÜRMEZ — sohbet ile sayfa iki ayrı dünyadır)",
  ],
  solution: [
    'Ziyaretçi soru sorduğunda uzun bir sohbet metni almaz: sayfa, cevabın yaşadığı bloğa (hizmet, fiyat, randevu, SSS) geçer. Bugün blok tıklamasıyla bu geçiş zaten çalışıyor (tam sayfa "sahne" + geri butonu); asistanın soruya bakıp doğru bloğu KENDİSİ açması roadmap\'te — henüz uygulanmadı.',
    "Kurulum sohbetle: işletme sahibiyle röportaj yapan agent bloklar halinde kurar, içeriği tr/en/ru'da üretir, işletmeye özgün tema tasarlar.",
    'Sayfa ürün ambalajı, asistan yönlendirme mekanizması: "ziyaretçiye göre açılan web sitesi" — chatbot değil, chatbot sayfayı doğru yere götüren bir katman.',
    '(v2) Gerçek DM kanallarına taşınma (WhatsApp, sonra Instagram) hâlâ yol haritasında, ama artık birincil vaat değil — birincil vaat sayfanın kendisi.',
  ],
  keyMetrics: [
    'Aylık aktif işletme (MAU) ve kurulum tamamlama oranı',
    "Ziyaretçi→sohbet etkileşim oranı; sohbet→doğru bloğun açılması→lead dönüşümü (landing demo hunisi admin/analytics'te canlı ölçülüyor — Faz 1.6)",
    'Ödeyen müşteri sayısı, kredi paketi tekrar-satın-alma oranı (abonelik yok — bu model MRR yerine "ne sıklıkta yeniden kredi alınıyor" ile ölçülür, henüz veri yok)',
    "Birim maliyet — GERÇEK ÖLÇÜM (2026-07-16, Sonnet 4.5): Saule mesajı $0,026 | Beiwe güncelleme $0,121 | Beiwe tam kurulum $0,147. Beiwe'nin ~18-19K token'lık sabit sistem prompt yükü küçük güncellemeleri tam kurulum kadar maliyetli kılıyor.",
    'Kredi maliyet katsayılarının doğrulanması — kod bugün Saule 1 / Beiwe güncelleme 6 / kurulum 10 kredi kullanıyor (src/agents/shared/limits.ts); gerçek maliyet oranı yukarıdaki ölçümle hâlâ tam örtüşmüyor.',
    'Kredi tüketim dağılımı (kullanıcılar krediyi neye harcıyor?) ve bakiye tükenme oranı',
  ],
  uniqueValueProposition:
    'Ziyaretçiye göre açılan web siten. Linktree ziyaretçiye aynı listeyi gösterir; Talkinbio\'da ziyaretçi soru sorar, sayfa cevabın olduğu bölüme açılır — randevuya, fiyata, doğru hizmete kadar.',
  highLevelConcept:
    '"Statik Linktree\'nin, ziyaretçiye göre açılan hali" — ya da: "Her ziyaretçiye kendi sorusuna göre açılan bio sayfası."',
  unfairAdvantage: [
    "Katman 1 — ürün içi viral imza: her sayfanın altında \"talkinbio.com\" imzası (widget içinde UTM'li link) bugün de kodda var, ANCAK imza metni şu an boş render ediliyor (messages/tr.json ve en.json 'signature' anahtarı boş string — 2026-07-29'daki Saule/Beiwe isimlendirme değişikliğinde geride kalmış bir bug, dolduruncaya kadar bu katman fiilen çalışmıyor). Doldurulsa bile: kopyalanabilir bir döngü, tek başına haksız avantaj değil — Linktree aynı modele büyüdü.",
    'Katman 2 — Gerçek hendek (zamanla birikir): işletme başına konuşma geçmişi + bilgi tabanı + konuşmalardan öğrenen sayfa geliştirme öneri döngüsü (Faz 3, henüz yapılmadı). Asistan her sohbette işletmeye daha akıllanır; rakibe geçmek sıfırdan demek.',
    'Katman 3 — Konumlanma: "soruya göre açılan sayfa" kategorisi henüz tanımlanmamış; Linktree\'nin sayfası var ama yönlendirmiyor, Intercom\'un botu var ama sayfayı değiştirmiyor. Bu boşluk bugün boş ama savunmasız — hız ve niş derinliği dışında bir hendek yok.',
  ].join('\n\n'),
  channels: [
    "Ana kanal: ürün içi viral döngü (widget imzası — şu an metni boş, doldurulmayı bekliyor) + niş topluluklar (koç/eğitmen/danışman Facebook grupları, Discord)",
    '"Linktree alternatifi", "ziyaretçiye göre açılan sayfa" içerikleri + yayınlanan her müşteri profili domain\'e çalışan indekslenebilir sayfa (teknik temel: Faz S, henüz yapılmadı)',
    'Product Hunt lansmanı (erken benimseyici dalgası — ilk ödeyen müşteriler sonrası)',
    'Ücretli reklam yok (LTV/CAC kanıtlanana kadar)',
  ],
  customerSegments: [
    'Randevu/hizmet bazlı çalışan profesyoneller (danışman, koç, terapist, eğitmen, güzellik uzmanı)',
    'Küçük yerel işletmeler ve hizmet sağlayıcılar (kuaför, mimar, stüdyo)',
    'Ürün/marka sahipleri — portfolyo, hikâye, satın alma adımı olan sayfa isteyenler',
    "Not (2026-08-01): tek-segment beachhead kısıtı (önceki V.1'de solo diyetisyen) kurucu kararıyla kaldırıldı — ürün çok sektörlü olarak konumlandırılıyor; bu, hiçbir segmentte henüz müşteri kanıtı olmadığı anlamına da gelir.",
  ],
  earlyAdopters: [
    'Instagram/TikTok\'tan müşteri kazanan, sayfası "sadece link listesi" olan, hizmet/ürün satan bireysel profesyoneller',
    'Halihazırda Linktree kullanan ama "statik" bulanlar',
    "Gerçek ilk dogfooding vakası: Talkinbio'nun kendi demo işletmesi (landing'de canlı) — ürün kendi kendini satıyor.",
  ],
  costStructure: [
    "Claude API: Sonnet 4.5 (sohbet + standart kurulum görevleri). GERÇEK ÖLÇÜM: mesaj $0,026, güncelleme $0,121, kurulum $0,147 — sabit ~18-19K token sistem prompt yükü küçük işlemleri de pahalı kılıyor, prompt caching + bağlam diyeti önceliklidir.",
    'Sesli cevap (TTS): her oynatmada fal.ai/ElevenLabs\'e gidiyor (src/app/api/chat/voice/speak) — cache YOK ve kredi düşmüyor; şu an kontrolsüz bir maliyet kalemi. Kayıt-altına-al-bir-kez-öde modeline geçiş roadmap\'te ama henüz yapılmadı.',
    'Kredisiz onboarding\'in API maliyeti müşteri edinme maliyetine (CAC) yazılır.',
    'Altyapı: Vercel + Supabase; ödeme sağlayıcısı Shopier (entegre, canlı) — komisyon payı kredi fiyatına yansıtılmalı, şu an ayrıca kalemlendirilmiyor.',
    'Geliştirme/destek — tek kurucu bant genişliği (bkz. ROADMAP riskler).',
  ],
  revenueStreams: [
    'Abonelik değil, tek seferlik kredi paketi satışı (src/config/plans.ts): Free $0 → 20 kredi (kayıt anında) · Starter $20 → 400 kredi · Pro $90 → 2.000 kredi · Business $400 → 10.000 kredi.',
    'Ek kredi paketi: $5 → 100 kredi.',
    '1 kredi = $0,05 (CREDIT_VALUE_USD, src/config/pricing.ts); AI üretim işlemleri gerçek maliyetin en az 2 katı fiyatla krediye çevrilir (creditsForCost, marj çarpanı 2x).',
    'Açık madde: kodda hâlâ duran $0,10 → 10 kredilik bir "TEST_PACK" var — kredi başı $0,01, yani $0,05 varsayımının 5\'te biri. Kalıcı bir paket mi, unutulmuş bir test artığı mı — karara bağlanmalı.',
    "Ziyaretçi sohbeti oturum bazlı: 50 mesaja kadar tek oturum = 1 kredi (SESSION_MESSAGE_CAP, SAULE_CREDIT_COST — kodda canlı). Ses cevabı ek 5 kredi (SAULE_VOICE_CREDIT_COST) ama yukarıdaki bug yüzünden şu an fiilen düşmüyor.",
    'Kredi bitince asistan kapanmaz — sayfa + "mesaj bırakın" modu yaşar (fiilen kalıcı ücretsiz katman etkisi; ücretsiz kayıt kredisi 20\'dir, sonrasında sayfa görünür kalır).',
    'Birim ekonomi henüz gerçek ödeyen müşteri verisiyle doğrulanmadı — 0/10 (bkz. Çekim Gücü Yol Haritası).',
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
          V.2 · 2026-08-01 — statik anlık görüntü; Fermi Tahmini V.2 ve Çekim Gücü Yol Haritası V.2 ile hizalı.
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
