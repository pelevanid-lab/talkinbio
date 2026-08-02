'use client';

import AdminLayout from '@/components/AdminLayout';
import ContinuousImprovementTabs from '@/components/ContinuousImprovementTabs';

/* ------------------------------------------------------------------ */
/* Static data â€” YalÄ±n Kanvas V.2                                     */
/* Fermi Tahmini (V.2) ve Ã‡ekim GÃ¼cÃ¼ Yol HaritasÄ± (V.2) ile hizalÄ±.    */
/* Statik â€” yenilikler oldukÃ§a kod bazÄ±nda gÃ¼ncellenir.                */
/*                                                                      */
/* V.2 (2026-08-01) â€” konumlanma deÄŸiÅŸti: Ã¼rÃ¼n artÄ±k "DM'e cevap veren  */
/* chatbot" deÄŸil, "ziyaretÃ§inin sorusuna gÃ¶re doÄŸru sahneyi aÃ§an       */
/* sayfa". FiyatlandÄ±rma gerÃ§ek koda (src/config/plans.ts) hizalandÄ± â€” */
/* eski V.1'in $9/$29/$79 aylÄ±k abonelik rakamlarÄ± kurgusaldÄ±, koddaki  */
/* gerÃ§ek model tek seferlik kredi paketidir. Tek-segment (solo         */
/* diyetisyen) beachhead kÄ±sÄ±tÄ± kaldÄ±rÄ±ldÄ± â€” kurucu kararÄ± 2026-08-01.  */
/* ------------------------------------------------------------------ */

const canvas = {
  problem: [
    'Ä°ÅŸletmeler ve serbest Ã§alÄ±ÅŸanlar bio linklerine trafik alÄ±yor ama trafik Ã¶lÃ¼: Linktree tarzÄ± sayfalar statik bir link listesi â€” ziyaretÃ§i ne aradÄ±ÄŸÄ±nÄ± bulmak iÃ§in sayfada dolaÅŸmak zorunda, sayfa ona gÃ¶re aÃ§Ä±lmÄ±yor.',
    'ZiyaretÃ§i sorularÄ± (fiyat, uygunluk, sÃ¼re, "online mÄ± yÃ¼z yÃ¼ze mi?") DM\'yi dolduruyor; iÅŸletme sahibi mesajlara yetiÅŸemiyor, geÃ§ cevap mÃ¼ÅŸteri kaybettiriyor.',
    'Formlar yÃ¼ksek terk oranÄ±yla Ã§alÄ±ÅŸÄ±yor; ziyaretÃ§i form doldurmak deÄŸil, sorusuna karÅŸÄ±lÄ±ÄŸÄ±nda somut bir sayfa (sÃ¼reÃ§, fiyat, randevu) gÃ¶rmek istiyor.',
  ],
  existingAlternatives: [
    'Linktree, Bio.fm gibi statik link toplama araÃ§larÄ± (Ã¼cretsiz ama sayfa herkese aynÄ± gÃ¶rÃ¼nÃ¼r, kimseye gÃ¶re aÃ§Ä±lmaz)',
    'DM/WhatsApp Ã¼zerinden manuel cevaplama (Ã¶lÃ§eklenmiyor; geÃ§ cevap = kayÄ±p mÃ¼ÅŸteri)',
    "Intercom, Tidio gibi chatbot widget'larÄ± (kurumsal, pahalÄ±; soruyu uzun metinle cevaplar ama ziyaretÃ§iyi sayfanÄ±n ilgili bÃ¶lÃ¼mÃ¼ne GÃ–TÃœRMEZ â€” sohbet ile sayfa iki ayrÄ± dÃ¼nyadÄ±r)",
  ],
  solution: [
    'ZiyaretÃ§i soru sorduÄŸunda uzun bir sohbet metni almaz: sayfa, cevabÄ±n yaÅŸadÄ±ÄŸÄ± bloÄŸa (hizmet, fiyat, randevu, SSS) geÃ§er. BugÃ¼n blok tÄ±klamasÄ±yla bu geÃ§iÅŸ zaten Ã§alÄ±ÅŸÄ±yor (tam sayfa "sahne" + geri butonu); asistanÄ±n soruya bakÄ±p doÄŸru bloÄŸu KENDÄ°SÄ° aÃ§masÄ± roadmap\'te â€” henÃ¼z uygulanmadÄ±.',
    "Kurulum sohbetle: iÅŸletme sahibiyle rÃ¶portaj yapan agent bloklar halinde kurar, iÃ§eriÄŸi tr/en/ru'da Ã¼retir, iÅŸletmeye Ã¶zgÃ¼n tema tasarlar.",
    'Sayfa Ã¼rÃ¼n ambalajÄ±, asistan yÃ¶nlendirme mekanizmasÄ±: "ziyaretÃ§iye gÃ¶re aÃ§Ä±lan web sitesi" â€” chatbot deÄŸil, chatbot sayfayÄ± doÄŸru yere gÃ¶tÃ¼ren bir katman.',
    '(v2) GerÃ§ek DM kanallarÄ±na taÅŸÄ±nma (WhatsApp, sonra Instagram) hÃ¢lÃ¢ yol haritasÄ±nda, ama artÄ±k birincil vaat deÄŸil â€” birincil vaat sayfanÄ±n kendisi.',
  ],
  keyMetrics: [
    'AylÄ±k aktif iÅŸletme (MAU) ve kurulum tamamlama oranÄ±',
    "ZiyaretÃ§iâ†’sohbet etkileÅŸim oranÄ±; sohbetâ†’doÄŸru bloÄŸun aÃ§Ä±lmasÄ±â†’lead dÃ¶nÃ¼ÅŸÃ¼mÃ¼ (landing demo hunisi admin/analytics'te canlÄ± Ã¶lÃ§Ã¼lÃ¼yor â€” Faz 1.6)",
    'Ã–deyen mÃ¼ÅŸteri sayÄ±sÄ±, kredi paketi tekrar-satÄ±n-alma oranÄ± (abonelik yok â€” bu model MRR yerine "ne sÄ±klÄ±kta yeniden kredi alÄ±nÄ±yor" ile Ã¶lÃ§Ã¼lÃ¼r, henÃ¼z veri yok)',
    "Birim maliyet â€” GERÃ‡EK Ã–LÃ‡ÃœM (2026-07-16, Sonnet 4.5): Saule mesajÄ± $0,026 | Beiwe gÃ¼ncelleme $0,121 | Beiwe tam kurulum $0,147. Beiwe'nin ~18-19K token'lÄ±k sabit sistem prompt yÃ¼kÃ¼ kÃ¼Ã§Ã¼k gÃ¼ncellemeleri tam kurulum kadar maliyetli kÄ±lÄ±yor.",
    'Kredi maliyet katsayÄ±larÄ±nÄ±n doÄŸrulanmasÄ± â€” kod bugÃ¼n Saule 1 / Beiwe gÃ¼ncelleme 6 / kurulum 10 kredi kullanÄ±yor (src/agents/shared/limits.ts); gerÃ§ek maliyet oranÄ± yukarÄ±daki Ã¶lÃ§Ã¼mle hÃ¢lÃ¢ tam Ã¶rtÃ¼ÅŸmÃ¼yor.',
    'Kredi tÃ¼ketim daÄŸÄ±lÄ±mÄ± (kullanÄ±cÄ±lar krediyi neye harcÄ±yor?) ve bakiye tÃ¼kenme oranÄ±',
  ],
  uniqueValueProposition:
    'ZiyaretÃ§iye gÃ¶re aÃ§Ä±lan web siten. Linktree ziyaretÃ§iye aynÄ± listeyi gÃ¶sterir; Talkinbio\'da ziyaretÃ§i soru sorar, sayfa cevabÄ±n olduÄŸu bÃ¶lÃ¼me aÃ§Ä±lÄ±r â€” randevuya, fiyata, doÄŸru hizmete kadar.',
  highLevelConcept:
    '"Statik Linktree\'nin, ziyaretÃ§iye gÃ¶re aÃ§Ä±lan hali" â€” ya da: "Her ziyaretÃ§iye kendi sorusuna gÃ¶re aÃ§Ä±lan bio sayfasÄ±."',
  unfairAdvantage: [
    "Katman 1 â€” Ã¼rÃ¼n iÃ§i viral imza: her sayfanÄ±n altÄ±nda \"talkinbio.com\" imzasÄ± (widget iÃ§inde UTM'li link) bugÃ¼n de kodda var, ANCAK imza metni ÅŸu an boÅŸ render ediliyor (messages/tr.json ve en.json 'signature' anahtarÄ± boÅŸ string â€” 2026-07-29'daki Saule/Beiwe isimlendirme deÄŸiÅŸikliÄŸinde geride kalmÄ±ÅŸ bir bug, dolduruncaya kadar bu katman fiilen Ã§alÄ±ÅŸmÄ±yor). Doldurulsa bile: kopyalanabilir bir dÃ¶ngÃ¼, tek baÅŸÄ±na haksÄ±z avantaj deÄŸil â€” Linktree aynÄ± modele bÃ¼yÃ¼dÃ¼.",
    'Katman 2 â€” GerÃ§ek hendek (zamanla birikir): iÅŸletme baÅŸÄ±na konuÅŸma geÃ§miÅŸi + bilgi tabanÄ± + konuÅŸmalardan Ã¶ÄŸrenen sayfa geliÅŸtirme Ã¶neri dÃ¶ngÃ¼sÃ¼ (Faz 3, henÃ¼z yapÄ±lmadÄ±). Asistan her sohbette iÅŸletmeye daha akÄ±llanÄ±r; rakibe geÃ§mek sÄ±fÄ±rdan demek.',
    'Katman 3 â€” Konumlanma: "soruya gÃ¶re aÃ§Ä±lan sayfa" kategorisi henÃ¼z tanÄ±mlanmamÄ±ÅŸ; Linktree\'nin sayfasÄ± var ama yÃ¶nlendirmiyor, Intercom\'un botu var ama sayfayÄ± deÄŸiÅŸtirmiyor. Bu boÅŸluk bugÃ¼n boÅŸ ama savunmasÄ±z â€” hÄ±z ve niÅŸ derinliÄŸi dÄ±ÅŸÄ±nda bir hendek yok.',
  ].join('\n\n'),
  channels: [
    "Ana kanal: Ã¼rÃ¼n iÃ§i viral dÃ¶ngÃ¼ (widget imzasÄ± â€” ÅŸu an metni boÅŸ, doldurulmayÄ± bekliyor) + niÅŸ topluluklar (koÃ§/eÄŸitmen/danÄ±ÅŸman Facebook gruplarÄ±, Discord)",
    '"Linktree alternatifi", "ziyaretÃ§iye gÃ¶re aÃ§Ä±lan sayfa" iÃ§erikleri + yayÄ±nlanan her mÃ¼ÅŸteri profili domain\'e Ã§alÄ±ÅŸan indekslenebilir sayfa (teknik temel: Faz S, henÃ¼z yapÄ±lmadÄ±)',
    'Product Hunt lansmanÄ± (erken benimseyici dalgasÄ± â€” ilk Ã¶deyen mÃ¼ÅŸteriler sonrasÄ±)',
    'Ãœcretli reklam yok (LTV/CAC kanÄ±tlanana kadar)',
  ],
  customerSegments: [
    'Randevu/hizmet bazlÄ± Ã§alÄ±ÅŸan profesyoneller (danÄ±ÅŸman, koÃ§, terapist, eÄŸitmen, gÃ¼zellik uzmanÄ±)',
    'KÃ¼Ã§Ã¼k yerel iÅŸletmeler ve hizmet saÄŸlayÄ±cÄ±lar (kuafÃ¶r, mimar, stÃ¼dyo)',
    'ÃœrÃ¼n/marka sahipleri â€” portfolyo, hikÃ¢ye, satÄ±n alma adÄ±mÄ± olan sayfa isteyenler',
    "Not (2026-08-01): tek-segment beachhead kÄ±sÄ±tÄ± (Ã¶nceki V.1'de solo diyetisyen) kurucu kararÄ±yla kaldÄ±rÄ±ldÄ± â€” Ã¼rÃ¼n Ã§ok sektÃ¶rlÃ¼ olarak konumlandÄ±rÄ±lÄ±yor; bu, hiÃ§bir segmentte henÃ¼z mÃ¼ÅŸteri kanÄ±tÄ± olmadÄ±ÄŸÄ± anlamÄ±na da gelir.",
  ],
  earlyAdopters: [
    'Instagram/TikTok\'tan mÃ¼ÅŸteri kazanan, sayfasÄ± "sadece link listesi" olan, hizmet/Ã¼rÃ¼n satan bireysel profesyoneller',
    'HalihazÄ±rda Linktree kullanan ama "statik" bulanlar',
    "GerÃ§ek ilk dogfooding vakasÄ±: Talkinbio'nun kendi demo iÅŸletmesi (landing'de canlÄ±) â€” Ã¼rÃ¼n kendi kendini satÄ±yor.",
  ],
  costStructure: [
    "Claude API: Sonnet 4.5 (sohbet + standart kurulum gÃ¶revleri). GERÃ‡EK Ã–LÃ‡ÃœM: mesaj $0,026, gÃ¼ncelleme $0,121, kurulum $0,147 â€” sabit ~18-19K token sistem prompt yÃ¼kÃ¼ kÃ¼Ã§Ã¼k iÅŸlemleri de pahalÄ± kÄ±lÄ±yor, prompt caching + baÄŸlam diyeti Ã¶nceliklidir.",
    'Sesli cevap: Faz 6 ile dinamik TTS kapatıldı; Saule yalnızca cueKey döndürür, ChatWidget onaylı hazır ses dosyasını çalar. Runtime standart paket ücretsiz; üretim/onay admin Talkinbio Lab → Saule Ses Paketleri altında yapılır.',
    'Kredisiz onboarding\'in API maliyeti mÃ¼ÅŸteri edinme maliyetine (CAC) yazÄ±lÄ±r.',
    'AltyapÄ±: Vercel + Supabase; Ã¶deme saÄŸlayÄ±cÄ±sÄ± Shopier (entegre, canlÄ±) â€” komisyon payÄ± kredi fiyatÄ±na yansÄ±tÄ±lmalÄ±, ÅŸu an ayrÄ±ca kalemlendirilmiyor.',
    'GeliÅŸtirme/destek â€” tek kurucu bant geniÅŸliÄŸi (bkz. ROADMAP riskler).',
  ],
  revenueStreams: [
    'Abonelik deÄŸil, tek seferlik kredi paketi satÄ±ÅŸÄ± (src/config/plans.ts): Free $0 â†’ 20 kredi (kayÄ±t anÄ±nda) Â· Starter $20 â†’ 400 kredi Â· Pro $90 â†’ 2.000 kredi Â· Business $400 â†’ 10.000 kredi.',
    'Ek kredi paketi: $5 â†’ 100 kredi.',
    '1 kredi = $0,05 (CREDIT_VALUE_USD, src/config/pricing.ts); AI Ã¼retim iÅŸlemleri gerÃ§ek maliyetin en az 2 katÄ± fiyatla krediye Ã§evrilir (creditsForCost, marj Ã§arpanÄ± 2x).',
    'AÃ§Ä±k madde: kodda hÃ¢lÃ¢ duran $0,10 â†’ 10 kredilik bir "TEST_PACK" var â€” kredi baÅŸÄ± $0,01, yani $0,05 varsayÄ±mÄ±nÄ±n 5\'te biri. KalÄ±cÄ± bir paket mi, unutulmuÅŸ bir test artÄ±ÄŸÄ± mÄ± â€” karara baÄŸlanmalÄ±.',
    'Ziyaretçi sohbeti oturum bazlı: 50 mesaja kadar metin oturumu = 1 kredi. Mikrofon/STT kullanılan sesli oturum = 5 kredi ve 8 dakika sınırı vardır; cevap tarafında dinamik TTS maliyeti yoktur.',
    'Kredi bitince asistan kapanmaz â€” sayfa + "mesaj bÄ±rakÄ±n" modu yaÅŸar (fiilen kalÄ±cÄ± Ã¼cretsiz katman etkisi; Ã¼cretsiz kayÄ±t kredisi 20\'dir, sonrasÄ±nda sayfa gÃ¶rÃ¼nÃ¼r kalÄ±r).',
    'Birim ekonomi henÃ¼z gerÃ§ek Ã¶deyen mÃ¼ÅŸteri verisiyle doÄŸrulanmadÄ± â€” 0/10 (bkz. Ã‡ekim GÃ¼cÃ¼ Yol HaritasÄ±).',
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
        <h1 className="text-3xl font-bold text-slate-900">YalÄ±n Kanvas</h1>
        <p className="text-slate-500 mt-1">SÃ¼rekli GeliÅŸim</p>
        <p className="text-xs text-slate-400 mt-1 font-mono">
          V.2 Â· 2026-08-01 â€” statik anlÄ±k gÃ¶rÃ¼ntÃ¼; Fermi Tahmini V.2 ve Ã‡ekim GÃ¼cÃ¼ Yol HaritasÄ± V.2 ile hizalÄ±.
          Yenilikler oldukÃ§a kod bazÄ±nda gÃ¼ncellenir.
        </p>
      </div>

      {/* Lean Canvas Grid */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {/* Top Section: 5 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 border-b border-slate-200 lg:min-h-[450px]">

          <div className="flex flex-col divide-y divide-slate-200">
            <ListCell title="Sorun" desc="MÃ¼ÅŸterilerinizin en bÃ¼yÃ¼k 3 sorununu yazÄ±n" items={canvas.problem} />
            <ListCell title="Mevcut Alternatifler" desc="Bu sorunlarÄ±n bugÃ¼n nasÄ±l Ã§Ã¶zÃ¼ldÃ¼ÄŸÃ¼nÃ¼ listeleyin" items={canvas.existingAlternatives} />
          </div>

          <div className="flex flex-col divide-y divide-slate-200">
            <ListCell title="Ã‡Ã¶zÃ¼m" desc="Her sorun iÃ§in olasÄ± Ã§Ã¶zÃ¼mleri ana hatlarÄ±yla yazÄ±n" items={canvas.solution} />
            <ListCell title="Ã–nemli Metrikler" desc="Ä°ÅŸin bugÃ¼n nasÄ±l olduÄŸunu ifade eden Ã¶nemli sayÄ±larÄ± listeleyin" items={canvas.keyMetrics} />
          </div>

          <div className="flex flex-col divide-y divide-slate-200">
            <TextCell title="Benzersiz DeÄŸer Teklifi" desc="Habersiz bir ziyaretÃ§iyi ilgili bir mÃ¼ÅŸteriye dÃ¶nÃ¼ÅŸtÃ¼recek sade, aÃ§Ä±k ve ikna edici mesaj" text={canvas.uniqueValueProposition} />
            <TextCell title="Ãœst DÃ¼zey Konsept" desc="X iÃ§in Y analojilerini listeleyin" text={canvas.highLevelConcept} />
          </div>

          <div className="flex flex-col divide-y divide-slate-200">
            <TextCell title="HaksÄ±z Avantaj" desc="KolaylÄ±kla kopyalanamayacak ya da satÄ±n alÄ±namayacak bir ÅŸey" text={canvas.unfairAdvantage} />
            <ListCell title="Kanallar" desc="MÃ¼ÅŸterilerinize ulaÅŸma yollarÄ±nÄ±zÄ± listeleyin" items={canvas.channels} />
          </div>

          <div className="flex flex-col divide-y divide-slate-200">
            <ListCell title="MÃ¼ÅŸteri Segmentleri" desc="Hedef mÃ¼ÅŸterilerinizi ve kullanÄ±cÄ±larÄ±nÄ±zÄ± listeleyin" items={canvas.customerSegments} />
            <ListCell title="Erken Benimseyenler" desc="Ä°deal mÃ¼ÅŸterinizin karakteristik Ã¶zelliklerini listeleyin" items={canvas.earlyAdopters} />
          </div>

        </div>

        {/* Bottom Section: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 min-h-[200px]">
          <ListCell title="Maliyet YapÄ±sÄ±" desc="Sabit ve deÄŸiÅŸken maliyetlerinizi listeleyin" items={canvas.costStructure} />
          <ListCell title="Gelir Kalemleri" desc="Gelir kaynaklarÄ±nÄ±zÄ± listeleyin" items={canvas.revenueStreams} />
        </div>
      </div>
    </AdminLayout>
  );
}
