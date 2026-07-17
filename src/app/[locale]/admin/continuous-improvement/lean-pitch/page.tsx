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
/* DATA — Tüm rakamlar Fermi V.1.1 ve Çekim Gücü Yol Haritası V.1.1   */
/* ile eşleşmektedir. Değiştirilmeden önce bu dosyaları kontrol et.    */
/*                                                                      */
/* Pazar zinciri (Fermi V.1.1):                                        */
/*   62M IG kullanıcısı (TR) × %2,4 satıcı = 1,5M                    */
/*   1,5M × %40 DM ile iş yapan = 600K                                */
/*   600K × %5 ödeme yapabilir = 30K adreslenebilir TR                */
/*   Global (MENA+LatAm benzer zincir): +120K → toplam ~150K          */
/*                                                                      */
/* Fiyat (karar 2026-07-17): Dolar-sabit. Starter $9, Pro $29,        */
/* Business $79. TL tahsilat güncel kur üzerinden. Lokal sabit TL yok.*/
/*                                                                      */
/* ARPU: Teorik blended $22. Starter-ağırlıklı erken dönem karması    */
/* + %20 yıllık indirim → efektif ARPU $15.                           */
/*                                                                      */
/* Birim ekonomi: $0,045/kredi. LTV = $15/0,05 = $300 (%5 churn).     */
/* CAC < $100 hedefi (LTV/3 kuralı). Viral imza döngüsü kritik.       */
/* ------------------------------------------------------------------ */

const elevatorPitch = {
  tr: `Instagram veya WhatsApp'tan müşteri alan her hizmet sahibinin ortak acısı şudur: DM'ler çoğalıyor, takip edilemiyor, lead'ler kaybolup gidiyor.

Türkiye'de bu şekilde iş yapan yaklaşık 600.000 satıcı var — koçlar, güzellik uzmanları, özel ders verenler, pet bakıcıları. Bunların hepsinin ortak sorusu: "Bugün kaç kişi soru sordu, kaçına cevap veremedim?"

talkinbio bu boşluğu kapatır. Saule, yapay zeka destekli müşteri asistanınızdır; bio sayfanızı ziyaret eden her potansiyel müşteriyle 7/24 konuşur, sorularını yanıtlar, randevu alır ve lead listesi oluşturur. Beiwe ise bu konuşmaları analiz ederek sizi her hafta pazarlama önerileriyle buluşturur.

Sabah kalkınca, takip edilemeyen DM değil — sıralanmış lead listesi bulursunuz.

Fiyat: $9/ay. Kurulum 10 dakika. Ücretsiz deneme yok — çünkü değer tespit edilene kadar ödeme yoksa, taahhüt de yoktur.`,
  en: `Every service provider who gets clients through Instagram or WhatsApp shares the same pain: DMs pile up, follow-ups slip through, and leads disappear.

In Turkey alone, roughly 600,000 sellers operate this way — coaches, beauty professionals, tutors, pet sitters. They all share the same question: "How many people asked something today that I never got back to?"

talkinbio closes that gap. Saule, your AI-powered customer assistant, engages every bio-page visitor 24/7 — answers questions, books appointments, and builds your lead list. Beiwe then analyzes those conversations and surfaces weekly marketing insights.

You wake up not to missed DMs, but to a ranked lead list.

Price: $9/month. Setup: 10 minutes. No free trial — because without payment, there's no real commitment to test.`,
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
    audience: 'Instagram/WhatsApp üzerinden iş yapan bireysel hizmet sahibi',
    hook: '"Bu hafta kaç kişi soru sordu, kaçına cevap veremedim?"',
    context: 'Hedef müşteri: koç, güzellik uzmanı, özel ders veren, pet bakıcısı, serbest çalışan. Günde 5-30 DM alan, takibini kaybeden, müşteri kaçtığında fark etmeyen birisi.',
    problem: "Soruna saatlerce cevap gelmeyince potansiyel müşteri başka birine gidiyor. Takip etmek isteseler bile not defteri, mesaj geçmişi, spreadsheet karmaşası var. Linktree sadece link paylaşıyor — soruları yanıtlamıyor. CRM'ler çok karmaşık ve pahalı.",
    solution: 'talkinbio, bio sayfanı 7/24 çalışan bir asistana dönüştürür. Saule ziyaretçinin sorusunu anlar ve yanıtlar, randevu toplar, lead kaydeder. Sen sabah kalkınca hazır liste bulursun — cevap vermediğin DM değil. Beiwe bu konuşmalardan haftalık içerik önerisi üretir.',
    cta: '"İlk kurulumu seninle birlikte yapıyoruz — 10 dakika. Fiyat $9/ay; TL karşılığı ~370 TL, kur üzerinden. 30 gün sonra kaç lead topladığını göreceksin — devam edip etmeme kararı o veri üzerinde."',
    objection: '"Benim için çok karmaşık gibi görünüyor." → Beiwe kurulum sürecinde seni adım adım yönlendiriyor. Kod yok, form yok, teknik bilgi gerekmiyor. İlk kurulumu birlikte yapıyoruz.',
    secondObjection: "\"$9/ay çok mu yüksek?\" → Kaçan bir lead ortalama 1-3 saat iş demek. Saatlik ücretini 370 TL'nin üzerinde tutuyorsan, bir lead'in maliyeti aylık aboneliği katlıyor.",
  },
  {
    id: 'investor',
    label: 'Yatırımcı Konuşması',
    icon: DollarSign,
    color: 'emerald',
    audience: "Erken aşama bootstrapped SaaS'a bakan melek yatırımcı veya mikro-VC",
    hook: "\"TR'de $400K ARR tavanı olan, kasıtlı muhafazakâr modellenmiş bir başlangıç noktası. Asıl hikâye v2'de.\"",
    context: 'Şu an Aşama 1 (Problem/Çözüm Uyumu). Bootstrapped başlangıç. Tek kurucu. Hedef: ilk 10 ödeme yapan müşteri → $100K ARR doğrulaması → v2 öncesi yatırımcı konuşması.',
    problem: "Türkiye'de sosyal medya üzerinden aktif satış yapan ~1,5 milyon bireysel hizmet sağlayıcısı var. Bu sayının %40'ı müşterisiyle DM üzerinden iş yapıyor: 600K satıcı. Bu segment için bugün ödeme yapılabilir, gerçekten işe yarayan bir araç neredeyse yok. CRM'ler fazla karmaşık, Linktree sadece link paylaşıyor. Boşluk kasıtlı olarak boş bırakılmış.",
    solution: 'talkinbio bu segmentin ilk dikey SaaS\'ı: Saule (web widget, konuşan bio) + Beiwe (marketing agent). Gelir: kredi modeli, $9/$29/$79, dolar-sabit fiyat. Efektif ARPU: $15 (Starter-ağırlıklı erken dönem karması + %20 yıllık indirim). Birim ekonomi: $0,045/kredi, Starter %69 marj. LTV=$300 (%5 churn). CAC hedefi <$100 — viral imza döngüsüne (Faz 1.8) bağlı.',
    cta: "TR'de P/Ç Uyumu (10 müşteri → 550 müşteri → $100K ARR eşiği). Sonraki adım v2 (WA+IG DM) ile MENA+LatAm: global adreslenebilir ~150K, baz senaryo ~4.500 müşteri = $810K ARR, stretch %6 yakalama = ~$1,6M ARR. $100K ARR doğrulamasında sizi bilgilendiririm — v2 öncesi konuşalım.",
    objection: '"TR pazarı çok küçük." → TR tavanı (~$400K ARR, 2.200 müşteri) kasıtlı muhafazakâr modellendi. Doğrulama zemini, ölçek zemini değil. v2 kanallarla (WhatsApp+IG DM) ve Faz 7 dil genişlemesiyle asıl hitap global DM-satış kategorisidir.',
    secondObjection: '"Tek kurucu riski?" → En büyük kırılma noktası bu — ve kabul edildi. Faz 3 (Beiwe) modüler tasarlandı; gecikmesi lansmanı bloklemiyor.',
  },
  {
    id: 'advisor',
    label: 'Danışman Konuşması',
    icon: Lightbulb,
    color: 'purple',
    audience: 'Metodoloji, pazar veya teknik konularda rehberlik edecek danışman/mentor',
    hook: '"Running Lean metodolojisini gerçekten uygulayan bir süreç — ama üç açık sorun var, bunlarda deneyiminize ihtiyacımız var."',
    context: 'Ash Maurya\'nın "Önce Sorun/Çözüm Uyumu, sonra ürün" ilkesiyle: müşteri görüşmeleri önce, ödeme testi manuel, ücretsiz deneme yok. Şu an Aşama 1 başlangıcı. OMTM: ödeme yapan müşteri sayısı. Sayaç 0/10.',
    problem: 'Bireysel hizmet sahipleri için araç yelpazesi iki uçta: ya çok basit (Linktree — sadece link, soru yanıtlamıyor) ya çok karmaşık ve pahalı (CRM — teknik bilgi gerekiyor, kurulum saatler sürüyor). Bu boşlukta "konuşan bio" kategorisi tanımlanmamış.',
    solution: 'Süreç: 20 problem görüşmesi → ücretli 10 kişilik pilot ($9/ay, manuel tahsilat — ücretsiz deneme yok) → ölçüm → build/pivot/devam kararı. Şu ana kadar doğrulanan yalnızca: birim maliyet ölçümleri ($0,026/mesaj, $0,121/güncelleme, $0,147/kurulum) ve kredi oranı (1:4.6:5.6, beklenti 1:3:10\'du). Doğrulanmamış: viral imza dönüşüm oranı, dolar-sabit fiyata karşı kur-churn etkisi.',
    cta: 'Danışmanlık ihtiyacı: (a) $9/ay dolar-sabit fiyat TR\'de gerçekten bariyer mi, yoksa değer iletişimi sorunu mu? (b) Faz 1.8 viral imza döngüsü CAC\'ı organik olarak $100 altına çekebilir mi — yoksa meta reklamına geçmek kaçınılmaz mı? (c) Meta evrak süreci (WA Business API + IG DM) için süreç deneyimi.',
    objection: '"Problem görüşmelerini neden 20 ile sınırladın?" → Maurya\'nın 20 görüşme önerisi Türkiye bağlamında yeterli olabilir; pazar homojen ve küçük. 20\'de tekrar eden acı nokta netleşmezse sayıyı artıracağım.',
    secondObjection: '"Ücretsiz deneme neden yok?" → Ücretsiz erken erişim meraklı toplar, müşteri değil. İlk 10 ödeyen, değer varlığının testidir — Maurya\'nın "ödeme taahhüttür" ilkesi.',
  },
  {
    id: 'pitch',
    label: 'İş Modeli Özeti',
    icon: Briefcase,
    color: 'amber',
    audience: 'Hızlı değerlendirme yapan herhangi bir iş muhatabı',
    hook: '"600K potansiyel satıcı, sıfır araç. talkinbio bu boşluğun ilk çözümü."',
    context: 'Türkiye\'de 1,5 milyon sosyal medya satıcısının 600 bini DM ile iş yapıyor. Bu 600K satıcının adreslenebilir alt kümesi (ödeme kapasiteli): ~30K TR, ~120K global (MENA+LatAm benzer zincir).',
    problem: 'DM ile iş yapan satıcılar müşteri sorularını manuel takip ediyor. Cevap gecikmesi = kaybedilen iş. Linktree sadece link verir, CRM\'ler çok karmaşık. Aradaki "konuşan bio" katmanı yok.',
    solution: 'talkinbio = Saule (bio sayfasında 7/24 konuşan AI widget) + Beiwe (konuşmaları pazarlama önerisine çeviren agent). Kurulum 10 dakika. Kredi modeli: Starter $9/ay (200 kr) | Pro $29 (700 kr) | Business $79 (1.800 kr). Dolar-sabit. TL tahsilat kur üzerinden.',
    cta: 'Aşama 1: 10 ödeme yapan müşteri (manuel satış + pilot). Ölçek: Faz 1.8 viral imza → CAC organik. Kırılma noktaları: 550 müşteri ($100K ARR) → 4.500 müşteri ($810K ARR, v2 global). Bugün: sayaç 0/10.',
    objection: '"Rakipler?" → Linktree link paylaşır, ManyChat bot kurar, büyük CRM\'ler aşırı karmaşık. talkinbio "konuşan bio" kategorisini tanımlıyor — bu segmentin dikey SaaS\'ı.',
    secondObjection: '"Neden şimdi?" → WhatsApp Business API kurulumu artık çok daha erişilebilir ve DM trafiği satıcılar için yönetilemez bir hacme ulaştı. Zamanlamayı bekleyen pazar olgunluğu var.',
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
    content: '"Bio linkin artık cevap veriyor." — Sosyal medya üzerinden iş yapan hizmet sahiplerinin kaçırdığı lead\'leri yakalayan, 7/24 müşteri karşılayan konuşan bio platformu.',
    detail: 'UVP tek cümle, somut çıktı üzerine kurulu: "sabah hazır lead listesiyle uyan." Habersiz bir ziyaretçi 5 saniyede ne kazandığını anlamalı. "Konuşan bio" kategori adı yeni — bu, sahiplenilmesi gereken bir boşluk.',
    maurya: '"Değer teklifinizi test etmenin en ucuz yolu: yabancı birine söyle, gözlerinde anlam görüyor musun? Eğer açıklamak zorunda kalıyorsan, mesaj bulanık."',
    keyMetric: null,
    risk: null,
  },
  {
    num: 2,
    title: 'Sorun',
    icon: AlertTriangle,
    content: 'DM satıcısının üç acı noktası: (1) Sorulara saatler sonra cevap → müşteri gidiyor. (2) Takip sistemi yok — not defteri, mesaj geçmişi, spreadsheet karmaşası. (3) Hangi içeriğin lead getirdiği bilinmiyor.',
    detail: 'Bu sorunları yaşayan ~600K satıcı TR\'de var. Mevcut çözümler: Linktree (link paylaşır, cevaplamaz), CRM (teknik bilgi ister, pahalı). Boşluk kasıtlı olarak boş. Problem görüşmelerinde (0/20) bu üç noktanın tekrar edip etmediği doğrulanacak.',
    maurya: '"Sorun gerçekse müşteri halihazırda geçici çözümler üretmiştir. O geçici çözümleri sor — mevcut alternatifler listende onlar var."',
    keyMetric: 'Doğrulanmamış: "kaçırılan lead başına günlük kayıp" gerçek miktar',
    risk: 'Sorun sert değil, "rahatsızlık" olarak algılanıyorsa ödeme olmaz',
  },
  {
    num: 3,
    title: 'Müşteri Segmenti & Erken Benimseyenler',
    icon: Users,
    content: 'Birincil: Türkiye\'de Instagram/WhatsApp üzerinden aktif hizmet satan bireysel satıcı (~1,5M). Filtre 1: müşteriyle DM üzerinden iş yapan (~%40 = 600K). Filtre 2: ödeme kapasiteli = ~30K adreslenebilir. Erken benimseyen: günde 10+ DM alan, randevu takibini spreadsheet veya not defteri ile yapan, tekrarlayan müşteri tabanı olan koç/güzellik/özel ders.',
    detail: 'Fermi zinciri: 62M TR IG kullanıcısı × %2,4 satıcı = 1,5M → ×%40 DM kullanan = 600K → ×%5 ödeyebilen = 30K. Global (MENA+LatAm benzer zincir): +120K → toplam ~150K adreslenebilir. Erken benimseyen kriterler: DM\'den lead kaybettiğini biliyor, teknik bariyeri düşük, sosyal medyada aktif.',
    maurya: '"Erken benimseyeni herkes yapmak, kimse yapmamaktır. Bir isim, bir meslek, bir spesifik acı nokta — bu kadar."',
    keyMetric: 'TR adreslenebilir: ~30K / Global: ~150K',
    risk: '%5 ödeme kapasitesi varsayımı; gerçek oran %3\'e düşerse TR tavanı ~$227K\'ya iner',
  },
  {
    num: 4,
    title: 'Benzersiz Değer Teklifi (UVP)',
    icon: Target,
    content: '"Bio linkin artık cevap veriyor — 10 dakikada kur, 7/24 müşteri karşıla." Rakiplerden fark: Linktree link paylaşır (cevaplamaz), CRM\'ler karmaşık (teknik bilgi ister). talkinbio ikisi arasındaki "konuşan bio" katmanını açıyor.',
    detail: 'Üst düzey konsept: "Bio sayfan için AI asistan." Ürün kolumuzun ana ürün/pazar hipotezi: "Hizmet sahibi, sayfasında cevap veren bir asistan olduğunda daha fazla lead\'e dönüşür." Bu hipotez A/B testi veya kohort analizi ile ölçülecek (Aşama 2).',
    maurya: '"UVP ürününü değil, müşteri sonucunu satmalı. \'AI widget\' değil \'hazır lead listesi\' — fark bu."',
    keyMetric: 'Landing demo → erişim talebi dönüşüm oranı (admin/analytics canlı ölçülüyor)',
    risk: 'UVP anlaşılmazsa kurulum başlamaz; 10 dakika vaadi test edilmeli',
  },
  {
    num: 5,
    title: 'Çözüm',
    icon: Mic,
    content: 'Saule (v1): bio sayfada embed AI widget — ziyaretçiyle konuşur, randevu alır, lead kaydeder. İmzası: "Saule ile konuşuyorsunuz — talkinbio.com." Beiwe (v1 → v2): kurulum yönlendirme + haftalık pazarlama özeti. v2: WhatsApp+IG DM doğrudan entegrasyon (Meta evrak sonrası).',
    detail: 'v1 kapsamı: web widget, Beiwe kurulum akışı, lead listesi, temel analytics. v2 kapsamı (kanallar Faz 5-6, dil Faz 7): WA Business API + IG DM, çok dilli destek, MENA/LatAm lokalizasyon. Saule imzası viral döngünün motoru: her konuşma bir organik tanıtım. Birim maliyet: $0,026/mesaj (gerçek ölçüm). Kredi oranı: Saule:güncelleme:kurulum = 1:4.6:5.6 (beklenti 1:3:10\'du — gerçek ölçümle revize edildi).',
    maurya: '"Çözümü üç özellikle sınırla; fazlası odak kaybı. Her özellik bir Kanvas sorununa bağlı olmalı."',
    keyMetric: 'Gerçek ölçüm: $0,045/kredi · $0,026/mesaj · Starter %69 marj',
    risk: 'Beiwe kurulumu 10 dakikayı aşarsa erken churn riski; test edilmedi',
  },
  {
    num: 6,
    title: 'Gelir Modeli',
    icon: DollarSign,
    content: 'Kredi aboneliği: Starter $9/ay (200 kr) · Pro $29/ay (700 kr) · Business $79/ay (1.800 kr). Yıllık ödeme: %20 indirim (fiyatı 12 ay kilitler — kur-churn bariyer). Ek paket: $5 → 100 kredi (birim pahalı; plan yükseltme teşviki). Fiyat dolar-sabit; TL tahsilat güncel kur üzerinden.',
    detail: 'Teorik blended ARPU: $22 (örnek varsayım: %60×$9 + %30×$29 + %10×$79 = $22,0). Efektif ARPU: $15 — Starter-ağırlıklı erken dönem karması + %20 yıllık indirim. Birim ekonomi: LTV = $15/0,05 = $300 (%5 churn). CAC < $100 hedefi (LTV/3). Starter marjı: %69 (tipik kullanım) → en dar senaryo (yalnızca güncelleme): %11. Kur riski: $9/ay bugün ~370 TL; devalüasyonda TL karşılığı yükselir → churn baskısı. Yanıt: yıllık kilit + değer iletişimi "kaçan lead\'in maliyeti" üzerinden.',
    maurya: '"Fiyat değer hipotezinin testidir." (Not: Ücretsiz deneme verirsek taahhüt ölçemeyiz. İlk 10 müşteri öder — bu bizim kararımız ve fiyat doğrulamamızdır.)',
    keyMetric: 'Efektif ARPU $15 · LTV $300 · CAC hedefi <$100',
    risk: 'Kur yükselmesi → TL karşılığı yükseliş → Starter churn; yıllık plan payı bunu yumuşatıyor mu? Test edilmedi.',
  },
  {
    num: 7,
    title: 'Pazar Boyutu (Fermi)',
    icon: BarChart2,
    content: 'TR adreslenebilir: ~30K satıcı. TR ARR senaryoları: Kötümser %1 = ~$54K · Orta %3 = ~$162K · İyimser TR tavanı %7 (2.100 müşteri) = ~$378K. v2 Global (baz %3): ~4.500 müşteri = $810K ARR. v2 Stretch (%6 yakalama): ~9.000 müşteri = $1,6M ARR.',
    detail: 'Fermi zinciri: 62M TR IG × %2,4 satıcı = 1,5M → × %40 DM kullanan = 600K → × %5 ödeyebilir = 30K. Muhafazakâr not: "%5 ödeme istekliliği" en spekülatif çarpan — $9/ay dolar-sabit, kur bariyeriyle %3\'e düşerse adreslenebilir 18K\'ya, TR tavanı ~$227K\'ya iner. Global: aynı zincir MENA+LatAm için ek ~120K → toplam adreslenebilir ~150K. Pazar için Cal.com benchmarkı: 60K ödeme yapan, $5M ARR — referans tempo.',
    maurya: '"Pazar boyutunu bir zincir olarak sun. Her halkayı savunabilmelisin. \'150M sosyal medya kullanıcısı var\' bir pazarlık değil, bir kaçış."',
    keyMetric: 'TR tavan $378K · Global baz $810K · Global stretch $1,6M',
    risk: '%5 ödeme istekliliği %3\'e düşerse TR tavanı ~$227K\'ya iner; tüm senaryolar ~2 kat küçülür',
  },
  {
    num: 8,
    title: 'Çekim Gücü & Güncel Metrikler',
    icon: TrendingUp,
    content: 'Şu an: Aşama 1 — Problem/Çözüm Uyumu. OMTM: ödeme yapan müşteri. Sayaç: görüşme 0/20 · ücretli pilot 0/10 · ödeme 0/10. Kırılma noktaları: 10 ödeme → 550 müşteri ($100K ARR) → 4.500 müşteri ($810K baz ARR).',
    detail: 'Doğrulanmış yalnızca: birim maliyet ölçümleri ($0,026/mesaj, $0,121/güncelleme, $0,147/kurulum), kredi oranı gerçek ölçüm (1:4.6:5.6). Doğrulanmamış: viral imza dönüşüm oranı (UTM\'lerle ölçülecek), dolar-sabit fiyata kur-churn tepkisi, $9/ay ödeme istekliliği gerçek oran, Beiwe kurulum süresi (10 dk vaadi). Ücretli pilot başlangıcı bekliyor.',
    maurya: '"Çekim, tahmin değil kanıttır. Meraklı kullanıcılar değil, ödeme yapan müşteriler sayılır. Her diğer metrik vanity."',
    keyMetric: 'Doğrulanmış: $0,026/mesaj · Doğrulanmamış: viral dönüşüm, kur-churn',
    risk: 'Viral imza döngüsü çalışmazsa CAC organik kalmaz; ücretli meta reklamı gerekirse <$100 CAC TR\'de zordur',
  },
  {
    num: 9,
    title: 'Haksız Avantaj',
    icon: Lightbulb,
    content: '1. Saule imzası = viral döngü: her konuşma organik marka tanıtımı, her widget bir büyüme kanalı. 2. Konuşma verisi birikimi: Beiwe ne kadar kullanılırsa o kadar özelleşir — yeni giren rakip bu veri avantajını hemen kopyalayamaz. 3. Türkçe-ilk dil derinliği: MENA/LatAm lokalizasyon modelini zaten taşıyan bir ürün mimarisi.',
    detail: 'Kopyalanamayan şey: ürünün kendisi değil, kullanıcı konuşma verisi + viral büyüme döngüsünün bileşimi. Bugün bu avantajlar sıfır — viral imza Faz 1.8\'de yeni canlıya girdi, veri birikimi henüz başlamadı. Dolayısıyla bu bir "vaat" değil, "inşa edilen süreç" olarak sunulmalı.',
    maurya: '"Haksız avantaj bugün sahip olduğun şey değil, başkalarının yarın sahip olamayacağı şey. Ama o zamana kadar hız ve niş yeterlidir."',
    keyMetric: 'Saule imzası viral dönüşüm oranı (UTM ile ölçülecek, Faz 1.8)',
    risk: 'Linktree veya büyük bir oyuncu bu segmenti fark ederse hızla kopyalar; hız tek savunma',
  },
  {
    num: 10,
    title: 'Çağrı (Call to Action)',
    icon: Target,
    content: 'Aşama 1 için: 10 ödeme yapan müşteri. Pilot ücretli, $9/ay, manuel tahsilat. 30 gün aktif Saule kullanımı → lead toplandı mı? Sonuç: devam/pivot/dur. Ücretsiz deneme yok.',
    detail: 'Müşteri çağrısı: "Birlikte kuralım. $9/ay. 30 gün lead toplarsın, veriyi görürsün." Yatırımcı çağrısı: "$100K ARR (550 müşteri) doğrulamasında bilgilendiririm — v2 öncesi konuşalım." Danışman çağrısı: "$9 dolar-sabit bariyer gerçek mi, değer iletişim sorunu mu? Bu soruya cevabın varsa haber ver." Bugünkü somut adım: 20 problem görüşmesi planla, ilk 5\'ini bu hafta yap.',
    maurya: '"Her sunumun sonunda net bir adım ol. Tarih yok, isim yok, somut eylem yok — o konuşma olmamış sayılır."',
    keyMetric: 'Hedef: 10 ödeme · 550 müşteri = $100K ARR · 4.500 = $810K ARR',
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
            V.2 · 2026-07-17 · Fermi V.1.1 + Çekim Gücü Yol Haritası V.1.1 verileriyle eşleştirildi. Statik.
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
                { label: 'Çözüm', text: 'Somut çıktıyı söyle — lead listesi' },
                { label: 'Çağrı', text: 'Net fiyat + ücretsiz deneme yok kararı' },
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
                body: 'Müşteri somut çıktı ister (lead listesi). Yatırımcı büyüme hikâyesi ister (v2 global). Danışman açık soru ister (kur-churn testi). Aynı slaytla üçünü kazanamazsın.',
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
