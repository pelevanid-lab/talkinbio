'use client';

import { Fragment, useEffect, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, ExternalLink, Loader2, Mail, RotateCcw, Sparkles } from 'lucide-react';
import { Link } from '@/i18n/routing';
import hubStyles from '@/components/touchpoints/touchpoints.module.css';
import { IMMERSIVE_VIDEO } from '@/config/immersiveMedia';
import { normalizeEditorialLocale } from './editorialTranslations';
import { customerInsightTranslations } from './customerInsightTranslations';
import styles from './customerInsight.module.css';

type Simulation = {
  scene: string;
  customer: { visible: string; underlying: string; tension: string };
  market: { signals: string[]; alternative: string; change: string };
  insight: { pattern: string; decision: string; test: string };
  turningPoint: string;
};

type RelatedArticle = { slug: string; eyebrow: string; title: string; readingTime: string };
type NextTopic = { slug: string; number: string; title: string; shortTitle: string; question: string };
type CardId = 'customer' | 'market' | 'insight' | 'pattern' | 'simulation' | 'articles' | 'next';
type ExampleStage = { key: string; number: string; title: string; caption: string };
type ExampleRow = { id: string; [key: string]: string };
type Lens = { eyebrow: string; title: string; body: string; question: string; details: readonly (readonly [string, string])[] };

const cardMeta: Record<CardId, { eyebrow: string; label: string; style: CSSProperties }> = {
  customer: { eyebrow: '01 · AYRI GÖR', label: 'Müşteriyi anla', style: { top: '7%', right: '33%', transform: 'rotate(-2deg)' } },
  market: { eyebrow: '02 · AYRI GÖR', label: 'Pazarı dinle', style: { top: '14%', right: '4%', transform: 'rotate(1.5deg)' } },
  insight: { eyebrow: '03 · AYRI GÖR', label: 'İçgörü üret', style: { top: '28%', right: '20%', transform: 'rotate(-1deg)' } },
  pattern: { eyebrow: 'ÖRÜNTÜ', label: 'İhtiyaçtan karara', style: { top: '45%', right: '3%', transform: 'rotate(1deg)' } },
  simulation: { eyebrow: 'CLAUDE İLE', label: 'Vaka simülasyonu', style: { top: '58%', right: '31%', transform: 'rotate(-1.6deg)' } },
  articles: { eyebrow: 'OKUMA', label: 'İlgili yazılar', style: { top: '70%', right: '17%', transform: 'rotate(0.7deg)' } },
  next: { eyebrow: 'SONRAKİ', label: 'Segmentasyon ve hedefleme', style: { top: '82%', right: '3%', transform: 'rotate(-1deg)' } },
};

const cardOrder = Object.keys(cardMeta) as CardId[];

const trUi = {
  coreQuestion: 'TEMEL SORU', deterministic: 'DETERMİNİSTİK ÖRNEKLER', customerExampleTitle: 'Aynı durumu üç farklı düzeyde oku.', customerExampleBody: 'Her satırı soldan sağa izle. Örnekler sabittir; kavramlar arasındaki dönüşümü göstermek için AI kullanılmadan hazırlanmıştır.', examples: 'örnekleri', signalExamples: 'SİNYAL BİRLEŞTİRME ÖRNEKLERİ', signalTitle: 'Aynı varsayımı üç kanıt türüyle sına.', signalBody: 'Her satır aynı iş fikrini izler. Tek bir bulgu karar verdirmez; kaynaklar yan yana geldiğinde açıklanabilir ve sınanabilir bir okuma oluşur.', signals: 'sinyal örnekleri', together: 'ÜÇÜ BİRLİKTE NE SÖYLÜYOR?', combined: 'Birleşik okuma', combinedCaption: 'Birleştirilmiş sinyallerden çıkan varsayımlar', insightExamples: 'İÇGÖRÜDEN KARARA ÖRNEKLER', insightTitle: 'Gözlemi değişen bir pazarlama kararına bağla.', insightBody: 'Her satır aynı vakayı izler. Örüntü, ancak hangi kararın değişeceğini ve sonraki öğrenmenin neyi sınayacağını söylediğinde işe yarar.', insightCaption: 'içgörü örnekleri', patternKicker: 'İHTİYAÇTAN KARARA', patternTitle: 'İçgörü doğrusal bir rapor değil, öğrenme döngüsüdür.', patternBody: 'Her karar yeni davranış üretir; yeni davranış da müşteriyi yeniden okumamızı sağlar.', manifesto: 'Gözlem, ancak müşterinin gerilimini açıklayıp bir pazarlama kararını değiştirdiğinde içgörüye dönüşür.', field: 'SAHA ÖDEVİ', fieldTitle: 'Kendi karar deneyini kur.', fieldBody: 'İlk üç adımı örneklerle gördün. Şimdi aynı çerçeveyi kendi iş fikrine uygula; cevaplarını kısa bir not hâline getirip bize gönder, biz de okumanın nerede güçlendiğine ve hangi testle başlanabileceğine bakalım.', send: "info@talkinbio.com'a gönder", simulationKicker: 'CLAUDE İLE VAKA SİMÜLASYONU', simulationTitle: 'Fikrini müşterinin dünyasında canlandır.', simulationBody: 'Kesin cevap yerine müşteri gerilimini, pazar sinyallerini ve sınanabilir içgörüyü görünür kılan öğretici bir vaka oluştur.', idea: 'Aklındaki fikir nedir?', placeholder: 'Örn. Mahalledeki bağımsız kafelerin gün sonunda kalan ürünlerini değerlendiren bir uygulama...', building: 'Vaka kuruluyor…', simulate: 'Vakayı canlandır', loading: 'İhtiyaç, sinyal ve karar birbirine bağlanıyor...', scene: 'MÜŞTERİ SAHNESİ', understand: 'MÜŞTERİYİ ANLA', underlying: 'Derindeki ihtiyaç', tension: 'Gerilim', listen: 'PAZARI DİNLE', otherSignals: 'Diğer sinyaller', alternative: 'Alternatif', change: 'Değişim', develop: 'İÇGÖRÜ ÜRET', decision: 'Karar', firstTest: 'İlk test', turning: 'VAKANIN DÖNÜM NOKTASI', tryAgain: 'Yeni fikir dene', continue: 'BURADAN DEVAM ET', deepenTitle: 'Vakayı Claude ile birlikte düşün.', deepenBody: 'Çalışma bağlamı panoya kopyalanır; Claude açıldığında promptu yapıştırarak araştırmayı sürdürebilirsin.', copied: 'Prompt kopyalandı', deepen: 'Claude ile derinleştir', paste: 'Claude’a geçip promptu yapıştırabilirsin.', copyError: 'Prompt kopyalanamadı; tekrar dene.', newTab: 'Claude yeni sekmede açılır.', disclaimer: 'Bu çıktı öğretici bir varsayım setidir; gerçek pazar araştırmasının yerine geçmez.', articlesKicker: 'İLGİLİ YAZILAR', articlesTitle: 'İhtiyacı gör, ürünü sahada sınamayı öğren.', articlesBody: 'Müşterinin görünmeyen ihtiyacını okumayı ve masadaki ürünü pazar gerçeğiyle yeniden konumlandırmayı anlatan iki derin okuma.', unavailableTitle: 'Bu bölüm sizin yazılarınızı bekliyor.', unavailableBody: 'Yazılar hazır olduğunda burada aynı tasarım dünyasında buluşacak.', nextKicker: 'SONRAKİ ADIM', nextTitle: 'İçgörüden seçim yapmaya geç.', nextBody: 'Müşteriyi ve pazarı okuduktan sonra önce anlamlı grupları gör, ardından hangi gruba değer sunacağını seç.', homeLabel: 'Talkinbio ana sayfa', fieldLabel: 'Müşteri ve Pazar İçgörüsü bölümleri', backLabel: 'Müşteri ve Pazar İçgörüsü ana ekranına dön',
};

const lenses = {
  customer: {
    eyebrow: 'MÜŞTERİYİ ANLA',
    title: 'Söylenenin arkasındaki ihtiyacı gör.',
    body: 'İnsanlar bir ürünü değil, bir durumdaki gerilimi çözmeye ister. İstek çözümün görünen biçimidir; ihtiyaç daha derindeki yarardır; talep ise istek, ödeme gücü ve seçim koşulları birleştiğinde oluşur.',
    question: 'Müşteri hangi ilerlemeyi sağlamaya çalışıyor?',
    details: [
      ['İhtiyaç', 'İnsanın çözmeye çalıştığı temel sorun veya aradığı yarar.'],
      ['İstek', 'İhtiyacın kültür, deneyim ve seçeneklerle aldığı görünür biçim.'],
      ['Talep', 'İsteğin seçim koşulları ve erişim gücüyle buluşmuş hâli.'],
    ],
  },
  market: {
    eyebrow: 'PAZARI DİNLE',
    title: 'Tek bir sesi değil, sinyallerin birleşimini oku.',
    body: 'İç kayıtlar ne olduğunu, pazar istihbaratı çevrede neyin değiştiğini, araştırma ise nedenini anlamaya yardım eder. Güçlü okuma, bu kaynakları tek bir varsayımı sınamak için birlikte kullanır.',
    question: 'Hangi kanıt varsayımımızı destekler veya bozar?',
    details: [
      ['İç kayıtlar', 'Arama, tercih, geri dönüş ve terk davranışları.'],
      ['Pazar istihbaratı', 'Rakiplerde, kanallarda ve çevrede görülen değişim.'],
      ['Araştırma', 'Gözlenen davranışın nedenini anlamaya yönelik sistemli sınama.'],
    ],
  },
  insight: {
    eyebrow: 'İÇGÖRÜ ÜRET',
    title: 'Gözlemi değiştirilebilir bir karara bağla.',
    body: 'Veri, tek başına içgörü değildir. İçgörü; tekrar eden bir örüntünün müşteri açısından anlamını açıklar, hangi kararın değişmesi gerektiğini söyler ve sınanabilir bir sonraki adım üretir.',
    question: 'Bu öğrendiğimiz şey hangi kararı değiştiriyor?',
    details: [
      ['Örüntü', 'Tekrarlayan davranış ile müşterinin gerilimi arasındaki bağ.'],
      ['Karar', 'İçgörü doğruysa farklı yapılması gereken pazarlama seçimi.'],
      ['Öğrenme', 'Kararın ardından varsayımı güçlendiren veya bozan yeni kanıt.'],
    ],
  },
} as const;

const patternSteps = [
  ['01', 'İhtiyaç', 'İnsan neyi çözmeye çalışıyor?'],
  ['02', 'Sinyal', 'Davranış bize ne gösteriyor?'],
  ['03', 'Örüntü', 'Ne tekrar ediyor veya değişiyor?'],
  ['04', 'Karar', 'Neyi farklı yapmalıyız?'],
  ['05', 'Öğrenme', 'Sonuç varsayımımızı nasıl değiştirdi?'],
] as const;

const assignmentQuestions = [
  'Müşterinin görünen isteği ne?',
  'Bu isteğin arkasındaki gerilim veya ihtiyaç ne olabilir?',
  'Bu gerilimi destekleyen üç sinyal ne?',
  'Bu okuma doğruysa hangi pazarlama kararını değiştirirdin?',
  'Bu kararı küçük ölçekte nasıl sınardın?',
] as const;

const customerExampleRows = [
  {
    id: 'A',
    need: 'Yoğun bir günde sağlıklı beslenmeyi sürdürebilmek.',
    want: 'Hazır ve porsiyonlanmış haftalık yemek aboneliği.',
    demand: 'Bütçesine, teslimat bölgesine ve programına uyan paketi satın almak.',
  },
  {
    id: 'B',
    need: 'Çocuğunun yaratıcılığını güvenli biçimde geliştirmek.',
    want: 'Canlı, çevrim içi yaratıcı yazarlık atölyesi.',
    demand: 'Yaşa, ders saatine ve bütçeye uyan atölyeye kayıt yaptırmak.',
  },
  {
    id: 'C',
    need: 'İşletmesini görünür kılarken kendi zamanını korumak.',
    want: 'Sade ve düzenli bir sosyal medya içerik hizmeti.',
    demand: 'Kanalına, içerik sıklığına ve bütçesine uyan hizmet paketini seçmek.',
  },
] as const;

const customerExampleStages = [
  { key: 'need', number: '01', title: 'İhtiyaç', caption: 'Sağlanmak istenen ilerleme' },
  { key: 'want', number: '02', title: 'İstek', caption: 'İlerlemenin görünür çözüm biçimi' },
  { key: 'demand', number: '03', title: 'Talep', caption: 'Seçim koşullarıyla buluşan istek' },
] as const;

const marketSignalRows = [
  {
    id: 'A',
    internal: 'Teslimat günü seçildikten sonra abonelik ödeme ekranından çıkış artıyor.',
    intelligence: 'Rakipler haftalık duraklatma ve gün değiştirme esnekliğini öne çıkarıyor.',
    research: 'Görüşmeler, düzensiz çalışma programının uzun süreli taahhüt kaygısı yarattığını gösteriyor.',
    reading: 'Sorun menü değil, kontrol kaybı. Sabit abonelik yerine esnek plan varsayımı sınanmalı.',
  },
  {
    id: 'B',
    internal: 'Ebeveynler ders saatleri ve eğitmen profillerini tekrar inceliyor; kayıtta bekliyor.',
    intelligence: 'Benzer atölyeler kısa deneme dersleri ve dönemlik yerine modüler programlar sunuyor.',
    research: 'Ebeveynler çocuğun ilgisinden emin olmadan uzun programa bağlanmak istemediklerini söylüyor.',
    reading: 'Engel fiyat değil, uyum belirsizliği. Önce kısa bir deneme deneyimi test edilmeli.',
  },
  {
    id: 'C',
    internal: 'Temel içerik paketi ilgi görüyor; müşteriler ikinci ayda revizyon ve onay sürecinde ayrılıyor.',
    intelligence: 'Yapay zekâ araçları üretimi ucuzlatırken ajanslar onay ve marka dili hizmetini ayrıştırıyor.',
    research: 'İşletme sahipleri içerikten çok sürekli karar verme ve markaya yabancı görünme yükünden yakınıyor.',
    reading: 'Değer yalnızca içerik üretmek değil, karar yükünü azaltmak. Teklif buna göre yeniden kurulmalı.',
  },
] as const;

const marketSignalStages = [
  { key: 'internal', number: '01', title: 'İç kayıtlar', caption: 'Davranışta ne oluyor?' },
  { key: 'intelligence', number: '02', title: 'Pazar istihbaratı', caption: 'Çevrede ne değişiyor?' },
  { key: 'research', number: '03', title: 'Araştırma', caption: 'Bu davranış neden oluyor?' },
] as const;

const insightExampleRows = [
  {
    id: 'A',
    pattern: 'Sağlıklı yemek aboneliğinde ödeme ekranından çıkışlar, teslimat günü sabitlendiğinde artıyor.',
    decision: 'Sabit haftalık abonelik yerine duraklatılabilir ve gün değiştirilebilir esnek planı öne çıkar.',
    learning: 'Esneklik vurgusu ödeme tamamlamayı artırırsa sorun menü değil, kontrol kaybı varsayımı güçlenir.',
  },
  {
    id: 'B',
    pattern: 'Ebeveynler yaratıcı yazarlık atölyesinde eğitmen profiline ve saatlere tekrar tekrar dönüyor.',
    decision: 'Uzun dönem kaydı yerine kısa deneme dersi ve eğitmen tanıtımını ilk teklif yap.',
    learning: 'Deneme dersinden sonra kayıt artarsa engelin fiyat değil, uyum belirsizliği olduğu anlaşılır.',
  },
  {
    id: 'C',
    pattern: 'Küçük işletmeler içerik paketini alıyor; ikinci ay onay ve revizyon sürecinde ayrılıyor.',
    decision: 'Teklifi yalnızca içerik üretiminden marka dili, onay ritmi ve karar yükünü azaltma üzerine kur.',
    learning: 'Ayrılma düşerse müşterinin satın aldığı şeyin gönderi sayısı değil, zihinsel yük azaltımı olduğu netleşir.',
  },
] as const;

const insightExampleStages = [
  { key: 'pattern', number: '01', title: 'Örüntü', caption: 'Tekrar eden davranış ne gösteriyor?' },
  { key: 'decision', number: '02', title: 'Karar', caption: 'Hangi pazarlama seçimi değişmeli?' },
  { key: 'learning', number: '03', title: 'Öğrenme', caption: 'Sonuç varsayımı nasıl sınar?' },
] as const;

const starterIdeas = [
  'Yoğun çalışanlar için haftalık sağlıklı yemek aboneliği',
  'Küçük işletmelere sade sosyal medya içerik hizmeti',
  'Çocuklar için çevrim içi yaratıcı yazarlık atölyesi',
];

function buildClaudeDeepeningPrompt(idea: string, simulation: Simulation) {
  return `Aşağıdaki iş fikri ve ilk vaka simülasyonu üzerinden interaktif bir müşteri ve pazar içgörüsü çalışması yürüt.

İŞ FİKRİ
${idea.trim()}

İLK VAKA SİMÜLASYONU
Müşteri sahnesi: ${simulation.scene}
Görünen istek: ${simulation.customer.visible}
Derindeki ihtiyaç: ${simulation.customer.underlying}
Müşteri gerilimi: ${simulation.customer.tension}
İzlenecek pazar sinyalleri: ${simulation.market.signals.join(' | ')}
Bugünkü alternatif: ${simulation.market.alternative}
İzlenecek değişim: ${simulation.market.change}
Sınanabilir örüntü: ${simulation.insight.pattern}
Değişebilecek pazarlama kararı: ${simulation.insight.decision}
İlk araştırma testi: ${simulation.insight.test}
Kritik öğrenme: ${simulation.turningPoint}

ÇALIŞMA BİÇİMİ
- Kotler ve Keller'in Pazarlama Yönetimi yaklaşımındaki müşteri ihtiyacı, pazar istihbaratı, pazarlama araştırması ve talep anlayışını kullan.
- Bütün analizi tek seferde verme. Her turda yalnızca bir karar noktası veya araştırma sorusu sun ve cevabımı bekle.
- Cevaplarıma göre ihtiyaç, sinyal, örüntü ve pazarlama kararı arasındaki bağlantıyı adım adım geliştir.
- Doğrulanmamış pazar verilerini gerçek gibi sunma; gözlem, varsayım ve içgörüyü birbirinden ayır.
- Gerektiğinde müşteri rolüne girerek gerçekçi bir karar anı canlandır; ancak uydurma demografi, oran, fiyat veya pazar büyüklüğü üretme.
- Amacın kesin cevap vermek değil, sınanabilir bir müşteri ve pazar içgörüsüne ulaşmama yardım etmek olsun.

Önce ilk vaka simülasyonundaki en kritik belirsizliği kısaca söyle ve yalnızca bir soruyla çalışmayı başlat.`;
}

async function copyText(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  document.body.removeChild(textarea);
  if (!copied) throw new Error('Kopyalama başarısız.');
}

function DeterministicCustomerExamples({ stages, rows, ui }: { stages: readonly ExampleStage[]; rows: readonly ExampleRow[]; ui: typeof trUi }) {
  return (
    <section className={styles.deterministicExamples} aria-labelledby="deterministic-examples-title">
      <div className={styles.exampleIntro}>
        <small>{ui.deterministic}</small>
        <div>
          <h3 id="deterministic-examples-title">{ui.customerExampleTitle}</h3>
          <p>{ui.customerExampleBody}</p>
        </div>
      </div>
      <div className={styles.exampleFlow}>
        {stages.map((stage, index) => (
          <Fragment key={stage.key}>
            <article className={styles.exampleTableCard}>
              <header><small>{stage.number}</small><div><strong>{stage.title}</strong><span>{stage.caption}</span></div></header>
              <table>
                <caption>{stage.title} {ui.examples}</caption>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <th scope="row">{row.id}</th>
                      <td>{row[stage.key]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
            {index < stages.length - 1 ? <ArrowRight className={styles.exampleArrow} aria-hidden="true" size={20} /> : null}
          </Fragment>
        ))}
      </div>
    </section>
  );
}

function MarketSignalExamples({ stages, rows, ui }: { stages: readonly ExampleStage[]; rows: readonly ExampleRow[]; ui: typeof trUi }) {
  return (
    <section className={styles.deterministicExamples} aria-labelledby="market-signal-examples-title">
      <div className={styles.exampleIntro}>
        <small>{ui.signalExamples}</small>
        <div>
          <h3 id="market-signal-examples-title">{ui.signalTitle}</h3>
          <p>{ui.signalBody}</p>
        </div>
      </div>
      <div className={styles.exampleFlow}>
        {stages.map((stage, index) => (
          <Fragment key={stage.key}>
            <article className={styles.exampleTableCard}>
              <header><small>{stage.number}</small><div><strong>{stage.title}</strong><span>{stage.caption}</span></div></header>
              <table>
                <caption>{stage.title} {ui.signals}</caption>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <th scope="row">{row.id}</th>
                      <td>{row[stage.key]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
            {index < stages.length - 1 ? <ArrowRight className={styles.exampleArrow} aria-hidden="true" size={20} /> : null}
          </Fragment>
        ))}
      </div>
      <div className={styles.combinedReading}>
        <div className={styles.combinedReadingHeader}>
          <small>{ui.together}</small>
          <strong>{ui.combined}</strong>
        </div>
        <table>
          <caption>{ui.combinedCaption}</caption>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <th scope="row">{row.id}</th>
                <td>{row.reading}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function InsightDecisionExamples({ stages, rows, ui }: { stages: readonly ExampleStage[]; rows: readonly ExampleRow[]; ui: typeof trUi }) {
  return (
    <section className={styles.deterministicExamples} aria-labelledby="insight-decision-examples-title">
      <div className={styles.exampleIntro}>
        <small>{ui.insightExamples}</small>
        <div>
          <h3 id="insight-decision-examples-title">{ui.insightTitle}</h3>
          <p>{ui.insightBody}</p>
        </div>
      </div>
      <div className={styles.exampleFlow}>
        {stages.map((stage, index) => (
          <Fragment key={stage.key}>
            <article className={styles.exampleTableCard}>
              <header><small>{stage.number}</small><div><strong>{stage.title}</strong><span>{stage.caption}</span></div></header>
              <table>
                <caption>{stage.title} {ui.insightCaption}</caption>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <th scope="row">{row.id}</th>
                      <td>{row[stage.key]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
            {index < stages.length - 1 ? <ArrowRight className={styles.exampleArrow} aria-hidden="true" size={20} /> : null}
          </Fragment>
        ))}
      </div>
    </section>
  );
}

function LensPanel({ lens, ui, examples }: { lens: Lens; ui: typeof trUi; examples: ReactNode }) {
  return (
    <>
      <header className={hubStyles.panelHeader}>
        <span>{lens.eyebrow}</span>
        <h2>{lens.title}</h2>
        <p>{lens.body}</p>
      </header>
      <div className={styles.lensQuestion}>
        <small>{ui.coreQuestion}</small>
        <strong>{lens.question}</strong>
      </div>
      <div className={hubStyles.pathGrid}>
        {lens.details.map(([title, description]) => (
          <article key={title} className={hubStyles.pathCard}>
            <h3>{title}</h3>
            <p>{description}</p>
          </article>
        ))}
      </div>
      {examples}
    </>
  );
}

export default function CustomerInsightExperience({ locale, relatedArticles, nextTopics }: { locale: string; relatedArticles: RelatedArticle[]; nextTopics: NextTopic[] }) {
  const normalizedLocale = normalizeEditorialLocale(locale);
  const translation = normalizedLocale === 'tr' ? null : customerInsightTranslations[normalizedLocale];
  const ui = translation?.ui || trUi;
  const activeLenses = translation?.lenses || lenses;
  const activePatternSteps = translation?.patternSteps || patternSteps;
  const activeAssignmentQuestions = translation?.assignmentQuestions || assignmentQuestions;
  const activeCustomerStages = translation?.customerStages || customerExampleStages;
  const activeCustomerRows = translation?.customerRows || customerExampleRows;
  const activeMarketStages = translation?.marketStages || marketSignalStages;
  const activeMarketRows = translation?.marketRows || marketSignalRows;
  const activeInsightStages = translation?.insightStages || insightExampleStages;
  const activeInsightRows = translation?.insightRows || insightExampleRows;
  const activeStarters = translation?.starters || starterIdeas;
  const homeCopy = translation?.home || { eyebrow: '01 · PAZARI DİNLE', title: 'Müşterinin söylediğini değil, kararını biçimlendiren gerilimi oku.', body: 'Pazarlama, çözüm üretmeden önce müşteriyi ve pazarı doğru okuma disiplinidir.' };
  const sectionTitle = normalizedLocale === 'en' ? 'Customer and Market Insight' : normalizedLocale === 'ru' ? 'Клиент и понимание рынка' : 'Müşteri ve Pazar İçgörüsü';
  const assignmentBody = [normalizedLocale === 'en' ? 'Hello Talkinbio,' : normalizedLocale === 'ru' ? 'Здравствуйте, Talkinbio!' : 'Merhaba Talkinbio,', '', ui.fieldTitle, '', ...activeAssignmentQuestions.map((question, index) => `${index + 1}. ${question}:`)].join('\n');
  const assignmentHref = `mailto:info@talkinbio.com?subject=${encodeURIComponent(`${sectionTitle} - ${ui.field}`)}&body=${encodeURIComponent(assignmentBody)}`;
  const localizedCardMeta = Object.fromEntries(cardOrder.map((card) => {
    const translated = translation?.card[card];
    return [card, { ...cardMeta[card], eyebrow: translated?.[0] || cardMeta[card].eyebrow, label: translated?.[1] || cardMeta[card].label }];
  })) as typeof cardMeta;
  const [openCard, setOpenCard] = useState<CardId | null>(null);
  const [idea, setIdea] = useState('');
  const [simulationIdea, setSimulationIdea] = useState('');
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState('');
  const [deepeningStatus, setDeepeningStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) { if (event.key === 'Escape') setOpenCard(null); }
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  async function runSimulation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = idea.trim();
    if (normalized.length < 10) {
      setError(normalizedLocale === 'en' ? 'Describe your idea in a little more detail.' : normalizedLocale === 'ru' ? 'Опишите идею немного подробнее.' : 'Fikrini en az birkaç kelimeyle tarif et.');
      setStatus('error');
      return;
    }
    setStatus('loading');
    setError('');
    setSimulation(null);
    setDeepeningStatus('idle');
    try {
      const response = await fetch('/api/editorial/customer-insight-simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: normalized, locale: normalizedLocale }),
      });
      const data = await response.json();
      if (!response.ok || !data.simulation) throw new Error(data.error || (normalizedLocale === 'en' ? 'The simulation could not be created.' : normalizedLocale === 'ru' ? 'Не удалось создать симуляцию.' : 'Simülasyon oluşturulamadı.'));
      setSimulation(data.simulation as Simulation);
      setSimulationIdea(normalized);
      setStatus('idle');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : (normalizedLocale === 'en' ? 'Something went wrong.' : normalizedLocale === 'ru' ? 'Что-то пошло не так.' : 'Bir şey ters gitti.'));
      setStatus('error');
    }
  }

  async function copyForClaude() {
    if (!simulation) return;
    try {
      await copyText(`${buildClaudeDeepeningPrompt(simulationIdea, simulation)}\n\n${normalizedLocale === 'en' ? 'Conduct the entire exercise in natural English.' : normalizedLocale === 'ru' ? 'Проведи всё упражнение на естественном русском языке.' : 'Çalışmanın tamamını Türkçe yürüt.'}`);
      setDeepeningStatus('copied');
    } catch {
      setDeepeningStatus('error');
    }
  }

  function renderPanelBody(card: CardId): ReactNode {
    if (card === 'customer') return <LensPanel lens={activeLenses.customer as unknown as Lens} ui={ui} examples={<DeterministicCustomerExamples stages={activeCustomerStages as unknown as readonly ExampleStage[]} rows={activeCustomerRows as unknown as readonly ExampleRow[]} ui={ui} />} />;
    if (card === 'market') return <LensPanel lens={activeLenses.market as unknown as Lens} ui={ui} examples={<MarketSignalExamples stages={activeMarketStages as unknown as readonly ExampleStage[]} rows={activeMarketRows as unknown as readonly ExampleRow[]} ui={ui} />} />;
    if (card === 'insight') return <LensPanel lens={activeLenses.insight as unknown as Lens} ui={ui} examples={<InsightDecisionExamples stages={activeInsightStages as unknown as readonly ExampleStage[]} rows={activeInsightRows as unknown as readonly ExampleRow[]} ui={ui} />} />;

    if (card === 'pattern') {
      return (
        <>
          <header className={hubStyles.panelHeader}>
            <span>{ui.patternKicker}</span>
            <h2>{ui.patternTitle}</h2>
            <p>{ui.patternBody}</p>
          </header>
          <div className={hubStyles.frameworkGrid}>
            {activePatternSteps.map(([number, title, description]) => (
              <div key={number} className={hubStyles.frameworkStep}>
                <strong><span>{number}</span>{title}</strong>
                <p>{description}</p>
              </div>
            ))}
          </div>
          <div className={hubStyles.manifesto}>
            <p>{ui.manifesto}</p>
            <span className={hubStyles.manifestoClaim}>{activePatternSteps.map(([, title]) => title).join(' → ')}</span>
          </div>
          <section className={styles.assignmentCard} aria-labelledby="market-listening-assignment-title">
            <div className={styles.assignmentCopy}>
              <small>{ui.field}</small>
              <h3 id="market-listening-assignment-title">{ui.fieldTitle}</h3>
              <p>{ui.fieldBody}</p>
              <a href={assignmentHref} className={styles.assignmentMailLink}>
                <Mail aria-hidden="true" size={15} />
                {ui.send}
              </a>
            </div>
            <ol className={styles.assignmentQuestions}>
              {activeAssignmentQuestions.map((question, index) => (
                <li key={question}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <p>{question}</p>
                </li>
              ))}
            </ol>
          </section>
        </>
      );
    }

    if (card === 'simulation') {
      return (
        <>
          <header className={hubStyles.panelHeader}>
            <span>{ui.simulationKicker}</span>
            <h2>{ui.simulationTitle}</h2>
            <p>{ui.simulationBody}</p>
          </header>
          <form className={styles.simulatorForm} onSubmit={runSimulation}>
            <label htmlFor="business-idea">{ui.idea}</label>
            <textarea id="business-idea" value={idea} onChange={(event) => setIdea(event.target.value)} maxLength={500} placeholder={ui.placeholder} />
            <div className={styles.ideaStarters}>
              {activeStarters.map((starter) => <button type="button" key={starter} onClick={() => setIdea(starter)}>{starter}</button>)}
            </div>
            <div className={styles.simulatorActions}>
              <span>{idea.length}/500</span>
              <button type="submit" disabled={status === 'loading'}>
                {status === 'loading' ? <Loader2 className={styles.spinner} aria-hidden="true" size={16} /> : <Sparkles aria-hidden="true" size={16} />}
                {status === 'loading' ? ui.building : ui.simulate}
              </button>
            </div>
            {status === 'error' ? <p className={styles.simulatorError} role="alert">{error}</p> : null}
          </form>
          {status === 'loading' ? <p className={styles.simulatorStatus} aria-live="polite">{ui.loading}</p> : null}
          {simulation ? (
            <div className={styles.simulationResult} aria-live="polite">
              <div className={styles.sceneCard}><small>{ui.scene}</small><p>{simulation.scene}</p></div>
              <div className={styles.resultGrid}>
                <article><small>01 · {ui.understand}</small><h3>{simulation.customer.visible}</h3><dl><div><dt>{ui.underlying}</dt><dd>{simulation.customer.underlying}</dd></div><div><dt>{ui.tension}</dt><dd>{simulation.customer.tension}</dd></div></dl></article>
                <article><small>02 · {ui.listen}</small><h3>{simulation.market.signals[0]}</h3><dl><div><dt>{ui.otherSignals}</dt><dd>{simulation.market.signals.slice(1).join(' · ')}</dd></div><div><dt>{ui.alternative}</dt><dd>{simulation.market.alternative}</dd></div><div><dt>{ui.change}</dt><dd>{simulation.market.change}</dd></div></dl></article>
                <article><small>03 · {ui.develop}</small><h3>{simulation.insight.pattern}</h3><dl><div><dt>{ui.decision}</dt><dd>{simulation.insight.decision}</dd></div><div><dt>{ui.firstTest}</dt><dd>{simulation.insight.test}</dd></div></dl></article>
              </div>
              <div className={styles.turningPoint}>
                <div><small>{ui.turning}</small><strong>{simulation.turningPoint}</strong></div>
                <button type="button" onClick={() => { setSimulation(null); setSimulationIdea(''); setDeepeningStatus('idle'); }}><RotateCcw aria-hidden="true" size={14} /> {ui.tryAgain}</button>
              </div>
              <div className={styles.deepenCard}>
                <div><small>{ui.continue}</small><strong>{ui.deepenTitle}</strong><p>{ui.deepenBody}</p></div>
                <div className={styles.deepenAction}>
                  <a href="https://claude.ai/new" target="_blank" rel="noreferrer" onClick={() => { void copyForClaude(); }}>
                    {deepeningStatus === 'copied' ? <Check aria-hidden="true" size={16} /> : <Sparkles aria-hidden="true" size={16} />}
                    {deepeningStatus === 'copied' ? ui.copied : ui.deepen}
                    <ExternalLink aria-hidden="true" size={14} />
                  </a>
                  <p className={deepeningStatus === 'error' ? styles.deepenError : ''} aria-live="polite">{deepeningStatus === 'copied' ? ui.paste : deepeningStatus === 'error' ? ui.copyError : ui.newTab}</p>
                </div>
              </div>
              <p className={styles.aiDisclaimer}>{ui.disclaimer}</p>
            </div>
          ) : null}
        </>
      );
    }

    if (card === 'articles') {
      return (
        <>
          <header className={hubStyles.panelHeader}><span>{ui.articlesKicker}</span><h2>{relatedArticles.length ? ui.articlesTitle : ui.unavailableTitle}</h2><p>{relatedArticles.length ? ui.articlesBody : ui.unavailableBody}</p></header>
          <div className={hubStyles.articleGrid}>
            {relatedArticles.map((article) => <Link key={article.slug} href={`/articles/${article.slug}`} className={hubStyles.articleCard}><small>{article.eyebrow} · {article.readingTime}</small><h3>{article.title}</h3></Link>)}
          </div>
        </>
      );
    }

    return (
      <>
        <header className={hubStyles.panelHeader}><span>{ui.nextKicker}</span><h2>{ui.nextTitle}</h2><p>{ui.nextBody}</p></header>
        <div className={styles.nextTopicGrid}>
          {nextTopics.map((topic) => <Link key={topic.slug} href={`/topics/${topic.slug}`} className={styles.nextTopicCard}><small>{topic.number} · {topic.shortTitle.toUpperCase()}</small><strong>{topic.title}</strong><p>{topic.question}</p><ArrowRight aria-hidden="true" size={16} /></Link>)}
        </div>
      </>
    );
  }

  return (
    <div className={hubStyles.page} data-revealed="true">
      <video className={hubStyles.media} src={IMMERSIVE_VIDEO.layer} autoPlay muted playsInline preload="auto" />
      <div className={hubStyles.scrim} aria-hidden="true" />
      <svg className={hubStyles.line} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M69,8 C84,1 96,2 97,7 C98,14 78,22 79,29 C80,36 99,39 98,46 C97,53 75,54 69,59 C64,64 87,66 84,72 C82,77 99,79 98,84" /></svg>
      <Link href="/" className={hubStyles.logo} aria-label={ui.homeLabel}><span>talkinbio</span></Link>
      <div className={hubStyles.homeScreen} aria-hidden={Boolean(openCard)} data-hidden={Boolean(openCard)}>
        <div className={hubStyles.homeCopy}><span>{homeCopy.eyebrow}</span><h1>{homeCopy.title}</h1><p>{homeCopy.body}</p></div>
        <div className={hubStyles.cardField} aria-label={ui.fieldLabel}>
          {cardOrder.map((card) => <button key={card} type="button" className={hubStyles.card} style={localizedCardMeta[card].style} onClick={() => setOpenCard(card)}><small>{localizedCardMeta[card].eyebrow}</small><span>{localizedCardMeta[card].label}</span></button>)}
        </div>
      </div>
      {openCard ? <button type="button" className={hubStyles.backdrop} aria-label={ui.backLabel} onClick={() => setOpenCard(null)} /> : null}
      <article className={hubStyles.panel} data-open={Boolean(openCard)} aria-hidden={!openCard}>
        <div className={hubStyles.panelScroll}><button type="button" className={hubStyles.panelBack} onClick={() => setOpenCard(null)}><ArrowLeft aria-hidden="true" size={15} /> {sectionTitle}</button>{openCard ? renderPanelBody(openCard) : null}</div>
      </article>
    </div>
  );
}
