// Faz S.7 — Ortak klip havuzunun tek gerçek kaynağı.
//
// `src/config/motionModels.ts` ile aynı gerekçe: server importu YOK, hem sunucuda
// (route doğrulaması) hem tarayıcıda (Podcast Room, Studio picker) okunuyor.

export type ClipRoom = 'podcast' | 'action' | 'external';
export type ClipSource = 'generated' | 'uploaded';

export function isClipRoom(value: unknown): value is ClipRoom {
  return value === 'podcast' || value === 'action' || value === 'external';
}

/** `character_clips` satırının uygulama tarafındaki karşılığı. */
export interface CharacterClip {
  id: string;
  character_id: string;
  room: ClipRoom;
  source: ClipSource;
  /** fal model kimliği; harici yüklemelerde null. */
  model: string | null;
  video_url: string;
  /** Eşlik eden anlatım sesi — ör. wan-motion'ın sessiz çıktısına karşılık, senkron kalan sürücü video. */
  audio_url: string | null;
  /** Üretimde kullanılan kanon kare, varsa. */
  source_image_url: string | null;
  /** Kullanıcı etiketi — özellikle harici yüklemeler için (üretilenlerde genelde boş). */
  label: string | null;
  created_at: string;
}

export type PerformanceModel = {
  /** fal queue endpoint kimliği. */
  id: string;
  label: string;
  hint: string;
  /** fal saniye başına faturalıyor; tahmini maliyet bununla hesaplanıyor. */
  costPerSecondUsd: number;
  /** Üretimi yönlendiren opsiyonel `prompt` alanını destekliyor mu (DreamActor'da yok). */
  supportsPrompt: boolean;
};

/**
 * OmniHuman/Kling (ses-güdümlü avatar) BİLEREK burada değil — gerçek kullanıcı testinde
 * ağız hareketi abartılı/gerçekçi olmadığı için Podcast Room'un yolu performans aktarımı.
 * wan-motion gerçek bir sürücü videoyla doğrulandı (bkz. proje geçmişi — 2026-07-29 testi).
 * DreamActor v2 henüz doğrulanmadı — kullanıcı karşılaştırmak için deniyor.
 */
export const PERFORMANCE_MODELS: PerformanceModel[] = [
  {
    id: 'fal-ai/wan-motion',
    label: 'Wan Motion',
    hint: 'Performans aktarımı — kendi hareketini/mimiğini karaktere giydirir',
    costPerSecondUsd: 0.06, // 720p tahmini, fal zam yaparsa sessizce yanlışa döner
    supportsPrompt: true,
  },
  {
    id: 'fal-ai/bytedance/dreamactor/v2',
    label: 'DreamActor v2',
    hint: 'ByteDance — yüz/dudak hareketini ayrıca vurguluyor, doğrulanmadı',
    costPerSecondUsd: 0.05,
    supportsPrompt: false,
  },
];

export const DEFAULT_PERFORMANCE_MODEL_ID = PERFORMANCE_MODELS[0].id;

export function findPerformanceModel(id: unknown): PerformanceModel | undefined {
  return typeof id === 'string' ? PERFORMANCE_MODELS.find((m) => m.id === id) : undefined;
}

/**
 * Referanssız senaryo-dan-video (Action Room'un "scenario" modu) — sürücü video yok,
 * yalnız kaynak görsel + metin. `PERFORMANCE_MODELS`'ten (video-to-video) BİLEREK ayrı:
 * bu aile image-to-video, farklı bir fal ürün kategorisi.
 *
 * DİKKAT — DOĞRULANMADI: wan-motion/OmniHuman gibi gerçek bir üretimle test edilmedi.
 * `costPerSecondUsd` bir TAHMİN. İlk gerçek denemeden sonra bu kayıt (ve gerekiyorsa
 * `generateSceneVideo`'nun gönderdiği alanlar) güncellenmeli — bkz. `motionModels.ts`'in
 * "DENEYLE bulundu, dokümanla değil" ilkesi.
 */
export type SceneVideoModel = {
  id: string;
  label: string;
  hint: string;
  costPerSecondUsd: number;
};

export const SCENE_VIDEO_MODELS: SceneVideoModel[] = [
  {
    id: 'fal-ai/kling-video/v2/master/image-to-video',
    label: 'Kling v2 Master (deneysel)',
    hint: 'Sürücü video yok — yalnız görsel + senaryo metninden video üretir. Henüz doğrulanmadı.',
    costPerSecondUsd: 0.28,
  },
];

export const DEFAULT_SCENE_VIDEO_MODEL_ID = SCENE_VIDEO_MODELS[0].id;

export function findSceneVideoModel(id: unknown): SceneVideoModel | undefined {
  return typeof id === 'string' ? SCENE_VIDEO_MODELS.find((m) => m.id === id) : undefined;
}
