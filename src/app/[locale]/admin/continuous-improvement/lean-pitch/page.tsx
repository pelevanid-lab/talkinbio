'use client';

import AdminLayout from '@/components/AdminLayout';
import ContinuousImprovementTabs from '@/components/ContinuousImprovementTabs';
import { useState } from 'react';
import {
  Mic, Users, TrendingUp, Lightbulb, Briefcase,
  ChevronRight, ChevronLeft, LayoutGrid, Quote,
  AlertTriangle, Target, DollarSign, Rocket, BarChart2,
  CheckCircle2, XCircle, Shield,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* DATA — Tüm rakamlar Fermi V.2 ve Çekim Gücü Yol Haritası V.2       */
/* ile eşleşmektedir. Değiştirilmeden önce bu dosyaları kontrol et.    */
/*                                                                      */
/* Konumlanma (2026-08-01): ürün artık "DM otomasyonu / chatbot"      */
/* değil, "ziyaretçinin sorusuna göre doğru sayfayı açan site".       */
/* Tek-segment (solo diyetisyen) beachhead kısıtı ve "ücretsiz deneme */
/* yok" kararı kurucu tarafından geçersiz kılındı — ürün Free         */
/* katmanla ve çok sektörlü konumlandırılıyor.                        */
/*                                                                      */
/* Pazar zinciri (Fermi V.2, DM-özel filtre kaldırıldığı için V.1'e   */
/* göre bir adım kısa):                                                */
/*   62M IG kullanıcısı (TR) × %2,4 satıcı = 1,5M                    */
/*   1,5M × %5 ödeme yapabilir ≈ 30K adreslenebilir TR                */
/*   Global (MENA+LatAm benzer zincir): +120K → toplam ~150K          */
/*                                                                      */
/* Fiyat — GERÇEK KOD (src/config/plans.ts), abonelik değil kredi     */
/* paketi: Free $0→20 kredi · Starter $20→400 · Pro $90→2.000 ·       */
/* Business $400→10.000 · Ek paket $5→100. Dolar-sabit; TL tahsilat   */
/* güncel kur üzerinden (Shopier entegrasyonu, kod doğrulandı).        */
/*                                                                      */
/* Yıllık müşteri değeri: ort. ilk paket ~$53 (Starter-ağırlıklı      */
/* karma varsayımı) × yılda 2 tekrar-alım (ÖLÇÜLMEDİ, varsayım) =     */
/* ~$106/yıl. Bu, eski V.1'in "efektif ARPU $15/ay" rakamının yerini  */
/* alıyor; eski rakamın koda hiçbir zaman karşılığı yoktu.             */
/* ------------------------------------------------------------------ */

const elevatorPitch = {
  tr: `Bio linkindeki her ziyaretçi aynı statik listeyi görür — ne aradığı fark etmez. Sorusu olan biri ya DM'e yazar ya da sayfada kaybolup çıkar.

Türkiye'de sosyal medyadan müşteri kazanan yaklaşık 1,5 milyon bireysel satıcı var — koçlar, güzellik uzmanları, danışmanlar, mimarlar, marka sahipleri. Hepsinin sayfası aynı sorunu yaşıyor: link listesi ziyaretçiye göre açılmıyor.

talkinbio bunu değiştirir. Ziyaretçi soru sorduğunda sayfa cevabın olduğu bölüme açılır — hizmet, fiyat, randevu, ne ise. Uzun bir sohbet metni değil, gerçek bir sayfa görür.

Ücretsiz başla — 20 kredilik ilk deneyimle kendin gör. Beğenirsen $20'dan başlayan kredi paketleriyle devam et. Abonelik yok, sadece ihtiyacın oldukça yüklediğin bir bakiye.`,
  en: `Every visitor to your bio link sees the same static list — no matter what they're looking for. Someone with a question either messages you directly or scrolls around and leaves.

Roughly 1.5 million individual sellers in Turkey alone gain customers through social media — coaches, beauty professionals, consultants, architects, brand owners. All of them share the same problem: their page doesn't open differently for each visitor.

talkinbio changes that. When a visitor asks a question, the page opens to wherever the answer lives — the service, the price, the booking step. Not a wall of chat text — an actual page.

Start free — try it with 20 credits. Then continue with credit packs starting at $20. No subscription, just a balance you top up when you need it.`,
};

/* ------------------------------------------------------------------ */
/* Perspective cards — her kart kendi kitlesinin diline konuşur        */
/* ------------------------------------------------------------------ */

const perspectives = [
  {
    id: 'customer',
    label: 'Müşteri Konuşması',
    icon: Users,
    color: 'blue',
    audience: 'Instagram/WhatsApp üzerinden hizmet veya ürün satan bireysel işletme sahibi',
    hook: '"Sayfanı ziyaret eden biri aradığını bulamayınca DM\'ine mi yazıyor, yoksa çıkıp mı gidiyor?"',
    context: 'Hedef müşteri: koç, güzellik uzmanı, danışman, mimar, eğitmen, marka sahibi — tek segment kısıtı yok (2026-08-01 kararı). Ortak nokta: bio linki var ama link listesi statik, ziyaretçi ne aradığını sayfada arayarak bulmak zorunda.',
    problem: "Linktree yalnızca link gösterir; hangi linkin ziyaretçinin sorusuna cevap olduğunu ziyaretçi kendisi bulmalı. Cevap bulamayınca ya DM'e yazıyor (takip edilemiyor) ya da sayfadan çıkıyor. CRM'ler çok karmaşık ve pahalı.",
    solution: 'talkinbio, bio sayfanı ziyaretçiye göre açılan bir sayfaya dönüştürür. Ziyaretçi soru sorduğunda sayfa cevabın olduğu bölüme (hizmet, fiyat, randevu) geçer — uzun bir sohbet metni değil, gerçek bir sayfa görür. İlk 20 kredi ücretsiz.',
    cta: '"Ücretsiz başla — 20 kredilik ilk deneyimi kendin gör. Beğenirsen $20\'dan (TL karşılığı kur üzerinden) başlayan kredi paketleriyle devam et, abonelik yok."',
    objection: '"Benim için çok karmaşık gibi görünüyor." → Kurulum sohbetle yapılıyor: kod yok, form yok, teknik bilgi gerekmiyor.',
    secondObjection: '"Ücretsiz deneyip bırakırsam ne olur?" → Kredi bitince sayfan kapanmaz, yayında kalır — sadece sohbet "mesaj bırakın" moduna geçer.',
  },
  {
    id: 'investor',
    label: 'Yatırımcı Konuşması',
    icon: DollarSign,
    color: 'emerald',
    audience: "Erken aşama bootstrapped SaaS'a bakan melek yatırımcı veya mikro-VC",
    hook: "\"TR'de ~$223K/yıl tavanı olan, kasıtlı muhafazakâr modellenmiş bir başlangıç noktası — fiyatlandırma yakın zamanda gerçek koda oturtuldu, asıl hikâye v2'de.\"",
    context: 'Şu an Aşama 1 (Problem/Çözüm Uyumu). Bootstrapped, tek kurucu. Hedef: ilk 10 ödeme yapan müşteri → ~$100K/yıl doğrulaması → v2 öncesi yatırımcı konuşması.',
    problem: "Türkiye'de sosyal medya üzerinden aktif satış yapan ~1,5 milyon bireysel satıcı var. Bio sayfaları statik link listesi (Linktree) ya da hiç yok. Ziyaretçiyi doğru bilgiye/adıma yönlendiren bir katman kategori olarak henüz tanımlanmamış.",
    solution: 'talkinbio bu boşluğun ilk ürünü: ziyaretçinin sorusuna göre açılan sayfa + konuşarak kurulum. Gelir: abonelik değil kredi cüzdanı — Free (20 kredi) → Starter $20/400kr → Pro $90/2.000kr → Business $400/10.000kr. Varsayımsal yıllık müşteri değeri ~$106 — tekrar-alım sıklığı henüz ölçülmedi, bu açık bir madde.',
    cta: "TR'de P/Ç Uyumu (10 müşteri → ~950 müşteri → ~$100K/yıl eşiği). Sonraki adım v2 (WA+IG DM) ile MENA+LatAm: global adreslenebilir ~150K, baz senaryo ~4.500 müşteri = ~$477K/yıl, stretch ~9.000 müşteri = ~$954K/yıl. ~$100K/yıl doğrulamasında sizi bilgilendiririm.",
    objection: '"TR pazarı çok küçük." → TR tavanı (~$223K/yıl) kasıtlı muhafazakâr modellendi. Doğrulama zemini, ölçek zemini değil. v2 kanallarla asıl hitap globaldir.',
    secondObjection: '"Tek kurucu riski + henüz hiç ödeyen müşteri yok?" → Doğru, bugün 0/10. Strateji belgelerindeki fiyatlar da yakın zamana kadar gerçek koddan kopuktu — bu düzeltildi; sıradaki adım gerçek müşteri kanıtı.',
  },
  {
    id: 'advisor',
    label: 'Danışman Konuşması',
    icon: Lightbulb,
    color: 'purple',
    audience: 'Metodoloji, pazar veya teknik konularda rehberlik edecek danışman/mentor',
    hook: '"Running Lean sürecini uyguluyoruz, ama Kanvas ile kod arasında iki ciddi sapma bulduk: fiyatlar kurgusaldı, konumlanma yanlış katmandaydı. İkisi de düzeltildi — şimdi sıfır müşteri kanıtıyla yeniden başlıyoruz."',
    context: 'Şu an Aşama 1 başlangıcı. OMTM: ödeme yapan müşteri sayısı. Sayaç 0/10. 2026-08-01\'de konumlanma da değişti: "DM chatbotu" değil "ziyaretçiye göre açılan sayfa."',
    problem: 'Bireysel hizmet sahipleri için araç yelpazesi iki uçta: ya çok basit (Linktree — link gösterir, yönlendirmez) ya çok karmaşık (CRM). "Ziyaretçiye göre açılan sayfa" kategorisi tanımlanmamış.',
    solution: 'Süreç: 20 problem görüşmesi → Free katmanla başlayan pilot → concierge kurulum + 30 gün aktif kullanım → build/pivot/devam kararı. Doğrulanan yalnızca: birim maliyet ölçümleri ($0,026/mesaj, $0,121/güncelleme, $0,147/kurulum). Doğrulanmamış: viral imza dönüşümü (bugün imza metni teknik olarak boş), $20 giriş fiyatının kabulü, ~$106/yıl varsayımının arkasındaki tekrar-alım oranı.',
    cta: 'Danışmanlık ihtiyacı: (a) Free katmandan ilk ödemeye geçiş oranı gerçekçi mi? (b) Widget imzası düzeltilip ölçülene kadar CAC organik kalabilir mi? (c) Kredi cüzdanı modelinde "tekrar-alım sıklığı" varsayımını doğrulamanın en hızlı yolu ne?',
    objection: '"Problem görüşmelerini neden 20 ile sınırladın?" → Pazar homojen ve küçük; 20\'de tekrar eden acı nokta netleşmezse sayıyı artıracağım.',
    secondObjection: '"Konumlanmayı bu kadar geç mi değiştirdiniz?" → Evet — ilk sürüm DM/chatbot çerçevesini öne çıkarıyordu, ürünün asıl farkı (sayfanın kendisinin değişmesi) arka planda kalmıştı. Gecikmiş bir düzeltmeydi, erken bir tercih değil.',
  },
  {
    id: 'pitch',
    label: 'İş Modeli Özeti',
    icon: Briefcase,
    color: 'amber',
    audience: 'Hızlı değerlendirme yapan herhangi bir iş muhatabı',
    hook: '"1,5M potansiyel satıcı, link listesi dışında neredeyse hiçbir araç yok. talkinbio ziyaretçiye göre açılan sayfayı sunan ilk ürün."',
    context: "Türkiye'de ~1,5 milyon sosyal medya satıcısı var. Adreslenebilir alt küme (ödeme kapasiteli): ~30K TR, ~120K global (MENA+LatAm benzer zincir).",
    problem: 'Bio sayfaları statik link listesi. Ziyaretçi ne aradığını bulamayınca ya DM\'e yazıyor (takip edilemiyor) ya da çıkıp gidiyor. Linktree link verir, CRM\'ler çok karmaşık.',
    solution: 'talkinbio = ziyaretçinin sorusuna göre açılan sayfa + konuşarak kurulum. Fiyat: abonelik değil kredi cüzdanı — Free (20 kredi) → Starter $20 (400 kredi) → Pro $90 (2.000 kredi) → Business $400 (10.000 kredi). Dolar-sabit, TL tahsilat kur üzerinden.',
    cta: 'Aşama 1: 10 ödeme yapan müşteri (manuel satış + pilot). Kırılma noktaları: ~950 müşteri (~$100K/yıl) → ~4.500 müşteri (~$477K/yıl, v2 global). Bugün: sayaç 0/10.',
    objection: '"Rakipler?" → Linktree link paylaşır, büyük CRM\'ler aşırı karmaşık. talkinbio "ziyaretçiye göre açılan sayfa" kategorisini tanımlıyor.',
    secondObjection: '"Neden şimdi?" → Sosyal medyadan gelen trafik satıcılar için yönetilemez bir DM hacmine ulaştı; ziyaretçiyi kendi başına doğru yere yönlendiren bir sayfa artık gerekli.',
  },
];

/* ------------------------------------------------------------------ */
/* 10 Slide Deck — her slayt tek soruya cevap verir                    */
/* ------------------------------------------------------------------ */

const slides = [
  {
    num: 1,
    title: 'Vizyon & Değer Teklifi',
    icon: Rocket,
    content: '"Ziyaretçiye göre açılan web siten." — Bio linkine gelen her ziyaretçi aynı statik listeyi görmek yerine, sorduğu soruya göre doğru sayfaya yönlendirilir.',
    detail: 'UVP tek cümle, somut davranış üzerine kurulu: ziyaretçi soru sorar, sayfa cevabın olduğu yere açılır. Habersiz bir ziyaretçi 5 saniyede ne kazandığını anlamalı. "Ziyaretçiye göre açılan sayfa" kategori adı yeni — sahiplenilmesi gereken bir boşluk.',
    maurya: '"Değer teklifinizi test etmenin en ucuz yolu: yabancı birine söyle, gözlerinde anlam görüyor musun? Eğer açıklamak zorunda kalıyorsan, mesaj bulanık."',
    keyMetric: null,
    risk: null,
  },
  {
    num: 2,
    title: 'Sorun',
    icon: AlertTriangle,
    content: 'Bio sayfası ziyaretçisinin acı noktası: (1) Ne aradığını bulamıyor, link listesinde geziniyor. (2) Sorusu varsa DM\'e yazıyor — cevap gecikirse gidiyor. (3) İşletme sahibi hangi sorunun/içeriğin lead getirdiğini bilmiyor.',
    detail: 'Bu sorunu yaşayan ~1,5M satıcı TR\'de var (adreslenebilir alt küme ~30K). Mevcut çözümler: Linktree (link paylaşır, yönlendirmez), CRM (pahalı, karmaşık). Problem görüşmelerinde (0/20) bu noktaların tekrar edip etmediği doğrulanacak.',
    maurya: '"Sorun gerçekse müşteri halihazırda geçici çözümler üretmiştir. O geçici çözümleri sor — mevcut alternatifler listende onlar var."',
    keyMetric: 'Doğrulanmamış: ziyaretçinin "aradığını bulamama" anındaki terk oranı',
    risk: 'Sorun sert değil, "rahatsızlık" olarak algılanıyorsa ödeme olmaz',
  },
  {
    num: 3,
    title: 'Müşteri Segmenti & Erken Benimseyenler',
    icon: Users,
    content: 'Birincil: Türkiye\'de Instagram/WhatsApp üzerinden aktif hizmet/ürün satan bireysel satıcı (~1,5M) — danışman, koç, kuaför, mimar, eğitmen, marka sahibi. Tek segment kısıtı yok (2026-08-01 kararı); erken benimseyen ortak özellik: sayfası "sadece link listesi", ziyaretçi sorularını manuel takip ediyor.',
    detail: 'Fermi zinciri: 62M TR IG kullanıcısı × %2,4 satıcı = 1,5M → ×%5 ödeyebilen ≈ 30K adreslenebilir TR (DM-özel filtre kaldırıldı, segment artık daha geniş). Global (MENA+LatAm benzer zincir): +120K → toplam ~150K adreslenebilir.',
    maurya: '"Erken benimseyeni herkes yapmak, kimse yapmamaktır. Bir isim, bir meslek, bir spesifik acı nokta — bu kadar."',
    keyMetric: 'TR adreslenebilir: ~30K / Global: ~150K',
    risk: '%5 ödeme kapasitesi varsayımı hâlâ doğrulanmadı; gerçek oran düşerse TAM küçülür',
  },
  {
    num: 4,
    title: 'Benzersiz Değer Teklifi (UVP)',
    icon: Target,
    content: '"Ziyaretçiye göre açılan web siten." Rakiplerden fark: Linktree link paylaşır (yönlendirmez), CRM\'ler karmaşık (teknik bilgi ister). talkinbio ikisi arasındaki boşluğu, "sayfanın kendisi değişiyor" fikriyle dolduruyor.',
    detail: 'Üst düzey konsept: "Statik Linktree\'nin, ziyaretçiye göre açılan hali." Ana ürün/pazar hipotezi: "Ziyaretçi doğru yere kendiliğinden yönlendirildiğinde daha fazla lead\'e/randevuya dönüşür." Bu hipotez henüz ölçülmedi (Aşama 2\'de kohort analiziyle test edilecek).',
    maurya: '"UVP ürününü değil, müşteri sonucunu satmalı. \'AI widget\' değil \'doğru sayfanın kendiliğinden açılması\' — fark bu."',
    keyMetric: 'Landing demo → erişim talebi dönüşüm oranı (admin/analytics canlı ölçülüyor)',
    risk: 'UVP anlaşılmazsa kurulum başlamaz; "sayfa açılıyor" davranışı bugün asistan tarafında henüz uygulanmadı (roadmap)',
  },
  {
    num: 5,
    title: 'Çözüm',
    icon: Mic,
    content: 'Bugün: blok tıklaması ziyaretçiyi ilgili bölüme (tam sayfa "sahne" + geri butonu) götürüyor — bu çalışıyor. Asistanın SORUYA bakıp doğru bloğu kendisi açması henüz yapılmadı, yol haritasının bir sonraki adımı. Kurulum sohbetle: işletme sahibiyle röportaj yapan agent bloklar halinde kurar, içeriği tr/en/ru\'da üretir.',
    detail: 'v1 kapsamı: web widget, sohbetle kurulum, lead listesi, temel analytics, blok bazlı sayfa. v2 kapsamı: WA Business API + IG DM, MENA/LatAm lokalizasyon. Birim maliyet: $0,026/mesaj (gerçek ölçüm, 2026-07-16). Kredi maliyeti bugün kodda: mesaj 1 kredi / güncelleme 6 / kurulum 10 (src/agents/shared/limits.ts) — gerçek maliyet oranıyla tam örtüşmüyor, kalibrasyon açık madde.',
    maurya: '"Çözümü üç özellikle sınırla; fazlası odak kaybı. Her özellik bir Kanvas sorununa bağlı olmalı."',
    keyMetric: 'Gerçek ölçüm: $0,026/mesaj · kredi maliyeti henüz tam kalibre değil',
    risk: 'Asistanın soruya göre sayfa açması (ürünün ana vaadi) henüz kodda yok — landing bunu göstermeden vaat anlaşılmaz',
  },
  {
    num: 6,
    title: 'Gelir Modeli',
    icon: DollarSign,
    content: 'Kredi cüzdanı (abonelik değil): Free $0 (20 kredi) · Starter $20 (400 kredi) · Pro $90 (2.000 kredi) · Business $400 (10.000 kredi) · Ek paket $5 (100 kredi). Fiyat dolar-sabit; TL tahsilat güncel kur üzerinden (Shopier entegrasyonu, kod doğrulandı).',
    detail: 'Ort. ilk paket değeri ~$53 (Starter-ağırlıklı karma varsayımı). Yıllık tekrar-alım sıklığı HİÇ ölçülmedi — burada yılda 2 varsayılıyor → ~$106/yıl varsayımsal müşteri değeri. 1 kredi=$0,05; AI üretimi gerçek maliyetin 2 katına satılıyor (creditsForCost). Kredi bitince sayfa kapanmaz, "mesaj bırakın" moduna düşer.',
    maurya: '"Fiyat değer hipotezinin testidir." (Not: Free katman artık var — 20 kredilik ilk deneyim taahhüt ölçmez ama denemeyi kolaylaştırır; asıl taahhüt testi ilk ödenen pakettir.)',
    keyMetric: 'Ort. ilk paket ~$53 · Varsayımsal yıllık değer ~$106 (ölçülmedi)',
    risk: 'Tekrar-alım sıklığı varsayımı (yılda 2×) hiç test edilmedi — gerçek oran 1\'e düşerse tüm senaryolar yarıya iner',
  },
  {
    num: 7,
    title: 'Pazar Boyutu (Fermi)',
    icon: BarChart2,
    content: 'TR adreslenebilir: ~30K satıcı. TR yıllık gelir senaryoları: Kötümser %1 = ~$32K · Orta %3 = ~$95K · İyimser TR tavanı %7 (2.100 müşteri) = ~$223K. v2 Global (baz %3): ~4.500 müşteri = ~$477K/yıl. v2 Stretch (%6): ~9.000 müşteri = ~$954K/yıl.',
    detail: 'Fermi zinciri: 62M TR IG × %2,4 satıcı = 1,5M → × %5 ödeyebilir = ~30K (DM-özel filtre kaldırıldığı için zincir V.1\'e göre bir adım kısaldı). Global: aynı zincir MENA+LatAm için ek ~120K → toplam ~150K. Cal.com benchmarkı: 60K ödeme yapan, $5M ARR — referans tempo.',
    maurya: '"Pazar boyutunu bir zincir olarak sun. Her halkayı savunabilmelisin. \'150M sosyal medya kullanıcısı var\' bir pazarlık değil, bir kaçış."',
    keyMetric: 'TR tavan ~$223K/yıl · Global baz ~$477K/yıl · Global stretch ~$954K/yıl',
    risk: '%5 ödeme istekliliği VE yılda-2-tekrar-alım varsayımı — iki bağımsız tahmin çarpılıyor, ikisi de ölçülmedi',
  },
  {
    num: 8,
    title: 'Çekim Gücü & Güncel Metrikler',
    icon: TrendingUp,
    content: 'Şu an: Aşama 1 — Problem/Çözüm Uyumu. OMTM: ödeme yapan müşteri. Sayaç: görüşme 0/20 · ücretli pilot 0/10 · ödeme 0/10. Kırılma noktaları: 10 ödeme → ~950 müşteri (~$100K/yıl) → ~4.500 müşteri (~$477K/yıl baz).',
    detail: 'Doğrulanmış yalnızca: birim maliyet ölçümleri ($0,026/mesaj, $0,121/güncelleme, $0,147/kurulum). Doğrulanmamış: viral imza dönüşümü (bugün imza metni teknik olarak boş — önce düzeltilmesi lazım), $20 giriş fiyatının kabulü, tekrar-alım sıklığı, asistanın soruya göre sayfa açma davranışının (ürünün ana vaadi) gerçek ziyaretçilerde çalışması.',
    maurya: '"Çekim, tahmin değil kanıttır. Meraklı kullanıcılar değil, ödeme yapan müşteriler sayılır. Her diğer metrik vanity."',
    keyMetric: 'Doğrulanmış: $0,026/mesaj · Doğrulanmamış: viral dönüşüm, tekrar-alım oranı, ana ürün davranışı',
    risk: 'İmza döngüsü çalışmıyor (bug) → CAC organik kalmaz; ücretli kanal gerekirse <$100 CAC TR\'de zordur',
  },
  {
    num: 9,
    title: 'Haksız Avantaj',
    icon: Lightbulb,
    content: '1. Widget imzası = potansiyel viral döngü — ama bugün metni boş, çalışmıyor (önce düzeltilmeli). 2. Konuşma verisi birikimi: asistan ne kadar kullanılırsa o kadar özelleşir. 3. Blok-tabanlı sayfa mimarisi zaten çok dilli (tr/en/ru) — MENA/LatAm lokalizasyonu mimari değişiklik değil, dil paketi eklemek.',
    detail: 'Kopyalanamayan şey: ürünün kendisi değil, kullanıcı konuşma verisi + (düzeltildiğinde) viral büyüme döngüsünün bileşimi. Bugün bu avantajların ikisi de "inşa edilen süreç" — biri henüz çalışmıyor, diğeri henüz birikmedi.',
    maurya: '"Haksız avantaj bugün sahip olduğun şey değil, başkalarının yarın sahip olamayacağı şey. Ama o zamana kadar hız ve niş yeterlidir."',
    keyMetric: 'Widget imza dönüşüm oranı — ölçülemez, çünkü imza metni boş',
    risk: 'Linktree veya büyük bir oyuncu "ziyaretçiye göre açılan sayfa" fikrini fark ederse hızla kopyalar; hız tek savunma',
  },
  {
    num: 10,
    title: 'Çağrı (Call to Action)',
    icon: Target,
    content: 'Aşama 1 için: 10 ödeme yapan müşteri. Free katmanla başla, concierge pilotla destekle, 30 gün aktif kullanım → kredi tükenince paket satın alıyor mu? Sonuç: devam/pivot/dur.',
    detail: 'Müşteri çağrısı: "Ücretsiz dene, 20 kredi. Beğenirsen $20\'dan devam et." Yatırımcı çağrısı: "~$100K/yıl doğrulamasında bilgilendiririm — v2 öncesi konuşalım." Danışman çağrısı: "Tekrar-alım oranını en hızlı nasıl ölçeriz?" Bugünkü somut adım: 20 problem görüşmesi planla, ilk 5\'ini bu hafta yap; widget imza metnini doldur.',
    maurya: '"Her sunumun sonunda net bir adım ol. Tarih yok, isim yok, somut eylem yok — o konuşma olmamış sayılır."',
    keyMetric: 'Hedef: 10 ödeme · 950 müşteri = ~$100K/yıl · 4.500 = ~$477K/yıl',
    risk: 'Pilot müşteri bulamazsan problem var demektir — ürün değil, sorun doğrulaması önce gelir',
  },
];

/* ------------------------------------------------------------------ */
/* Sub-components                                                        */
/* ------------------------------------------------------------------ */

const colorMap: Record<string, { bg: string; border: string; badge: string; icon: string; quote: string; audienceBg: string }> = {
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
    icon: 'text-blue-600',
    quote: 'text-blue-800 bg-blue-100 border-blue-300',
    audienceBg: 'bg-blue-100 text-blue-700',
  },
  emerald: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700',
    icon: 'text-emerald-600',
    quote: 'text-emerald-800 bg-emerald-100 border-emerald-300',
    audienceBg: 'bg-emerald-100 text-emerald-700',
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    badge: 'bg-purple-100 text-purple-700',
    icon: 'text-purple-600',
    quote: 'text-purple-800 bg-purple-100 border-purple-300',
    audienceBg: 'bg-purple-100 text-purple-700',
  },
  amber: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-700',
    icon: 'text-amber-600',
    quote: 'text-amber-800 bg-amber-100 border-amber-300',
    audienceBg: 'bg-amber-100 text-amber-700',
  },
};

function PerspectiveCard({ p }: { p: typeof perspectives[0] }) {
  const c = colorMap[p.color];
  const Icon = p.icon;

  return (
    <div className={`rounded-2xl border ${c.border} bg-white flex flex-col gap-0 overflow-hidden`}>
      {/* Card Header */}
      <div className={`${c.bg} px-5 py-4 flex items-start gap-3 border-b ${c.border}`}>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-white border ${c.border} shrink-0`}>
          <Icon className={`w-4 h-4 ${c.icon}`} />
        </div>
        <div className="flex-1 min-w-0">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${c.badge}`}>{p.label}</span>
          <p className={`text-[11px] mt-1.5 font-medium ${c.audienceBg} px-2 py-1 rounded-md`}>{p.audience}</p>
        </div>
      </div>

      <div className="p-5 flex flex-col gap-4">
        {/* Hook */}
        <blockquote className={`text-sm font-semibold italic leading-relaxed border-l-3 pl-4 border ${c.quote} rounded-r-xl p-3`}>
          {p.hook}
        </blockquote>

        {/* Context */}
        <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Bağlam / Durum</p>
          <p className="text-xs text-slate-600 leading-relaxed">{p.context}</p>
        </div>

        {/* Problem */}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1.5">Problem Çerçevesi</p>
          <p className="text-sm text-slate-700 leading-relaxed">{p.problem}</p>
        </div>

        {/* Solution */}
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1.5">Çözüm Anlatısı</p>
          <p className="text-sm text-slate-700 leading-relaxed">{p.solution}</p>
        </div>

        {/* CTA */}
        <div className="bg-slate-900 rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1.5">Çağrı / Sonraki Adım</p>
          <p className="text-sm font-medium text-white leading-relaxed">{p.cta}</p>
        </div>

        {/* Objections */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">İtirazlar & Yanıtlar</p>
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex gap-2">
            <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-700 leading-relaxed">{p.objection}</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex gap-2">
            <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-700 leading-relaxed">{p.secondObjection}</p>
          </div>
        </div>
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
      className={`w-full text-left rounded-xl border-2 p-3 transition-all ${
        isActive
          ? 'border-slate-900 bg-slate-900 text-white shadow-md'
          : 'border-slate-200 bg-white hover:border-slate-400 text-slate-700'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="font-mono text-[10px] font-bold text-slate-400">
          {String(slide.num).padStart(2, '0')}
        </span>
        <Icon className={`w-3 h-3 ${isActive ? 'text-slate-300' : 'text-slate-400'}`} />
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

      <div className="mt-6 space-y-14">

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
            V.2 · 2026-08-01 · Fermi V.2 + Çekim Gücü Yol Haritası V.2 verileriyle eşleştirildi. Statik.
          </p>
        </div>

        {/* 1. Asansör Konuşması */}
        <section>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-mono">1</span>
              Asansör Konuşması
              <span className="text-xs font-normal text-slate-400 font-mono ml-1">~90 saniye</span>
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
            <div className="px-6 py-6">
              <Quote className="w-6 h-6 text-slate-200 mb-4" />
              <p className="text-slate-800 leading-relaxed whitespace-pre-line text-sm">
                {elevatorPitch[pitchLang]}
              </p>
            </div>
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: 'Açılış', text: 'Spesifik acı nokta ile başla' },
                { label: 'Çözüm', text: 'Somut davranışı söyle — sayfanın doğru yere açılması' },
                { label: 'Çağrı', text: 'Net fiyat + ücretsiz başlama' },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{item.label}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 2. Perspektifler */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-mono">2</span>
            İzleyici Perspektifleri
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            Aynı iş modeli, farklı izleyiciler için farklı vurgulanır. Her kart: bağlam → problem çerçevesi → çözüm anlatısı → çağrı → iki itiraz yanıtı.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
          <p className="text-xs text-slate-500 mb-6">
            Ash Maurya&#39;nın Lean Canvas çerçevesi. Her slayt tek soruya cevap verir.
            Her slaytın altında gerçek metrik ve kritik risk notu var.
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
              <div className="bg-white border-2 border-slate-900 rounded-2xl overflow-hidden shadow-md flex flex-col">
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
                <div className="flex-1 p-6 flex flex-col gap-4">
                  {/* Ana İçerik */}
                  <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2">Slayt İçeriği</p>
                    <p className="text-slate-800 text-sm leading-relaxed">{slide.content}</p>
                  </div>

                  {/* Sunum Notu */}
                  <div className="bg-white rounded-xl p-4 border border-slate-100">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1.5">Sunum Notu & Veri Gerekçesi</p>
                    <p className="text-slate-600 text-sm leading-relaxed">{slide.detail}</p>
                  </div>

                  {/* Metrik + Risk yan yana */}
                  {(slide.keyMetric || slide.risk) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {slide.keyMetric && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-emerald-600 font-bold mb-0.5">Kilit Metrik</p>
                            <p className="text-xs text-emerald-800 leading-relaxed">{slide.keyMetric}</p>
                          </div>
                        </div>
                      )}
                      {slide.risk && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-red-600 font-bold mb-0.5">Risk</p>
                            <p className="text-xs text-red-700 leading-relaxed">{slide.risk}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

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

        {/* 4. Running Lean Prensipleri */}
        <section className="bg-slate-900 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-2 mb-5">
            <LayoutGrid className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-lg">Running Lean Bölüm 5 — Temel Prensipler</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                title: 'Hikâye Önce, Ürün Sonra',
                body: 'Hikâyeni net anlatamıyorsan, ürünün de net değildir. Sunum pratiği, ürünü netleştirir. Asansör konuşması yazamazsan Kanvas doldurulamaz.',
                icon: Mic,
              },
              {
                title: 'İzleyiciyi Önce Anla',
                body: 'Müşteri somut davranış ister (sayfanın doğru yere açılması). Yatırımcı büyüme hikâyesi ister (v2 global). Danışman açık soru ister (tekrar-alım oranı testi). Aynı slaytla üçünü kazanamazsın.',
                icon: Users,
              },
              {
                title: 'Çekim Olmadan Hikâye Boş',
                body: '"Traction is the best story you can tell." Bugün sayaç: 0/10 ödeme. İlk 10 ödeyen, 10.000 satırlık sunumdan daha güçlüdür. Oradan sonra konuşmak çok daha kolay.',
                icon: Shield,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="bg-white/10 rounded-xl p-5 border border-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="w-4 h-4 text-amber-400" />
                    <p className="text-amber-400 font-semibold text-sm">{item.title}</p>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed">{item.body}</p>
                </div>
              );
            })}
          </div>
        </section>

      </div>
    </AdminLayout>
  );
}
