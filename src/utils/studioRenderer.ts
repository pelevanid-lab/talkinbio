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

import { drawTextBlock, drawWordmark, loadImage, PADDING_RATIO, resolveFontFamily } from './imageOverlay';
import type { StudioFit, StudioImageOverlay, StudioTextOverlay, StudioTimeline } from '@/config/studio';

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

export type DrawFrameParams = {
  ctx: CanvasRenderingContext2D;
  timeline: StudioTimeline;
  /** Kırpılmış zaman çizelgesine göre saniye — 0 = timeline.trim.start. */
  time: number;
  video: HTMLVideoElement;
  /** Cutaway/overlay görselleri için önceden yüklenmiş <img> önbelleği (bkz. `preloadStudioImages`). */
  assets: Map<string, HTMLImageElement>;
};

/**
 * Saf, senkron çizim — önizleme (her rAF) ve export (her kaydedilen kare) bunu çağırır.
 * Görsel henüz önbellekte yoksa (yükleme bitmemiş) o katman sessizce atlanır; çökme yerine
 * eksik kare tercih edildi.
 */
export function drawFrame({ ctx, timeline, time, video, assets }: DrawFrameParams): void {
  const canvas = ctx.canvas;
  const width = canvas.width;
  const height = canvas.height;

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  const totalVideoDuration = (timeline.trim.end || video.duration || 0) - timeline.trim.start;
  const isIntro = timeline.intro && time < timeline.intro.duration;
  const isOutro = timeline.outro && time >= Math.max(0, totalVideoDuration - timeline.outro.duration);

  const activeCutaway = timeline.cutaways.find((c) => time >= c.startTime && time < c.endTime);

  let drawnMedia = false;

  if (isIntro && timeline.intro) {
    const img = assets.get(timeline.intro.assetUrl);
    if (img) {
      drawMediaFitted(ctx, img, width, height, timeline.intro.fit);
      drawnMedia = true;
    }
  } else if (isOutro && timeline.outro) {
    const img = assets.get(timeline.outro.assetUrl);
    if (img) {
      drawMediaFitted(ctx, img, width, height, timeline.outro.fit);
      drawnMedia = true;
    }
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
    } else {
      drawTextOverlayItem(ctx, overlay, width, height);
    }
  }

  if (timeline.wordmark) {
    const family = resolveFontFamily('inter'); // Bricolage'ın Kiril desteği yok — wordmark sabit inter.
    const padding = Math.round(Math.min(width, height) * PADDING_RATIO);
    // drawWordmark'ın son parametresi "metin nerede duruyor, wordmark ona çakışmasın diye
    // KARŞI köşeye kaçsın" mantığıyla çalışıyor (composeOverlayPng'te headline pozisyonuna
    // göre otomatik geçerli). Studio'da sabit bir headline yok, o yüzden 'top' veriyoruz ki
    // formül wordmark'ı normal/beklenen köşeye (sağ-ALT) yerleştirsin — 'bottom' verirsem
    // (ilk halde yanlışlıkla öyleydi) tam tersi olup sağ-ÜSTE kaçıyordu.
    drawWordmark(ctx, canvas, family, padding, 'top');
  }
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
  if (timeline.intro) urls.push(timeline.intro.assetUrl);
  if (timeline.outro) urls.push(timeline.outro.assetUrl);
  for (const c of timeline.cutaways) urls.push(c.assetUrl);
  for (const o of timeline.overlays) if (o.kind === 'image') urls.push(o.assetUrl);
  return urls;
}

/**
 * MediaRecorder'ın kabul ettiği ilk (en tercih edilen) mimeType — MP4/H.264 önce denenir,
 * OS'ta donanım encoder yoksa WebM'e düşülür. Tarayıcı desteği yoksa boş string döner.
 */
const CANDIDATE_EXPORT_MIME_TYPES = [
  'video/mp4;codecs=avc1',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
];

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
  /** `timeline.music` varsa, ona karşılık gelen önceden yüklenmiş <audio> elementi. */
  musicAudio?: HTMLAudioElement;
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
  musicAudio,
  onProgress,
}: ExportParams): Promise<ExportResult> {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas oluşturulamadı.');

  const sourceStart = timeline.trim.start;
  const sourceEnd = timeline.trim.end || video.duration;
  const totalDuration = sourceEnd - sourceStart;
  if (!(totalDuration > 0)) throw new Error('Geçersiz kırpma aralığı.');

  const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) throw new Error('Bu tarayıcı Web Audio API desteklemiyor.');
  const audioCtx = new AudioContextCtor();
  const dest = audioCtx.createMediaStreamDestination();

  // Video sesi hem kayıt hedefine hem hoparlöre bağlanıyor — export sırasında sessiz
  // kalması "çalışmıyor mu" izlenimi verir, izlenebilir olması güven veriyor.
  const videoSource = audioCtx.createMediaElementSource(video);
  videoSource.connect(dest);
  videoSource.connect(audioCtx.destination);

  if (timeline.music && musicAudio) {
    const musicSource = audioCtx.createMediaElementSource(musicAudio);
    const musicGain = audioCtx.createGain();
    musicGain.gain.value = timeline.music.volume;
    musicSource.connect(musicGain);
    musicGain.connect(dest);
    musicGain.connect(audioCtx.destination);
  }

  const canvasStream = canvas.captureStream(30);
  const audioTrack = dest.stream.getAudioTracks()[0];
  const combined = new MediaStream([...canvasStream.getVideoTracks(), ...(audioTrack ? [audioTrack] : [])]);

  const mimeType = pickExportMimeType();

  let recorder: MediaRecorder;
  try {
    recorder = mimeType ? new MediaRecorder(combined, { mimeType }) : new MediaRecorder(combined);
  } catch {
    await audioCtx.close().catch(() => {});
    throw new Error('Bu tarayıcı video kaydını desteklemiyor.');
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

    const tick = () => {
      if (stopped) return;
      const time = video.currentTime - sourceStart;
      drawFrame({ ctx, timeline, time, video, assets });
      onProgress?.(Math.min(1, time / totalDuration));

      if (video.currentTime >= sourceEnd || video.ended) {
        stopped = true;
        recorder.stop();
        return;
      }
      requestAnimationFrame(tick);
    };

    video.onseeked = () => {
      video.onseeked = null;
      recorder.start();
      if (musicAudio) {
        musicAudio.currentTime = 0;
        musicAudio.play().catch(() => {
          // Müzik çalmazsa export durmasın — sessiz devam eder, kullanıcıya ayrı uyarı gerekmez
          // çünkü bu son çare bir durum (autoplay engeli gibi) ve video sesi zaten akıyor.
        });
      }
      video
        .play()
        .then(() => requestAnimationFrame(tick))
        .catch((err) => {
          stopped = true;
          cleanup();
          reject(err instanceof Error ? err : new Error('Video oynatılamadı.'));
        });
    };
    video.currentTime = sourceStart;
  });
}
