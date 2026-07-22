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
> Son güncelleme: 2026-07-18 (Faz 2 tamamlandı; Faz H eklendi; SEO canonical/hreflang
> bug'ı düzeltildi; Faz 3 hazırlığı — migration numarası, cron altyapısı, `generateText`
> yolu, `/legal` revizyonu — tamamlandı; H.1 "her şeyin ön koşulu" çerçevesi düzeltildi:
> tetikleyici artık ilk ödeme taahhüdü, Faz P başlamadan önce değil; Faz 3 tamamlandı —
> konuşma madenciliği, içerik stüdyosu, haftalık özet e-postası; Faz 4.1 tamamlandı —
> kötüye kullanım koruması, Supabase tabanlı sayaç, Faz 1.6'nın demo-özel geçici
> tavanının yerini aldı; Faz 4.2 tamamlandı — usage_events, admin maliyet panosu;
> Faz 4.3'ün kod kısmı tamamlandı — kredi modeli, fiili ücretsiz katman, /pricing
> geçici "bize ulaşın" sayfası, admin/subscriptions; ödeme sağlayıcı H.1'i bekliyor;
> Faz 4.4 tamamlandı — Resend tabanlı notifyAdmin, /api/health, cron başarısızlık
> bildirimi, migrationlar Supabase'e uygulandı, UptimeRobot canlıda doğrulandı,
> hata izleme Vercel Logs üzerinden; Faz 4 (4.1-4.4) baştan sona tamamlandı;
> Resend gönderici adresi doğrulanmış domaine çevrildi; kod dondurulup Faz T
> — Uliana pilot test dönemi — başladı, ~3 hafta sürecek)

## v1 — Faz özeti ve bağımlılıklar

| Faz | Başlık | Amaç | Ön koşul |
|-----|--------|------|----------|
| 0 | Hızlı düzeltmeler + model stratejisi | Bilinen bug'lar, ölü ayarlar, agent-bazlı model seçimi | — |
| 1 | Güven & denetim (Saule v1) | Sahibin konuşmaları görmesi, güvenli geçmiş, bilgi tabanı, landing'de canlı Saule demosu | Faz 0 |
| 2 | Agent çekirdeği refactor'u (hafif) | Agent'ların modülerleşmesi + taşınabilirlik kuralları, AI SDK güncellemesi, test altyapısı | Faz 1 |
| S | SEO & marka temelleri (~2 gün) | Favicon/metadata/sitemap/schema, Search Console, marka tescil taraması | — (herhangi bir faza paralel, erken yapılmalı) |
| P | Pilot & müşteri geliştirme (sürekli) | 20 problem görüşmesi, 10 ücretli pilot, manuel tahsilat — Aşama 1 OMTM'ini besleyen TEK iş | — (tüm fazlara paralel; kod işi değil takvim işi) |
| R | Takım & büyüme kaynakları (sürekli) | Lokal partnerler (UA/KZ, sonra MENA/LatAm), AI/Next.js danışmanlığı | — (paralel) |
| H | Hukuk & kurumsallaşma (sürekli) | Şirket kuruluşu (tetikleyici: ilk ödeme taahhüdü, ~5 iş günü sürer), KVKK/GDPR revizyonu, kullanım şartları, çerez/saklama politikaları | — (paralel; şirket kuruluşu Faz P *başlamadan önce* değil, P.1'de ilk "evet, öderim" alındığında tetiklenir — ay sonu tahsilatına yetişir; Faz 4 lansmanının ön koşulu) |
| 3 | Beiwe → Marketing Agent | Konuşma madenciliği, içerik üretimi, haftalık rapor | Faz 2 |
| 4 | Satılabilir v1 kapısı | Maliyet koruması, kullanım ölçümü, faturalandırma | Lansman öncesi zorunlu |
| T | Uliana pilot test dönemi (~3 hafta, paralel) | Kod dondurma; gerçek 3. taraf müşterilerle canlı doğrulama, izleme listesi | Faz 4 (kod tamamlandı, 2026-07-18) |

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

**1.1.1 Arşivleme & silme (2026-07-18, kullanıcı talebi):** işletme sahibi kendi talep
(lead) ve konuşma kayıtlarını arşivleyebilmeli ya da kalıcı olarak silebilmeli — bir
ziyaretçi verisinin silinmesini istediğinde bu, legal metnin (H.2) vaat ettiği "talep
işletme sahibine yönlendirilir" akışının fiili karşılığı.
- **Migration `00027_leads_conversations_archive.sql`:** `leads.is_archived` ve
  `conversations.is_archived` (`default false`) eklendi; `leads`'te zaten "for all" RLS
  policy vardı (00001), `conversations`'a update+delete policy eklendi (önceden yalnızca
  select vardı). `messages.conversation_id` `on delete cascade` olduğundan konuşma
  silinince mesajlar da otomatik gidiyor. **Elle Supabase'e uygulanmalı** (önceki
  fazlardaki gibi, bu oturumda otomatik push edilmedi).
- UI: Talepler ve Konuşmalar listelerinde her kayda arşivle/arşivden çıkar (📦) ve kalıcı
  sil (🗑, `window.confirm` onaylı) ikon butonları; arşivlenenler varsayılan listeden
  gizlenir, "Arşivlenenleri gör (N)" linkiyle ayrı görünüme geçilir
  ([LeadsClient.tsx](src/app/[locale]/dashboard/leads/LeadsClient.tsx),
  [ConversationsPanel.tsx](src/app/[locale]/dashboard/leads/ConversationsPanel.tsx)).
- Doğrulama: typecheck + 29 test yeşil. Tarayıcıda gerçek tıklama testi yapılmadı —
  yalnızca kullanıcı isterse.

**1.1.2 Not alanı + geri bildirim çağrısı (2026-07-18):** Kullanıcı, tam bir CRM katmanı
(müşteri/lead ayrımı, etiketleme, ticket sistemi, hizmet geçmişi) istedi; tartışma
sonucunda **bilinçli olarak ertelendi** — gerekçe: (a) Paydaşlar sayfasının (q3) kendi
konumlandırması "büyük CRM'ler aşırı karmaşık, biz basitiz" diyor, tam CRM bu farkı
aşındırma riski taşıyor; (b) ayna-odası kuralı — Faz P'nin 20 görüşmesi henüz
yapılmadı, bu özelliklerin gerçek pilot ihtiyacı olduğu doğrulanmadı. **Şimdilik yalnızca
tek bir quick win yapıldı:**
- Migration `00028_leads_notes.sql`: `leads.notes text` — işletme sahibi her talep
  kartına serbest metin not düşebiliyor (ziyaretçi görmüyor, transkriptten bağımsız).
  UI: kart içi textarea, blur'da kaydediyor (`LeadsClient.tsx`).
- Panel'e (tüm sekmelerde görünen) kalıcı bir geri bildirim çağrısı eklendi: "Talkinbio
  sürekli gelişen bir uygulama..." + `info@talkinbio.com` mailto linki (`LeadsClient.tsx`
  footer).
- Doğrulama: typecheck + 29 test yeşil.
- **Kapsam dışı bırakılanlar (Faz P geri bildirimiyle yeniden değerlendirilecek):**
  lead/müşteri stage ayrımı, etiketleme, ayrı `tickets` tablosu, son hizmet tarihi/tekrar
  sayacı, durgunluk göstergesi, duplicate tespiti. Öneri hazır (bu konuşmada tartışıldı),
  kod yazılmadı.

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

> **Üretimde yakalanan kritik bug (2026-07-18):** Kullanıcı, demo ile iki gerçek test
> konuşması yaptı (Receyp Ayaz, Recep Aslan — isim+e-posta bıraktılar); Saule ikisine de
> "bilgilerinizi kaydettim" dedi ama **hiçbiri ne `leads` ne `onboarding_requests`
> tablosuna yazılmadı** — DB'den doğrudan sorguyla doğrulandı. Kök neden: `capture_access_request`
> aracının (tool) çağrılması modelin kendi takdirine bırakılmıştı; model bazen aracı hiç
> çağırmadan doğrudan "kaydettim" metnini üretiyor — klasik bir LLM hallüsinasyon deseni.
> (16 Temmuz'daki tek başarılı kayıt bunun her zaman olmadığını, ama **güvenilmez** olduğunu
> gösteriyor.) Aynı zafiyet gerçek işletmelerin `capture_lead` akışında da var — yani bu
> sadece demo değil, **her Saule kurulumunun potansiyel olarak lead kaybettiği** anlamına
> geliyor. Düzeltme: `prompt.ts`'teki her iki talimat da ("önce araç çağrısı, sonra cevap;
> aracı çağırmadan onay cümlesi ASLA kurma") zorunlu dille güçlendirildi; `run.ts`'in
> `onFinish`'i artık araç hiç çağrılmadan onay-benzeri bir metin üretildiğinde
> `console.warn` ile sunucu loguna düşürüyor (testli, `run.test.ts`). Bu, modelin
> güvenilirliğini garanti etmez — sadece bir daha sessizce fark edilmeden geçmesini önler.
> **Doğrulama (2026-07-18, Enes):** düzeltme sonrası elle tekrar test edildi, capture_access_request
> artık güvenilir şekilde çalışıyor — şu an bilinen bir sorun yok.
> **Hâlâ açık:** üretim loglarının (Vercel) bu warning için izlenmesi — henüz otomatik bir
> uyarı/alarm mekanizması yok (Faz 4.4'ün hata izleme maddesiyle birleştirilebilir).

**Kurulum:**
- Rezerve `talkinbio` username'iyle özel bir business kaydı (seed migration
  `00023_talkinbio_demo_business.sql` — planda 00021 yazıyordu, 00021-00022'yi
  1.5'in `preferred_datetime` ve `onboarding_requests.source` migration'ları aldı;
  ID sabit env: `TALKINBIO_BUSINESS_ID`).
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
      **Düzeltme notu (2026-07-18):** sayfa çalışıyordu ama erişilemezdi — login/`/dashboard`
      hep `/dashboard/editor`'a sabitti, editör ile `/dashboard/leads` arasında hiç link yoktu.
      Kullanıcı denetimde yakaladı; bkz. Faz 3 hazırlık notu.
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

### 2.2 AI SDK güncellemesi (`ai` v3.4.33 → v7 — tamamlandı 2026-07-17)
- **Bloke edici bug (Faz 0 testinde bulundu):** `ai@3.4.33` çekirdeği, `streamText`'e
  `temperature` verilmese bile `prepareCallSettings` içinde otomatik `temperature: 0`
  enjekte ediyor (`node_modules/ai/dist/index.js:1245`). `claude-sonnet-5` bu parametreyi
  değeri ne olursa olsun reddediyor ("`temperature` is deprecated for this model", 400).
  Eski SDK'da bunu atlamanın yolu yok — bu yüzden `.env.local`'da `AI_MODEL` geçici olarak
  `claude-sonnet-4-5-20250929`'a sabitlendi. **`claude-sonnet-5`'e geçiş bu SDK güncellemesini
  bekliyor**; güncelleme sonrası tekrar denenmeli. *(Durum 2026-07-17: SDK v7'ye geçildi
  ama deneme henüz yapılmadı — `ai.ts` varsayılanı hâlâ Sonnet 4.5. Takip maddesi
  Faz 4.2'ye taşındı; maliyet ölçümüyle birlikte denenecek.)*
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
      (manuel regresyon: karşılama, lead akışı, geçmiş, erişim talebi — landing'de
      canlı Saule demosuyla doğrulandı).
- [x] `runSauleTurn` web dışı bir bağlamdan (test harness) çağrılabiliyor
      (`src/agents/saule/run.test.ts`, vitest + sahte Supabase client).
- [x] CI yeşil; agent modülleri için temel test kapsamı var
      (`.github/workflows/ci.yml`; 23 vitest testi, lint pre-existing borç nedeniyle
      informational/non-blocking bırakıldı — bkz. 2.4 notu).
- [x] İşletme sahibi sayfası için aktif dilleri (maksimum 3) seçebiliyor
      (EditorClient "Aktif Diller" kartı; şimdilik yalnızca altyapı — sayfa hâlâ 3
      dilde de yayınlanıyor, Faz 7'de kısıtlayıcı hale gelecek).

**Uygulama notu (2026-07-17):** Faz 2 başladığında kod tabanında hiçbiri
uygulanmamıştı (`src/agents/` yoktu, `ai@3.4.33`, test/CI yoktu, `active_locales`
kolonu yoktu) — bu bölümdeki eski `[x]` işaretleri gerçek durumu yansıtmıyordu,
şimdi düzeltildi. AI SDK güncellemesi planlanandan ("güncel major", o sırada v4
varsayılıyordu) daha büyük çıktı: npm'deki güncel sürüm v7 idi, bu yüzden v3'ten
doğrudan v7'ye geçildi (streamText/tool/useChat üç kez yeniden yazıldı — v4, v5,
v7 breaking change'leri). Yeni migration dosyaları (`00025_conversation_channel.sql`,
`00026_business_active_locales.sql`) önceki fazlardaki gibi elle Supabase'e
uygulanmalı — bu oturumda otomatik push edilmedi.

---

## Faz S — Marketing (Sürekli, Paralel)

Talkinbio'nun görünürlüğünü, arama motoru otoritesini ve sosyal kanıtını inşa eden yapı taşı. Yalnızca organik trafik değil, aynı zamanda işletmelerin kendi müşterilerini çekeceği "vitrin" (Linktree büyüme modeli) işlevini de içerir.

### S.1 SEO ve Büyüme Temelleri
- **Sitemap & Otomatik İndeksleme:** Yayınlanan her yeni işletme profili (`is_published = true`) sitemap'e otomatik olarak eklenir; `/legal` ve `/stakeholders` de statik rota olarak eklendi (2026-07-17 — önceden `/stakeholders` sitemap'te yoktu, yatırımcı/partner-hedefli sayfa hiç indexlenmiyordu).
- **Locale-Bazlı Metadata (i18n):** Türkçe, İngilizce ve Rusça dilleri için özel `title` ve `description` tagleri üretilir. Hreflang etiketleriyle arama motorlarına doğru dil versiyonları sunulur.
  - **Düzeltilen bug (2026-07-17):** `[locale]/layout.tsx`'teki `alternates` (canonical + hreflang) her zaman `/${locale}` köküne sabitti; alt sayfalar (`[username]`, `/legal`, `/stakeholders`) kendi `alternates`'ini tanımlamadığı için Next.js bunu **olduğu gibi miras alıyordu** — yani her yayınlanan işletme sayfası Google'a "canonical'ım ana sayfa" sinyali veriyordu. Google böyle bir sayfayı ana sayfanın kopyası sanıp indexlemeyebilir; bu, sitemap'in doğru üretilmesine rağmen gerçek indexlenmeyi baltalıyordu. Düzeltme: `[username]/page.tsx`'in `generateMetadata`'sına ve `/legal`, `/stakeholders` için eklenen `layout.tsx` dosyalarına kendi rotasına özel `alternates.canonical` + `alternates.languages` eklendi; sunucudan render edilen HTML'de üç rota da doğrulandı.
  - **Eklenen OG/Twitter meta:** hiçbir rotada `og:image`/Twitter Card yoktu (WhatsApp/Instagram'da paylaşılan bio linkleri görselsiz çıkıyordu). Geçici çözüm: mevcut `saule-avatar-v1.png` (512×512) site geneli ve işletme sayfalarında varsayılan OG/Twitter görseli olarak bağlandı. **Açık iş:** 1200×630 oranında özel bir OG banner tasarımı hâlâ gerekiyor — bu geçici görsel onun yerini almaz.
- **Paydaşlara (`/stakeholders`) sayfası — içerik bakım notları (2026-07-20 kontrolü):** Sayfa üç dilde de (tr/en/ru) eksiksiz; tüm rakamlar iç kaynaklarla (4.3 kredi tablosu, lean-pitch, fermi-estimation, traction-roadmap) çapraz doğrulandı, tutarsızlık yok. Açık bakım işleri:
  - **Dil eşitleme:** EN'deki ARPU açıklaması ("$15 — early-stage Starter-heavy mix + annual discount effect") TR ve RU metinlerinde yok; üç dil eşitlenmeli.
  - **Kur bağımlılığı:** Fermi kayıp örneği TR'de 800 TL / 584.000 TL, EN-RU'da $20 / $14.600 (≈40 TL/$ varsayımı). Kur değiştikçe TR ile EN/RU rakamları birbirinden uzaklaşır — periyodik güncelleme gerekir.
  - **Sabit sayaç:** "Sayaç şu an 0/10" elle yazılmış metin; ilk ödemeler geldikçe üç dilde de güncellenmeli (sayfanın kendi "canlı belge" taahhüdü gereği).
- **Marka Araması Optimizasyonu:** Google Search Console ve Bing Webmaster entegrasyonu; marka (Talkinbio) aramalarında logo ve doğru site açıklaması (site-links) çıkartılması.
- **Microdata & JSON-LD:**
  - `Organization` şeması (Talkinbio'nun kendi kurumsal otoritesi için. **Not:** Sosyal medya hesapları açıldığında bu şemaya eklenecektir).
  - `LocalBusiness` şeması (Kullanıcıların kendi sayfalarının Google yerel aramalarda çıkması için — ürüne doğrudan satış argümanıdır).

### S.2 İçerik ve Otorite İnşası
- **Örnek Müşteri Hikayeleri:** Ücretli pilotların (`Faz P`) başarı hikayelerinin blog formatında yayınlanması.
- **Kullanım Senaryoları (Use Cases):** "Kuaförler için AI", "Danışmanlar için Randevu Asistanı" gibi sektörel dikey açılış sayfaları (Landing Page'ler) hazırlanması.
- **Backlink Stratejisi:** Dizinler, Product Hunt lansmanı ve indie-hacker forumlarında aktif görünürlük.

### S.3 Dönüşüm Oranı Optimizasyonu (CRO)
- **A/B Testleri:** Landing page üzerindeki "Erken Erişim" butonlarının yerleşimi ve metinlerinin dönüşüme etkisinin ölçülmesi.
- **Saule İmzası:** Müşterilerin widget'larında yer alan "Saule ile konuşuyorsunuz" imzasından gelen trafiğin (UTM parametreleri ile) ölçümlenmesi ve viral büyüme katsayısının (K-factor) izlenmesi.

### Kabul Kriterleri
- [x] Zengin sonuç testi (Rich Results Test) tüm şemaları doğruluyor.
- [x] Yayınlanan her profil sitemap'te yer alıyor ve Search Console'da indeksleniyor.
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
  Ödeme ay sonunda tahsil edileceği için, kurulumla ödeme arasındaki pencerede
  şirket kuruluşu (Faz H.1, ilk "evet" ile tetiklenir, ~5 iş günü) tamamlanır —
  pilota "evet" denirken şirket henüz kurulu olmak zorunda değil.
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

## Faz H — Hukuk & Kurumsallaşma (Sürekli, Paralel — tetikleyicisi Faz P'nin ilk "evet"i)

Ücretli pilot (Faz P) para alıyor ve Saule gerçek müşteri konuşmaları (kişisel veri)
kaydediyor; bu fazın işleri kod işi değil ama tahsilatı bloke etme gücü en yüksek
kalemler. Ama şirket kuruluşunun kendisi Faz P'den ÖNCE gelmez — aşağıya bakın.

### H.1 Şirket kuruluşu (tetikleyici: ilk ödeme taahhüdü, henüz kurulmadı — 2026-07-18 düzeltildi)
**Karar (2026-07-18):** Önceki "her şeyin ön koşulu, hemen şimdi kurulmalı" çerçevesi
kendi ayna-odası kuralımızla çelişiyordu — henüz doğrulanmamış bir varsayım için
aylık ~5.000 TL sabit gidere (Bağ-Kur primi + muhasebeci, gelirden bağımsız) girmek,
tam da mühendislik illüzyonunun hukuki versiyonu. Düzeltilmiş plan:
- P.1'deki 20 görüşmeden biri ödemeye "evet" dediği anda tetiklenir — 10 pilotun
  tamamı değil, **ilk gerçek taahhüt**.
- Pilotlara "ödeme ay sonunda tahsil edilecek" denir; şirket kuruluşu (şahıs şirketi,
  ~5 iş günü sürer) ay bitmeden tamamlanır. Yani gerçek gider, gerçek gelir
  taahhüdünden SONRA başlar — hiç müşterisiz beklerken para yakmayız.
- Tür kararı (şahıs şirketi vs. doğrudan limited, genç girişimci vergi muafiyeti)
  mali müşavirle netleştirilecek ayrı araştırma maddesi; bu görüşme gider yazmadan
  önceden yapılabilir ki ilk "evet" geldiğinde 5 günlük süreç hemen başlasın.
- **Artık bloke ettiği tek acil şey:** ay sonunda pilotlardan fatura kesip parayı
  yasal olarak tahsil edebilmek. Aşağıdakiler H.1'i acilleştirmiyor, çünkü zaten
  başka fazlara ait:
  - Ödeme sağlayıcı hesabı (iyzico/Stripe) → Faz 4.3'ün işi, ilk 10 pilotu etkilemiyor
    (Faz P.2 zaten manuel tahsilat planlıyordu).
  - Meta Business Verification → v2 işi, Aşama 2/3'e kadar gerekmiyor.
  - Legal metindeki (H.2) veri sorumlusu kimliği ve marka tescili, şirket kurulunca
    güncellenir; o ana kadar metin zaten "şahıs girişimi" olarak dürüstçe işaretli.

### H.2 Legal metin revizyonu (`/legal`) — içerik düzeltmesi tamamlandı (2026-07-17)
Denetim bulguları (2026-07-17) ve düzeltmeler üç dilde (tr/en/ru) uygulandı:
- [x] **Google Firebase → gerçek işleyen listesi.** Metin artık Supabase (DB/auth/depolama),
  Vercel (hosting), **Anthropic (Saule/Beiwe yanıt üretimi — ABD merkezli, yurt dışı
  aktarım olarak açıkça belirtildi)**, Resend (e-posta) listeliyor.
- [x] **Gerçek veri envanteri.** Madde 2, hesap sahibi verisi ile ziyaretçi/son müşteri
  verisi (Saule transkriptleri, lead bilgileri, `visitor_session_id` çerezi) olarak iki
  ayrı grupta yeniden yazıldı.
- [x] **AI şeffaflığı eklendi.** Madde 2'ye "Saule bir yapay zeka asistanıdır; ziyaretçi
  doğrudan sorduğunda bu durum kendisine dürüstçe belirtilir" cümlesi eklendi (Faz 0.5
  kuralı + 1.8 imzasıyla tutarlı).
- [x] **İki katmanlı veri sorumluluğu Madde 1'e netleştirildi:** ziyaretçi verisi için
  işletme sahibi veri sorumlusu/talkinbio veri işleyen; hesap sahibi verisi için
  veri sorumlusu talkinbio. **Açık iş:** bu ilişkiyi resmi bir belgeye (DPA) bağlamak
  hâlâ H.3'ün işi — madde 1 bunu şimdilik yalnızca metinde tarif ediyor, ayrı imzalı
  bir ek henüz yok.
- [x] **Saklama süreleri somutlandı** (hesap/konuşma verisi: aktifken + kapanıştan
  90 gün; fatura kayıtları: VUK gereği 5 yıl; güvenlik logları: 12 aya kadar) ve
  ziyaretçi silme talebi akışı (işletme sahibine yönlendirme) Madde 5'e eklendi.
- [x] Madde 1, henüz kurulmamış şirket için sahte bir unvan/kişi adı **uydurmuyor** —
  "şahıs girişimi olarak yürütülüyor, kuruluş tamamlanınca güncellenecek" diyor.
  Şirket kurulunca (H.1) bu madde gerçek unvan/MERSİS no ile güncellenmeli.
- [x] `lastUpdated` → "Temmuz 2026" olarak güncellendi.
- **Hâlâ açık:** VERBİS kayıt yükümlülüğü kriterleri kontrol edilmedi (mali
  müşavir/hukuk danışmanı gerektirir — bu metin taslağı bir hukuki görüş yerine
  geçmez, şirket kuruluşuyla birlikte gözden geçirilmeli).

### H.3 Sözleşmeler (ödeme almadan önce zorunlu)
- **Kullanım Şartları (ToS):** hizmet tanımı, kredi modeli, kabul edilebilir
  kullanım, sorumluluk sınırı (AI çıktıları için), fesih.
- **Mesafeli Satış Sözleşmesi + iade/cayma politikası:** TR tüketici mevzuatı
  (abonelik ürünlerinde cayma hakkı istisnaları dahil) — ödeme sayfası yayına
  girmeden hazır olmalı; Faz P'nin manuel tahsilatında da basit bir hizmet
  sözleşmesi/onay maili kullanılmalı.
- DPA (H.2) — işletme sahibi onboarding akışına onay adımı olarak eklenir.

### H.4 Çerez ve izleme tutarlılığı
- Mevcut metin "analitik/pazarlama çerezleri yalnızca açık rızayla" diyor; şu an
  rıza banner'ı yok. Kural: yalnızca zorunlu çerez (`visitor_session_id`, oturum)
  kullanıldığı sürece banner gerekmez — Faz S'te analitik (Search Console dışında
  sayfa-içi izleme/UTM analitiği) eklenirse önce rıza mekanizması kurulur.
- Landing demo Saule'si için de aynı şeffaflık: konuşmanın kaydedildiği bilgisi
  widget'ta/metinde yer almalı.

### Kabul Kriterleri
- [ ] P.1'de ilk pilot "evet, öderim" dedi; şirket kuruluşu tetiklendi ve ay sonu
      tahsilatından önce tamamlandı (vergi levhası ve resmi unvan alındı).
- [x] `/legal` metni gerçek veri envanteri ve işleyen listesiyle (Anthropic dahil,
      Firebase çıkarılmış) üç dilde güncellendi (2026-07-17); veri sorumlusu kimliği
      şirket kuruluncaya kadar "şahıs girişimi" olarak dürüstçe işaretli — **gerçek
      tüzel kişi bilgisiyle güncellenmesi hâlâ H.1'in sonucuna bağlı.**
- [ ] ToS + mesafeli satış/iade metinleri yayında; ilk ödeme bu metinler olmadan alınmıyor.
- [ ] Meta Business Verification başvurusu şirket evrakıyla yapıldı (v2 saatini başlatır).

---

## Faz 3 — Beiwe → Marketing Agent (~2-3 hafta)

Beiwe'nin "kurulum sihirbazı"ndan "pazarlama danışmanı"na ilk gerçek adımları.
Üç ayak — hepsi Beiwe'nin zaten sahip olduğu yapılandırılmış veriden beslenir.
Meta entegrasyonunun v2'ye alınmasıyla v1'in ana farklılaştırıcısı bu faz oldu.

**Başlamadan önce tamamlanan hazırlık (2026-07-17):**
1. İkiz migration numarası çözüldü: `00024_demo_business_paid_pricing.sql` →
   `00024b_demo_business_paid_pricing.sql` (kronolojik sıra `git log` ile doğrulandı;
   ikisi de zaten elle uygulanmıştı, yeniden adlandırma salt repo hijyeni).
2. Cron altyapısı hazırlandı: `vercel.json`'a 3.1/3.3'ün rotaları için haftalık
   schedule eklendi (`/api/cron/analyze-conversations` Pazartesi 06:00 UTC,
   `/api/cron/weekly-report` Pazartesi 08:00 UTC — rotalar henüz yazılmadı, iskelet
   hazır); `src/utils/cronAuth.ts` ile `CRON_SECRET` bearer-token doğrulaması eklendi
   (testli) — bu iki rota canlıya çıkarken ilk satırda çağrılmalı, yoksa gerçek
   müşteri konuşma verisini işleyen uç dışarıdan tetiklenebilir hale gelir.
3. `generateText` (stream-dışı) yolu kanıtlandı: Faz 2.2'nin "Faz 3'te hazır olacak"
   varsayımı doğrulanmamıştı — `src/agents/shared/generateOnce.ts` + testleri eklendi,
   `getModel('analysis')` ile birlikte çalıştığı gösterildi. 3.1/3.3 bunun üzerine inşa eder.
4. `/legal` metni gerçek veri/işleyen envanterine güncellendi (H.2) — Faz 3.1'in
   konuşma içeriğini toplu analiz için işlemeye başlamasından önce bu açıklanmış olmalıydı.
5. **Panel/dashboard erişilemezliği düzeltildi.** `/dashboard/leads` (Faz 1.1'in
   Talepler/Konuşmalar/Ayarlar ekranı) kodda tamamdı ama hiçbir auth yolundan
   ulaşılamıyordu: `login` sayfası, `/dashboard` kökü hep `/dashboard/editor`'a
   sabitti; iki sayfa arasında link yoktu. Faz 3.1'in "editör panelinde Beiwe
   önerisi göster" döngüsü, sahibin konuşma verisini hiç görmediği bir ürün
   üzerine kuruluyordu. Düzeltme: normal giriş artık Panel'e iniyor (ilk kurulum/
   şifre sıfırlama akışları bilinçli olarak editöre inmeye devam ediyor — o anda
   henüz konuşma/lead yok); editör ↔ panel arasına karşılıklı geçiş linki eklendi
   ([EditorClient.tsx](src/components/EditorClient.tsx), [LeadsClient.tsx](src/app/[locale]/dashboard/leads/LeadsClient.tsx)).
   Doğrulama: typecheck + 28 test yeşil, `/dashboard` → `/dashboard/leads` →
   (auth yoksa) `/login` zinciri sunucudan doğrulandı. **Açık iş:** yeni linkler
   gerçek bir işletme hesabıyla giriş yapılarak görsel olarak henüz doğrulanmadı
   (bu ortamda güvenli bir test hesabı yoktu) — ilk fırsatta elle kontrol edilmeli.

### 3.1 Konuşma madenciliği → içerik önerileri (iki agent'ı bağlayan döngü)
- Haftalık arka plan işi (Vercel Cron → `/api/cron/analyze-conversations`,
  `isAuthorizedCronRequest` ile korunur — bkz. yukarıdaki hazırlık notu):
  - Son 7 günün Saule konuşmalarını `analysis` modeliyle (`generateOnce`) işler:
    cevaplanamayan sorular, sık sorulan konular, kaçan lead'ler.
  - Çıktı: `beiwe_insights` tablosu (business_id, type: 'faq-suggestion' | 'content-gap' | 'trend', payload jsonb, status).
- Editor'de "Beiwe Önerileri" paneli: "Müşterileriniz bu hafta 4 kez fiyat listesi sordu —
  Hizmetler bölümüne ve ya bilgi tabanına fiyat ekleyelim mi?" → tek tıkla Beiwe sohbetine trigger mesajı
  (mevcut `useBeiweSuggestions` kart altyapısı yeniden kullanılır; rule-based öneriler
  ve AI-insight önerileri aynı panelde birleşir).
- **Bilinen sınırlama (2026-07-20, düzeltme):** yukarıdaki fiyat örneği bir ideal
  senaryo gibi okunabilir ama gerçek davranış daha dar. `analyzeConversations.ts`'teki
  analiz prompt'u yalnızca son 7 günün ziyaretçi mesajlarını görüyor; işletmenin
  mevcut sayfa bloklarını veya bilgi tabanı notlarını **karşılaştırma için almıyor**.
  Yani bir konu "en az 2 kez" sorulduğunda sistem her zaman ekleme önerisi çıkarıyor —
  o konunun cevabı sayfada/bilgi tabanında zaten olsa bile. "Cevabı zaten var mı"
  kontrolü şu an yok (bkz. aşağıda Kapsam dışı — bu, gerçek bir geliştirme gerektiriyor,
  Faz 3.1'in tamamlanmış kapsamının bir parçası değil).

### 3.2 İçerik stüdyosu (sosyal medya üretimi)
- Dashboard'a "İçerik" sayfası: bloklardan (hizmet, yorum, galeri) Instagram
  gönderi metni / story metni / WhatsApp durum önerisi üretimi.
- Beiwe tool'ları: `generatePostIdeas`, `draftCaption` (3 dilde, işletme tonunda).
- v1'de yalnız metin; görsel şablon üretimi bilinçli olarak kapsam dışı.
- **Bilinen sınırlama (2026-07-22):** üretim tamamen stateless (`src/app/api/content/generate/route.ts`)
  — her istek yalnızca o an seçilen TEK kalemin (bir hizmet/galeri/yorum) başlık+açıklamasını
  görüyor; ne işletmenin geri kalan sayfasını ne önceden üretilmiş gönderileri biliyor,
  hiçbir üretim geçmişi saklanmıyor. Bkz. aşağıda Kapsam dışı — Faz 3.1 ile ortak kök nedene bağlı.

### 3.3 Haftalık özet e-postası
- Vercel Cron (`/api/cron/weekly-report`, `vercel.json`'da schedule hazır — bkz.
  Faz 3 hazırlık notu) + Resend (doğrulanmış domain hazır ✅):
  yeni lead sayısı, konuşma sayısı, en sık sorular, Beiwe'nin haftanın önerisi.
- Ön koşul: basit sayfa görüntülenme sayacı — **migration `00029_page_views.sql`**
  (planda 00022, sonra 00027, sonra 00028 yazıyordu; 00027'yi 1.1.1'in arşiv/silme,
  00028'i 1.1.2'nin not alanı migration'ı aldı (2026-07-18) — bkz. Faz 3 hazırlık notu;
  business_id, günlük tekilleştirilmiş sayaç; `[username]/page.tsx` server-side artırır).

### Kabul kriterleri
- [x] Cron haftalık çalışıyor; en az bir gerçek konuşma setinden anlamlı FAQ önerisi çıkıyor.
      **Doğrulama notu (2026-07-18):** kod tamamlandı, typecheck + build + 43 vitest testi
      yeşil; ancak bu ortamda çalışan bir Supabase/Vercel bağlantısı yok, bu yüzden gerçek
      cron tetikleme ve gerçek müşteri konuşma verisiyle uçtan uca doğrulama yapılamadı —
      önceki fazlardaki "migration elle uygulanmalı" notuyla aynı sınırlama.
- [x] Öneri kartından tek tıkla Beiwe sohbetinde ilgili blok güncelleniyor
      (editördeki mevcut "Beiwe Önerileri" paneli AI içgörüleriyle birleşti,
      tıklanınca `beiwe_insights.status = 'actioned'` işaretleniyor).
- [x] Haftalık e-posta gerçek verilerle sahibe ulaşıyor (kod tamam, Resend gönderimi
      gerçek trafikle test edilmedi — yukarıdaki not geçerli).

**Uygulama notu (2026-07-18):** Faz 3 uygulandı —
`00029_beiwe_insights.sql` / `00030_page_views.sql` migration'ları (elle Supabase'e
uygulanmalı, önceki fazlardaki gibi bu oturumda otomatik push edilmedi);
`/api/cron/analyze-conversations` ve `/api/cron/weekly-report` rotaları yazıldı
(`isAuthorizedCronRequest` ile korunuyor); editördeki "Beiwe Önerileri" paneli
`beiwe_insights`'ı rule-based önerilerle birleştiriyor; yeni "İçerik" sayfası
(`/dashboard/content`) hizmet/galeri/yorum bloklarından 3 dilde sosyal medya metni
üretiyor (`/api/content/generate`, yalnız metin — görsel şablon kapsam dışı, DB'ye
kalıcı yazılmıyor). `page_views` sayacı `[username]/page.tsx`'e eklendi (sahibin
kendi ziyaretleri hariç). Doğrulama: `tsc --noEmit`, `npm test` (43 test, 14'ü bu
fazda eklendi) ve `npm run build` yeşil; tarayıcıda gerçek hesapla elle kontrol
edilmedi (bu ortamda test hesabı/Supabase bağlantısı yok).

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

**Uygulama notu (2026-07-18):** Faz 4.1 uygulandı — Supabase tabanlı sayaç
seçildi (Upstash/Redis kurulu değildi, yeni ücretli servis gerektirmiyor).
`00031_messages_business_id.sql` migration'ı `messages`'a denormalize
`business_id` ekliyor (join'siz sayım için) + iki yeni index (**elle Supabase'e
uygulanmalı**, önceki fazlardaki gibi bu oturumda otomatik push edilmedi).
`src/agents/shared/limits.ts` eşikleri, `src/agents/shared/rateLimit.ts` üç
kontrol fonksiyonunu (`checkShortTermFlood`, `checkSessionOpenRateLimit`,
`checkBusinessDailyCap`) ve lokalize (tr/en/ru) statik ret mesajlarını taşıyor
— sert limitler LLM çağırmadan reddediyor. `src/agents/saule/run.ts`'teki
Faz 1.6'nın demo-özel `DEMO_MESSAGE_CAP`'i kaldırıldı; oturum içi tavan artık
tüm işletmeler için `SESSION_MESSAGE_CAP` (50) ile çalışıyor (`isPreview`
muaf). `chat/route.ts` (Saule, 2K karakter) ve `setup-agent/route.ts` (Beiwe,
50K karakter) girdi sınırlarını uyguluyor. `ChatWidget.tsx`'e eklenen
`onError` handler'ı sert blokaj mesajlarını (429 + `AgentTurnError`) normal
bir Saule balonu gibi gösteriyor. Doğrulama: `tsc --noEmit`, `npm test` (55
test, 8'i bu fazda eklendi: `rateLimit.test.ts` + `run.test.ts`'e iki yeni
senaryo) ve `npm run build` yeşil; tarayıcıda gerçek hesapla elle kontrol
edilmedi (bu ortamda Supabase bağlantısı yok — önceki fazlardaki sınırlama
aynen geçerli).

### 4.2 Kullanım ölçümü
- `usage_events` tablosu: business_id, agent ('beiwe'|'saule'), channel, input/output token,
  model, created_at. `streamText`/`generateText` `usage` çıktısından yazılır.
- Admin analytics'e maliyet panosu (işletme başı aylık token/₺ tahmini).
- Kritik: **model-bazlı fiyat farkını görünür kılar** — Beiwe'ye güçlü model verme
  kararı (Faz 0.1) veriyle test edilir.
- **Faz 2.2'den devreden açık iş:** `claude-sonnet-5` denemesi (SDK v7'ye geçildi,
  temperature engeli kalkmış olmalı) — maliyet/kalite karşılaştırması bu ölçüm
  altyapısıyla yapılır; sonuç Faz 0.1 model stratejisine işlenir.

**Uygulama notu (2026-07-18):** Faz 4.2 uygulandı. `00032_usage_events.sql`
migration'ı `usage_events` tablosunu (roadmap'in istediği alanlara ek olarak
`cache_read_tokens`/`cache_write_tokens` — Faz 2.3'ün prompt caching getirisini
görünür kılmak için) ekliyor (**elle Supabase'e uygulanmalı**, önceki
fazlardaki gibi bu oturumda otomatik push edilmedi). `src/agents/shared/usage.ts`
(`recordUsageEvent`, hataya dayanıklı — insert başarısız olsa da kullanıcı
cevabını bozmaz) üç noktadan çağrılıyor: `saule/run.ts` (ana + oturum tavanı
apology streamText'i), `setup-agent/route.ts` (Beiwe), `cron/analyze-conversations`
(analysis görevi; `weekly-report` cron'unun kendi LLM çağrısı yok, yalnızca
mevcut `beiwe_insights`'ı e-postalıyor — kayıt gerektirmiyor). `src/utils/ai.ts`'e
`getModelName(task)` eklendi, `generateOnce` artık `model` da döndürüyor.
`src/utils/modelPricing.ts` (`estimateCostUsd`) Faz 4.3'te ölçülen Sonnet 4.5
fiyatıyla ($3/$15 per MTok) + standart Anthropic cache çarpanlarıyla (write
≈1,25×, read ≈0,1×) tahmini $ hesaplıyor; bilinmeyen model için `null` döner
(sessizce yanlış rakam göstermek yerine). `admin/analytics/page.tsx`'e "Maliyet
(Bu Ay)" paneli eklendi — içinde bulunulan takvim ayı, işletme bazında
gruplanmış, yalnızca $ (Faz 4.3'ün "fiyatlar dolara sabit" kararıyla tutarlı,
₺ dönüşümü göstermiyor — bayat kur riski). Doğrulama: `tsc --noEmit`, `npm test`
(61 test, 6'sı bu fazda eklendi: `usage.test.ts`, `modelPricing.test.ts` +
`generateOnce.test.ts`'e bir assertion) ve `npm run build` yeşil; tarayıcıda
gerçek hesapla elle kontrol edilmedi (bu ortamda Supabase bağlantısı yok).

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
  **Karar (2026-07-18, Enes düzeltmesi):** güncelleme çarpanı 3'ten **6'ya**
  yükseltildi (10'luk kurulum aynen kaldı) — $0,27 satış fiyatına karşı %45
  maliyet oranı, %55 marj (eski %89/%11'e göre çok daha sağlıklı). Sayılar artık
  koda gömülü sabit değil, env değişkenleriyle elle ince ayar yapılabiliyor
  (`CREDIT_COST_SAULE`, `CREDIT_COST_BEIWE_UPDATE`, `CREDIT_COST_BEIWE_INSTALL`
  — `src/agents/shared/credits.ts`) — Faz 2.3'ün prompt caching optimizasyonu
  Beiwe'nin sabit yükünü küçülttükçe kod değişikliği gerekmeden yeniden kalibre
  edilebilir. `usage_events` (4.2) bu kalibrasyonu üretimde sürekli doğrulayacak.

- **Ürün gereksinimi (2026-07-16, Enes onayı) — kabul kriteri:** Starter paketi alan bir
  kullanıcı (a) sayfasını en az bir kez oluşturabilmeli, (b) deneme yanılmayla **birkaç kez**
  yeniden oluşturabilmeli/düzenleyebilmeli, (c) Saule'yi de bir miktar deneyimleyebilmeli —
  hepsi 200 kredi içinde. Gerçek sayılarla model: 3× kurulum (30 kredi, $0,44) + 15
  etkileşimli güncelleme (45 kredi, $1,81) + 20 Saule mesajı (20 kredi, $0,53) = 95/200
  kredi, ~$2,78 gerçek maliyet → $9 fiyata karşı %31 maliyet oranı, %69 marj. **Bu senaryo
  200 kredi içinde rahatça ve kârlı şekilde karşılanıyor** — asıl risk yukarıdaki
  "yalnızca güncelleme" uç senaryosunda, tipik kullanımda değil. **Açık iş (kod değil,
  gelecekteki bir doğrulama):** yeterli üretim `usage_events` verisi birikince, bu
  senaryo ("yeni bir hesap sayfasını kurar + birkaç kez düzenler + Saule ile biraz
  konuşulur — toplam gerçek maliyet ödediği fiyatın altında mı kalıyor") otomatik bir
  regresyon testine dönüştürülebilir. Şimdi yeterli üretim verisi olmadığı için
  yapılmadı.
- **Kredi devri:** kullanılmayan krediler devreder, bakiye tavanı 2 aylık kota.
- **Fiili ücretsiz katman:** kredi bitince asistan kapanmaz — sayfa + "mesaj bırakın" modu
  (LLM'siz lead toplama) yaşar; ziyaretçi duvara çarpmaz, viral imza döngüsü (1.8) beslenmeye
  devam eder, sahip yükseltmeye nazikçe itilir.
- `businesses.plan` + kredi bakiyesi kolonları; limit enforcement 4.1 sayaçlarına bağlanır;
  kredi tüketimi dashboard'da şeffaf gösterilir.
- **İstisna hesaplar (2026-07-18, Enes notu):** kredi düşme sayacı devreye girdiği anda
  (ilk kredi tüketimi yazımıyla birlikte, kredi kolonları eklenirken bir kerelik seed
  olarak) iki hesabın bakiyesi **1.000.000.000 (1 milyar) kredi** olarak ayarlanmalı:
  `enespehlivan@live.com` (talkinbio — kurucu/demo hesabı) ve `pehlivanuliana@gmail.com`
  (Uliana Pehlivan — mevcut tek ücretsiz test hesabı, bkz. Faz P.2 notu). Fiilen sınırsız
  kullanım anlamına gelir; ürün gereksinimi kabul testi (yukarıdaki 200 kredi senaryosu)
  bu iki hesap için geçerli değildir.
- **Fiyatlama kararı (2026-07-17, Enes):** fiyatlar **dolara sabittir**; TL tahsilat
  güncel kur üzerinden yapılır, lokal sabit TL fiyat yoktur (girdi maliyetleri dolar).
  Birim ekonomi hesapları ($0,045/kredi) dolar bazında geçerliliğini korur; kur riski
  gelir tarafında değil churn tarafındadır (Fermi V.1.1 risk tablosu). Kanvastaki
  açık fiyat sorusu bu kararla kapandı — Gelir Kalemleri kutusuna işlendi ✅
  (kanvas `page.tsx` satır 66/73, 2026-07-17).
- Ödeme sağlayıcı kararı (iyzico vs Stripe) hâlâ açık — dolar-sabit fiyat + TL tahsilat
  kombinasyonunu destekleyen sağlayıcı seçilmeli (ayrı araştırma maddesi).
  **Ön koşul: Faz H.1 şirket kuruluşu** — sağlayıcı hesabı tüzel kişilik ister;
  araştırma şimdi yapılabilir ama hesap açılışı şirketi bekler. Faz 4 süre tahmini
  (1-2 hafta) sağlayıcı entegrasyonunu İÇERMEZ — entegrasyon +1 hafta sayılmalı.
- Mevcut admin "subscriptions" sayfası gerçek veriye bağlanır.

**Uygulama notu (2026-07-18):** Faz 4.3'ün kod kısmı uygulandı (ödeme sağlayıcı
hariç — Faz H.1'i bekliyor). `00033_business_credits.sql` migration'ı
`businesses.credit_balance` + `deduct_credits`/`add_credits` RPC'lerini ekliyor,
iki istisna hesabı 1 milyar kredi ile seed ediyor (**elle Supabase'e
uygulanmalı**, önceki fazlardaki gibi). `src/agents/shared/credits.ts` kredi
mantığını taşıyor; `saule/run.ts` ve `setup-agent/route.ts` hem kontrol
(`hasCredits`/`credit_balance <= 0`) hem düşüm (`deductCredits`, Beiwe'de araç
sayısına göre `beiweCreditCost`) noktalarına bağlandı. **Fiili ücretsiz katman**
tam yazıldı: kredi bitince Saule sunucu tarafında 402 + JSON payload
(`{code:'credits_exhausted', message, directLinks}`) döner, `ChatWidget.tsx`
bunu yakalayıp sohbeti kapatmadan LLM'siz bir isim/iletişim/mesaj formuna
döner (`POST /api/leads/direct-capture` — `insertLeadAndNotify`, eski
`captureLeadTool`'dan çıkarıldı, aynı e-posta bildirimini kullanır); Beiwe
(sahip-yüzlü) tarafında düz bir 402 mesajı yeterli görüldü (`EditorClient.tsx`
artık `error.message`'ı gösteriyor). **Kredi paketleri/plan sayfası** (Enes
talebi, 2026-07-18) `/pricing` altında yayında — gerçek checkout değil,
roadmap'teki plan tablosunu (kapasiteyi somut "≈N Saule sohbeti / M Beiwe
güncellemesi" örneğiyle) şeffaf gösteren, e-posta+telefon alan bir "bize
ulaşın" formu; H.3 (sözleşmeler) ve ödeme sağlayıcı tamamlanana kadar geçici.
Talepler yeni `pricing_inquiries` tablosuna düşüyor (`00034` migration),
admin `admin/subscriptions` sayfasından hem bu talepleri görüp "arandı"
işaretleyebiliyor hem de bir işletmeye plan+kredi elle atayabiliyor (mevcut
ama boş `subscriptions` tablosu — migration `00002` — ilk kez kullanılmaya
başlandı). Doğrulama: `tsc --noEmit`, `npm test` (73 test, 12'si bu fazda
eklendi: `credits.test.ts` + `run.test.ts`'e iki senaryo) ve `npm run build`
yeşil; tarayıcıda gerçek hesapla elle kontrol edilmedi (bu ortamda Supabase
bağlantısı yok).

### 4.4 Operasyonel gözlemleme (lansman kapısının parçası)
- Hata izleme (Sentry veya Vercel'in hazır error tracking'i): prod hatasını
  müşteriden önce duymak — özellikle webhook'suz tek geliştiricili üründe kritik.
- Uptime kontrolü (basit bir sağlık ucu + ücretsiz bir izleyici, ör. UptimeRobot).
- Cron işleri (Faz 3) için başarısızlık bildirimi (çalışmadıysa e-posta).
- Faz 1.6'da eklenen `[runSauleTurn] possible unconfirmed capture` uyarısı (`console.warn`)
  şu an yalnızca Vercel fonksiyon loglarında görünür, hiçbir yere bildirim atmıyor —
  Sentry kurulunca bu log bir hata/uyarı olarak yakalanıp gerçek zamanlı bildirime
  bağlanmalı (kayıp lead'i keşfetmek günler sürmemeli).

**Uygulama notu (2026-07-18):** Faz 4.4'ün kod tarafı, Sentry/Vercel error
tracking **hariç** uygulandı — Sentry gerçek bir hesap/DSN gerektirdiği ve bu
ortamda kurulup doğrulanamayacağı için (Enes onayı), bunun yerine projede
zaten kurulu olan Resend altyapısı admin bildirim kanalı olarak kullanıldı:
`src/agents/shared/notifyAdmin.ts` (`ADMIN_NOTIFICATION_EMAIL`'e best-effort
e-posta, hiçbir zaman fırlatmaz). Bağlandığı üç nokta: (1) `GET /api/health`
— basit sağlık ucu, harici bir uptime izleyici (UptimeRobot vb.) buraya
yönlendirilmeli; (2) `cron/analyze-conversations` ve `cron/weekly-report`
— üst seviye hata veya kısmi başarısızlık (bazı işletmeler işlenemedi) olunca
admin'e e-posta gider; (3) `[runSauleTurn] possible unconfirmed capture`
uyarısı artık yalnızca `console.warn` değil, aynı zamanda gerçek zamanlı
e-posta da tetikliyor. Doğrulama: `tsc --noEmit`, `npm test` (77 test, 4'ü bu
fazda eklendi: `notifyAdmin.test.ts`) ve `npm run build` yeşil.

**Dış kurulum tamamlandı (2026-07-18, Enes):** migrationlar (`00031`-`00034`)
Supabase'e uygulandı, `ADMIN_NOTIFICATION_EMAIL` Vercel'e eklendi, değişiklikler
commit edildi (`f06fbd1`). UptimeRobot `talkinbio.com/api/health`'i 5 dakikada
bir izliyor — canlıda doğrulandı (%100 uptime, `200` yanıtı). Hata izleme için
Sentry yerine Vercel'in kendi Logs ekranı (Seçenek A, kod gerektirmez)
kullanılıyor — `/api/health` isteği Vercel Logs'ta görünür durumda doğrulandı.
Sentry entegrasyonu (Seçenek B) hâlâ opsiyonel; DSN alınırsa `@sentry/nextjs`
o zaman eklenir.

### Kabul kriterleri
- [x] Oturum tavanı dolunca tek tıkla yeni sohbete geçilebiliyor; sert blokaj yalnızca
      hız sınırlarında ve token harcamadan devreye giriyor. (4.1, 2026-07-18 — kod +
      testlerle doğrulandı, gerçek tarayıcı testi bu ortamda yapılamadı.)
- [x] Admin panelde işletme başına gerçek token maliyeti görünüyor. (4.2,
      2026-07-18 — kod + testlerle doğrulandı, gerçek tarayıcı testi bu
      ortamda yapılamadı.)
- [x] Plan limitleri uçtan uca enforce ediliyor. (4.3, 2026-07-18 — kredi
      kontrolü/düşümü ve fiili ücretsiz katman kod + testlerle doğrulandı;
      gerçek ödeme sağlayıcı hâlâ Faz H.1'i bekliyor, `/pricing` bu yüzden
      geçici bir "bize ulaşın" formu, gerçek tarayıcı testi bu ortamda
      yapılamadı.)
- [x] Cron başarısızlıkları ve kayıp lead riski gerçek zamanlı bildirime bağlı.
      (4.4, 2026-07-18 — Resend tabanlı `notifyAdmin` kod + testlerle
      doğrulandı; UptimeRobot `talkinbio.com/api/health`'i izliyor, canlıda
      %100 uptime ile doğrulandı; hata izleme Vercel Logs üzerinden — Sentry
      opsiyonel, henüz kurulmadı.)

---

## Faz T — Uliana pilot test dönemi (~3 hafta, paralel, kod dondurma)

**Başlangıç (2026-07-18, Enes kararı):** v1'in kod tarafı tamamlandı (Faz 0-4).
Tahmini ~3 hafta boyunca **yeni kod yazılmayacak** — Uliana Pehlivan hesabıyla
gerçek 3. taraf müşteriler test edilecek. Bu, Faz P'nin "20 problem görüşmesi
+ 10 ücretli pilot" çalışmasının fiili başlangıcı; bu bölüm o çalışma
sırasında **özellikle izlenmesi gereken teknik noktaların** listesidir —
Faz P'nin genel sürekli akışından ayrı, bu dönemin kendine özgü kontrol listesi.

### T.1 Kod dondurma kuralı
- Hata çıkmadığı sürece kod tarafına dokunulmayacak. Küçük bug'lar not
  edilip biriktirilecek, haftada bir toplu değerlendirilecek — tek tek
  yamalayıp dondurmayı bozmak yok.
- **İstisna:** gerçek para kaybı, veri kaybı veya güvenlik riski taşıyan
  bir hata çıkarsa (ör. lead kaydedilmiyor, kredi yanlış düşüyor) hemen
  müdahale edilir.

### T.2 Bu dönemde bilerek/dolaylı olarak tetiklenecek noktalar
- **E-posta teslimi (Resend, 2026-07-18 düzeltildi):** gönderici adresi
  `onboarding@resend.dev`'den doğrulanmış `info@talkinbio.com`'a çevrildi
  (`tools.ts`, `notifyAdmin.ts`, `weekly-report/route.ts`) — düzeltmeden önce
  test hesabı dışına giden hiçbir e-posta (lead bildirimi, haftalık rapor,
  admin uyarısı) ulaşmıyordu. İlk lead testinde e-postanın gerçekten Uliana'ya
  ulaştığı doğrulanmalı.
- **Kredi bakiyesi (Faz 4.3):** yeni onaylanan her pilot işletme `credit_balance = 0`
  ile doğuyor — concierge onboarding'de (P.2) kurulumdan önce
  `admin/subscriptions`'tan plan+kredi atanmalı, yoksa pilotun Saule'si ilk
  günden "kredi bitti" formuna düşer.
- **Rate limit'ler (Faz 4.1):** yoğun elle test sırasında flood limiti (10
  dakikada 20 mesaj) veya oturum açma hızı sınırına (saatte 4 yeni oturum)
  çarpılabilir — bu bug değil, tasarım; editör önizlemesi (`isPreview`) tüm
  limitlerden muaf, sınırsız test için onu kullan.
- **Haftalık cron'lar** Pazartesi sabahı çalışıyor — Salı günü
  `beiwe_insights` ve rapor e-postasının gerçekten gittiği kontrol edilmeli.
- **`/pricing` formu:** gönderilen talep `admin/subscriptions`'ta görünmeli
  + admin'e bildirim e-postası gitmeli.

### T.3 Ayna-odası ritmi
Her hafta pivot günlüğüne en az bir "bu hafta hangi varsayım GERÇEK
müşteriyle test edildi" girişi düşülür (bkz. Faz P.3, ayna-odası kuralı).
Bu dönem, kanvasın "GERÇEK ÖLÇÜM" etiketli kutularının çoğunun ilk kez
gerçek talep verisiyle doldurulacağı dönem — maliyet tarafı zaten ölçüldü,
eksik olan talep tarafı.

### Kabul kriterleri
- [ ] En az 3 gerçek 3. taraf müşteriyle uçtan uca test tamamlandı (kurulum
      + Saule konuşması + lead akışı + e-posta teslimi doğrulandı).
- [ ] Kredi düşümü ve `admin/subscriptions`'tan manuel atama en az bir kez
      gerçek pilotta doğrulandı.
- [ ] 3 hafta boyunca biriken bug/iyileştirme listesi hazır — bir sonraki
      kod dönüşü bu listeyle başlar.

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
  - **Not (2026-07-20) — Saule'nin öğrenmesi:** Beiwe konuşma verisiyle özelleşiyor
    (bkz. Faz 3.1), ama Saule'nin kendisi konuşmalardan otomatik öğrenmiyor — bilgisi
    sahibin elle girdiği notlarla sınırlı (Faz 1.4, `saule_knowledge`). Saule'nin
    konuşma geçmişinden kendi kendine öğrenmesi kapsamlı bir konu ve RAG altyapısıyla
    doğrudan ilişkili; RAG gündeme geldiğinde birlikte değerlendirilecek.
- **Beiwe önerilerinde mevcut içerik kontrolü** (2026-07-20, genişletildi 2026-07-22) —
  `analyzeConversations.ts`'teki analiz prompt'una işletmenin güncel sayfa bloklarını ve
  bilgi tabanı notlarını da vererek, yalnızca cevabı henüz sayfada/bilgi tabanında olmayan
  konuların önerilmesi sağlanabilir (şu an yalnızca ziyaretçi mesajlarını görüyor, mevcut
  içerikle karşılaştırmıyor — bkz. Faz 3.1 bilinen sınırlama notu). v1'in kod tarafı
  tamamlandı ve şu an kod dondurma döneminde (Faz T); bu, dondurma bittikten sonra
  değerlendirilecek bir v1.1 adayı — Faz 3.1'in kapanmış kapsamına dahil değil.
  - **Canlı pilot bulgusu (2026-07-22, Uliana Pehlivan hesabı):** hem "Beiwe Önerileri"
    paneli (3.1, ampul ikonu) hem İçerik Stüdyosu (3.2, "İçerik" sekmesi) gerçek hesapta
    denendi — ikisi de "çok zayıf" bulundu, ikisi de AYNI kökten: hiçbiri işletmenin ne
    zaten sahip olduğunu bilmiyor.
    - 3.1: sayfa bloklarını/bilgi tabanını görmediği için, o konunun cevabı sayfada zaten
      olsa bile aynı ekleme önerisini tekrar tekrar çıkarabiliyor (yukarıdaki not).
    - 3.2 (`src/app/api/content/generate/route.ts`): her üretim tamamen stateless — sadece
      o an seçilen tek kalemin (bir hizmet/galeri/yorum) başlık+açıklamasını görüyor, ne
      işletmenin geri kalan sayfasını ne önceden üretilmiş gönderileri biliyor; üretilen
      içeriğin hiçbir geçmişi saklanmıyor, bu yüzden aynı kalem için tekrar üretim
      istendiğinde önceki sonuçtan habersiz, tekrarlayan/jenerik metin çıkabiliyor.
  - **Karar (2026-07-22):** ikisi de v1 haliyle donduruldu — bu geliştirme (mevcut içerik
    karşılaştırması) tamamlanmadan ikisine de öncelik verilmeyecek. Faz T (kod dondurma)
    bittiğinde, 3.1 ve 3.2'yi AYNI "içerik farkındalığı" katmanı altında birlikte ele almak
    mantıklı — ikisinde de eksik olan şey aynı: üretilen/önerilen şeyin işletmenin MEVCUT
    durumuyla (sayfa + bilgi tabanı + geçmiş üretimler) karşılaştırılması. Ayrı ayrı
    yamanmamalı, tek bir v1.1 işi olarak planlanmalı.
- **Görsel içerik üretimi** (story şablonları) — İçerik stüdyosu v2.
- **Telegram kanalı** — Bot API onay gerektirmediği için v2'nin en ucuz kanal kazanımı;
  `channel_accounts` mimarisi hazır olduğunda hızlıca eklenebilir, hatta Meta onayları
  gecikirse Faz 5'ten öne alınabilir.

## Riskler

| Risk | Etki | Önlem |
|------|------|-------|
| İlk "evet" geldiğinde şirket kuruluşu (H.1) ay sonu tahsilatına yetişmezse | O pilotun ilk ay ödemesi fatura kesilemeden gecikir | Mali müşavir görüşmesi (tür kararı) ilk "evet" beklenmeden önceden yapılır, böylece tetiklendiği an 5 günlük kuruluş süreci hemen başlar |
| Meta evrak süreci v1 sırasında ihmal edilirse | v2 başlangıcı haftalarca bloke | Business Verification / Tech Provider başvurusu şirket kurulur kurulmaz yapılır (geliştirmesiz; ön koşulu H.1) |
| AI SDK major migration (2.2) | Widget/stream regresyonları | Ayrı PR; Faz 1'deki transkript ekranı + landing demo regresyon testi olarak kullanılır |
| Landing demosu anonim trafiğe açık | Token maliyeti | Faz 1.6'daki oturum başına mesaj tavanı; Faz 4'te genel altyapıyla değiştirilir |
| Tek geliştirici bant genişliği | Fazların uzaması | Faz 3 (marketing) bağımsız modüller halinde; gerekirse 3.2/3.3 lansman sonrasına kayabilir |
| Saule, aracı (tool) çağırmadan "kaydettim" diyebiliyor (bkz. Faz 1.6, 2026-07-18) | Gerçek lead/erişim talebi sessizce kaybolur, ziyaretçi kayıtlı sandığı halde hiçbir yerde yok | Prompt zorunlu dille güçlendirildi + `console.warn` eklendi (testli); kalıcı çözüm Faz 4.4'te Sentry'ye bağlanmak — o güne kadar Vercel logları elle izlenmeli |
