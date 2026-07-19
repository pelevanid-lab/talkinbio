# Kurulum Ajanı (Beiwe) Test Senaryosu — Soru & Cevap

Bu belge, Beiwe'yi gerçek Uliana verisiyle uçtan uca test etmen için hazırlandı.

**Nasıl kullanılır:** Beiwe'nin soruları LLM tarafından üretiliyor, bu yüzden
tam cümle birebir eşleşmeyecek — ama `src/agents/beiwe/prompt.ts`'teki kurallar
gereği konu sırası (tema → Hakkımda/Hizmetler → iletişim → çalışma saatleri/SSS
→ galeri/yorumlar) bu sırayla ilerler. Beiwe hangi konuyu sorarsa, aşağıdaki
ilgili "YAPIŞTIR" bloğunu ver. Tek seferde 1-2 konu sorması beklenir, sabırla
sırayla ilerlet.

İki test yolu var:
- **A) Adım adım (önerilen ilk test):** Aşağıdaki sırayla, Beiwe'nin sorduğu
  her konuda ilgili cevabı yapıştır. Asıl konuşma akışını, ara soruları, ton
  ve düzeltme davranışını bu şekilde görürsün.
- **B) Toplu (bulk) test:** En sona eklenen `[BULK]` bloğunu tek mesajda
  gönder — Beiwe tüm blokları arka arkaya tek seferde oluşturmalı. İkinci bir
  test hesabıyla/oturumla dene, adım adım testi bozmamak için.

---

## Adım 1 — Açılış (işletme tanıtımı)

**Beiwe muhtemelen sorar:** "İşletmenizi birkaç cümleyle anlatın — ne
yapıyorsunuz, kime hizmet ediyorsunuz?"

**YAPIŞTIR:**
> Я практикующий специалист по массажу лица и тела с опытом более 13 лет.
> С 2022 года обучаю специалистов комплексному массажу лица и
> шейно-воротниковой зоны — офлайн в Стамбуле и онлайн. Также провожу
> индивидуальные консультации для мастеров массажа и продаю авторское
> массажное масло Face & Harmony.

**Gözlemlenecek:** Bu turda `setTheme` çağrılmalı (kural 7 — her zaman ilk
araçlardan biri). Tema masaj/spa klişesi (yeşil-bej) yerine özgün bir palet
mi seçti?

---

## Adım 2 — Hakkımda derinleştirme

**Beiwe muhtemelen sorar:** deneyim, sertifikalar, yaklaşım hakkında devam
sorusu.

**YAPIŞTIR:**
> Для меня массаж — это больше, чем техника, это забота через прикосновение.
> В основе моей работы — глубокотканный массаж (Deep Tissue) в сочетании с
> лимфодренажными, миофасциальными и букальными техниками — учитываю не
> только ткани лица, но и мышечное напряжение, осанку, шейно-воротниковую
> зону и эмоциональное состояние.
>
> Опыт: более 13 лет практики в Турции и Украине, с 2022 года обучаю онлайн и
> офлайн — ученицы из Сербии, Нидерландов, Бельгии, Испании, Франции, США,
> Турции, Казахстана. Профильное обучение в ведущих школах массажа Украины.
> Сертификат МЕВ (Турция) по специальности массажист. Диплом специалиста по
> интегративному питанию ИФИД.

**Gözlemlenecek:** `updateAbout` aracı 3 dilde (tr/en/ru) metin üretmeli
(kural 4 — kullanıcı tek dilde yazsa da).

---

## Adım 3 — Hizmetler (5 kalem, tek tek)

Beiwe her hizmeti sorduğunda sırayla yapıştır. `numbered-list` veya
`price-table` varyantı seçmesi beklenir (premium/az sayıda hizmet + net
fiyatlar).

**3.1 — Bireysel eğitim (İstanbul):**
> Индивидуальное обучение комплексному массажу лица и шейно-воротниковой зоны
> в Стамбуле, 850$. Подходит начинающим и практикующим мастерам. В программу
> входит: глубокотканный массаж, миофасциальные и лимфодренажные техники,
> буккальный массаж, анатомия, работа с клиентами после ботокса. Формат
> индивидуальный, с моделями для практики.

**3.2 — Online eğitim (3 paket — ayrı ayrı ver, testin amacı bu çoklu-fiyat
senaryosunun nasıl işlendiğini görmek):**
> Онлайн-обучение, три пакета. Базовый 250$: 3 видеоурока + пособие + 1
> созвон (60-90 мин). Оптимальный 350$: то же + 2 созвона. Максимальный 490$:
> то же + 5 созвонов (1 теория + 4 практики с разбором ошибок).

**Gözlemlenecek:** Beiwe bunu tek kalemde mi topladı yoksa 3 ayrı `services`
kalemine mi böldü? [Belge 1](01-icerik-bloklara-ayrildi.md)'deki öneri 3 ayrı
kalem — Beiwe'nin kendiliğinden bunu yapıp yapmadığı, yapmıyorsa açıkça "bunu
3 ayrı fiyat kalemi olarak ekler misin" diye yönlendirmen gereken bir nokta.

**3.3 — Danışmanlık:**
> Индивидуальная консультация для мастеров массажа, 90$, 90 минут онлайн. Для
> тех, кто уже практикует, но не хватает клиентов. Разбираем: где искать
> клиентов, как вести переписку, работа с возражениями, как увеличить доход.

**3.4 — Face & Harmony yağı:**
> Авторское массажное масло Face & Harmony, 1900 лир, 100 мл. Для лица и
> тела, легкая текстура, не забивает поры, подходит для чувствительной кожи.
> Два аромата: №3 теплый (ваниль, жасмин) и №5 изысканный (роза, амбра).

**3.5 — Seans masajı (3 süre — ayrı ayrı ver):**
> Массаж лица, три варианта. 45 минут (лицо+декольте+маска) 2700 лир. 60
> минут (лицо+шея+голова) 3500 лир. 75 минут (то же + маска) 3800 лир. Все с
> глубокотканной, миофасциальной, лимфодренажной техникой и буккальным
> массажем.

---

## Adım 4 — İletişim

**Beiwe muhtemelen sorar:** WhatsApp/telefon, Instagram, e-posta, Telegram.

**YAPIŞTIR (gerçek numara/kullanıcı adını Uliana'dan aldıktan sonra doldur —
şu an belgede yok):**
> WhatsApp (birincil): [NUMARA EKSİK]
> Telegram: [KULLANICI ADI EKSİK]
> Instagram: @uliana_massage (mevcut kayıtta var, teyit)

**Gözlemlenecek:** `updateContact` bir blok değil, genel ayar — Beiwe'nin
bunu doğru şekilde ayrı bir araçla (blok oluşturmadan) kaydettiğini doğrula.

---

## Adım 5 — Bağlantılar (Telegram kanalı)

**YAPIŞTIR (kanal adı eksik, test için geçici bir placeholder kullan ya da bu
adımı atla):**
> У меня есть Telegram-канал по самомассажу, [KANAL ADI EKSİK — Uliana'dan
> alınmalı].

Kanal adı gerçekten yoksa bu adımı atlayıp Beiwe'nin "bağlantı eklemek ister
misiniz" önerisini nasıl karşıladığını (ısrar mı ediyor, nazikçe geçiyor mu)
gözlemlemek de başlı başına bir test.

---

## Adım 6 — Çalışma saatleri

Uliana bunu hiç belirtmedi — bireysel randevu + online eğitim modeli olduğu
için sabit saat olmayabilir. Bu, Beiwe'nin "zorunlu olmayan" bir bölümü nasıl
ele aldığını test etmek için iyi bir senaryo.

**YAPIŞTIR:**
> У меня нет фиксированного расписания — запись индивидуальная, по
> предварительной договорённости.

**Gözlemlenecek:** Beiwe ısrar etmeden bu bölümü es geçip bir sonraki konuya
mı ilerliyor (prompt kural 8: "zorunlu değil, nazikçe teklif etmeye devam
et").

---

## Adım 7 — SSS (gerçek içerik yok — önerilen taslak)

Uliana hiç SSS metni vermedi. Aşağıdaki 3 soru-cevabı **mevcut hizmet
metinlerinden türettim** (uydurma bilgi değil, zaten yukarıdaki içerikte var)
— hem test verisi hem de gerçekten yayına koyulabilir bir taslak olarak
kullanılabilir, ama yayından önce Uliana onayı gerekir.

**YAPIŞTIR:**
> Вопрос 1: Можно ли делать массаж лица после ботокса?
> Ответ: Да, но с осторожностью — на консультации/обучении отдельно
> разбираются ограничения и то, как выстраивать работу с клиентами после
> инъекционных процедур, чтобы получить результат без риска.
>
> Вопрос 2: Подходит ли онлайн-обучение новичкам?
> Ответ: Да, Оптимальный и Максимальный пакеты специально рассчитаны на
> начинающих специалистов, которым важна обратная связь и уверенная
> постановка техники.
>
> Вопрос 3: Что нужно подготовить для онлайн-обучения?
> Ответ: Стабильный интернет, штатив для телефона, хорошее освещение и модель
> для практической отработки техник во время созвонов.

**Not:** `addFAQ` aracı tek dillidir (kural 4'ün istisnası) — Rusça girilirse
Rusça kalmalı, otomatik 3 dile çevrilmemeli. Bunun doğru davrandığını
doğrula.

---

## Adım 8 — Yorumlar (gerçek içerik yok)

**YAPIŞTIR:**
> Пока нет добавленных отзывов, оставим этот раздел пустым.

**Gözlemlenecek:** Beiwe boş bırakmayı kabul edip zorlamadan bir sonraki
konuya mı geçiyor, yoksa nasıl tepki veriyor. Gerçek yorumlar (öğrenci/müşteri
isim + alıntı) ayrıca Uliana'dan toplanmalı — bu adım sadece "boş bırakma"
davranışını test ediyor.

---

## Adım 9 — Galeri

Hiç görsel verilmedi. Bu adımı metinle test edemezsin (görsel yükleme
gerekiyor) — sadece Beiwe'nin görsel-ağırlıklı önerip önermediğini gözlemle
(masaj/güzellik sektörü "galeri-öncelikli" kategoriye girebilir, prompt kural
2).

---

## B) Toplu (Bulk) test — ayrı bir oturumda dene

Yukarıdaki tüm bilgiyi tek mesajda, `[BULK]` etiketiyle gönder (editördeki
"Toplu" sekmesi zaten bu etiketi otomatik ekliyor):

**YAPIŞTIR (Toplu sekmesine):**
> Я практикующий специалист по массажу лица и тела, опыт 13+ лет, обучаю с
> 2022 года. Глубокотканный массаж + лимфодренажные, миофасциальные и
> буккальные техники. Сертификат МЕВ (Турция), диплом ИФИД.
>
> Услуги: 1) Индивидуальное обучение в Стамбуле — 850$. 2) Онлайн-обучение —
> Базовый 250$ (3 урока + 1 созвон), Оптимальный 350$ (2 созвона), Максимальный
> 490$ (5 созвонов). 3) Индивидуальная консультация для мастеров — 90$/90 мин.
> 4) Авторское масло Face & Harmony — 1900 лир, 100мл. 5) Массаж лица: 45 мин
> — 2700 лир, 60 мин — 3500 лир, 75 мин — 3800 лир.
>
> Контакт: WhatsApp [NUMARA], Instagram @uliana_massage.

**Gözlemlenecek (prompt kural 9):** `setTheme` ilk çağrılan araç mı? Sonra
`updateContact`? Sonra sırayla içerik blokları mı? Tüm hizmetler ayrı araç
çağrılarıyla mı kaydedildi (kural 11 — tek çağrıda birleştirmemeli)?

---

## Toplanması gereken eksik bilgiler (her iki test yolunda da)

- WhatsApp numarası
- Telegram kullanıcı adı (kişisel + varsa self-masaj kanalı)
- Profil fotoğrafı
- Ana ekran kısa sloganı (1 cümle)
- Gerçek müşteri/öğrenci yorumları (en az 2-3)
- Öncesi/sonrası veya çalışma fotoğrafları (galeri için)
