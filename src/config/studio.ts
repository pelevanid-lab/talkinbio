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
 * Video, cutaway'de kullanılmıyor (tam ekran görsel değişimi için görsel yeterli) ama
 * overlay'de "ekrana monte edilen görüntü" (StudioVideoOverlay) kaynağı olarak kullanılıyor.
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

/**
 * "3 — 2 — 1 — yayın" geri sayımı. Noktalar CANVAS'A ÇİZİLİR (hazır bir görselin üstüne
 * değil): her nokta kendi bipiyle aynı anda yanabilsin diye görüntü ile sesin tek bir zaman
 * planından türemesi gerekiyor — bkz. `utils/countdown`.
 *
 * Sesi burada dosya olarak tutmuyoruz; osilatörle sentezleniyor. Klasik yayın sayacı bipi
 * (1000 Hz) zaten saf bir sinüs — asset yüklemek/yönetmek, önizleme ile export'un aynı
 * dosyayı beklemesi gibi bir yığın sorunu bedavaya getirirdi.
 */
export type StudioCountdown = {
  /** Kaç nokta = kaç kısa bip (sondaki uzun "yayın" bipi buna dahil değil). */
  steps: number;
  /**
   * `drain` = noktalar tek tek SÖNER (3 → 2 → 1 → yayın) — "geri sayım"ın birebir karşılığı.
   * `fill` = noktalar tek tek YANAR (yükleniyor → başlıyoruz). İkisi de aynı bip ritmini
   * kullanır, sadece hangi noktanın ne zaman değiştiği ters çevrilir.
   */
  direction: 'drain' | 'fill';
  /** Yanmış noktanın rengi; sönük hâli aynı renkten düşük opaklıkla türetilir. */
  color: string;
  /** Intro'ya görsel seçilmediyse çizilen düz arka plan. */
  background: string;
  /** Bip sesi — kapatılırsa sadece görsel geri sayım kalır. */
  sound: boolean;
};

export type StudioIntroOutro = {
  /** Geri sayım modunda null olabilir — o zaman `countdown.background` düz renk çizilir. */
  assetUrl: string | null;
  duration: number; // In seconds
  /**
   * Videonun başı (Intro) veya sonuna (Outro) göre zamanlama ofseti.
   * Intro'da -2 ise videodan 2 saniye önce (pre-roll) başlar. 0 ise video ile aynı anda başlar.
   * Outro'da +2 ise video bittikten 2 saniye sonraya (post-roll) uzar. 0 ise videoyla aynı anda biter.
   */
  offset: number;
  fit: StudioFit;
  /** null = düz görsel intro (eski davranış, kayıtlı projeler böyle açılır). */
  countdown: StudioCountdown | null;
};

/**
 * Kamera yakınlaştırma ("punch-in") — bu aralıkta TÜM kare (video + üstündeki overlay'ler)
 * `x`/`y` merkez noktasına doğru `scale` oranında büyür, `transition` saniyede yakınlaşır/
 * uzaklaşır, ortada sabit kalır. Ekrana monte edilen bir video overlay ile birlikte
 * kullanıldığında ikisi birlikte büyür — kameranın ekrana yaklaştığı hissi budur.
 */
export type StudioZoom = {
  id: string;
  startTime: number;
  endTime: number;
  /** Yakınlaşma hedefinin merkezi, canvas yüzdesi (0-100). */
  x: number;
  y: number;
  /** Büyütme çarpanı — 1 = zoom yok. */
  scale: number;
  /** Zoom-in/zoom-out geçiş süresi (saniye), başta ve sonda simetrik uygulanır. */
  transition: number;
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

/**
 * Ekrana monte edilen video (ör. laptop ekranına oturan bir screen-recording) — image
 * overlay ile aynı konumlama mantığı (x/y/width, eksene hizalı dikdörtgen), ama kaynağı
 * video. Her zaman sessiz oynatılır: ana videonun sesiyle karışmasın diye ayrıca bir
 * ses seviyesi/mute alanı YOK, `studioRenderer` bunu her zaman muted oynatıyor.
 */
export type StudioVideoOverlay = StudioOverlayBase & {
  kind: 'video';
  assetUrl: string;
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

export type StudioOverlay = StudioImageOverlay | StudioTextOverlay | StudioVideoOverlay;

export type StudioMusic = {
  assetUrl: string;
  /** 0-1 arası kazanç — orijinal video sesi ayrıca `StudioTimeline.videoVolume` ile ayarlanır. */
  volume: number;
};

/**
 * Otomatik altyazının TEK bir kelimesi (fal-ai/whisper `chunk_level: "word"` çıktısından) —
 * ekranda aynı anda tek kelime yanıp söner ("karaoke"/TikTok tarzı pop-on caption).
 * `startTime`/`endTime` diğer zaman çizelgesi öğeleriyle AYNI koordinat sisteminde
 * (0 = `trim.start`) — transkripsiyon sırasında whisper'ın mutlak zaman damgasından
 * `trim.start` çıkarılarak hesaplanıyor (bkz. StudioEditor'daki transcribe akışı).
 */
export type StudioCaption = {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
};

/** Tüm altyazı kelimelerinin paylaştığı ortak görünüm — her kelime için ayrı ayarlamak yerine tek stil. */
export type StudioCaptionStyle = {
  /** Canvas yüzdesi, metnin merkezi. */
  x: number;
  y: number;
  /** Canvas yüksekliğinin yüzdesi. */
  fontSize: number;
  color: string;
  font: OverlayFont;
};

export type StudioTimeline = {
  aspectRatio: StudioAspectRatio;
  /** Ana videonun kaynak süresinden (saniye) kırpılan aralık. */
  trim: { start: number; end: number };
  cutaways: StudioCutaway[];
  overlays: StudioOverlay[];
  zooms: StudioZoom[];
  captions: StudioCaption[];
  captionStyle: StudioCaptionStyle;
  intro: StudioIntroOutro | null;
  outro: StudioIntroOutro | null;
  music: StudioMusic | null;
  /** 0-1 arası kazanç — orijinal video/anlatım sesi (bkz. `enhancedAudioUrl`). */
  videoVolume: number;
  /** fal-ai/elevenlabs/audio-isolation çıktısı — varsa orijinal video sesi yerine BU çalınır/kaydedilir. */
  enhancedAudioUrl: string | null;
  wordmark: boolean;
};

export const MAX_CUTAWAYS = 12;
export const MAX_OVERLAYS = 12;
export const MAX_ZOOMS = 8;
// Cutaway/overlay'den çok daha yüksek: bir dakikalık konuşma kolayca 150+ kelime üretir,
// bunlar tek tek elle eklenmiyor, whisper'dan toplu geliyor.
export const MAX_CAPTIONS = 600;
export const MAX_OVERLAY_TEXT_LENGTH = 200;
export const MAX_PROJECT_NAME_LENGTH = 80;

export const MIN_COUNTDOWN_STEPS = 2;
export const MAX_COUNTDOWN_STEPS = 5;

// Nokta rengi `LogoSVG`deki (page.tsx) üç noktayla BİREBİR aynı hex — geri sayım markanın
// kendi işaretinin büyütülmüş hâli gibi okunsun diye. Zemin markanın kirli beyazı.
export const DEFAULT_COUNTDOWN: StudioCountdown = {
  steps: 3,
  direction: 'drain',
  color: '#14231F',
  background: '#F2EFE6',
  sound: true,
};

/**
 * Geri sayım intro'sunun varsayılan süresi. Yayın sayacı ritmi süreyi (adım + 1)'e böldüğü
 * için 2.5 sn ≈ 0.6 sn'lik vuruşlar demek — Reels için fazla uzatmadan sayaç hissini veriyor.
 */
export const DEFAULT_COUNTDOWN_DURATION = 2.5;

// y: 82 -> Instagram/TikTok Reels'in alt %20'lik kendi arayüzü (kullanıcı adı, açıklama,
// paylaş butonları) tam bu bölgeyi kaplıyor — StudioEditor'daki güvenli alan çizgisiyle
// (bottom-[20%], yani Y:80) çakışırdı. 70, o çizginin belirgin şekilde üstünde kalıyor.
export const DEFAULT_CAPTION_STYLE: StudioCaptionStyle = {
  x: 50,
  y: 70,
  fontSize: 7,
  color: '#FFFFFF',
  font: 'bricolage',
};

export const DEFAULT_TIMELINE: StudioTimeline = {
  aspectRatio: '9:16',
  // end=0: "kaynak videonun tamamı" için sentinel — gerçek süre yüklenince editör dolduruyor.
  trim: { start: 0, end: 0 },
  cutaways: [],
  overlays: [],
  zooms: [],
  captions: [],
  captionStyle: DEFAULT_CAPTION_STYLE,
  intro: null,
  outro: null,
  music: null,
  videoVolume: 1,
  enhancedAudioUrl: null,
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

function parseZoom(value: unknown): StudioZoom | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (!isFiniteNumber(v.startTime) || !isFiniteNumber(v.endTime) || v.endTime <= v.startTime) return null;
  return {
    id: typeof v.id === 'string' ? v.id : crypto.randomUUID(),
    startTime: Math.max(0, v.startTime),
    endTime: v.endTime,
    x: clamp(isFiniteNumber(v.x) ? v.x : 50, 0, 100),
    y: clamp(isFiniteNumber(v.y) ? v.y : 50, 0, 100),
    scale: clamp(isFiniteNumber(v.scale) ? v.scale : 1.6, 1, 4),
    transition: clamp(isFiniteNumber(v.transition) ? v.transition : 0.4, 0, 3),
  };
}

function parseCountdown(value: unknown): StudioCountdown | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  return {
    steps: Math.round(clamp(isFiniteNumber(v.steps) ? v.steps : DEFAULT_COUNTDOWN.steps, MIN_COUNTDOWN_STEPS, MAX_COUNTDOWN_STEPS)),
    direction: v.direction === 'fill' ? 'fill' : 'drain',
    color: typeof v.color === 'string' ? v.color : DEFAULT_COUNTDOWN.color,
    background: typeof v.background === 'string' ? v.background : DEFAULT_COUNTDOWN.background,
    sound: v.sound !== false,
  };
}

function parseIntroOutro(value: unknown): StudioIntroOutro | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (!isFiniteNumber(v.duration) || v.duration <= 0) return null;

  const countdown = parseCountdown(v.countdown);
  const assetUrl = isHttpUrl(v.assetUrl) ? v.assetUrl : null;
  // Görselsiz intro yalnızca geri sayım modunda anlamlı — aksi hâlde ekranda çizilecek
  // hiçbir şey kalmaz (siyah kare), o yüzden böyle bir kayıt tamamen reddediliyor.
  if (!assetUrl && !countdown) return null;

  const fit: StudioFit = v.fit === 'contain' ? 'contain' : 'cover';
  const offset = isFiniteNumber(v.offset) ? v.offset : 0;
  return {
    assetUrl,
    duration: v.duration,
    offset,
    fit,
    countdown,
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

  if (v.kind === 'video') {
    if (!isHttpUrl(v.assetUrl)) return null;
    return {
      ...base,
      kind: 'video',
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

function parseCaption(value: unknown): StudioCaption | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.text !== 'string' || !v.text.trim()) return null;
  if (!isFiniteNumber(v.startTime) || !isFiniteNumber(v.endTime) || v.endTime <= v.startTime) return null;
  return {
    id: typeof v.id === 'string' ? v.id : crypto.randomUUID(),
    text: v.text.slice(0, MAX_OVERLAY_TEXT_LENGTH),
    startTime: Math.max(0, v.startTime),
    endTime: v.endTime,
  };
}

function parseCaptionStyle(value: unknown): StudioCaptionStyle {
  if (typeof value !== 'object' || value === null) return DEFAULT_CAPTION_STYLE;
  const v = value as Record<string, unknown>;
  const font = OVERLAY_FONTS_SET.has(v.font as OverlayFont) ? (v.font as OverlayFont) : DEFAULT_CAPTION_STYLE.font;
  return {
    x: clamp(isFiniteNumber(v.x) ? v.x : DEFAULT_CAPTION_STYLE.x, 0, 100),
    y: clamp(isFiniteNumber(v.y) ? v.y : DEFAULT_CAPTION_STYLE.y, 0, 100),
    fontSize: clamp(isFiniteNumber(v.fontSize) ? v.fontSize : DEFAULT_CAPTION_STYLE.fontSize, 1, 20),
    color: typeof v.color === 'string' ? v.color : DEFAULT_CAPTION_STYLE.color,
    font,
  };
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

  const zooms = Array.isArray(v.zooms)
    ? (v.zooms.map(parseZoom).filter(Boolean) as StudioZoom[]).slice(0, MAX_ZOOMS)
    : [];

  const captions = Array.isArray(v.captions)
    ? (v.captions.map(parseCaption).filter(Boolean) as StudioCaption[]).slice(0, MAX_CAPTIONS)
    : [];

  return {
    aspectRatio: v.aspectRatio,
    trim: { start, end },
    cutaways,
    overlays,
    zooms,
    captions,
    captionStyle: parseCaptionStyle(v.captionStyle),
    intro: parseIntroOutro(v.intro),
    outro: parseIntroOutro(v.outro),
    music: v.music ? parseMusic(v.music) : null,
    videoVolume: clamp(isFiniteNumber(v.videoVolume) ? v.videoVolume : 1, 0, 1),
    enhancedAudioUrl: isHttpUrl(v.enhancedAudioUrl) ? v.enhancedAudioUrl : null,
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
