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
    id: 'fal-ai/kling-video/ai-avatar/v2/pro',
    label: 'Kling Avatar v2 Pro',
    hint: 'Güçlü dudak senkronu, OmniHuman’ın yaklaşık yarı fiyatı',
    costPerSecondUsd: 0.115,
    resolutions: { '1080p': 60 },
    sendsResolution: false,
    supportsTurbo: false,
    minAudioSeconds: 2,
    maxAudioMb: 5,
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
