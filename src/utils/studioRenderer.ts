// Faz S.6 — Post-prodüksiyon stüdyosunun render çekirdeği.
//
// Neden sunucuda değil burada: `git log`'da silinmiş bir `mp4-studio` denemesi var
// (bkz. proje geçmişi) — Remotion ile sunucu tarafı render kuruyordu (her istekte webpack
// bundle + headless Chromium + `public/`'e dosya yazma). Vercel'de dosya sistemi
// salt-okunur olduğu için production'da hiç çalışamazdı. Bu dosya bilerek tamamen
// tarayıcıda çalışır: Canvas 2D + MediaRecorder, yeni runtime bağımlılığı yok.
//
// Omurga fikir: video elementi baştan sona KESİNTİSİZ oynar — ses kaynağı ve ana saat
// odur. Her karede video.currentTime'a bakılıp ne çizileceğine karar verilir (video karesi
// mi, yoksa o ana denk gelen bir cutaway görseli mi). Export sırasında hiç seek
// yapılmadığı için takılma/kare düşme riski yoktur.
//
// Önizleme ve export AYNI `drawFrame`'i çağırır — `CharacterOverlayEditor`'daki "önizlemedeki
// punto canvas'takiyle aynı formülü kullanmalı" sorununu (elle senkron tutma ihtiyacını)
// kökünden ortadan kaldırıyor.

import { countdownPlan, drawCountdownDots, scheduleCountdownBeeps } from './countdown';
import { drawTextBlock, drawWordmark, loadImage, PADDING_RATIO, resolveFontFamily } from './imageOverlay';
import type {
  StudioCaption,
  StudioCaptionStyle,
  StudioFit,
  StudioImageOverlay,
  StudioIntroOutro,
  StudioOverlay,
  StudioTextOverlay,
  StudioTimeline,
  StudioVideoOverlay,
  StudioZoom,
} from '@/config/studio';

type Media = HTMLImageElement | HTMLVideoElement;

function isVideoElement(media: Media): media is HTMLVideoElement {
  return typeof HTMLVideoElement !== 'undefined' && media instanceof HTMLVideoElement;
}

function mediaNaturalSize(media: Media): { width: number; height: number } {
  if (isVideoElement(media)) {
    return { width: media.videoWidth || 1, height: media.videoHeight || 1 };
  }
  return { width: media.naturalWidth || media.width || 1, height: media.naturalHeight || media.height || 1 };
}

/**
 * CSS `object-fit` ile aynı matematik: cover taşan kenarı kırpar (canvas kendi sınırının
 * dışına çizileni otomatik keser, ayrıca clip gerekmiyor), contain sığdırır (boşluk kalan
 * kenarlar zaten siyah arka planla dolu — bkz. drawFrame).
 */
function drawMediaFitted(
  ctx: CanvasRenderingContext2D,
  media: Media,
  boxWidth: number,
  boxHeight: number,
  fit: StudioFit,
) {
  const { width: mw, height: mh } = mediaNaturalSize(media);
  if (!mw || !mh) return;

  const scale = fit === 'cover' ? Math.max(boxWidth / mw, boxHeight / mh) : Math.min(boxWidth / mw, boxHeight / mh);
  const drawWidth = mw * scale;
  const drawHeight = mh * scale;
  const dx = (boxWidth - drawWidth) / 2;
  const dy = (boxHeight - drawHeight) / 2;

  ctx.drawImage(media as CanvasImageSource, dx, dy, drawWidth, drawHeight);
}

function drawImageOverlayItem(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  overlay: StudioImageOverlay,
  canvasWidth: number,
  canvasHeight: number,
) {
  const targetWidth = (overlay.width / 100) * canvasWidth;
  const aspect = (img.naturalWidth || img.width || 1) / (img.naturalHeight || img.height || 1);
  const targetHeight = targetWidth / aspect;
  const x = (overlay.x / 100) * canvasWidth;
  const y = (overlay.y / 100) * canvasHeight;

  ctx.save();
  ctx.globalAlpha = overlay.opacity;
  ctx.drawImage(img, x, y, targetWidth, targetHeight);
  ctx.restore();
}

/**
 * Video overlay'in kaynağı canlı bir <video> elementi — henüz ilk kare decode olmadıysa
 * (readyState < 2) veya boyutu bilinmiyorsa sessizce atlanır (drawImage o durumda ya
 * hata verir ya siyah kare çizer, ikisi de eksik kareden daha kötü).
 */
function drawVideoOverlayItem(
  ctx: CanvasRenderingContext2D,
  el: HTMLVideoElement,
  overlay: StudioVideoOverlay,
  canvasWidth: number,
  canvasHeight: number,
) {
  if (el.readyState < 2 || !el.videoWidth || !el.videoHeight) return;
  const targetWidth = (overlay.width / 100) * canvasWidth;
  const aspect = el.videoWidth / el.videoHeight;
  const targetHeight = targetWidth / aspect;
  const x = (overlay.x / 100) * canvasWidth;
  const y = (overlay.y / 100) * canvasHeight;

  ctx.save();
  ctx.globalAlpha = overlay.opacity;
  ctx.drawImage(el, x, y, targetWidth, targetHeight);
  ctx.restore();
}

/**
 * Video overlay'lerin oynatma başlarını timeline zamanına göre sürer. Ana video ve müzikle
 * AYNI mantık: gerçek zamanlı export sırasında her kare seek etmek yerine elementi
 * OYNATIP currentTime'ı doğal akışına bırakmak gerekiyor (MediaRecorder gerçek zamanlı
 * yakaladığı için, sürekli seek hem yavaş hem karesi kaçmış görüntüye yol açar).
 * Sadece durakl/scrub halinde (isPlaying=false) doğrudan seek ediyoruz.
 *
 * Not: aynı video assetUrl'i BİRDEN FAZLA overlay'de kullanılıp zaman aralıkları
 * ÇAKIŞIYORSA tek <video> elementi paylaşılacağından oynatma karışır — v1'de bu nadir ve
 * kabul edilebilir bir sınır (bkz. StudioEditor'daki videoOverlayEls, url ile anahtarlanıyor).
 */
export function syncVideoOverlays(
  overlays: StudioOverlay[],
  time: number,
  isPlaying: boolean,
  videoEls: Map<string, HTMLVideoElement>,
): void {
  for (const overlay of overlays) {
    if (overlay.kind !== 'video') continue;
    const el = videoEls.get(overlay.assetUrl);
    if (!el) continue;
    const active = time >= overlay.startTime && time < overlay.endTime;
    if (!active) {
      if (!el.paused) el.pause();
      if (el.currentTime !== 0) el.currentTime = 0;
      continue;
    }
    if (isPlaying) {
      if (el.paused) {
        el.currentTime = 0;
        el.play().catch(() => {});
      }
    } else if (Number.isFinite(el.duration)) {
      const target = Math.min(el.duration, Math.max(0, time - overlay.startTime));
      if (Math.abs(el.currentTime - target) > 0.05) el.currentTime = target;
    }
  }
}

/** Metin overlay'i sabit genişlikte sarılır (canvas'ın %90'ı) — align'a göre kutu genişliği hesaplamak yerine basit ve öngörülebilir tutuldu. */
const TEXT_OVERLAY_MAX_WIDTH_RATIO = 0.9;

function drawTextOverlayItem(
  ctx: CanvasRenderingContext2D,
  overlay: StudioTextOverlay,
  canvasWidth: number,
  canvasHeight: number,
) {
  const family = resolveFontFamily(overlay.font);
  const sizePx = (overlay.fontSize / 100) * canvasHeight;
  const x = (overlay.x / 100) * canvasWidth;
  const y = (overlay.y / 100) * canvasHeight;

  ctx.save();
  ctx.globalAlpha = overlay.opacity;
  drawTextBlock(ctx, {
    text: overlay.text,
    x,
    y,
    maxWidth: canvasWidth * TEXT_OVERLAY_MAX_WIDTH_RATIO,
    style: { fontFamily: family, sizePx, color: overlay.color, align: overlay.align },
  });
  ctx.restore();
}

/**
 * Karaoke altyazının tek kelimesi — `drawTextOverlayItem`'dan bilerek AYRI: burada
 * sarma/hizalama yok (tek kelime, tek satır, her zaman merkez), ama rastgele arka planlar
 * üzerinde okunaklı kalsın diye koyu bir kontur (stroke) ekleniyor — StudioTextOverlay'in
 * elle yerleştirilen serbest metniyle karışmasın diye stil formülü paylaşılmıyor.
 */
function paintCaption(
  ctx: CanvasRenderingContext2D,
  caption: StudioCaption,
  style: StudioCaptionStyle,
  canvasWidth: number,
  canvasHeight: number,
) {
  const family = resolveFontFamily(style.font);
  const sizePx = (style.fontSize / 100) * canvasHeight;
  const x = (style.x / 100) * canvasWidth;
  const y = (style.y / 100) * canvasHeight;

  ctx.font = `800 ${sizePx}px ${family}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = sizePx * 0.18;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.strokeText(caption.text, x, y);
  ctx.fillStyle = style.color;
  ctx.fillText(caption.text, x, y);
}

/**
 * `ctx.strokeText` büyük `lineWidth` ile glyph başına path stroke ettiği için ucuz değil —
 * wordmark'takiyle (bkz. `getWordmarkLayer`) AYNI gerekçe: bir kelime tipik olarak 300-600ms
 * (9-18 kare) ekranda kalıyor, o pencere boyunca AYNI metni her karede yeniden çizmek yerine
 * ilk karede önbelleğe alıp sonrasında `drawImage` ile kopyalıyoruz. Anahtar `caption.id`
 * (metin değil): whisper'dan gelen iki farklı kelime aynı metne sahip olabilir ama ayrı
 * zaman aralıklarıdır, id ile ayrışmaları önbelleği yanlış kelimede tutmayı engelliyor.
 */
let captionLayerCache: { key: string; canvas: HTMLCanvasElement } | null = null;

function drawCaptionItem(
  ctx: CanvasRenderingContext2D,
  caption: StudioCaption,
  style: StudioCaptionStyle,
  canvasWidth: number,
  canvasHeight: number,
) {
  const key = `${caption.id}|${canvasWidth}x${canvasHeight}|${style.x}|${style.y}|${style.fontSize}|${style.color}|${style.font}`;
  if (captionLayerCache?.key !== key) {
    const layer = document.createElement('canvas');
    layer.width = canvasWidth;
    layer.height = canvasHeight;
    const layerCtx = layer.getContext('2d')!;
    paintCaption(layerCtx, caption, style, canvasWidth, canvasHeight);
    captionLayerCache = { key, canvas: layer };
  }
  ctx.drawImage(captionLayerCache.canvas, 0, 0);
}

function smoothstep(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

type ZoomState = { scale: number; cx: number; cy: number };

/**
 * `zoom.transition` süresince 1 -> hedef scale'e (ve sonda geri) ease'lenir, aradaki bölüm
 * sabit kalır. `transition` aralığın yarısından uzunsa (çok kısa zoom penceresi) her iki
 * geçiş orantılı kısaltılır ki zoom hiç "hold" yapmadan direkt geri dönmesin.
 */
function computeZoomState(zoom: StudioZoom, time: number): ZoomState {
  const duration = zoom.endTime - zoom.startTime;
  const transition = Math.min(zoom.transition, duration / 2);
  let t: number;
  if (transition <= 0) {
    t = 1;
  } else if (time - zoom.startTime < transition) {
    t = (time - zoom.startTime) / transition;
  } else if (zoom.endTime - time < transition) {
    t = (zoom.endTime - time) / transition;
  } else {
    t = 1;
  }
  const eased = smoothstep(t);
  return {
    scale: 1 + (zoom.scale - 1) * eased,
    cx: 50 + (zoom.x - 50) * eased,
    cy: 50 + (zoom.y - 50) * eased,
  };
}

/** Verilen merkez noktası etrafında büyütür — sonraki tüm çizimler bu dönüşümden etkilenir, çağıran taraf ctx.save/restore ile sınırlamalı. */
function applyZoomTransform(ctx: CanvasRenderingContext2D, state: ZoomState, width: number, height: number) {
  if (state.scale <= 1.0001) return;
  const cxPx = (state.cx / 100) * width;
  const cyPx = (state.cy / 100) * height;
  ctx.translate(cxPx, cyPx);
  ctx.scale(state.scale, state.scale);
  ctx.translate(-cxPx, -cyPx);
}

/**
 * Intro/outro bölümünü çizer; `sectionTime` bölümün KENDİ başlangıcına göre saniye.
 * Sırayla: arka plan (görsel varsa o, yoksa geri sayımın düz rengi) + geri sayım noktaları.
 * Ekrana hiçbir şey konulamadıysa `false` döner — çağıran taraf o zaman videoya düşmeyi
 * değil, siyah kareyi tercih ediyor (bkz. drawFrame).
 */
function drawIntroOutroSection(
  ctx: CanvasRenderingContext2D,
  section: StudioIntroOutro,
  sectionTime: number,
  width: number,
  height: number,
  assets: Map<string, HTMLImageElement>,
): boolean {
  let drawn = false;

  const img = section.assetUrl ? assets.get(section.assetUrl) : undefined;
  if (img) {
    drawMediaFitted(ctx, img, width, height, section.fit);
    drawn = true;
  } else if (section.countdown) {
    ctx.fillStyle = section.countdown.background;
    ctx.fillRect(0, 0, width, height);
    drawn = true;
  }

  if (section.countdown) {
    drawCountdownDots(
      ctx,
      section.countdown,
      countdownPlan(section.duration, section.countdown.steps),
      sectionTime,
      width,
      height,
    );
    drawn = true;
  }

  return drawn;
}

export type DrawFrameParams = {
  ctx: CanvasRenderingContext2D;
  timeline: StudioTimeline;
  /** Kırpılmış zaman çizelgesine göre saniye — 0 = timeline.trim.start. */
  time: number;
  video: HTMLVideoElement;
  /** Cutaway/overlay görselleri için önceden yüklenmiş <img> önbelleği (bkz. `preloadStudioImages`). */
  assets: Map<string, HTMLImageElement>;
  /** Video-overlay'lerin canlı <video> elementleri, assetUrl ile anahtarlanmış (bkz. `syncVideoOverlays`). */
  videoOverlays: Map<string, HTMLVideoElement>;
};

/**
 * Saf, senkron çizim — önizleme (her rAF) ve export (her kaydedilen kare) bunu çağırır.
 * Görsel henüz önbellekte yoksa (yükleme bitmemiş) o katman sessizce atlanır; çökme yerine
 * eksik kare tercih edildi.
 */
export function drawFrame({ ctx, timeline, time, video, assets, videoOverlays }: DrawFrameParams): void {
  const canvas = ctx.canvas;
  const width = canvas.width;
  const height = canvas.height;

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  const totalVideoDuration = (timeline.trim.end || video.duration || 0) - timeline.trim.start;
  const isIntro = timeline.intro && time >= timeline.intro.offset && time < timeline.intro.offset + timeline.intro.duration;
  const outroStart = timeline.outro ? totalVideoDuration + timeline.outro.offset - timeline.outro.duration : 0;
  const isOutro = timeline.outro && time >= outroStart && time < outroStart + timeline.outro.duration;

  const activeCutaway = timeline.cutaways.find((c) => time >= c.startTime && time < c.endTime);
  const activeZoom = timeline.zooms.find((z) => time >= z.startTime && time < z.endTime);

  // Zoom, video/cutaway VE üstündeki overlay'leri birlikte büyütür (kameranın sahneye
  // yaklaşması gibi) — bu yüzden ctx.save/restore bu ikisini de kapsıyor. Wordmark bilerek
  // dışında: o kamera hareketinden etkilenmeyen sabit bir arayüz katmanı.
  ctx.save();
  if (activeZoom) applyZoomTransform(ctx, computeZoomState(activeZoom, time), width, height);

  let drawnMedia = false;

  if (isIntro && timeline.intro) {
    drawnMedia = drawIntroOutroSection(ctx, timeline.intro, time - timeline.intro.offset, width, height, assets);
  } else if (isOutro && timeline.outro) {
    drawnMedia = drawIntroOutroSection(ctx, timeline.outro, time - outroStart, width, height, assets);
  } else if (activeCutaway) {
    const img = assets.get(activeCutaway.assetUrl);
    if (img) {
      drawMediaFitted(ctx, img, width, height, activeCutaway.fit);
      drawnMedia = true;
    }
  }
  
  if (!drawnMedia) {
    // Sadece siyah zemin kalmasın diye (cutaway/intro yüklenemediyse) video'ya dönmüyoruz 
    // ama eğer aktif bir şey yoksa (normal akış) video çizilir.
    if (!isIntro && !isOutro && !activeCutaway) {
      drawMediaFitted(ctx, video, width, height, 'cover');
    }
  }

  for (const overlay of timeline.overlays) {
    if (time < overlay.startTime || time >= overlay.endTime) continue;
    if (overlay.kind === 'image') {
      const img = assets.get(overlay.assetUrl);
      if (img) drawImageOverlayItem(ctx, img, overlay, width, height);
    } else if (overlay.kind === 'video') {
      const el = videoOverlays.get(overlay.assetUrl);
      if (el) drawVideoOverlayItem(ctx, el, overlay, width, height);
    } else {
      drawTextOverlayItem(ctx, overlay, width, height);
    }
  }

  ctx.restore();

  // Altyazı bilerek zoom transformunun DIŞINDA: konuşmayı temsil eden bir UI katmanı,
  // kamera yakınlaşmasıyla birlikte büyüyüp okunaksızlaşmamalı/kaymamalı.
  const activeCaption = timeline.captions.find((c) => time >= c.startTime && time < c.endTime);
  if (activeCaption) {
    drawCaptionItem(ctx, activeCaption, timeline.captionStyle, width, height);
  }

  if (timeline.wordmark) {
    ctx.drawImage(getWordmarkLayer(width, height), 0, 0);
  }
}

/**
 * Wordmark her karede AYNI görünüyor (sabit metin/pozisyon) ama `drawWordmark` içindeki
 * `ctx.shadowBlur` yazılım tabanlı bir bulanıklaştırma — Canvas 2D'nin bilinen en yavaş
 * operasyonlarından biri. Gerçek zamanlı export'ta bunu saniyede 30 kez tekrar çizmek,
 * ölçülen kare donmalarının (bkz. exportTimeline'daki tick döngüsü) başlıca sebeplerinden
 * biriydi. Çözüm: bir kere şeffaf bir katmana çizip önbelleğe alıyoruz, sonraki her karede
 * sadece ucuz bir `drawImage` (GPU destekli kopyalama) çalışıyor. Boyut değişirse (format
 * değişimi) önbellek otomatik yenileniyor.
 */
let wordmarkLayerCache: { key: string; canvas: HTMLCanvasElement } | null = null;

function getWordmarkLayer(width: number, height: number): HTMLCanvasElement {
  const key = `${width}x${height}`;
  if (wordmarkLayerCache?.key === key) return wordmarkLayerCache.canvas;

  const layer = document.createElement('canvas');
  layer.width = width;
  layer.height = height;
  const layerCtx = layer.getContext('2d')!;

  const family = resolveFontFamily('inter'); // Bricolage'ın Kiril desteği yok — wordmark sabit inter.
  const padding = Math.round(Math.min(width, height) * PADDING_RATIO);
  // Son parametre "metin nerede duruyor, wordmark ona çakışmasın diye KARŞI köşeye kaçsın"
  // mantığıyla çalışıyor (composeOverlayPng'te headline pozisyonuna göre otomatik geçerli).
  // Studio'da sabit bir headline yok, o yüzden 'top' veriyoruz ki formül wordmark'ı normal/
  // beklenen köşeye (sağ-ALT) yerleştirsin — 'bottom' verirsem tam tersi olup sağ-ÜSTE kaçıyordu.
  drawWordmark(layerCtx, layer, family, padding, 'top');

  wordmarkLayerCache = { key, canvas: layer };
  return layer;
}

/** Cutaway/overlay görsellerini export ve önizlemeden ÖNCE yükler; başarısız olanlar sessizce atlanır (drawFrame zaten eksik önbelleği tolere ediyor). */
export async function preloadStudioImages(urls: string[]): Promise<Map<string, HTMLImageElement>> {
  const unique = Array.from(new Set(urls.filter(Boolean)));
  const loaded = await Promise.all(
    unique.map(async (url): Promise<[string, HTMLImageElement] | null> => {
      try {
        return [url, await loadImage(url)];
      } catch {
        return null;
      }
    }),
  );

  const map = new Map<string, HTMLImageElement>();
  for (const entry of loaded) {
    if (entry) map.set(entry[0], entry[1]);
  }
  return map;
}

/** Timeline'daki tüm cutaway/overlay görsel URL'lerini toplar — preloadStudioImages'a doğrudan verilebilir. */
export function collectStudioImageUrls(timeline: StudioTimeline): string[] {
  const urls: string[] = [];
  // Geri sayım intro'sunun görseli olmayabilir (düz renk arka plan) — bkz. StudioIntroOutro.
  if (timeline.intro?.assetUrl) urls.push(timeline.intro.assetUrl);
  if (timeline.outro?.assetUrl) urls.push(timeline.outro.assetUrl);
  for (const c of timeline.cutaways) urls.push(c.assetUrl);
  for (const o of timeline.overlays) if (o.kind === 'image') urls.push(o.assetUrl);
  return urls;
}

/** Timeline'daki video-overlay assetUrl'lerini toplar (dedup) — hidden <video> elementlerini render etmek için. */
export function collectStudioVideoOverlayUrls(timeline: StudioTimeline): string[] {
  const urls = timeline.overlays.filter((o) => o.kind === 'video').map((o) => o.assetUrl);
  return Array.from(new Set(urls));
}

/**
 * MediaRecorder'ın kabul ettiği ilk (en tercih edilen) mimeType — MP4/H.264 önce denenir,
 * OS'ta donanım encoder yoksa WebM'e düşülür. Tarayıcı desteği yoksa boş string döner.
 *
 * SES KODEĞİ AÇIKÇA BELİRTİLİYOR (`mp4a.40.2` = AAC-LC): sadece `codecs=avc1` demek yalnızca
 * VİDEO kodeğini sabitliyor, ses kodeğini tarayıcı seçiyor ve Chrome MP4 kabına OPUS koyuyor.
 * MP4+Opus teknik olarak geçerli ama Instagram/TikTok ve çoğu oynatıcı desteklemiyor —
 * yüklenen reel sessiz çıkıyor. AAC'li aday önce denenmeli.
 *
 * H.264 PROFİLİ DE AÇIKÇA BELİRTİLİYOR: `avc1.42E01E` = Constrained Baseline @ L3.0, eski
 * telefonlar için tasarlanmış düşük profil — CABAC ve B-frame yok, bu yüzden AYNI bitrate'te
 * High profile'dan gözle görülür ölçüde daha bozuk. Sıralama High (`6400..`) → Main
 * (`4D40..`) → Baseline; ilki desteklenmezse otomatik düşülür. Level 4.0, 1080×1920@30'u
 * (8160 makroblok) tam karşılıyor.
 */
const CANDIDATE_EXPORT_MIME_TYPES = [
  'video/mp4;codecs=avc1.640028,mp4a.40.2',
  'video/mp4;codecs=avc1.4D4028,mp4a.40.2',
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4;codecs=avc1,mp4a.40.2',
  'video/mp4;codecs=avc1',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
];

/**
 * Kayıt kare hızı. Konuşan kafa videosunda 60 fps hiçbir şey kazandırmıyor; üstelik Instagram
 * yüklemeyi zaten 30'a indirip yeniden sıkıştırdığı için 60 fps sadece kare başına düşen
 * bitrate'i yarıya bölüp çift bozulmaya yol açıyor.
 */
const EXPORT_FPS = 30;

/**
 * Bitrate açıkça veriliyor — MediaRecorder'ın varsayılanı 1080×1920 için fena halde düşük
 * (~1-2 Mbps) ve Instagram'ın kendi yeniden sıkıştırması bunun ÜSTÜNE bindiği için sonuç
 * blok blok bir görüntü oluyor. 0.16 bit/piksel, 1080×1920@30'da ~10 Mbps'e denk geliyor
 * (platformun kaynak için önerdiği aralık). Alt/üst sınırlar kare ve yatay formatlarda
 * sırasıyla fazla düşük / gereksiz şişkin dosyayı engelliyor.
 */
const EXPORT_BITS_PER_PIXEL = 0.16;
const MIN_VIDEO_BITRATE = 6_000_000;
const MAX_VIDEO_BITRATE = 16_000_000;
const EXPORT_AUDIO_BITRATE = 128_000;

function exportVideoBitrate(canvas: HTMLCanvasElement): number {
  const raw = canvas.width * canvas.height * EXPORT_FPS * EXPORT_BITS_PER_PIXEL;
  return Math.round(Math.min(MAX_VIDEO_BITRATE, Math.max(MIN_VIDEO_BITRATE, raw)));
}

/** MP4 kabında AAC dışı (ör. Opus) ses varsa true — çağıran taraf kullanıcıyı uyarmalı. */
export function exportHasIncompatibleAudio(mimeType: string): boolean {
  return mimeType.startsWith('video/mp4') && !mimeType.includes('mp4a');
}

export function pickExportMimeType(): string {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return '';
  return CANDIDATE_EXPORT_MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
}

export function exportFileExtension(mimeType: string): 'mp4' | 'webm' {
  return mimeType.startsWith('video/mp4') ? 'mp4' : 'webm';
}

export type ExportParams = {
  timeline: StudioTimeline;
  /** Kaynak Motion videosu — metadata (video.duration) zaten yüklenmiş olmalı. */
  video: HTMLVideoElement;
  /** Çağıran taraf, boyutunu `studioAspectPreset(timeline.aspectRatio)`den zaten ayarlamış olmalı. */
  canvas: HTMLCanvasElement;
  assets: Map<string, HTMLImageElement>;
  /** Video-overlay'lerin canlı <video> elementleri, assetUrl ile anahtarlanmış. */
  videoOverlays: Map<string, HTMLVideoElement>;
  /** `timeline.music` varsa, ona karşılık gelen önceden yüklenmiş <audio> elementi. */
  musicAudio?: HTMLAudioElement;
  /** `timeline.enhancedAudioUrl` varsa, ona karşılık gelen <audio> elementi — orijinal video sesi YERİNE bu kaydedilir. */
  enhancedAudio?: HTMLAudioElement;
  /**
   * Anlatım sesine uygulanacak gürlük normalizasyon çarpanı (lineer, `videoVolume`'un ÜSTÜNE
   * çarpılır) — bkz. `utils/loudness`. Verilmezse 1, yani sese dokunulmaz.
   */
  loudnessGain?: number;
  onProgress?: (fraction: number) => void;
};

export type ExportResult = { blob: Blob; mimeType: string };

/**
 * GERÇEK ZAMANLIDIR: video gerçekten oynatılıp o hızda kaydedilir (36 sn'lik klip ≈ 36
 * sn'de dışa aktarılır) — MediaRecorder'ın canvas+ses akışını yakalayabilmesinin tek yolu
 * bu. Sekme arka plana alınırsa tarayıcı rAF'ı kısabilir, dışa aktarma sırasında sekmeyi
 * ön planda tutmak önerilir (bu, arayüzde de kullanıcıya söylenmeli).
 */
export async function exportTimeline({
  timeline,
  video,
  canvas,
  assets,
  videoOverlays,
  musicAudio,
  enhancedAudio,
  loudnessGain = 1,
  onProgress,
}: ExportParams): Promise<ExportResult> {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas oluşturulamadı.');

  const sourceStart = timeline.trim.start;
  const sourceEnd = timeline.trim.end || video.duration;
  const totalDuration = sourceEnd - sourceStart;
  if (!(totalDuration > 0)) throw new Error('Geçersiz kırpma aralığı.');

  const masterStart = Math.min(0, timeline.intro?.offset ?? 0);
  const masterEnd = Math.max(totalDuration, totalDuration + (timeline.outro?.offset ?? 0));
  const totalMasterDuration = masterEnd - masterStart;

  const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) throw new Error('Bu tarayıcı Web Audio API desteklemiyor.');
  const audioCtx = new AudioContextCtor();
  const dest = audioCtx.createMediaStreamDestination();

  // Tüm kaynaklar (anlatım + müzik) çıkıştan ÖNCE ortak bir limitleyiciden geçiyor:
  // `loudnessGain` ile ~9 dB'lik bir yükseltme yapıldığında tepe değerler 0 dBFS'i aşar ve
  // ham hâlde çirkin bir kırpma (clipping) duyulurdu. Sert diz + yüksek oran = pratikte
  // limitleyici; sadece tepeleri bastırıp ortalama seviyeyi olduğu gibi bırakıyor.
  const limiter = audioCtx.createDynamicsCompressor();
  limiter.threshold.value = -2;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.25;
  limiter.connect(dest);
  limiter.connect(audioCtx.destination);

  // `enhancedAudioUrl` varsa anlatım BUNDAN kaydedilir, orijinal videonun sesi hiç grafiğe
  // bağlanmaz (StudioEditor zaten video.muted=true yapıp hoparlörde de duyulmasını engelliyor).
  // İkisinde de `videoVolume` kazancı uygulanıyor — kullanıcı için "anlatımın sesi" tek kadran.
  // `loudnessGain` onun üstüne çarpılıyor: kadran kullanıcının mikstajı, normalizasyon ise
  // platform hedefine götüren teknik düzeltme (bkz. utils/loudness).
  const useEnhancedAudio = Boolean(timeline.enhancedAudioUrl && enhancedAudio);
  const narrationGain = audioCtx.createGain();
  narrationGain.gain.value = timeline.videoVolume * loudnessGain;
  narrationGain.connect(limiter);

  // KRİTİK: `createMediaElementSource`, elementin kendi `volume` özelliğini grafiğe GİRMEDEN
  // ÖNCE uyguluyor. Önizleme için StudioEditor `element.volume = videoVolume` yapıyor; burada
  // gain'e de aynı değeri verdiğimiz için kazanç İKİ KEZ çarpılıyordu (0.5 → 0.25, yani ~12 dB
  // fazladan kısılma) ve export edilen ses duyulmayacak kadar sessiz çıkıyordu.
  // Export süresince elementleri 1'e sabitleyip tek yetkiliyi GainNode yapıyoruz; cleanup'ta
  // önizleme davranışı bozulmasın diye geri yükleniyor.
  const narrationEl = useEnhancedAudio && enhancedAudio ? enhancedAudio : video;
  const previousNarrationElVolume = narrationEl.volume;
  narrationEl.volume = 1;
  audioCtx.createMediaElementSource(narrationEl).connect(narrationGain);

  // Müzik de aynı çift-çarpma tuzağında: `togglePlay` önizleme için `musicAudio.volume`'u
  // ayarlıyor, burada gain'e de aynı değer veriliyordu. Aynı çözüm — element 1'e sabitleniyor.
  let previousMusicElVolume: number | null = null;
  if (timeline.music && musicAudio) {
    previousMusicElVolume = musicAudio.volume;
    musicAudio.volume = 1;
    const musicSource = audioCtx.createMediaElementSource(musicAudio);
    const musicGain = audioCtx.createGain();
    musicGain.gain.value = timeline.music.volume;
    musicSource.connect(musicGain);
    musicGain.connect(limiter);
  }

  const canvasStream = canvas.captureStream(EXPORT_FPS);
  const audioTrack = dest.stream.getAudioTracks()[0];
  const combined = new MediaStream([...canvasStream.getVideoTracks(), ...(audioTrack ? [audioTrack] : [])]);

  const mimeType = pickExportMimeType();
  const recorderOptions: MediaRecorderOptions = {
    videoBitsPerSecond: exportVideoBitrate(canvas),
    audioBitsPerSecond: EXPORT_AUDIO_BITRATE,
  };
  if (mimeType) recorderOptions.mimeType = mimeType;

  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(combined, recorderOptions);
  } catch {
    // `isTypeSupported` iyimser olabiliyor: profili/bitrate'i kabul ettiğini söyleyip
    // donanım encoder'ı gerçekte kuramayan makineler var. Böyle bir durumda export'u
    // tamamen düşürmek yerine tarayıcının kendi varsayılanlarına dönüyoruz — kalite
    // hedefinden ödün verilir ama kullanıcı çıktısını yine de alır.
    try {
      recorder = new MediaRecorder(combined);
    } catch {
      await audioCtx.close().catch(() => {});
      throw new Error('Bu tarayıcı video kaydını desteklemiyor.');
    }
  }

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  return new Promise<ExportResult>((resolve, reject) => {
    let stopped = false;

    const cleanup = () => {
      video.pause();
      musicAudio?.pause();
      if (useEnhancedAudio) enhancedAudio?.pause();
      for (const el of videoOverlays.values()) el.pause();
      // Export için 1'e sabitlenen element seviyeleri geri yükleniyor — yoksa export sonrası
      // önizleme, kullanıcının ayarladığı seviyeyi yok sayıp tam ses çalardı.
      narrationEl.volume = previousNarrationElVolume;
      if (musicAudio && previousMusicElVolume !== null) musicAudio.volume = previousMusicElVolume;
      audioCtx.close().catch(() => {});
    };

    recorder.onerror = () => {
      stopped = true;
      cleanup();
      reject(new Error('Kayıt sırasında hata oluştu.'));
    };

    recorder.onstop = () => {
      cleanup();
      const usedType = recorder.mimeType || mimeType || 'video/webm';
      resolve({ blob: new Blob(chunks, { type: usedType }), mimeType: usedType });
    };

    // rAF ekran tazeleme hızında (60, hatta 120 Hz) çalışır; `captureStream(EXPORT_FPS)` ise
    // saniyede yalnızca 30 kare alır. rAF ile elle kısmak, zamanlamada sapmalara ve "hızlanmış"
    // bozuk videolara (dropped frames/VFR) yol açabiliyor.
    // Çözüm: Tarayıcı destekliyorsa `requestVideoFrameCallback` kullanmak — bu doğrudan videonun
    // kendi kare hızında (örn. 30fps) tetiklenir, hem gereksiz çizimi önler hem de tam senkron sağlar.
    const frameInterval = 1000 / EXPORT_FPS;
    let lastDrawAt = Number.NEGATIVE_INFINITY;
    const isRVFC = 'requestVideoFrameCallback' in video;

    let virtualTime = masterStart;
    let lastVirtualTickAt = performance.now();
    let videoIsPlaying = false;
    let hasPlayedVideo = false;

    const tick = () => {
      if (stopped) return;
      
      const now = performance.now();
      let masterTime = virtualTime;
      let shouldDraw = true;

      if (!videoIsPlaying) {
        // Pre-roll (Intro) veya Post-roll (Outro): saat rAF deltasıyla ilerler
        const delta = (now - lastVirtualTickAt) / 1000;
        virtualTime += delta;
        masterTime = virtualTime;
        lastVirtualTickAt = now;
        
        if (now - lastDrawAt < frameInterval - 2) {
          shouldDraw = false;
        } else {
          lastDrawAt = now;
        }
      } else {
        // Video oynarken saat tamamen videoya bağlıdır
        masterTime = video.currentTime - sourceStart;
        lastVirtualTickAt = now; // Post-roll geçişi için güncel tutulur
        
        if (!isRVFC) {
          if (now - lastDrawAt < frameInterval - 2) {
            shouldDraw = false;
          } else {
            if (lastDrawAt === Number.NEGATIVE_INFINITY) {
              lastDrawAt = now;
            } else {
              lastDrawAt += frameInterval;
              if (now - lastDrawAt > frameInterval) lastDrawAt = now;
            }
          }
        } else {
          lastDrawAt = now;
        }
      }

      // Geçişleri kontrol et
      if (!videoIsPlaying && !hasPlayedVideo && masterTime >= 0 && masterTime < totalDuration) {
        // Pre-roll bitti, ana video başlıyor
        videoIsPlaying = true;
        hasPlayedVideo = true;
        masterTime = 0;
        virtualTime = 0;
        video.currentTime = sourceStart;
        video.play().catch(() => {});
        if (useEnhancedAudio && enhancedAudio) {
          enhancedAudio.currentTime = video.currentTime;
          enhancedAudio.play().catch(() => {});
        }
      } else if (videoIsPlaying && (video.currentTime >= sourceEnd || video.ended)) {
        // Video bitti, post-roll (outro) başlıyor
        videoIsPlaying = false;
        video.pause();
        if (useEnhancedAudio && enhancedAudio) {
          enhancedAudio.pause();
        }
        virtualTime = totalDuration;
        masterTime = totalDuration;
        lastVirtualTickAt = performance.now();
      }

      if (shouldDraw) {
        syncVideoOverlays(timeline.overlays, masterTime, videoIsPlaying, videoOverlays);
        if (useEnhancedAudio && enhancedAudio && videoIsPlaying && Math.abs(enhancedAudio.currentTime - video.currentTime) > 0.15) {
          enhancedAudio.currentTime = video.currentTime;
        }
        drawFrame({ ctx, timeline, time: masterTime, video, assets, videoOverlays });
        onProgress?.(Math.min(1, Math.max(0, (masterTime - masterStart) / totalMasterDuration)));
      }

      if (masterTime >= masterEnd) {
        stopped = true;
        recorder.stop();
        return;
      }
      
      if (videoIsPlaying && isRVFC) {
        (video as any).requestVideoFrameCallback(tick);
      } else {
        requestAnimationFrame(tick);
      }
    };

    video.onseeked = () => {
      video.onseeked = null;
      recorder.start();
      lastVirtualTickAt = performance.now();

      if (musicAudio) {
        musicAudio.currentTime = 0;
        musicAudio.play().catch(() => {});
      }
      if (useEnhancedAudio && enhancedAudio) {
        enhancedAudio.pause(); // Video oynatılana kadar bekleyecek
        enhancedAudio.currentTime = video.currentTime;
      }

      // Geri sayım bipleri, tam olarak offset zamanında duyulmalı
      if (timeline.intro?.countdown?.sound) {
        const introStartAudioTime = audioCtx.currentTime + (timeline.intro.offset - masterStart);
        scheduleCountdownBeeps(
          audioCtx,
          limiter,
          countdownPlan(timeline.intro.duration, timeline.intro.countdown.steps),
          introStartAudioTime,
        );
      }
      
      requestAnimationFrame(tick);
    };
    video.currentTime = sourceStart;
  });
}
