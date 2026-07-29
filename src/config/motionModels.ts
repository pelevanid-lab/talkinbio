// Faz S.5 — Motion (görsel + ses → konuşan video) modellerinin tek gerçek kaynağı.
//
// Bu dosya BİLEREK `src/utils/fal.ts`'ten ayrı: fal.ts `node:fs/promises` kullanıyor ve
// client bundle'a giremiyor. Kayıtlar hem sunucuda (doğrulama, istek gövdesi) hem
// tarayıcıda (model seçimi, süre/boyut uyarısı, maliyet tahmini) okunduğu için
// bağımlılıksız ve client-safe kalmalı — buraya server importu eklemeyin.
//
// İlk sürümde `fal-ai/sadtalker` kullanılıyordu ve çıktı kullanılamaz haldeydi:
// SadTalker (2023) yüzü 256×256'ya kırpıp animasyonu orada üretiyor, sonra kareye geri
// yerleştiriyor — yüz bulanık çıkıyor, gövde ve eller hiç hareket etmiyor. Aşağıdaki
// modeller kareyi tek geçişte üretiyor ve sesi jest/mimik sinyali olarak kullanıyor.

export type MotionResolution = '720p' | '1080p';

/**
 * Kabul edilen ses formatları — uzantıdan KANONİK MIME'a.
 *
 * DENEYLE bulundu, dokümanla değil. `.m4a` iki kez denendi ve ikisinde de fal
 * "Audio format is invalid" döndürdü — ikincisinde Content-Type doğru (`audio/mp4`,
 * RFC 4337) gitmesine rağmen. Yani konteynerin kendisi reddediliyor.
 *
 * DİKKAT: fal'ın model sayfalarındaki "kabul edilen dosya türleri: mp3, ogg, wav, m4a,
 * aac" satırı yanıltıcı — o, sitedeki playground YÜKLEYİCİSİNİN kabul ettiği türler,
 * modelin doğrulayıcısının değil. Kling geliştirici kılavuzunun düzyazısı (MP3/WAV/AAC)
 * ve OmniHuman kılavuzunun önerisi ("MP3 128kbps+ veya 16-bit PCM WAV") gerçeğe yakın.
 * Yeni format eklemeden önce gerçekten bir istek atıp doğrulayın.
 *
 * Tablonun ikinci işi MIME'ı NORMALLEŞTİRMEK: yükleme eskiden `file.type`'ı olduğu gibi
 * Supabase'e yazıyordu, tarayıcı ise m4a'da `audio/x-m4a` gibi standart dışı değerler
 * veriyor. Aynı tuzak WAV'da da var — bazı tarayıcılar `audio/x-wav` veya `audio/wave`
 * döndürüyor. Bu yüzden `file.type`'a güvenmiyoruz, Content-Type'ı hep buradan yazıyoruz.
 */
export const MOTION_AUDIO_MIME: Record<string, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
};

export const MOTION_AUDIO_EXTENSIONS = Object.keys(MOTION_AUDIO_MIME);

/** Dosya adının uzantısına karşılık gelen kanonik MIME; desteklenmiyorsa undefined. */
export function motionAudioMime(fileName: string): string | undefined {
  const ext = fileName.split('.').pop()?.toLowerCase();
  return ext ? MOTION_AUDIO_MIME[ext] : undefined;
}

export type MotionModel = {
  /** fal queue endpoint kimliği — DB'nin `model` kolonuna bu yazılıyor. */
  id: string;
  label: string;
  /** Seçim listesinde modelin ne zaman tercih edileceğini anlatan tek satır. */
  hint: string;
  /** fal saniye başına faturalıyor; tahmini maliyet bununla hesaplanıyor. */
  costPerSecondUsd: number;
  /**
   * Desteklenen çözünürlükler ve her birinin ses süresi üst sınırı (saniye).
   * Model `resolution` alanı kabul etmiyorsa tek anahtar olur ve UI seçim göstermez.
   */
  resolutions: Partial<Record<MotionResolution, number>>;
  /** `resolution` alanı istek gövdesine eklenecek mi? */
  sendsResolution: boolean;
  /** `turbo_mode` alanı destekleniyor mu? */
  supportsTurbo: boolean;
  /** Ses süresi alt sınırı (saniye) — Kling 2 sn altını reddediyor. */
  minAudioSeconds: number;
  /** Ses dosyası boyut sınırı (MB) — Kling'de 5MB, OmniHuman'da cömert. */
  maxAudioMb: number;
};

/**
 * Sıra UI'daki sırayı belirliyor: en kaliteli en üstte, en ucuz en altta.
 * Fiyatlar 2026-07 itibarıyla fal model sayfalarından alındı; fal zam yaparsa
 * buradaki tahmin sessizce yanlışa döner, o yüzden UI "tahmin" diye etiketliyor.
 */
export const MOTION_MODELS: MotionModel[] = [
  {
    id: 'fal-ai/bytedance/omnihuman/v1.5',
    label: 'OmniHuman 1.5',
    hint: 'En iyi kalite — jest ve mimiği sesin duygusundan çıkarıyor',
    costPerSecondUsd: 0.16,
    resolutions: { '1080p': 30, '720p': 60 },
    sendsResolution: true,
    supportsTurbo: true,
    minAudioSeconds: 0,
    maxAudioMb: 50,
  },
  {
    id: 'fal-ai/kling-video/ai-avatar/v2/standard',
    label: 'Kling Avatar v2 Standard',
    hint: 'En ucuz — varyasyon denemek için, son çekim için değil',
    costPerSecondUsd: 0.0562,
    resolutions: { '1080p': 60 },
    sendsResolution: false,
    supportsTurbo: false,
    minAudioSeconds: 2,
    maxAudioMb: 5,
  },
];

export const DEFAULT_MOTION_MODEL_ID = MOTION_MODELS[0].id;

export function findMotionModel(id: unknown): MotionModel | undefined {
  return typeof id === 'string' ? MOTION_MODELS.find((m) => m.id === id) : undefined;
}

export function motionResolutions(model: MotionModel): MotionResolution[] {
  return Object.keys(model.resolutions) as MotionResolution[];
}

/** Seçilen çözünürlük modelde yoksa modelin ilk çözünürlüğüne düşer. */
export function motionMaxSeconds(model: MotionModel, resolution: MotionResolution): number {
  return model.resolutions[resolution] ?? model.resolutions[motionResolutions(model)[0]]!;
}
