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
    label: 'clipWanMotionLabel',
    hint: 'clipWanMotionHint',
    costPerSecondUsd: 0.06, // 720p tahmini, fal zam yaparsa sessizce yanlışa döner
    supportsPrompt: true,
  },
  {
    id: 'fal-ai/bytedance/dreamactor/v2',
    label: 'clipDreamActorLabel',
    hint: 'clipDreamActorHint',
    costPerSecondUsd: 0.05,
    supportsPrompt: false,
  },
];

export const DEFAULT_PERFORMANCE_MODEL_ID = PERFORMANCE_MODELS[0].id;

export function findPerformanceModel(id: unknown): PerformanceModel | undefined {
  return typeof id === 'string' ? PERFORMANCE_MODELS.find((m) => m.id === id) : undefined;
}

/**
 * Action Room'un video-to-video modeli — `PERFORMANCE_MODELS`'ten (Podcast) BİLEREK AYRI.
 *
 * DÜZELTME (kullanıcı geri bildirimi): wan-motion/DreamActor göz-kaş-mimik odaklı yakın
 * plan performans aktarımı için ayarlı — Motion'ın ihtiyacı FARKLI: boydan/cinematic/
 * fantastic sahnelerde tüm gövde koreografisini taşıyabilen modeller. Bu yüzden Motion
 * artık PERFORMANCE_MODELS'i KULLANMIYOR, bu ayrı listeyi kullanıyor.
 *
 * DOĞRULANMADI — SCENE_VIDEO_MODELS'teki aynı disiplin: ilk gerçek denemeden sonra
 * güncellenmeli (`generateCharacterPerformance`'ın gönderdiği alanlar da dahil).
 */
export type FullBodyMotionModel = {
  id: string;
  label: string;
  hint: string;
  costPerSecondUsd: number;
  supportsPrompt: boolean;
};

export const FULL_BODY_MOTION_MODELS: FullBodyMotionModel[] = [
  {
    id: 'fal-ai/mimic-motion',
    label: 'clipMimicMotionLabel',
    hint: 'clipMimicMotionHint',
    costPerSecondUsd: 0.1,
    supportsPrompt: false,
  },
];

export const DEFAULT_FULL_BODY_MOTION_MODEL_ID = FULL_BODY_MOTION_MODELS[0].id;

export function findFullBodyMotionModel(id: unknown): FullBodyMotionModel | undefined {
  return typeof id === 'string' ? FULL_BODY_MOTION_MODELS.find((m) => m.id === id) : undefined;
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
    label: 'clipKlingLabel',
    hint: 'clipKlingHint',
    costPerSecondUsd: 0.28,
  },
];

export const DEFAULT_SCENE_VIDEO_MODEL_ID = SCENE_VIDEO_MODELS[0].id;

export function findSceneVideoModel(id: unknown): SceneVideoModel | undefined {
  return typeof id === 'string' ? SCENE_VIDEO_MODELS.find((m) => m.id === id) : undefined;
}
