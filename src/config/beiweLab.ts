// Beiwe Lab — yayından önceki geliştirme alanı.
//
// Karakter Odası bugün tek sayfada beş ayrı işi taşıyor (yüz tanıtma, sahne üretimi,
// ses klonlama, performans aktarımı, post-production). Lab bunları katmanlara ayırır:
// her sayfanın tek bir girdisi ve tek bir çıktısı olur.
//
// Mevcut `admin/characters/*` odasına dokunulmuyor — Lab paralel yaşar, yeni tasarım
// bitince sidebar'dan eski oda düşürülür.

/**
 * Twin sayfasının üzerinde çalıştığı karakter.
 *
 * "(2)" soneki kişinin twin'ini işaret eder — "Enes (2)", Enes'in ikinci, yapay
 * kopyası. Şimdilik tek profil var; ürün kullanıma açıldığında her kullanıcı kendi
 * adıyla bir "(2)" alacak ve bu sabit, oturumdaki kullanıcının profiline dönecek.
 */
export const TWIN_CHARACTER_ID = 'enes2' as const;

/** Bir karenin "twin doğrulandı" sayılması için gereken benzerlik puanı. */
export const TWIN_VERIFIED_SCORE = 9;

/** LoRA eğitim setine giren karenin alması gereken asgari puan. */
export const LORA_MIN_SCORE = 8;

/** LoRA eğitimini başlatmak için gereken yüksek puanlı kare sayısı. */
export const LORA_TRAINING_THRESHOLD = 15;

/**
 * fal `flux-lora-fast-training` en az 5 fotoğrafla eğitiyor; API route da bunu
 * doğruluyor (bkz. `api/admin/characters/[characterId]/lora/route.ts`).
 */
export const LORA_MIN_PHOTOS = 5;

export type LoraStatus = 'none' | 'queued' | 'training' | 'ready' | 'failed';

export const LORA_STATUS_LABELS: Record<LoraStatus, string> = {
  none: 'Başlatılmadı',
  queued: 'Kuyrukta',
  training: 'Eğitiliyor',
  ready: 'Hazır',
  failed: 'Başarısız',
};

/* ------------------------------------------------------------------ */
/* Voice katmanı                                                       */
/* ------------------------------------------------------------------ */

/**
 * MiniMax — gerçek bir kalıcı klon kimliği var (F5-TTS'in aksine).
 *
 * 2026-07-29 testinde F5-TTS Türkçe'de anlamsız hece üretti (dil desteği yetersiz);
 * MiniMax `language_boost: 'Turkish'` ile doğru okudu. `fal-ai/minimax/voice-clone`
 * referansı bir kez işleyip kalıcı bir `custom_voice_id` döndürüyor — sonraki
 * üretimler ses dosyasını değil bu kimliği kullanıyor. Twin'deki LoRA'nın ses
 * karşılığı bu: Voice de artık üç aşamalı (Referans → Klonla → Doğrula).
 *
 * Benzerlik testinde en iyi sonuç HAM referanstan geldi (fal'ın kendi gürültü
 * temizliği/normalizasyonu kapalıyken) — bkz. `cloneMinimaxVoice` (fal.ts). Eldeki
 * en iyi sonuç bile "klonlamaya değecek kalitede değil" bulundu (kurucu değerlendirmesi,
 * 2026-07-29); bu bilinen bir sınır, iyi bir kaynak kayıtla yeniden denenebilir.
 */
export const VOICE_MODEL_NOTE = 'fal-ai/minimax · kalıcı klon kimliği, language_boost: Turkish';

/** Klonlama tek seferlik ücretli bir işlem — fal fiyatlandırması (doğrulandı, 2026-07-29). */
export const MINIMAX_CLONE_COST_USD = 1.5;

/**
 * TTS maliyeti (1000 karakter başına, USD) — `speech-02-hd`, fal fiyatlandırma
 * sayfasından doğrulandı (2026-07-29). Eskiden F5-TTS için DOĞRULANMAMIŞ bir tahmindi;
 * bu artık gerçek bir rakam.
 */
export const ESTIMATED_VOICE_COST_PER_1K_CHARS_USD = 0.1;

/**
 * Yeni bir `custom_voice_id`, gerçek bir TTS çağrısında kullanılmazsa 7 gün içinde
 * fal/MiniMax tarafında siliniyor. Klonlama sırasındaki önizleme bunu saymıyor —
 * o yüzden `cloneMinimaxVoice` önizlemeyi atlıyor (`text: null`); kimliği mühürleyen
 * ilk gerçek çağrı, doğrulama aşamasındaki ilk "Seslendir".
 */
export const MINIMAX_VOICE_EXPIRY_DAYS = 7;

/**
 * Klon doğrulama metinleri.
 *
 * Genel amaçlı "merhaba dünya" yerine ürünün gerçekten üreteceği cümleler: klonun
 * işe yarayıp yaramadığı ancak kendi işini yaparken anlaşılır. Segment = solo
 * diyetisyen (ilk 10 beachhead).
 */
export const VOICE_TEST_SCRIPTS: {
  id: string;
  label: string;
  hint: string;
  text: string;
}[] = [
  {
    id: 'greeting',
    label: 'Karşılama',
    hint: 'Kısa cümle — tını ve aksan burada en çıplak duyulur.',
    text: 'Merhaba, ben Enes. Mesajını aldım, hemen yardımcı oluyorum.',
  },
  {
    id: 'appointment',
    label: 'Randevu onayı',
    hint: 'Ürünün asıl işi. Tarih ve saat okunuşu doğru mu?',
    text: 'Randevunu salı günü saat 14:30 için oluşturdum. Görüşmemiz 45 dakika sürecek, bir gün önce sana hatırlatma göndereceğim.',
  },
  {
    id: 'pricing',
    label: 'Fiyat sorusu',
    hint: 'Rakam ve para birimi — sayılar tökezliyor mu?',
    text: 'İlk görüşme ücreti 1.250 TL. Dört seanslık paket alırsan seans başı 950 TL oluyor.',
  },
  {
    id: 'endurance',
    label: 'Uzun anlatım',
    hint: 'Dayanıklılık testi: uzun metinde ses kimlikten kayıyor mu?',
    text: 'Beslenme programını hazırlarken önce günlük alışkanlıklarını konuşuyoruz. Neyi ne zaman yediğin, uyku düzenin ve hareket miktarın programın iskeletini kuruyor. Sonrasında iki haftada bir kontrol görüşmesi yapıyoruz; gerekirse programı birlikte güncelliyoruz. Yani sana tek bir liste verip bırakmıyorum, süreç boyunca yanındayım.',
  },
];

/**
 * Twin doğrulama kareleri — sahne üretimi DEĞİL.
 *
 * Bu sayfanın sorusu "bu yüz bana benziyor mu?", "bu sahne güzel mi?" değil. O yüzden
 * serbest sahne tarifi yok; kimliği farklı mesafe ve açılardan sınayan sabit bir set var.
 * İçerik/sahne üretimi Lab'ın ayrı bir sayfasına (Beiwe Studio) taşınacak.
 *
 * `presetId` değerleri `src/config/characters.ts`'teki `SHARED_SCENE_PRESETS` ile eşleşir.
 */
export const TWIN_VALIDATION_ANGLES: {
  id: string;
  label: string;
  hint: string;
  presetId: string;
}[] = [
  {
    id: 'close',
    label: 'Yakın portre',
    hint: 'Yüz hatları en net burada okunur — benzerliği asıl bu kare belirler.',
    presetId: 'close-portrait',
  },
  {
    id: 'mid',
    label: 'Orta plan',
    hint: 'Yüz + omuz oranı; kimlik uzaklaşınca da tutuyor mu?',
    presetId: 'mid-shot',
  },
  {
    id: 'profile',
    label: 'Yarı profil',
    hint: 'Üç çeyrek açı. Modeller en çok burada kimlikten kayar.',
    presetId: 'talking-to-camera',
  },
];
