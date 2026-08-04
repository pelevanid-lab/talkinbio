# Talkinbio Akış Yenileme (v2) — Implementation Plan

## Faz 0: Ücretsiz Katman + Uygulama İçi Satın Alma Modeli (2026-08-03 — final)

Bu faz, Phase 1-4'ün (ürün akışı) ÜZERİNE kurulan iş modelini tanımlar. Phase 1-4 planı
geçerliliğini koruyor; Faz 0 onları değiştirmiyor, üzerine parasal katmanı ekliyor.

### Piyasa Araştırması (Linktree / Beacons.ai / Stan Store — 2026-08-03)

**Linktree:** Free-forever katman var (sınırsız link, temel tema, Linktree rozeti,
kısıtlı analytics). Ücretli katmanlar şunu açıyor: rozet kaldırma (en ucuz seviyenin TEK
gerekçesi), zamanlamalı/animasyonlu linkler, derin analytics/entegrasyonlar, custom domain
(sadece en üst seviye). Ayrıca satıştan **komisyon** alıyor: free katmanda %12, ücretli
katmanlarda %9, en üst seviyede %0.

**Beacons.ai:** Free-forever katmanda bile **10 AI üretimi dahil** (medya kiti, email
otomasyonu, auto-DM) — ama satıştan %9 komisyon kesiyor. Ücretli katman komisyonu
kaldırıyor + daha fazla AI kredisi veriyor.

**Stan Store:** Free katman YOK (sadece 14 gün deneme), ama komisyon her zaman %0. Email
marketing gibi temel bir araç bile en üst pakete ($99/ay) kilitli.

**Talkinbio için çıkarımlar:**
1. Free-forever + düşük mühendislik maliyetli bir "rozet kaldırma" ayracı (Linktree
   modeli), en basit ve en kanıtlanmış freemium levier'i — düşük öncelikli ama ucuz, ileride eklenebilir.
2. Free katmanda küçük miktarda AI'yı DAHİL etmek (Beacons modeli — "10 AI üretimi
   free'de") kanıtlanmış bir pattern. Talkinbio'nun 20 kredilik "hoşgeldin hediyesi" bu
   modele denk düşüyor — çerçeveleme doğru.
3. Stan Store'un "free yok, her şey kilitli" modeli Talkinbio'nun stratejisiyle ZIT —
   biz tam tersini seçtik (agresif free-forever), bu bilinçli bir farklılaşma.
4. **Uyarı:** Bu üç örnekte de asıl gelir motoru ya abonelik ya da komisyondur; Talkinbio'da
   şu an ikisi de yok (ürün free, komisyon yok). Aşağıdaki "ücretli yüzey" bölümü bu yüzden
   kasıtlı olarak küçük tutuluyor — ama bu küçüklüğün gelir riski olduğu açıkça not
   edilmeli (bkz. "Gelir Riski" altbölümü).

Sources: [Linktree Pricing Explained (UniLink)](https://app.unilink.us/blog/linktree-pricing-2026), [Linktree Pricing (SaaSworthy)](https://www.saasworthy.com/product/linktree/pricing), [Is Linktree Free? (Links)](https://blog.links.fans/is-linktree-free/), [Stan Store vs Beacons (Stan)](https://stan.store/blog/stan-store-vs-beacons/), [Beacons.ai Pricing (NiftySite)](https://niftysite.co/resources/beacons-pricing)

### Temel Karar
**Plan satışı YOK.** Talkinbio, ziyaretçiye açılan sayfa deneyiminin TAMAMI için tamamen
ücretsiz olarak lanse edilir. Kredi, yalnızca işletme sahibinin (Uliana gibi) admin/stüdyo
tarafındaki AI araçlarını kullanmasıyla ilgilidir — ziyaretçi tarafındaki sayfayı ASLA
etkilemez.

> **Ziyaretçi sayfası = her zaman, sonsuza kadar, kredi olsun olmasın tam çalışır.**
> **Kredi yalnızca işletme sahibinin gerçekten AI kullanan içerik üretim araçları için gerekir.**

### Ücretsiz — Ziyaretçi Sayfası (her zaman, kredi şartı yok)
| Özellik | Not |
|---|---|
| Sayfa: biyografi, bloklar (hizmet/ürün/iletişim/saatler) | — |
| Tema/tasarım özelleştirme | — |
| ActiveFlow: Kampanya/Survey (Phase 1) — statik içerik | — |
| IntentPanel buton seçimi (Phase 2) — deterministik routing | — |
| StandardBlocks açılması (blok seçilince detay sayfası) | — |
| **"Bir soru yaz" formu — HER ZAMAN deterministik, LLM'e hiç geçmez** | Kredi kontrolü yok |
| Hazır ses cue **playback**'i (karşılama, yönlendirme sesleri) | Ücretsiz |
| Lead-capture / iletişim yönlendirme | — |
| Instagram/WhatsApp/TikTok link yönlendirme | — |
| Temel analytics (sayfa görüntülenme) | — |

### Ücretsiz — İşletme Sahibi Kurulum Araçları (düzeltildi — 2026-08-03)
| Özellik | Not |
|---|---|
| **Instagram'dan otomatik profil/bilgi çıkarma (AI destekli import)** | **Düzeltildi: ÜCRETSİZ.** Önceki taslakta 20 kredi harcatıyordu — kaldırıldı, kurulum engeli olmamalı. |
| **Toplu metin → blok dönüştürme** | **Düzeltildi: zaten LLM DEĞİL, deterministik yönlendirme.** Önceki taslakta yanlışlıkla "AI parse/paid" listelenmişti. |
| **Kampanya/Survey sayfası açma** | **Düzeltildi: ÜCRETSİZ.** Deterministik bir survey/kampanya FLOW BUILDER kurulacak (form/yapı tabanlı, AI taslak önerisi YOK) — işletme sahibi kendi kampanyasını/survey'ini bu builder ile oluşturur, LLM hiç araya girmez. |

### Ücretli — Yalnızca Belirli Admin/Stüdyo Araçları (daraltıldı — 2026-08-03)
| Özellik | Neden kredi gerekir |
|---|---|
| **Creative Studio → yalnızca "Post" araçları** | AI içerik üretimi. Not: cast/motion/podcast/twin/voice zaten kullanıcı arayüzünden kaldırılmış durumda — bunlar şu an hiç sunulmuyor (ne free ne paid), bu yüzden listede yok. |
| Yeni ses cue **üretimi** (admin stüdyosunda yeni Saule sesi kaydetme) | TTS üretimi (playback ayrı, ücretsiz) |

**Kredi bittiğinde:** işletme sahibi yukarıdaki araçlardan birini kullanmaya çalıştığında
kredi paketlerine (`starter`/`pro`/`business`/`EXTRA_PACK`, bkz. `plans.ts`) yönlendirilir.
Bu akış SADECE dashboard/admin tarafında olur, ziyaretçi hiç görmez.

### ⚠️ Gelir Riski (Faz 0'ın açık zayıflığı — kayda geçmeli)
Yukarıdaki düzeltmelerden sonra ücretli yüzey ÇOK küçük: sadece "Post" içerik üretimi +
yeni ses cue kaydı. Instagram import, bulk-text parse, kampanya/survey oluşturma hepsi
free'ye taşındı. Bu, kullanıcı deneyimi açısından doğru (kurulum engeli yok) ama **gelir
motoru neredeyse sadece Post araçlarına bağlı** hale geldi. Linktree/Beacons örneklerinde
gelir motoru (abonelik veya komisyon) her zaman ürünün ÇEKİRDEĞİNDEydi; Talkinbio'da
çekirdek artık tamamen free. Bu bilinçli bir tercih ama ilerideki büyüme/gelir
konuşmalarında (Yalın Kanvas güncellemesi) bu daralmanın etkisi ayrıca değerlendirilmeli —
gelecekte rozet kaldırma (Linktree modeli) gibi düşük maliyetli ek levier'ler gündeme
gelebilir.

### Kesinleşen Kararlar
1. Ses cue playback → **ücretsiz.**
2. "Bir soru yaz" → **HER ZAMAN deterministik, kredi kontrolü hiç yok.**
3. 20 kredi → **hoşgeldin hediyesi olarak kalıyor** ("Deneme" değil "Hoşgeldin Hediyesi"
   çerçevesi) — Beacons.ai'ın "free'de 10 AI üretimi dahil" modeliyle aynı mantık.
4. Instagram import → **ücretsiz** (düzeltildi, bu turda).
5. Bulk-text parse → **zaten deterministik, hiç AI değil** (düzeltildi, bu turda).
6. Kampanya/Survey oluşturma → **ücretsiz**, deterministik flow builder ile (düzeltildi, bu turda).
7. Creative Studio → **sadece "Post" araçları** ücretli yüzeyde kalıyor, diğerleri UI'da yok.
8. Talkinbio rozeti (Powered by Talkinbio) — hâlâ açık soru, öncelikli değil.

### Phase 1-4 Üzerine Etkisi
- **useTalkinbioFlow / Flow Controller**: değişiklik yok, zaten AI'sız tasarlandı.
- **INTENT_PROMPT → QUESTION_SUBMITTED**: `credit_balance` kontrolü YOK. Soru her zaman
  deterministik bir motor tarafından işlenir (anahtar kelime/bilgi tabanı eşleştirmesi →
  ilgili blok/cevap kartı açılır). Phase 3'teki "Saule LLM soru-cevap" planı **kapsam
  dışına çıktı** — ziyaretçi tarafında LLM YOK. Bkz. Phase 3 revizyonu aşağıda.
- **`ChatWidget.tsx`'teki `creditsExhausted` mantığı**: `credit_balance` bağımlılığı
  kaldırılır, bu UI/davranış artık koşulsuz varsayılan olur.
- **`plans.ts`**: `free` planındaki `trialGrant: true` → kaldır/yeniden adlandır (Deneme
  değil Hoşgeldin Hediyesi), `credits: 20` aynı kalır.
- **Yeni: Kampanya/Survey Flow Builder** — ActiveFlow (Phase 1) içeriğinin nasıl
  oluşturulacağını tanımlayan deterministik, form-tabanlı bir editör gerekiyor (LLM taslak
  önerisi yok). Bu, Phase 1'in admin-editör tarafına yeni bir alt görev ekliyor.
- Yeni bir "plan tier" alanına gerek yok; `credit_balance` artık SADECE dashboard/stüdyo
  tarafında (Post araçları + ses cue üretimi) kontrol edilir, ziyaretçi sayfası kodunda hiç
  okunmaz.

### ⚠️ Phase 3 Revizyonu Gerekiyor
Yukarıdaki bölümdeki "Phase 3: Saule Soru-Cevap (LLM Content)" planı artık YANLIŞ —
ziyaretçi sorusu LLM'e gitmiyor. Salı günü Phase 3, "deterministik soru-cevap motoru"
(anahtar kelime/bilgi tabanı eşleştirme → blok veya hazır cevap kartı açma) olarak yeniden
yazılmalı. Saule/LLM'in ürün içindeki rolü sadece "Post" içerik üretimine ve ses cue
kaydına daralıyor.

---


## Overview
Müşteri deneyimini yeniden tasarlıyor: **ActiveFlow** (kampanya/survey) → Soru-Cevap akışı. 
- **Flow Controller**: deterministik state machine (hangi state, ne göster, ne zaman)
- **Saule**: LLM content (sorunu anla, cevap üret, aksiyon döndür)
- Sesli input: kapatıldı | Sesli output (cue): aktif

---

## Phase 1: ActiveFlow Data Type + Flow Controller Setup

### Amaç
Landing/Survey sayfalarını "aktif akış" olarak tanımlı sistemde yönetmek. Normal block gibi davranmaması, state machine tarafından kontrol edilmesi.

### Değişiklikler

1. **ActiveFlow Type Tanımı** → `src/types/activeFlow.ts`
   ```typescript
   type ActiveFlow = {
     id: string;
     type: "campaign" | "survey";
     enabled: boolean;
     priority: number;
     trigger: "after_bio" | "after_scroll" | "after_delay";
     fallbackDelayMs: number;
     dismissible: boolean;
   };
   ```

2. **Flow Controller** → `src/components/FlowController.tsx` (state machine)
   - Biyografi tamamlandı mı?
   - Aktif flow var mı?
   - Kullanıcı dismiss/tamamladı mı?
   - Klasik bloklar ne zaman açılmalı?
   - Sesli takip mesajı ne zaman oynatılmalı?

3. **Admin Editör** → Block UI
   - "Kampanya" (campaign) ve "Survey" seçenekleri add-on olarak görünsün
   - Runtime'da `ActiveFlow` type'ına dönüştürülür

4. **Placeholder Components**
   - `src/components/flows/CampaignFlow.tsx` (placeholder)
   - `src/components/flows/SurveyFlow.tsx` (placeholder)

### Outcome
- Admin: kampanya/survey oluşturabilir, enableDisable yapabilir
- Runtime: Flow Controller deterministik olarak akışı yönetir
- Klasik bloklar arka planda tutulur, aktif flow tamamlanınca açılır
- v1: Aynı anda yalnızca 1 aktif flow

---

## Phase 2: ProfileExperience Orchestrator + useTalkinbioFlow Hook

### Amaç
Mevcut ProfilePageBody'i refactor et → ProfileExperience orchestrator component + state machine hook.

### Değişiklikler

1. **ProfileExperience.tsx** (YENİ) → Orchestrator component
   ```
   ProfileExperience
    ├─ BiographySection       (biyografi blokları)
    ├─ ActiveFlowSlot         (kampanya/survey — gerekirse hidden)
    ├─ IntentPanel            ("Size nasıl yardımcı?")
    ├─ StandardBlocks         (klasik bloklar — aktif flow sırasında gizli)
    └─ PassiveAssistBar       (Saule dock, state'e göre size/hide)
   ```

2. **useTalkinbioFlow.ts** (YENİ) → Hook/state machine
   - State: BIOGRAPHY → ACTIVE_FLOW_OFFERED → INTENT_PROMPT → CONTENT_OPEN/ANSWERING → PASSIVE_ASSIST
   - Event handler: BiographyReachedEnd, ActiveFlowAccepted/Skipped/Completed, BlockSelected, QuestionSubmitted, InteractionIdle
   - Side effects: timing, Saule sinyali, layout güncellemeleri

3. **FlowEvent type** → `src/types/flowEvent.ts`
   ```typescript
   type FlowEvent =
     | { type: "BIOGRAPHY_REACHED_END" }
     | { type: "ACTIVE_FLOW_ACCEPTED" }
     | { type: "ACTIVE_FLOW_SKIPPED" }
     | { type: "ACTIVE_FLOW_COMPLETED" }
     | { type: "ACTIVE_FLOW_TIMED_OUT" }
     | { type: "BLOCK_SELECTED"; blockId: string }
     | { type: "QUESTION_SUBMITTED"; text: string }
     | { type: "INTERACTION_IDLE" };
   ```

4. **Eski ProfilePageBody.tsx** → Refactor
   - BiographySection, StandardBlocks'e bölün
   - ProfileExperience'ın alt bileşenleri haline getir

### Outcome
- Akış yönetimi: useTalkinbioFlow hook
- UI orchestration: ProfileExperience component
- Genişletilebilirlik: Event sistemi, yeni akışlar (form, duyuru vb.) kolay eklenebilir

---

## Phase 3: Deterministik Soru-Cevap Motoru (REVİZE — 2026-08-03, LLM YOK)

### Amaç
**Değişti:** "Bir soru yaz" formu ziyaretçi tarafında ASLA LLM'e gitmiyor — [[free-tier-flow-controller-ayrimi]]
kararına göre ürün tamamen ücretsiz, kredi kontrolü ziyaretçi akışında yok. Saule/LLM'in
rolü artık sadece admin-side içerik üretimine daralıyor (Creative Studio, AI import).

Bu bölüm artık "Saule LLM content" değil, **deterministik eşleştirme motoru** tasarımı:

### Değişiklikler
1. **Deterministik eşleştirme motoru** (YENİ, LLM çağrısı yok)
   - Ziyaretçinin yazdığı soru → anahtar kelime / bilgi tabanı eşleştirmesi
   - Eşleşme bulunursa: ilgili blok açılır VEYA önceden tanımlı yapısal cevap kartı gösterilir
     (başlık + görsel + süre/kapsam + CTA — bkz. [[landing-v2-pozisyon]] Demo Sahne 4 formatı)
   - Eşleşme bulunamazsa: lead-capture formuna (isim/iletişim/mesaj) düşer
   - `assistantPrompt.ts`/`assistantRun.ts` isimleri yanıltıcı olabilir — bu dosyaların LLM
     çağırıp çağırmadığı Salı günü kod okunarak netleştirilmeli; mevcut Saule agent kodu
     muhtemelen büyük ölçüde YENİDEN YAZILACAK ya da tamamen admin-side'a taşınacak.
   - INFO_MARKER, ACTION_MARKER pattern'i (blok açma sinyali) korunur — bunlar LLM'e özgü
     değil, sadece yapısal sinyal formatı.

2. **Kredi kontrolü kaldırılır**
   - `ChatWidget.tsx`'teki `creditsExhausted`/`credit_balance` bağımlılığı ziyaretçi
     formundan tamamen çıkar — bu form artık koşulsuz, her zaman aynı şekilde çalışır.

### Salı İçin Açık Soru
Mevcut `src/agents/saule/modes/assistant/` altındaki kod (assistantPrompt, assistantRun,
assistantTools, pageRouter) bugün gerçekten LLM çağırıyor mu, yoksa zaten kısmen
deterministik mi çalışıyor? Salı'nın ilk işi bu klasörü okuyup gerçek mimariyi netleştirmek
olmalı — plan burada varsayımsal, kod okunmadan kesin adım listesi çıkarılamaz.

### Outcome
- Ziyaretçi sayfası: %100 deterministik, kredi/AI bağımlılığı yok
- LLM/Saule: yalnızca admin/stüdyo araçlarında (bkz. İş Modeli bölümü "Ücretli" tablosu)

---

## Phase 4: Sesli Input Kapatma

### Amaç
Müşteri sesli soru YAPAMAYACAK (input kapatılıyor). Sesli output (Talkinbio cue notification) devam ediyor.

### Değişiklikler
1. **ChatWidget.tsx** → Sesli input devre dışı
   - `MicButton` gizle / disable et
   - `isVoiceInputEnabled = false` (sauleSettings ayarı)

2. **Sesli Output (Cue)** → Devam
   - `resolveCueAudioUrl()`, `playCue()` olduğu gibi kalır
   - Saule'nin cue keys devam: `welcome`, `showing_written_answer`, etc.

### Outcome
- Sesli input: kapalı (user konuşamıyor)
- Sesli output: aktif (Talkinbio notification soundları devam)

---

## State Machine: useTalkinbioFlow()

```
BIOGRAPHY
  ↓ [BIOGRAPHY_REACHED_END event]
ACTIVE_FLOW_OFFERED       (kampanya/survey varsa)
  ├─ ACTIVE_FLOW_ACCEPTED → ACTIVE_FLOW_OPEN
  ├─ ACTIVE_FLOW_SKIPPED → INTENT_PROMPT
  └─ ACTIVE_FLOW_TIMED_OUT → STANDARD_BLOCKS + INTENT_PROMPT
  ↓
INTENT_PROMPT
  Saule: "Size nasıl yardımcı olabilirim?"
  ├─ BLOCK_SELECTED → CONTENT_OPEN
  └─ QUESTION_SUBMITTED → ANSWERING
  ↓
CONTENT_OPEN / ANSWERING
  (blok açılıyor, soru cevaplanıyor)
  ↓
PASSIVE_ASSIST
  (Saule dock küçük, pasif mod)
```

## Mimari Ayrım
- **useTalkinbioFlow()** (deterministik): state geçişi, event handling, timing
- **ProfileExperience** (UI orchestration): component gösterme/gizleme, layout yönetimi
- **Saule** (LLM): içerik, sorunu anlama, aksiyon önerisi (state machine sinyaline uyar)

---

---

## Phase 5: Landing Page V2 (Pazarlama Sitesi — `/` route)

### Amaç
Ana sayfayı ürünün yeni konumlandırmasına göre yeniden yaz: "chatbot değil, interaktif sayfa". Bu, `/[username]` altındaki gerçek ürün build'inden (Phase 1-4) **bağımsız** ilerleyebilir — ayrı route, ayrı component ağacı.

### Mevcut Durum (incelendi)
- `src/app/[locale]/page.tsx` — tek dosyada hem `landingCopy` (tr/en/ru) hem tüm section JSX'i
- `src/components/LandingHeroTabs.tsx` — "Sayfanız"/"Kolay Kurulum" iki sekme; kaldırılacak
- `src/components/LandingMockup.tsx` — gerçek `/[locale]/talkinbio` sayfasını iframe'de açıyor (kontrolsüz); kaldırılacak
- `src/components/ShowcaseSection.tsx`, `InstagramDMSection.tsx` — kendi içlerinde locale copy tutuyorlar (pattern olarak devam edilecek model)
- `src/config/plans.ts` — `PLANS`, `EXTRA_PACK` (pricing preview için aynen kullanılacak)

### Yeni Dosya Yapısı

```
src/components/landing/
├── LandingHeader.tsx        (mevcut header JSX'inden çıkarılır)
├── HeroSection.tsx          (kicker + başlık + CTA'lar, tabs YOK)
├── InteractivePageDemo.tsx  (YENİ — LandingHeroTabs + LandingMockup yerine)
├── PageRedefinedSection.tsx (§3 — "Bir chatbot değil, interaktif bir sayfa")
├── ExperienceFlowSection.tsx(§4 — 5 aşama: Tanıtır/Önceliklendirir/Dinler/Açılır/Yardımcı olur)
├── ActiveFlowsSection.tsx   (§5 — Kampanya + Survey akış diyagramları)
├── InteractionModesSection.tsx (§6 — Seçer/Keşfeder/Sorar/Tamamlar)
├── UseCasesSection.tsx      (§7 — ShowcaseSection'ın yerini alır, tam yolculuk gösterir)
├── SauleSection.tsx         (§8 — "Sayfanın arkasında Saule")
├── SetupSection.tsx         (§9 — LandingHeroTabs'ın "Kolay Kurulum" sekmesi buraya taşınır)
├── SocialTrafficSection.tsx (§10 — mevcut InstagramDMSection'ın sadeleştirilmiş hali)
├── PricingPreview.tsx       (§11 — mevcut pricing section, PLANS/EXTRA_PACK aynen)
├── FAQSection.tsx           (§12)
└── FinalCTA.tsx             (§13)
```

**Copy pattern:** Her section kendi `locale` copy objesini içinde tutar (ShowcaseSection/InstagramDMSection'daki mevcut pattern) — `page.tsx`'teki dev `landingCopy` blob'u dağıtılır, `page.tsx` sadece section'ları sırayla render eder + `locale` prop geçer.

### InteractivePageDemo.tsx — Detay Spesifikasyon

Scripted, deterministik mobil demo — gerçek backend/ChatWidget'a bağlı DEĞİL. `useState` ile sahne index'i (1-5), otomatik ilerleme veya tıkla-ilerle.

| Sahne | İçerik | Not |
|---|---|---|
| 1 — Biyografi | Foto, isim, uzmanlık, kısa bio, güven unsurları. Chat kutusu YOK. | "Önce sizi anlatır." |
| 2 — Aktif akış | Örnek kampanya kartı ("Ağustos yüz masajı programı") + "Kampanyayı incele" / "Ya da diğer seçenekleri keşfet" | Varyant: survey örneği de gösterilebilir |
| 3 — İlerleme seçenekleri | "Nasıl ilerlemek istersin?" + Masaj/Eğitim/Ürünler/Randevu/İletişim + "Bir soru yaz…" (mikrofon YOK) | Gerçek üründe bu liste dinamik (bkz. not aşağıda) |
| 4 — Sayfa tepki verir | Blok seçilirse: başlık+görsel+süre/kapsam+CTA kartı açılır. Soru sorulursa: yazılı cevap + yapısal alt-kartlar (format/tarih/link/CTA) | Chat balonu değil, sayfa içeriği |
| 5 — Yardım geri çekilir | Panel kapanır, küçük pasif yardım satırı kalır, bağlama göre mesaj değişir | Hizmet sayfası ≠ iletişim sayfası mesajı |

**Not (gerçek ürüne referans):** Sahne 3 ve 4, `useTalkinbioFlow` state machine'inin (Phase 1-3) INTENT_PROMPT ve CONTENT_OPEN/ANSWERING state'leriyle birebir örtüşüyor. Demo şu an scripted/sahte veriyle çalışacak ama görsel format gerçek ürünle daha sonra hizalanmalı.

### Kaldırılacaklar
- `LandingHeroTabs.tsx` (silinir)
- `LandingMockup.tsx` (silinir)
- `page.tsx` içindeki `landingCopy` mega-obje (section'lara dağıtılır)

### Eksik / Salı'ya Not
- Doküman şu an **sadece Türkçe** metin içeriyor. EN/RU çevirileri Salı'dan önce ya da Salı'nın ilk işi olarak hazırlanmalı (mevcut `page.tsx` üç dilde tam metin tutuyor, bu standart korunmalı).
- Demo sahne 3'teki kategori listesi (Masaj/Eğitim/Ürünler/Randevu/İletişim) landing'de sabit/örnek olarak kalabilir (bu bir demo, gerçek sayfa değil) — ama gerçek üründe (Phase 2/3) dinamik olmalı, bu ayrımı net tutmak gerekiyor.

---

## Başlama Tarihi
**Salı, 2026-08-05** (kredi tükenmiş, salı gün devam)

## Salı Günü Sıra Önerisi
1. Phase 1 (ActiveFlow type + Flow Controller) — ürünün temeli
2. Phase 2 (ProfileExperience + useTalkinbioFlow) — ürün UI
3. Phase 3 (Saule soru-cevap) — içerik
4. Phase 4 (sesli input kapatma) — küçük değişiklik
5. Phase 5 (Landing V2) — bağımsız, paralel de yapılabilir, farklı gün de olabilir

---

## Not
- Sesli input devre dışı bırakıldı
- Sesli output (Talkinbio cue notification) aktif kalıyor
- Landing/Survey block'ları user tarafından aktivate edilmediği sürece akış 2 atlanıyor
- Landing page (Phase 5) ürün akışından (Phase 1-4) bağımsız route/component ağacı — paralel ilerleyebilir
