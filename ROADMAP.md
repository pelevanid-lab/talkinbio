# Talkinbio Yol Haritası

> Vizyon: Bireysel çalışanların sosyal medya üzerinden yürüttüğü müşteri görüşmelerini
> uçtan uca handle eden agentic çözüm. **Beiwe** sayfa kurulumundan agentic marketing'e
> evrilecek; **Saule** web widget'ından gerçek sosyal medya kanallarına (WhatsApp → Instagram)
> taşınacak müşteri hizmetleri agent'ı.
>
> **Pusula belgeler** (hepsi Admin > Sürekli Gelişim sekmelerinde, statik olarak kodda —
> 2026-07-17'de kanvasın DB/AI-düzenleme katmanı kaldırıldı): **Yalın Kanvas** ("neden";
> `admin/continuous-improvement/page.tsx`), **Fermi Tahmini** ("ne kadar" — pazar boyutu,
> efektif ARPU, senaryolar; `.../fermi-estimation`), **Çekim Gücü Yol Haritası** ("ne
> zaman" — Maurya aşamaları, OMTM, pivot günlüğü; `.../traction-roadmap`) ve bu dosyanın
> kendisi ("nasıl" — `.../roadmap` sekmesi ROADMAP.md'yi render eder). Her faz dört
> belgeyle tutarlı olmalı; çelişki görüldüğünde ya plan ya ilgili belge güncellenir —
> sessizce ıraksamaya izin verilmez. Aylık denetim sorusu tutarlılık değil, "bu ay hangi
> varsayım GERÇEK müşteriyle test edildi?"dir (ayna-odası kuralı, 2026-07-17).
>
> Kapsam kararı (2026-07-16): Meta entegrasyonları (WhatsApp + Instagram DM) **v2'ye alındı**.
> v1, mevcut `ig.me`/`wa.me` handoff köprüsü + landing'de canlı Saule demosu + Beiwe'nin
> marketing agent'a ilk evrimi ile satışa çıkar. Meta başvuru evrakları (Business
> Verification vb.) geliştirmeden bağımsız olarak v1 sırasında başlatılır.
>
> Son güncelleme: 2026-07-17

## v1 — Faz özeti ve bağımlılıklar

| Faz | Başlık | Amaç | Ön koşul |
|-----|--------|------|----------|
| 0 | Hızlı düzeltmeler + model stratejisi | Bilinen bug'lar, ölü ayarlar, agent-bazlı model seçimi | — |
| 1 | Güven & denetim (Saule v1) | Sahibin konuşmaları görmesi, güvenli geçmiş, bilgi tabanı, landing'de canlı Saule demosu | Faz 0 |
| 2 | Agent çekirdeği refactor'u (hafif) | Agent'ların modülerleşmesi + taşınabilirlik kuralları, AI SDK güncellemesi, test altyapısı | Faz 1 |
| S | SEO & marka temelleri (~2 gün) | Favicon/metadata/sitemap/schema, Search Console, marka tescil taraması | — (herhangi bir faza paralel, erken yapılmalı) |
| P | Pilot & müşteri geliştirme (sürekli) | 20 problem görüşmesi, 10 ücretli pilot, manuel tahsilat — Aşama 1 OMTM'ini besleyen TEK iş | — (tüm fazlara paralel; kod işi değil takvim işi) |
| 3 | Beiwe → Marketing Agent | Konuşma madenciliği, içerik üretimi, haftalık rapor | Faz 2 |
| 4 | Satılabilir v1 kapısı | Maliyet koruması, kullanım ölçümü, faturalandırma | Lansman öncesi zorunlu |

## v2 — Kanal genişlemesi

| Faz | Başlık | Not |
|-----|--------|-----|
| 5 | WhatsApp kanalı | Meta evrak süreci v1 sırasında bitirilmiş olur |
| 6 | Instagram DM kanalı | App Review, Faz 5 biter bitmez tetiklenir |
| 7 | Dil/locale genişlemesi (ar/es/pt) | Fermi'nin MENA+LatAm hedefinin ön koşulu; kanal işinden bağımsız, paralel başlatılabilir |

---

# v1

## Faz 0 — Hızlı düzeltmeler + model stratejisi (~2-3 gün)

### 0.1 Agent-bazlı model yapılandırması
`src/utils/ai.ts` yeniden yazılır:

```ts
// Hedef API
getModel(task: 'beiwe' | 'saule' | 'analysis')
```

- Env değişkenleri: `AI_MODEL_BEIWE`, `AI_MODEL_SAULE`, `AI_MODEL_ANALYSIS`
  (hepsi boşsa `AI_MODEL` fallback'i, o da yoksa `claude-sonnet-4-5-20250929`).
- `claude-sonnet-5` → `claude-sonnet-4-5` alias'ı **kaldırılır** (artık gerçek bir
  model ID'si; alias sessizce eski modele düşürüyor).
- Varsayılan strateji: Saule = Sonnet 4.5 (hacimli, maliyet hassas);
  Beiwe = Sonnet 4.5 ile başla, tema tasarımı/bulk kurulum kalitesi yetersiz kalırsa
  env ile daha güçlü modele (`claude-opus-4-8` vb.) yükseltilebilir — kod değişikliği gerekmez.
- `analysis` görevi Faz 3'teki arka plan işleri için şimdiden tanımlanır.

### 0.2 `useBeiweSuggestions` veri şeması bug'ları
`src/hooks/useBeiweSuggestions.ts`:
- `aboutBlock.content?.text` → `content?.[locale]?.text` (hiç tetiklenmiyor).
- `item.image` → `item.mediaUrl` (hizmet görsel kontrolü hep false).
- Tema kontrolü `settings` tipli blok yerine `businesses.theme`'den okunmalı
  (hook'a `theme` parametresi eklenir; "tema eksik" uyarısı tema varken de görünüyor).

### 0.3 Ölü ayar: Özel Karşılama (customGreeting)
- `[username]/page.tsx` → `saule_settings.customGreetingEnabled && customGreeting`
  değerini `ChatWidget`'a prop olarak geçir.
- `ChatWidget.tsx` → `initialMessages` boşken welcome mesajı olarak kullan
  (yoksa mevcut `t('welcome')`).

### 0.4 Beiwe oturum arşivi bug'ı
Editörde "yeni sohbet"/arşivleme kalıcı değil: yeni oturum yalnızca istemcide üretiliyor
(`EditorClient.tsx handleNewChat`), DB'ye ilk mesajla yazılıyor; sayfa yenilenince aktif
oturum "DB'deki en yeni oturum" seçildiği için eski konuşma geri geliyor. Ayrıca
`setup_sessions`'ta arşiv bayrağı yok — eski oturum hep aktif olarak açılıyor.
- Yeni oturum oluşturulduğu anda `setup_sessions`'a upsert edilir.
- Migration `00016_setup_sessions_archive.sql`: `is_archived boolean default false`;
  arşivleme eylemi bayrağı set eder, editör açılışında arşivlenmemiş en yeni oturum
  (yoksa taze oturum) seçilir. Arşiv listesi arşivlenenleri ayrı gösterir.

### 0.5 AI beyan kuralı yumuşatma
`src/app/api/chat/route.ts` sistem prompt'u:
- "Asla yapay zeka veya bot olduğunu söyleme" →
  "Kendiliğinden gündeme getirme; ama doğrudan sorulursa dijital asistan olduğunu dürüstçe söyle."
- Gerekçe: AB AI Act + platform politikaları (v2'de Meta kanalları geldiğinde
  bot beyanı zaten zorunlu — şimdiden uyumlu olalım).

### Kabul kriterleri
- [x] Beiwe ve Saule farklı env modelleriyle çalıştırılabiliyor.
- [x] Öneri kartları gerçek veriyle doğru tetikleniyor (kısa about → uyarı; tema varken tema uyarısı yok).
- [x] Özel karşılama açıkken widget ilk mesajı sahibin yazdığı metin.
- [x] Editörde yeni sohbet açıp sayfayı yenileyince yeni (boş) oturum aktif kalıyor;
      arşivlenen oturum bir daha kendiliğinden açılmıyor.

---

## Faz 1 — Güven & denetim: Saule v1 (~1.5-2 hafta)

### 1.1 Konuşma transkripti ekranı (en öncelikli eksik)
Sahip, Saule'nin müşterilerle ne konuştuğunu görebilmeli.

**Migration `00019_conversation_metadata.sql`** (00017-00018'i lean canvas aldı)**:**
```sql
alter table conversations add column last_message_at timestamptz;
alter table conversations add column is_read boolean default false;   -- sahip için okundu bilgisi
alter table conversations add column is_preview boolean default false; -- sahibin editörden yaptığı test sohbetleri (1.7)
-- last_message_at chat route'ta her mesajda güncellenir (trigger veya uygulama kodu)
```

**UI — `dashboard/leads` sayfasına üçüncü sekme "Konuşmalar":**
- Sol liste: konuşmalar (son mesaj önizlemesi, zaman, okunmadı rozeti, bağlı lead varsa etiket).
- Sağ panel: tam transkript (ChatWidget'taki balon stilinin salt-okunur versiyonu).
- Lead kartından ilgili konuşmaya derin bağlantı (`conversation_id` zaten leads'te var).
- RLS zaten sahip select'ine izin veriyor (00001'deki policy'ler) — ek policy gerekmez,
  client-side Supabase sorgusu yeterli.

### 1.2 Sunucu tarafı mesaj geçmişi (güvenlik)
`/api/chat` şu an `messages` dizisini istemciden alıyor → ziyaretçi sahte
assistant mesajı enjekte edebilir.
- Route yalnızca **son kullanıcı mesajını** kabul eder.
- Geçmiş, DB'deki `messages` tablosundan kurulur (son N=30 mesaj, token bütçesi için).
- `ChatWidget` değişmez (useChat yine tüm diziyi yollar, sunucu yok sayar).
- Yan kazanım: kullanıcı sayfayı yenileyince kaldığı yerden devam mantığı
  tek kaynaktan (DB) beslenir.

### 1.3 Konuşma yaşam döngüsü
Şu an ziyaretçi başına sonsuza dek tek konuşma var — sayfaya her girişte aynı konu açılıyor.
- Kural: son mesajdan >7 gün geçmişse yeni konuşma açılır (aynı `visitor_session_id`).
- `[username]/page.tsx` geçmiş yüklerken yalnızca aktif (7 gün içi) konuşmayı getirir.
- Widget'a ziyaretçi için **"Yeni sohbet" butonu**: aktif konuşmayı kapatır, temiz
  oturum başlatır (eski konuşma sahibin transkript ekranında görünmeye devam eder).

### 1.4 Saule bilgi tabanı
Sahipler Saule'ye sayfada yazmayan şeyler öğretebilmeli (iptal politikası,
kampanya kuralları, "şu soruya şöyle cevap ver").

**Migration `00020_saule_knowledge.sql`:**
```sql
create table saule_knowledge (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade not null,
  title text,
  content text not null,
  is_active boolean default true,
  created_at timestamptz default now()
);
-- RLS: sahip full access; anon erişim yok (service role okur)
```

- UI: "Saule Ayarları" sekmesine "Bilgi Tabanı" bölümü — basit not listesi (ekle/düzenle/pasifleştir).
- Chat route sistem prompt'una `is_active` notlar eklenir.
- **RAG yok** — bu ölçekte gereksiz; toplam bilgi 4-5K token'ı aşarsa UI'da uyarı gösterilir.
  (İleride gerekirse pgvector zaten Supabase'de hazır.)

### 1.5 Yapılandırılmış randevu talepleri (takvim entegrasyonu DEĞİL)
- `capture_lead` tool'una opsiyonel `preferred_datetime: string` parametresi.
- Leads tablosuna `preferred_datetime text` kolonu; lead kartında ve e-postada gösterilir.
- Gerçek takvim entegrasyonu (Google Calendar) bilinçli olarak ertelendi → v2 adayı.

### 1.6 Landing'de canlı Saule demosu (dogfooding)
Ziyaretçi, satın alacağı şeyi landing'de bizzat deneyimler; Saule, Talkinbio'nun
kendi satış asistanı olur. **Yeni bir chat altyapısı YAZILMAZ** — Talkinbio'nun kendisi
sistemdeki bir işletme kaydı olur ve mevcut akış aynen kullanılır.

**Kurulum:**
- Rezerve `talkinbio` username'iyle özel bir business kaydı (seed migration
  `00021_talkinbio_demo_business.sql`; ID sabit env: `TALKINBIO_BUSINESS_ID`).
- İçeriği Beiwe ile kur (dogfooding #2): Hakkında = ürün tanıtımı, Hizmetler = özellikler
  /planlar, SSS = "Saule nedir, nasıl çalışır, fiyat ne olacak" tarzı satış soruları.
  Faz 1.4 bilgi tabanına satış senaryoları eklenir ("fiyat sorulursa erken erişimin
  ücretsiz olduğunu söyle ve erişim talebi almaya yönlendir" vb.).

**Landing entegrasyonu:**
- `LandingMockup.tsx` canlandırılır: mockup'taki statik Saule önizlemesi, gerçek
  `ChatWidget`'a bağlanır (`businessId = TALKINBIO_BUSINESS_ID`). Telefon mockup'ının
  kendisi çalışan ürün olur — "demo" ile "ekran görüntüsü" farkı satışın kendisidir.
- Widget zaten locale-aware; landing'in 3 dilinde çalışır.
- Mobilde mevcut bottom-sheet davranışı korunur; desktop'ta sheet yerine mockup
  çerçevesi içinde açılan kompakt varyant (ChatWidget'a `variant: 'inline'` prop'u).

**Dönüşüm akışı (mevcut davet hattına bağlanır):**
- `businessId === TALKINBIO_BUSINESS_ID` iken `capture_lead` yerine
  `capture_access_request(name, email, category)` tool'u devreye girer:
  - `onboarding_requests` tablosuna yazar → mevcut admin onay + davet e-postası
    akışına (admin/requests) sıfır yeni süreçle düşer.
  - Migration: `alter table onboarding_requests add column source text default 'form';`
    → Saule kaynaklı talepler `source = 'saule'` ile işaretlenir.
  - Ayrıca normal `leads` kaydı da atılır (raporlama tutarlılığı için).
- Saule demo prompt eki: amaç ürün sorularını cevaplamak + erişim talebi toplamak;
  ziyaretçi hazır olduğunda formu doldurtmak yerine sohbet içinde isim/e-posta al.

**Admin raporlama:**
- `admin/analytics` sayfasına "Landing Demo" bölümü: konuşma sayısı, mesaj sayısı,
  Saule kaynaklı erişim talebi sayısı ve dönüşüm oranı (konuşma → talep).
- `admin/requests` listesinde `source` rozeti (Form / Saule) — hangi kanalın
  dönüştürdüğü ilk günden ölçülür.

**Erken koruma (Faz 4'ten öne çekilen minimum dilim):**
- Landing, anonim trafiğe açık en riskli yüzey. Sadece demo business için,
  Faz 4'teki oturum-bazlı felsefeyle uyumlu hafif bir sürüm:
  konuşma başına cömert mesaj tavanı; tavan dolunca Saule kibarca "yeni sohbet
  başlatın" der veya `request-access`'e yönlendirir (blokaj değil, davet).
  Faz 4'teki genel altyapı geldiğinde bu geçici kontrol onunla değiştirilir.

### 1.7 Editör önizlemesinde gerçek Saule (sahip için canlı demo)
Editördeki telefon mockup'ının alt %30'luk sohbet alanı şu an statik süs
(`pointer-events-none`, sabit karşılama metni) — sahip kendi Saule'sini
yayınlamadan hiç deneyemiyor.
- Mockup'taki sahte sohbet alanı, Faz 1.6'da yapılan `ChatWidget` `inline`
  varyantıyla değiştirilir (aynı bileşen iki yere hizmet eder: landing + editör).
- **Test verisi izolasyonu:** sahibin editörden yaptığı konuşmalar `is_preview = true`
  ile işaretlenir (chat route'a `preview: true` bayrağı; yalnızca sahibin kendi
  işletmesi için kabul edilir — auth kontrolü). Preview konuşmaları:
  lead e-postası tetiklemez, Konuşmalar sekmesinde "Test" rozetiyle ayrı görünür,
  Faz 3 konuşma madenciliğinden ve admin raporlarından hariç tutulur.
- Sahip Saule ayarını (ton, bilgi tabanı) değiştirip önizlemede anında test edebilir —
  "kaydet → önizlemede dene" döngüsü Saule ayar sayfasının değerini artırır.

### 1.8 Saule imzası (kanvasın "Haksız Avantaj" Katman 1'i)
Kanvas, her Saule widget'ında bir imza vaat ediyor; kodda henüz yok. ChatWidget'ın
altına küçük, zarif bir "Saule ile konuşuyorsunuz — talkinbio.com" imzası eklenir
(3 dilde, UTM parametreli link). Ürün içi viral döngünün ilk tuğlası — birkaç
satırlık iş, dönüşüm ölçümü Faz S'teki Search Console + UTM ile yapılır.

### Kabul kriterleri
- [x] Sahip tüm konuşma transkriptlerini dashboard'dan okuyabiliyor, lead ↔ konuşma geçişi çalışıyor.
- [x] İstemciden gönderilen sahte geçmiş sunucuda yok sayılıyor (elle test: bozuk messages body'si).
- [x] Bilgi tabanına eklenen not, Saule'nin cevabında etkisini gösteriyor.
- [x] Landing'de ziyaretçi 3 dilde Saule ile konuşup ürün sorularına cevap alabiliyor.
- [x] Saule'nin topladığı erişim talebi admin/requests'te `saule` kaynağıyla görünüyor;
      onaylayınca mevcut davet e-postası akışı çalışıyor.
- [x] Demo mesaj tavanı dolunca Saule "yeni sohbet" veya `request-access` daveti yapıyor, sert blokaj yok.
- [x] Ziyaretçi widget'tan yeni sohbet başlatabiliyor; eski konuşma sahibin transkriptinde duruyor.
- [x] Editör önizlemesinde sahip kendi Saule'siyle gerçekten konuşabiliyor; bu test
      konuşmaları lead e-postası üretmiyor ve raporlarda "Test" olarak ayrışıyor.

---

## Faz 2 — Agent çekirdeği refactor'u, hafifletilmiş (~1 hafta)

Kanal entegrasyonları v2'ye alındığı için kapsam daraltıldı: amaç artık "kanal
hazırlığı" değil, Faz 3'ün (konuşma madenciliği, cron işleri) temiz bir çekirdeğe
yaslanması ve teknik borcun kapanması. `runSauleTurn` soyutlaması yine kurulur —
ucuz bir yatırım ve v2'de kanal eklemeyi adaptör yazmaya indirger.

### 2.1 Modül yapısı
```
src/agents/
├── saule/
│   ├── prompt.ts      # buildSaulePrompt(business, blocks, knowledge, settings, channel)
│   ├── tools.ts       # capture_lead, capture_access_request (channel-agnostik)
│   └── run.ts         # runSauleTurn({ businessId, channel, conversationKey, userMessage })
│                      #   → geçmişi DB'den kurar, streamText çağırır, mesajları persist eder
├── beiwe/
│   ├── prompt.ts
│   └── tools.ts       # setTheme, updateAbout, addServices... (şu an route içinde 300+ satır)
└── shared/
    └── history.ts     # DB'den konuşma geçmişi kurma, N-mesaj penceresi
```

- `/api/chat/route.ts` → ince web adaptörü: cookie'den `visitor_session_id` alır,
  `runSauleTurn(..., channel: 'web')` çağırır, stream döner.
- `channel` parametresi v1'de hep `'web'` — v2 kanalları için genişleme noktası
  olarak durur; `conversations` tablosuna şimdiden `channel text default 'web'`
  kolonu eklenir (ucuz, ileride backfill derdi olmaz).

**Taşınabilirlik kuralları (Saule ve Beiwe'nin başka projelerde yeniden kullanımı için):**
İki agent da ileride bağımsız ürün adayı (domainleri alındı). Bunu şimdi
overengineering yapmadan, iki ucuz tasarım kuralıyla garanti altına alıyoruz:
1. `src/agents/` modülleri **framework-bağımsız** kalır: içlerinde Next.js import'u
   (`next/headers`, `cookies` vb.) olmaz; DB istemcisi, ayarlar ve conversationKey
   dışarıdan parametre geçilir. Route dosyaları sadece ince adaptördür.
2. Veri erişimi yalnızca tool'ların execute fonksiyonlarında yaşar — başka bir
   projeye taşımada değişmesi gereken tek katman budur; kişilik/prompt,
   konuşma yönetimi ve kanal soyutlaması aynen taşınır.
İkinci bir tüketici proje gerçekten doğduğunda modüller monorepo paketine
(`@talkinbio/saule-core` gibi) veya API arkasına çıkarılır — o gün iş
"yeniden yazma" değil "paketleme" olur.

### 2.2 AI SDK güncellemesi (`ai` v3 → güncel major)
- **Bloke edici bug (Faz 0 testinde bulundu):** `ai@3.4.33` çekirdeği, `streamText`'e
  `temperature` verilmese bile `prepareCallSettings` içinde otomatik `temperature: 0`
  enjekte ediyor (`node_modules/ai/dist/index.js:1245`). `claude-sonnet-5` bu parametreyi
  değeri ne olursa olsun reddediyor ("`temperature` is deprecated for this model", 400).
  Eski SDK'da bunu atlamanın yolu yok — bu yüzden `.env.local`'da `AI_MODEL` geçici olarak
  `claude-sonnet-4-5-20250929`'a sabitlendi. **`claude-sonnet-5`'e geçiş bu SDK güncellemesini
  bekliyor**; güncelleme sonrası tekrar denenmeli.
- `streamText`/`tool`/`useChat` API'leri major sürümlerde değişti — migration rehberi
  takip edilerek yapılır; refactor'la aynı PR'da olmasın (ayrı, önce SDK sonra modül taşıma).
- Kazanımlar: `@ts-ignore`'lu Zod tip uyumsuzlukları çözülür, daha iyi tool-streaming,
  Faz 3'teki stream-dışı (cron) kullanım için `generateText` yolları netleşir.
- Not: Next.js 16 breaking changes — route dosyalarına dokunan her işte
  `node_modules/next/dist/docs/` altındaki ilgili rehber okunmalı (AGENTS.md kuralı).

### 2.3 Prompt caching + bağlam diyeti (birim maliyet hedefi)
Kanvasın hedefi sohbet başına ≤$0,02; Faz 0 testinde ölçülen gerçek: **~$0,026/mesaj**
(tek Saule mesajı 8,1K prompt token tüketiyor — sistem prompt'u tüm blokları 3 dilde,
pretty-print JSON olarak taşıyor). **Beiwe'de öncelik daha yüksek:** Faz 4.3 testinde
ölçülen gerçek maliyetler, Beiwe'nin her çağrıda ~18-19K token'lık sabit yük taşıdığını
gösterdi — küçük bir güncelleme bile tam bir BULK kurulumla neredeyse aynı maliyette
(~$0,12-0,15). Prompt caching burada Saule'den de kritik: sabit yük (mevcut bloklar +
kural seti) kısaltılmadan "güncelleme" kredi tier'i kalıcı olarak ince marjlı kalır.
Hedefe iki işle ulaşılır:
- **Bağlam diyeti:** bloklar yalnızca ziyaretçinin dilinde, kompakt formatta prompt'a girer
  (muhtemelen tek başına ~%50 azaltır). Faz 1.2'deki 30-mesajlık pencere de tarihçe
  büyümesini keser.
- **Prompt caching:** sistem prompt'u + bloklar konuşma boyunca sabittir; Anthropic prompt
  caching ile cache'lenmiş girdi ~10 kat ucuzlar. SDK güncellemesi (2.2) düzgün cache
  kontrolünün ön koşulu — bu yüzden bu madde Faz 2'de.
Doğrulama: Faz 4.2 `usage_events` ölçümü; kredi çarpanları (Saule 1 / Beiwe 3 / kurulum 10)
bu veriyle kalibre edilir.

### 2.4 Test altyapısı
- Vitest kurulumu; ilk hedefler:
  - `useBeiweSuggestions` (Faz 0'daki bug'ların regresyon testleri),
  - Beiwe tool execute fonksiyonları (Supabase mock'u ile upsert şekilleri),
  - `buildSaulePrompt` çıktısı (ayarların prompt'a yansıması: ton, bilgi tabanı, customGreeting),
  - `shared/history` pencere mantığı.
- CI: GitHub Actions ile `lint + test + build` (repo GitHub'da zaten).

### 2.5 Müşteri Dil Seçimi (Faz 7 Altyapısı)
- Faz 7'de sistem 6 dilli olduğunda maliyet (Beiwe token hacmi) ve editör karmaşasının patlamaması için, her işletme kendi vitrinine **en fazla 3 dil** seçebilecek kuralının altyapısı kurulur.
- İşletme sahipleri mevcut (tr, en, ru) diller arasından 1, 2 veya 3 dili aktif etme hakkına sahip olur. DB'de `active_locales` (veya benzeri) ile tutulur.

### Kabul kriterleri
- [x] Web widget ve landing demo davranışı refactor öncesiyle birebir aynı
      (manuel regresyon: karşılama, lead akışı, geçmiş, erişim talebi).
- [ ] `runSauleTurn` web dışı bir bağlamdan (test harness) çağrılabiliyor.
- [x] CI yeşil; agent modülleri için temel test kapsamı var.
- [ ] İşletme sahibi sayfası için aktif dilleri (maksimum 3) seçebiliyor.

---

## Faz S — Marketing (Sürekli, Paralel)

Talkinbio'nun görünürlüğünü, arama motoru otoritesini ve sosyal kanıtını inşa eden yapı taşı. Yalnızca organik trafik değil, aynı zamanda işletmelerin kendi müşterilerini çekeceği "vitrin" (Linktree büyüme modeli) işlevini de içerir.

### S.1 SEO ve Büyüme Temelleri
- **Sitemap & Otomatik İndeksleme:** Yayınlanan her yeni işletme profili (`is_published = true`) sitemap'e otomatik olarak eklenir. 
- **Locale-Bazlı Metadata (i18n):** Türkçe, İngilizce ve Rusça dilleri için özel `title` ve `description` tagleri üretilir. Hreflang etiketleriyle arama motorlarına doğru dil versiyonları sunulur.
- **Marka Araması Optimizasyonu:** Google Search Console ve Bing Webmaster entegrasyonu; marka (Talkinbio) aramalarında logo ve doğru site açıklaması (site-links) çıkartılması.
- **Microdata & JSON-LD:**
  - `Organization` şeması (Talkinbio'nun kendi kurumsal otoritesi için).
  - `LocalBusiness` şeması (Kullanıcıların kendi sayfalarının Google yerel aramalarda çıkması için — ürüne doğrudan satış argümanıdır).

### S.2 İçerik ve Otorite İnşası
- **Örnek Müşteri Hikayeleri:** Ücretli pilotların (`Faz P`) başarı hikayelerinin blog formatında yayınlanması.
- **Kullanım Senaryoları (Use Cases):** "Kuaförler için AI", "Danışmanlar için Randevu Asistanı" gibi sektörel dikey açılış sayfaları (Landing Page'ler) hazırlanması.
- **Backlink Stratejisi:** Dizinler, Product Hunt lansmanı ve indie-hacker forumlarında aktif görünürlük.

### S.3 Dönüşüm Oranı Optimizasyonu (CRO)
- **A/B Testleri:** Landing page üzerindeki "Erken Erişim" butonlarının yerleşimi ve metinlerinin dönüşüme etkisinin ölçülmesi.
- **Saule İmzası:** Müşterilerin widget'larında yer alan "Saule ile konuşuyorsunuz" imzasından gelen trafiğin (UTM parametreleri ile) ölçümlenmesi ve viral büyüme katsayısının (K-factor) izlenmesi.

### Kabul Kriterleri
- [ ] Zengin sonuç testi (Rich Results Test) tüm şemaları doğruluyor.
- [ ] Yayınlanan her profil sitemap'te yer alıyor ve Search Console'da indeksleniyor.
- [ ] UTM ile gelen trafik ve widget imzası dönüşümleri admin panelinde izlenebiliyor.

---

## Faz P — Customer Operations (Sürekli, Paralel)

Mühendislik işlerinden bağımsız, Çekim Gücü (Traction) Yol Haritasının kalbini oluşturan ve "Müşteri ödemeye hazır mı?" riskini test eden operasyonel aşama. Ürün geliştirmeyi beklemek yerine, erken aşama manuel operasyonlarla döngüyü tamamlar.

### P.1 Problem Görüşmeleri & Geri Bildirim Döngüsü
- **Hedef Kitle Teması:** Sürekli olarak hedef segmentle (randevu bazlı, DM'den müşteri alan hizmet verenler) görüşmeler yapılması.
- **Kanıt Toplama:** Çözüm göstermeden, yaşanan mevcut DM yükünün ve kaçan potansiyel müşterilerin acı noktasının dinlenmesi.
- **Fiyat Testi:** Görüşme sonunda doğrudan "$9/ay öder miydin?" sorusuyla fiyat hassasiyetinin ölçülmesi ve Pivot Günlüğü'ne işlenmesi.

### P.2 Ücretli Pilot (Concierge Onboarding)
- **Ücretsiz Deneme YOK:** Ürünün gerçek değerini test etmek için ilk günden ücret alınması. 
- **Manuel Tahsilat & Kurulum:** Fatura altyapısı (Stripe/Iyzico) hazır olana kadar tahsilatların manuel yapılması.
- **Birlikte Kurulum:** İlk 10 müşterinin Beiwe kurulumunun doğrudan ekibimiz eşliğinde (Concierge Onboarding) 10 dakika içinde yapılması.
- **Değer İspatı:** 30 günün sonunda müşteriye "gerçekte kaç lead toplandığı" ve "zaman tasarrufu" metrikleriyle ROI (Yatırım Getirisi) gösterimi.

### P.3 Sürekli Denetim ve Ritim
- **Ayna-Odası Kuralı:** Mühendislik illüzyonuna düşmemek için her ay sorulan kritik soru: "Bu ay hangi varsayım GERÇEK müşteriyle test edildi?"
- **Haftalık Gözden Geçirme:** Pilot işletmelerin Saule üzerinden aldıkları konuşma transkriptlerinin ve lead verilerinin kalitesinin haftalık olarak incelenmesi.

### Kabul Kriterleri
- [ ] 20 problem görüşmesi tamamlandı, bulgular pivot günlüğüne eklendi.
- [ ] İlk 10 ücretli pilot işletme yayında ve ödemeleri manuel olarak tahsil edildi.
- [ ] "Müşteri para öder mi?" varsayımı (Çekim Gücü Aşama 1) kesin olarak Doğrulandı/Çürütüldü olarak işaretlendi.

---

## Faz R — Takım & Büyüme Kaynakları (Sürekli, Paralel)

Ürün (Faz 1-3) ve Pazarlama (Faz S-P) süreçlerinin altından kalkabilmek ve uluslararası ölçeklenmeyi (Faz 7) sağlayabilmek için çekirdek takımın ve stratejik partnerlerin kurgulanması.

### R.1 Lokal Geliştirme Partnerleri
- **Erken Aşama:** Ukrayna ve Kazakistan (Rusça bölgesi) için ürünün büyümesini, müşteri diyaloglarını ve satışını üstlenecek yerel (local) partnerlerle anlaşılması.
- **Global Genişleme (Faz 7'ye paralel):** Arapça, İspanyolca ve Portekizce dilleri için; özellikle MENA ve Latin Amerika (LatAm) bölgelerinden o kültürün dinamiklerine hakim "Country Manager" vari yerel partnerlerin bulunması. Müşteri destek ve go-to-market süreçlerinin doğrudan bu partnerler aracılığıyla yerelleştirilmesi.

### R.2 Çekirdek Mühendislik ve AI Uzmanlığı
- **İhtiyaç:** Faz 2'deki Agent Çekirdeği Refactor'ü ve Faz 3'teki pazarlama asistanı (Marketing Agent) geçişi için, Vercel AI SDK ve LLM prompt mühendisliği (caching, context diyet) konularında uzman, gerektiğinde danışmanlık/yarı zamanlı destek alınabilecek bir AI/Next.js mühendisi.
- **Hedef:** Kurucunun üzerindeki teknik yükü hafifletip, kurucunun Faz P (Problem Görüşmeleri) ve bizzat yürüteceği müşteri onboarding süreçlerine tam ağırlık verebilmesini sağlamak.

### Kabul Kriterleri
- [ ] Ukrayna ve Kazakistan pazarında ürün satışını/desteğini üstlenecek ilk partnerlerle anlaşıldı.
- [ ] Çekirdek teknik yükü hafifletecek AI/Next.js uzmanı/danışmanı ile çalışılmaya başlandı.

---

---

## Faz 3 — Beiwe → Marketing Agent (~2-3 hafta)

Beiwe'nin "kurulum sihirbazı"ndan "pazarlama danışmanı"na ilk gerçek adımları.
Üç ayak — hepsi Beiwe'nin zaten sahip olduğu yapılandırılmış veriden beslenir.
Meta entegrasyonunun v2'ye alınmasıyla v1'in ana farklılaştırıcısı bu faz oldu.

### 3.1 Konuşma madenciliği → içerik önerileri (iki agent'ı bağlayan döngü)
- Haftalık arka plan işi (Vercel Cron → `/api/cron/analyze-conversations`):
  - Son 7 günün Saule konuşmalarını `analysis` modeliyle işler:
    cevaplanamayan sorular, sık sorulan konular, kaçan lead'ler.
  - Çıktı: `beiwe_insights` tablosu (business_id, type: 'faq-suggestion' | 'content-gap' | 'trend', payload jsonb, status).
- Editor'de "Beiwe Önerileri" paneli: "Müşterileriniz bu hafta 4 kez fiyat listesi sordu —
  Hizmetler bölümüne fiyat ekleyelim mi?" → tek tıkla Beiwe sohbetine trigger mesajı
  (mevcut `useBeiweSuggestions` kart altyapısı yeniden kullanılır; rule-based öneriler
  ve AI-insight önerileri aynı panelde birleşir).

### 3.2 İçerik stüdyosu (sosyal medya üretimi)
- Dashboard'a "İçerik" sayfası: bloklardan (hizmet, yorum, galeri) Instagram
  gönderi metni / story metni / WhatsApp durum önerisi üretimi.
- Beiwe tool'ları: `generatePostIdeas`, `draftCaption` (3 dilde, işletme tonunda).
- v1'de yalnız metin; görsel şablon üretimi bilinçli olarak kapsam dışı.

### 3.3 Haftalık özet e-postası
- Vercel Cron + Resend (doğrulanmış domain hazır ✅):
  yeni lead sayısı, konuşma sayısı, en sık sorular, Beiwe'nin haftanın önerisi.
- Ön koşul: basit sayfa görüntülenme sayacı — **migration `00022_page_views.sql`**
  (business_id, günlük tekilleştirilmiş sayaç; `[username]/page.tsx` server-side artırır).

### Kabul kriterleri
- [ ] Cron haftalık çalışıyor; en az bir gerçek konuşma setinden anlamlı FAQ önerisi çıkıyor.
- [ ] Öneri kartından tek tıkla Beiwe sohbetinde ilgili blok güncelleniyor.
- [ ] Haftalık e-posta gerçek verilerle sahibe ulaşıyor.

---

## Faz 4 — Satılabilir v1 kapısı: maliyet koruması + ölçüm + faturalandırma (~1-2 hafta)

**Lansmandan önce zorunlu** (bilinçli olarak ertelendi — test kolaylığı için).

### 4.1 Kötüye kullanım koruması
**Felsefe:** Gelir 2. taraftan (işletme sahibi) gelir; ziyaretçi limitleri gelir aracı
değil, kötü niyetli 3. taraflara karşı kalkandır. Bu yüzden limitler **oturum (konuşma)
bazlıdır ve gerçek ziyaretçiyi hissettirmeyecek kadar cömerttir**; asıl koruma,
gerçek kullanıcının hiç karşılaşmayacağı hız sınırlarındadır.

- **Oturum içi tavan (cömert):** konuşma başına maksimum mesaj (ör. 50) —
  dolunca sert blokaj YOK: Saule "dilerseniz yeni bir sohbet başlatalım" der,
  tek tıkla yeni oturum açılır (Faz 1.3'teki "Yeni sohbet" akışı), bağlam sıfırlanır.
- **Oturum açma hızı sınırı (asıl kalkan):** ziyaretçi başına yeni oturum açma
  hızı sınırlanır (ör. saatte 3-4 yeni oturum) — oturum tavanını sıfırlayarak
  dolaşan botları keser, gerçek ziyaretçi bu sınıra pratikte hiç çarpmaz.
- **Kısa vadeli hız sınırı:** ~20 mesaj / 10 dk (script'lenmiş flood'a karşı).
- **İşletme başına günlük toplam tavan** (plana göre) — sahibin faturasını korur;
  dolduğunda ziyaretçiye kibar bir "doğrudan iletişim" yönlendirmesi (handoff linkleri).
- Girdi sınırı: mesaj başına maksimum karakter (Saule 2K, Beiwe bulk 50K) —
  oturum içi deneyimi kısıtlamak için değil, tek istekte token bombasını kesmek için.
- Altyapı: Upstash Redis veya Supabase tabanlı sayaç.
- Faz 1.6'daki landing'e özel geçici tavan bu genel altyapıyla değiştirilir.
- v2 kanalları geldiğinde aynı sayaçlar `conversationKey` üzerinden çalışır.

### 4.2 Kullanım ölçümü
- `usage_events` tablosu: business_id, agent ('beiwe'|'saule'), channel, input/output token,
  model, created_at. `streamText`/`generateText` `usage` çıktısından yazılır.
- Admin analytics'e maliyet panosu (işletme başı aylık token/₺ tahmini).
- Kritik: **model-bazlı fiyat farkını görünür kılar** — Beiwe'ye güçlü model verme
  kararı (Faz 0.1) veriyle test edilir.

### 4.3 Plan/faturalandırma — kredi modeli (kanvasla hizalandı, gerçek maliyetle doğrulandı)
Kanvasın kilitli "Gelir Kalemleri" kutusundaki model uygulanır:
- **Planlar:** Starter $9 → 200 kredi | Pro $29 → 700 | Business $79 → 1.800;
  yıllık ödemede %20 indirim; ek kredi paketi $5 → 100 (birim pahalı — plana yükseltme teşviki).

- **Kredi çarpanları — GERÇEK ÖLÇÜM (2026-07-16, Uliana Pehlivan test hesabı, Sonnet 4.5
  $3/$15 per MTok):**

  | Eylem | Kredi | Gerçek maliyet | Kredi fiyatı ($0,045/kredi) | Maliyet oranı |
  |---|---|---|---|---|
  | Saule sohbeti | 1 | $0,026 (8.139 girdi + 136 çıktı token) | $0,045 | %58 |
  | Beiwe güncelleme (tek alan) | 3 | **$0,121** (37.395 girdi + 571 çıktı, 2 adım) | $0,135 | **%89** |
  | Beiwe kurulum (tam BULK: tema+iletişim+hakkımda+hizmetler+saatler+SSS) | 10 | **$0,147** (39.481 girdi + 1.921 çıktı, 2 adım) | $0,45 | %33 |

  **Şaşırtıcı bulgu — varsayılan 1:3:10 oranı gerçekle ters düşüyor:** "güncelleme" ile
  "kurulum" neredeyse aynı maliyette (~$0,12-0,15) çünkü Beiwe'nin sistem prompt'u
  (mevcut bloklar JSON + sektör profili + 11 maddelik kural seti) ~18-19K token'lık **sabit
  yük** taşıyor — kullanıcı tek bir çalışma saati güncellemesi bile istese bu yük aynen
  gönderiliyor. Gerçek oran Saule:güncelleme:kurulum ≈ 1 : 4,6 : 5,6 — tasarımdaki 1:3:10
  değil. Sonuç: küçük güncellemeler kredi başına en ince marjlı (%89 maliyet oranı, %11
  marj) eylem; kurulum ise en sağlıklısı (%33 maliyet oranı).
  **En kötü senaryo stres testi:** 200 kredinin tamamı yalnızca güncellemeye harcansa
  (66 işlem × $0,121 = $8,05 gerçek maliyet) $9 fiyata karşı hâlâ pozitif ama çok ince
  bir marj (%11) — zarar değil, ama tampon yok. Kredi tavanı doğal bir zarar-durdurucu
  işlevi görüyor.
  **Aksiyon:** çarpanlar bu gerçek ölçümle yeniden kalibre edilmeli (ör. güncelleme
  3→5, kurulum 10→6 gibi gerçek orana yakınsatılmalı) VEYA (tercih edilen) Faz 2.3'teki
  prompt caching Beiwe'nin ~18K sabit yükünü küçültsün — küçük güncellemelerin asıl
  sorunu çarpan değil, her çağrıda tekrar ödenen sabit maliyet. `usage_events` (4.2)
  bu kalibrasyonu üretimde sürekli doğrulayacak.

- **Ürün gereksinimi (2026-07-16, Enes onayı) — kabul kriteri:** Starter paketi alan bir
  kullanıcı (a) sayfasını en az bir kez oluşturabilmeli, (b) deneme yanılmayla **birkaç kez**
  yeniden oluşturabilmeli/düzenleyebilmeli, (c) Saule'yi de bir miktar deneyimleyebilmeli —
  hepsi 200 kredi içinde. Gerçek sayılarla model: 3× kurulum (30 kredi, $0,44) + 15
  etkileşimli güncelleme (45 kredi, $1,81) + 20 Saule mesajı (20 kredi, $0,53) = 95/200
  kredi, ~$2,78 gerçek maliyet → $9 fiyata karşı %31 maliyet oranı, %69 marj. **Bu senaryo
  200 kredi içinde rahatça ve kârlı şekilde karşılanıyor** — asıl risk yukarıdaki
  "yalnızca güncelleme" uç senaryosunda, tipik kullanımda değil. Faz 4'te bu senaryo
  gerçek `usage_events` verisiyle otomatik bir kabul testine dönüştürülmeli (yeni hesap →
  kurulum + N düzenleme + M Saule mesajı → toplam maliyet fiyatın altında kalıyor mu?).
- **Kredi devri:** kullanılmayan krediler devreder, bakiye tavanı 2 aylık kota.
- **Fiili ücretsiz katman:** kredi bitince asistan kapanmaz — sayfa + "mesaj bırakın" modu
  (LLM'siz lead toplama) yaşar; ziyaretçi duvara çarpmaz, viral imza döngüsü (1.8) beslenmeye
  devam eder, sahip yükseltmeye nazikçe itilir.
- `businesses.plan` + kredi bakiyesi kolonları; limit enforcement 4.1 sayaçlarına bağlanır;
  kredi tüketimi dashboard'da şeffaf gösterilir.
- **Fiyatlama kararı (2026-07-17, Enes):** fiyatlar **dolara sabittir**; TL tahsilat
  güncel kur üzerinden yapılır, lokal sabit TL fiyat yoktur (girdi maliyetleri dolar).
  Birim ekonomi hesapları ($0,045/kredi) dolar bazında geçerliliğini korur; kur riski
  gelir tarafında değil churn tarafındadır (Fermi V.1.1 risk tablosu). Kanvastaki
  açık fiyat sorusu bu kararla kapandı — Gelir Kalemleri kutusuna işlenmeli.
- Ödeme sağlayıcı kararı (iyzico vs Stripe) hâlâ açık — dolar-sabit fiyat + TL tahsilat
  kombinasyonunu destekleyen sağlayıcı seçilmeli (ayrı araştırma maddesi).
- Mevcut admin "subscriptions" sayfası gerçek veriye bağlanır.

### Kabul kriterleri
- [ ] Oturum tavanı dolunca tek tıkla yeni sohbete geçilebiliyor; sert blokaj yalnızca
      hız sınırlarında ve token harcamadan devreye giriyor.
- [ ] Admin panelde işletme başına gerçek token maliyeti görünüyor.
- [ ] Plan limitleri uçtan uca enforce ediliyor.

---

# v2 — Kanal genişlemesi (Meta entegrasyonları)

> **v1 sırasında yapılacak tek şey evrak:** Meta Business Verification + Tech Provider
> başvurusu ücretsizdir ve haftalar sürer. Geliştirme v2'de başlar ama onaylar v1
> biterken hazır beklemeli — tersi değil.

## Faz 5 — WhatsApp kanalı (~2-3 hafta geliştirme)

Saule'nin ilk gerçek sosyal medya kanalı. Instagram'dan önce WhatsApp:
API erişimi çok daha kolay, Türkiye pazarında müşteri iletişiminin ana kanalı.

### 5.0 Stratejik karar (kodlamadan önce netleşmeli)
İki model var:

| Model | Nasıl | Artı | Eksi |
|-------|-------|------|------|
| **A. Embedded Signup (önerilen)** | Talkinbio, Meta "Tech Provider" olur; her işletme kendi numarasını OAuth benzeri akışla bağlar | İşletmenin kendi numarası, ölçeklenebilir, doğru ürün | Meta onayları (v1'de evrakla çözülür), geliştirme yükü |
| B. Merkezi numara | Tek Talkinbio numarası, mesajlar prefix/işaretle işletmeye yönlendirilir | Hızlı prototip | Müşteri deneyimi kötü, ölçeklenmez, marka karışıklığı |

Geliştirme, tek test numarasıyla (Meta test WABA) yapılır.

### 5.1 Altyapı
- `POST /api/webhooks/whatsapp` — Meta webhook (GET verify + POST mesaj alımı).
  - İmza doğrulama (`X-Hub-Signature-256`).
  - Webhook stream desteklemez → `runSauleTurn` (Faz 2'de kuruldu) stream'siz modda
    (`generateText`) çalışır, cevap Graph API `messages` endpoint'iyle gönderilir.
- **Migration `000XX_channel_accounts.sql`:**
```sql
create table channel_accounts (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade not null,
  channel text not null,              -- 'whatsapp' | 'instagram'
  external_id text not null,          -- phone_number_id / ig business id
  access_token text,                  -- şifrelenmiş saklama (Supabase Vault)
  status text default 'pending',
  created_at timestamptz default now(),
  unique (channel, external_id)
);
```
- Gelen mesaj → `external_id` ile işletme bulunur → `conversationKey = 'wa:<gönderen>'`.

### 5.2 WhatsApp'a özgü kurallar
- **24 saat penceresi:** müşterinin son mesajından 24 saat sonra serbest metin gönderilemez;
  yalnızca onaylı template. İlk sürüm kuralı: pencere dışında Saule cevap üretmez,
  sahibe "cevaplanmamış mesaj" bildirimi düşer (dashboard + e-posta).
- Mesaj tipleri: ilk sürümde yalnız metin; medya (görsel alma) sonraki iterasyon.
- Saule prompt'una `channel: 'whatsapp'` bilgisi → daha kısa, mesajlaşma-uyumlu üslup;
  markdown yok (WhatsApp formatına uygun kalın/italik).

### 5.3 Sahip deneyimi
- Dashboard'a "Kanallar" sayfası: WhatsApp bağla (Embedded Signup akışı), durum, bağlantıyı kes.
- Faz 1'deki Konuşmalar sekmesi kanal filtresi kazanır (Web / WhatsApp rozetleri).
- Lead kaydı kanaldan bağımsız aynı akışla çalışır (`capture_lead` zaten kanal-agnostik).

### Kabul kriterleri
- [ ] Test numarasına atılan WhatsApp mesajına Saule cevap veriyor; konuşma ve lead DB'de.
- [ ] 24 saat penceresi dışında serbest mesaj denenmiyor; sahip bilgilendiriliyor.
- [ ] Transkript ekranında WhatsApp konuşmaları görünüyor.

## Faz 6 — Instagram DM kanalı (~2-4 hafta geliştirme + Meta onay süresi)

Vizyonun kalbi; mimari olarak Faz 5'in kopyası, zorluk Meta süreçlerinde.

- Gereksinimler: IG professional hesap + bağlı Facebook Page,
  `instagram_manage_messages` izni için **App Review**, Business Verification.
  → **App Review başvurusu Faz 5 biter bitmez (mümkünse Faz 5 sırasında) yapılmalı.**
- `POST /api/webhooks/instagram` — Messenger Platform (Instagram Messaging) webhook'u;
  `channel_accounts` tablosu ve `runSauleTurn` aynen kullanılır (`conversationKey = 'ig:<IGSID>'`).
- Instagram'a özgü kurallar: 24 saat cevap penceresi (human agent istisnası 7 gün),
  "ice-breaker" karşılama menüsü, story mention/reply tetikleyicileri (sonraki iterasyon).
- **Mevcut `ig.me` handoff akışı korunur** — API bağlamayan işletmeler için fallback olarak kalır.
  `source_username` yakalama, API'li işletmelerde otomatik eşleşmeye evrilir.

### Kabul kriterleri
- [ ] Bağlı bir IG hesabının DM'ine Saule cevap veriyor.
- [ ] API bağlamamış işletmelerde eski handoff akışı bozulmadan çalışıyor.

## Faz 7 — Dil/locale genişlemesi: ar / es / pt

Fermi V.1.1'in global senaryosu ($810K baz, $1,6M stretch) tamamen MENA+LatAm'a dayanır
ve bu pazarlar Arapça/İspanyolca/Portekizce olmadan adreslenemez — v2 "iş modelinin
kendisi" ise dil genişlemesi onun ön koşuludur. Kapsam (detaylandırılacak):
- next-intl locale rotalarına ar/es/pt eklenmesi; `messages/*.json` çevirileri.
- Blok içerik şeması bugün tr/en/ru üçlüsüne gömülü (Beiwe tool'ları 3 dilde üretir,
  ChatWidget imzası 3 dilde) — şema esnetilmeli veya hedef locale seti genişletilmeli.
- **Maksimum 3 Dil Kuralı:** Sistem toplamda 6 dile çıksa bile, her müşteri/işletme kendi sayfası için en fazla 3 aktif dil seçebilir. Aksi halde Beiwe'nin her işlemde 6 dil üretmesi inanılmaz bir LLM maliyeti yaratır ve editör tarafını kontrol edilemez hale getirir. Bu kuralın altyapısı önceden Faz 2'de (2.5) atılır.
- Arapça için RTL düzen desteği (ayrı tasarım işi — en maliyetli kalem).
- Saule zaten model seviyesinde çok dilli; asıl iş UI + içerik şeması tarafında.
- Kanal işinden (Faz 5-6) bağımsızdır; Meta onayları beklerken paralel yürütülebilir.

---

## Kapsam dışı (bilinçli ertelenenler)

- **Takvim entegrasyonu** (Google Calendar randevu yazma) — v2 adayı; şimdilik
  yapılandırılmış randevu talebi (Faz 1.5) yeterli.
- **RAG / vektör arama** — bilgi tabanı token bütçesini aşarsa gündeme gelir (pgvector hazır).
- **Görsel içerik üretimi** (story şablonları) — İçerik stüdyosu v2.
- **Telegram kanalı** — Bot API onay gerektirmediği için v2'nin en ucuz kanal kazanımı;
  `channel_accounts` mimarisi hazır olduğunda hızlıca eklenebilir, hatta Meta onayları
  gecikirse Faz 5'ten öne alınabilir.

## Riskler

| Risk | Etki | Önlem |
|------|------|-------|
| Meta evrak süreci v1 sırasında ihmal edilirse | v2 başlangıcı haftalarca bloke | Business Verification / Tech Provider başvurusu v1'in ilk haftalarında yapılır (Faz 0-1 sırasında, geliştirmesiz) |
| AI SDK major migration (2.2) | Widget/stream regresyonları | Ayrı PR; Faz 1'deki transkript ekranı + landing demo regresyon testi olarak kullanılır |
| Landing demosu anonim trafiğe açık | Token maliyeti | Faz 1.6'daki oturum başına mesaj tavanı; Faz 4'te genel altyapıyla değiştirilir |
| Tek geliştirici bant genişliği | Fazların uzaması | Faz 3 (marketing) bağımsız modüller halinde; gerekirse 3.2/3.3 lansman sonrasına kayabilir |
