// Faz S.6 — Karakter Odası'nın 3. katmanı: post-prodüksiyon stüdyosu, tek gerçek kaynağı.
//
// Bu dosya BİLEREK `src/utils/fal.ts` ve `src/utils/supabase/admin.ts`'ten ayrı: server
// importu YOK. Kayıtlar hem sunucuda (`studio` route'unda timeline doğrulaması) hem
// tarayıcıda (editör, canvas render) okunuyor — motionModels.ts ile aynı gerekçe.
//
// Render burada YOK — o `src/utils/studioRenderer.ts`'te, çünkü render fonksiyonları
// DOM tipleri (HTMLCanvasElement, HTMLVideoElement) kullanıyor ve bu dosyanın sunucuda
// da import edilebilir (tip-only) kalması gerekiyor.

import type { OverlayFont } from './characters';

export type StudioAssetKind = 'image' | 'video' | 'audio';

/**
 * Yükleme sınırları — tür başına. `character_studio_assets.kind` check kısıtıyla eşleşir.
 * Video, v1'in zaman çizelgesi özelliklerinde (cutaway/overlay) kullanılmıyor — ikisi de
 * sadece görsel kabul ediyor — ama kütüphane ileride (ör. logo animasyonu) kullanılabilsin
 * diye genel amaçlı yükleme türü olarak duruyor.
 */
export const STUDIO_ASSET_LIMITS: Record<StudioAssetKind, { maxBytes: number; mimePrefix: string }> = {
  image: { maxBytes: 10 * 1024 * 1024, mimePrefix: 'image/' },
  video: { maxBytes: 100 * 1024 * 1024, mimePrefix: 'video/' },
  audio: { maxBytes: 20 * 1024 * 1024, mimePrefix: 'audio/' },
};

export function isStudioAssetKind(value: unknown): value is StudioAssetKind {
  return value === 'image' || value === 'video' || value === 'audio';
}

/** `character_studio_assets` satırının uygulama tarafındaki karşılığı. */
export interface StudioAsset {
  id: string;
  character_id: string;
  kind: StudioAssetKind;
  url: string;
  file_name: string;
  created_at: string;
}

/** Çıktı formatları — fal'a giden `AspectRatio`'dan bilerek ayrı: burada piksel boyutu lazım. */
export type StudioAspectRatio = '9:16' | '1:1' | '4:5' | '16:9';

export type StudioAspectPreset = {
  value: StudioAspectRatio;
  label: string;
  width: number;
  height: number;
};

/** 1080 tabanlı standart sosyal medya export boyutları. */
export const STUDIO_ASPECT_RATIOS: StudioAspectPreset[] = [
  { value: '9:16', label: 'Story/Reel 9:16', width: 1080, height: 1920 },
  { value: '1:1', label: 'Kare 1:1', width: 1080, height: 1080 },
  { value: '4:5', label: 'Gönderi 4:5', width: 1080, height: 1350 },
  { value: '16:9', label: 'Yatay 16:9', width: 1920, height: 1080 },
];

export function studioAspectPreset(ratio: StudioAspectRatio): StudioAspectPreset {
  return STUDIO_ASPECT_RATIOS.find((p) => p.value === ratio) ?? STUDIO_ASPECT_RATIOS[0];
}

export function isStudioAspectRatio(value: unknown): value is StudioAspectRatio {
  return typeof value === 'string' && STUDIO_ASPECT_RATIOS.some((p) => p.value === value);
}

export type StudioFit = 'cover' | 'contain';

/**
 * Videonun yerine tam ekran görsel gösterilen zaman aralığı — ses videodan kesintisiz
 * akmaya devam eder, sadece görüntü değişir. `studioRenderer.drawFrame` bunu, video
 * karesi çizmek yerine bu aralıktaki görseli çizerek uyguluyor (bkz. o dosyadaki yorum).
 */
export type StudioCutaway = {
  id: string;
  assetUrl: string;
  startTime: number;
  endTime: number;
  fit: StudioFit;
};

export type StudioIntroOutro = {
  assetUrl: string;
  duration: number; // In seconds
  fit: StudioFit;
};

/** Ortak zaman/konum alanları — hem görsel hem metin overlay'i bunu taşır. */
type StudioOverlayBase = {
  id: string;
  startTime: number;
  endTime: number;
  /** Canvas boyutunun yüzdesi (0-100) — çözünürlükten bağımsız olsun diye (overlay.headlineSize ile aynı mantık). */
  x: number;
  y: number;
  opacity: number;
};

export type StudioImageOverlay = StudioOverlayBase & {
  kind: 'image';
  assetUrl: string;
  /** Canvas genişliğinin yüzdesi; yükseklik görselin kendi oranından hesaplanır. */
  width: number;
};

export type StudioTextOverlay = StudioOverlayBase & {
  kind: 'text';
  text: string;
  /** Canvas yüksekliğinin yüzdesi — CharacterShot.overlay.headlineSize ile aynı birim. */
  fontSize: number;
  color: string;
  align: 'left' | 'center' | 'right';
  font: OverlayFont;
};

export type StudioOverlay = StudioImageOverlay | StudioTextOverlay;

export type StudioMusic = {
  assetUrl: string;
  /** 0-1 arası kazanç; orijinal video sesi her zaman 1'de kalır, sadece müzik kısılır. */
  volume: number;
};

export type StudioTimeline = {
  aspectRatio: StudioAspectRatio;
  /** Ana videonun kaynak süresinden (saniye) kırpılan aralık. */
  trim: { start: number; end: number };
  cutaways: StudioCutaway[];
  overlays: StudioOverlay[];
  intro: StudioIntroOutro | null;
  outro: StudioIntroOutro | null;
  music: StudioMusic | null;
  wordmark: boolean;
};

export const MAX_CUTAWAYS = 12;
export const MAX_OVERLAYS = 12;
export const MAX_OVERLAY_TEXT_LENGTH = 200;
export const MAX_PROJECT_NAME_LENGTH = 80;

export const DEFAULT_TIMELINE: StudioTimeline = {
  aspectRatio: '9:16',
  // end=0: "kaynak videonun tamamı" için sentinel — gerçek süre yüklenince editör dolduruyor.
  trim: { start: 0, end: 0 },
  cutaways: [],
  overlays: [],
  intro: null,
  outro: null,
  music: null,
  wordmark: true,
};

const OVERLAY_FONTS_SET = new Set<OverlayFont>(['bricolage', 'inter', 'mono']);

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** `assetUrl` alanlarının en azından http(s) URL'i olduğunu doğrular — tam whitelisting değil. */
function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function parseCutaway(value: unknown): StudioCutaway | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (!isHttpUrl(v.assetUrl)) return null;
  if (!isFiniteNumber(v.startTime) || !isFiniteNumber(v.endTime)) return null;
  if (v.endTime <= v.startTime) return null;
  const fit: StudioFit = v.fit === 'contain' ? 'contain' : 'cover';
  return {
    id: typeof v.id === 'string' ? v.id : crypto.randomUUID(),
    assetUrl: v.assetUrl,
    startTime: Math.max(0, v.startTime),
    endTime: v.endTime,
    fit,
  };
}

function parseIntroOutro(value: unknown): StudioIntroOutro | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (!isHttpUrl(v.assetUrl)) return null;
  if (!isFiniteNumber(v.duration) || v.duration <= 0) return null;
  const fit: StudioFit = v.fit === 'contain' ? 'contain' : 'cover';
  return {
    assetUrl: v.assetUrl,
    duration: v.duration,
    fit,
  };
}

function parseOverlay(value: unknown): StudioOverlay | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (!isFiniteNumber(v.startTime) || !isFiniteNumber(v.endTime) || v.endTime <= v.startTime) return null;

  const base = {
    id: typeof v.id === 'string' ? v.id : crypto.randomUUID(),
    startTime: Math.max(0, v.startTime),
    endTime: v.endTime,
    x: clamp(isFiniteNumber(v.x) ? v.x : 50, 0, 100),
    y: clamp(isFiniteNumber(v.y) ? v.y : 50, 0, 100),
    opacity: clamp(isFiniteNumber(v.opacity) ? v.opacity : 1, 0, 1),
  };

  if (v.kind === 'image') {
    if (!isHttpUrl(v.assetUrl)) return null;
    return {
      ...base,
      kind: 'image',
      assetUrl: v.assetUrl,
      width: clamp(isFiniteNumber(v.width) ? v.width : 30, 5, 100),
    };
  }

  if (v.kind === 'text') {
    if (typeof v.text !== 'string' || !v.text.trim()) return null;
    const font = OVERLAY_FONTS_SET.has(v.font as OverlayFont) ? (v.font as OverlayFont) : 'bricolage';
    const align = v.align === 'left' || v.align === 'right' ? v.align : 'center';
    return {
      ...base,
      kind: 'text',
      text: v.text.slice(0, MAX_OVERLAY_TEXT_LENGTH),
      fontSize: clamp(isFiniteNumber(v.fontSize) ? v.fontSize : 6, 1, 20),
      color: typeof v.color === 'string' ? v.color : '#FFFFFF',
      align,
      font,
    };
  }

  return null;
}

function parseMusic(value: unknown): StudioMusic | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (!isHttpUrl(v.assetUrl)) return null;
  return { assetUrl: v.assetUrl, volume: clamp(isFiniteNumber(v.volume) ? v.volume : 0.5, 0, 1) };
}

/**
 * İstemciden gelen timeline'ı sunucuda doğrular — istemciye güvenilmiyor (plan kararı).
 * Geçersiz/eksik alanlar makul varsayılanlara düşer, tamamen anlamsız girdi `null` döner.
 */
export function parseStudioTimeline(value: unknown): StudioTimeline | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;

  if (!isStudioAspectRatio(v.aspectRatio)) return null;

  const trimSource = typeof v.trim === 'object' && v.trim !== null ? (v.trim as Record<string, unknown>) : {};
  const start = isFiniteNumber(trimSource.start) ? Math.max(0, trimSource.start) : 0;
  const end = isFiniteNumber(trimSource.end) ? trimSource.end : 0;
  if (end !== 0 && end <= start) return null;

  const cutaways = Array.isArray(v.cutaways)
    ? (v.cutaways.map(parseCutaway).filter(Boolean) as StudioCutaway[]).slice(0, MAX_CUTAWAYS)
    : [];

  const overlays = Array.isArray(v.overlays)
    ? (v.overlays.map(parseOverlay).filter(Boolean) as StudioOverlay[]).slice(0, MAX_OVERLAYS)
    : [];

  return {
    aspectRatio: v.aspectRatio,
    trim: { start, end },
    cutaways,
    overlays,
    intro: parseIntroOutro(v.intro),
    outro: parseIntroOutro(v.outro),
    music: v.music ? parseMusic(v.music) : null,
    wordmark: v.wordmark !== false,
  };
}

/** `character_studio_projects` satırının uygulama tarafındaki karşılığı. */
export interface StudioProject {
  id: string;
  character_id: string;
  motion_id: string | null;
  name: string;
  timeline: StudioTimeline;
  output_url: string | null;
  created_at: string;
  updated_at: string;
}
