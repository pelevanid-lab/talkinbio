// Beiwe Post — şablonlu gönderiyi Canvas 2D ile çizer.
//
// `imageOverlay.ts`'ten AYRI bir dosya, çünkü işi farklı: orası bir görselin ÜSTÜNE
// serbest metin bindiriyor (kaynak görselin boyutunu koruyor). Burası ise sabit boyutlu
// bir GÖNDERİ TUVALİ açıp görseli onun içine yerleştiriyor — ekran kayıtları 16:9 gelir,
// dikey gönderi formatına kırpılırsa arayüzün yarısı kesilir; o yüzden kırpmıyor,
// çerçeveliyoruz.
//
import { type LoadedMedia, resolveFontFamily, wrapLines } from '@/utils/imageOverlay';
import type { OverlayFont } from '@/config/characters';
import { BRAND, type PostFormat, type PostTemplate } from '@/config/post';

const LINE_HEIGHT = 1.14;
const PADDING_RATIO = 0.075;
/** Çerçevelenmiş görselin köşe yarıçapı — kısa kenarın yüzdesi. */
const IMAGE_RADIUS_RATIO = 0.022;

/**
 * "Hareketli" post'un toplam klip süresi. Kilitli — Post'un şablon disipliniyle aynı
 * mantık: kullanıcı animasyonu AÇAR/KAPATIR, süresini/eğrisini değiştiremez.
 */
export const ANIMATED_POST_DURATION_MS = 4000;

const HEADLINE_REVEAL_MS = 550;
const SUBLINE_DELAY_MS = 150;
const SUBLINE_REVEAL_MS = 550;
const REVEAL_OFFSET_RATIO = 0.03;
const KEN_BURNS_MAX_SCALE_DELTA = 0.05;

function clamp01(t: number): number {
  return Math.min(Math.max(t, 0), 1);
}

function easeOutCubic(t: number): number {
  const c = clamp01(t);
  return 1 - Math.pow(1 - c, 3);
}

type RevealTransform = { opacity: number; offsetY: number };

/** `elapsedMs` yoksa (animasyon kapalı/PNG) tam görünür, ofsetsiz döner. */
function revealTransform(elapsedMs: number | undefined, delayMs: number, durationMs: number, offsetPx: number): RevealTransform {
  if (elapsedMs === undefined) return { opacity: 1, offsetY: 0 };
  const p = easeOutCubic((elapsedMs - delayMs) / durationMs);
  return { opacity: p, offsetY: (1 - p) * offsetPx };
}

export type PostTexts = { headline: string; subline: string };

export type RenderPostParams = {
  canvas: HTMLCanvasElement;
  template: PostTemplate;
  format: PostFormat;
  texts: PostTexts;
  /** `imageMode: 'none'` şablonlarda yok sayılır. */
  mediaObj?: LoadedMedia | null;
  /**
   * Animasyon açıkken geçen süre (ms) — verilmezse (undefined) tam görünür/statik kare
   * çizilir (PNG indirme ve "hareketli" kapalıyken önizleme bunu kullanır).
   */
  elapsedMs?: number;
};

/** roundRect her yerde yok; yoksa düz dikdörtgene düş. */
function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
}

/** Görseli kutuya sığdır (tamamı görünür, boşluk kalabilir). */
function fitContain(imgW: number, imgH: number, boxW: number, boxH: number) {
  const scale = Math.min(boxW / imgW, boxH / imgH);
  const w = imgW * scale;
  const h = imgH * scale;
  return { w, h, x: (boxW - w) / 2, y: (boxH - h) / 2 };
}

/** Görseli kutuyu dolduracak şekilde kırp (kaynak koordinatları döner). */
function fitCoverSource(imgW: number, imgH: number, boxW: number, boxH: number) {
  const scale = Math.max(boxW / imgW, boxH / imgH);
  const sw = boxW / scale;
  const sh = boxH / scale;
  return { sx: (imgW - sw) / 2, sy: (imgH - sh) / 2, sw, sh };
}

type MeasuredBlock = { lines: string[]; size: number; weight: number; color: string; height: number };

function measureBlock(
  ctx: CanvasRenderingContext2D,
  text: string,
  sizePx: number,
  weight: number,
  color: string,
  family: string,
  maxWidth: number,
): MeasuredBlock | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  ctx.font = `${weight} ${sizePx}px ${family}`;
  const lines = wrapLines(ctx, trimmed, maxWidth);
  return { lines, size: sizePx, weight, color, height: lines.length * sizePx * LINE_HEIGHT };
}

function paintBlock(
  ctx: CanvasRenderingContext2D,
  block: MeasuredBlock,
  x: number,
  y: number,
  family: string,
  align: CanvasTextAlign,
  transform: RevealTransform = { opacity: 1, offsetY: 0 },
) {
  if (transform.opacity <= 0) return;
  ctx.save();
  ctx.globalAlpha = transform.opacity;
  ctx.font = `${block.weight} ${block.size}px ${family}`;
  ctx.fillStyle = block.color;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  let cursor = y + transform.offsetY;
  for (const line of block.lines) {
    ctx.fillText(line, x, cursor);
    cursor += block.size * LINE_HEIGHT;
  }
  ctx.restore();
}

function paintWordmark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  padding: number,
  family: string,
  color: string,
  align: 'left' | 'right' | 'center',
) {
  const size = height * 0.019;
  ctx.font = `500 ${size}px ${family}`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'bottom';
  ctx.textAlign = align;
  const x = align === 'left' ? padding : align === 'right' ? width - padding : width / 2;
  ctx.fillText('talkinbio.com', x, height - padding);
}

/**
 * Şablonu tuvale çizer. Metin boşsa da çalışır (yalnız görsel + wordmark).
 *
 * Font ailesi `bricolage` sabit: başlık tipografisi şablonun kilitli parçası. Kiril
 * desteği sınırlı olduğu için Rusça metinde `inter`'a düşüyoruz (aynı gerekçe
 * `OVERLAY_FONTS` notunda da var).
 */
export async function renderPost({ canvas, template, format, texts, mediaObj, elapsedMs }: RenderPostParams): Promise<void> {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas oluşturulamadı.');

  canvas.width = format.width;
  canvas.height = format.height;
  const { width, height } = canvas;

  await document.fonts.ready;

  // Kiril kontrolü: Bricolage'da Kiril glifleri eksik, sistem fontuna düşerse tipografi bozulur.
  const hasCyrillic = /[Ѐ-ӿ]/.test(`${texts.headline}${texts.subline}`);
  const font: OverlayFont = hasCyrillic ? 'inter' : 'bricolage';
  const family = resolveFontFamily(font);

  const padding = Math.round(Math.min(width, height) * PADDING_RATIO);
  const maxTextWidth = width - padding * 2;
  const revealOffsetPx = Math.min(width, height) * REVEAL_OFFSET_RATIO;
  const headlineReveal = revealTransform(elapsedMs, 0, HEADLINE_REVEAL_MS, revealOffsetPx);
  const sublineReveal = revealTransform(elapsedMs, SUBLINE_DELAY_MS, SUBLINE_REVEAL_MS, revealOffsetPx);
  /** Ken Burns/shimmer için 0..1 döngü ilerlemesi — `elapsedMs` yoksa (statik) sabit 1. */
  const loopProgress = elapsedMs === undefined ? 1 : clamp01(elapsedMs / ANIMATED_POST_DURATION_MS);

  // 1 — Zemin
  ctx.fillStyle = template.background;
  ctx.fillRect(0, 0, width, height);

  // Hareketli iken hafif bir ışık huzmesi zeminde kayar — ElevenLabs'ın renkli
  // gradient karolarına yakın bir his verir, görsel olmayan ('none') şablonlarda
  // özellikle belirgin; görselli şablonlarda görsel üstüne bindiği için görünmez kalır.
  if (elapsedMs !== undefined) {
    const cx = width * (0.15 + 0.7 * loopProgress);
    const cy = height * 0.35;
    const radius = Math.max(width, height) * 0.6;
    const shimmer = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    shimmer.addColorStop(0, 'rgba(255,255,255,0.10)');
    shimmer.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shimmer;
    ctx.fillRect(0, 0, width, height);
  }

  const headline = measureBlock(
    ctx,
    texts.headline,
    (height * template.headlineSizePct) / 100,
    700,
    template.headlineColor,
    family,
    maxTextWidth,
  );
  const subline = measureBlock(
    ctx,
    texts.subline,
    (height * template.sublineSizePct) / 100,
    400,
    template.sublineColor,
    family,
    maxTextWidth,
  );
  const blockGap = (height * template.sublineSizePct) / 100 * 0.7;
  const textHeight =
    (headline?.height ?? 0) + (subline?.height ?? 0) + (headline && subline ? blockGap : 0);

  if (template.imageMode === 'none') mediaObj = null;
  const img = mediaObj?.element || null;

  if (template.imageMode === 'contain') {
    // Başlık üstte, görsel altta kalan alanda çerçeveli.
    let cursorY = padding;
    if (headline) {
      paintBlock(ctx, headline, padding, cursorY, family, 'left', headlineReveal);
      cursorY += headline.height;
    }
    if (subline) {
      cursorY += headline ? blockGap : 0;
      paintBlock(ctx, subline, padding, cursorY, family, 'left', sublineReveal);
      cursorY += subline.height;
    }

    if (img) {
      const boxTop = cursorY + padding * 0.9;
      // Alt boşluk: wordmark için yer bırak.
      const boxHeight = height - boxTop - padding * 1.8;
      const boxWidth = width - padding * 2;
      if (boxHeight > 0 && mediaObj) {
        const fit = fitContain(mediaObj.width, mediaObj.height, boxWidth, boxHeight);
        const radius = Math.min(fit.w, fit.h) * IMAGE_RADIUS_RATIO;
        // Ken Burns: çerçeve (klip) sabit kalır, içindeki görsel yavaşça büyür.
        const kb = elapsedMs !== undefined ? 1 + KEN_BURNS_MAX_SCALE_DELTA * loopProgress : 1;
        const dw = fit.w * kb;
        const dh = fit.h * kb;
        const dx = padding + fit.x - (dw - fit.w) / 2;
        const dy = boxTop + fit.y - (dh - fit.h) / 2;
        ctx.save();
        roundedRectPath(ctx, padding + fit.x, boxTop + fit.y, fit.w, fit.h, radius);
        ctx.clip();
        ctx.drawImage(mediaObj.element, dx, dy, dw, dh);
        ctx.restore();
      }
    }

    paintWordmark(ctx, width, height, padding, family, template.wordmarkColor, 'right');
    return;
  }

  if (template.imageMode === 'cover') {
    if (mediaObj) {
      const src = fitCoverSource(mediaObj.width, mediaObj.height, width, height);
      // Ken Burns: tam kanar görsel canvas'a göre hafifçe büyür, merkezde kalır.
      const kb = elapsedMs !== undefined ? 1 + KEN_BURNS_MAX_SCALE_DELTA * loopProgress : 1;
      const dw = width * kb;
      const dh = height * kb;
      ctx.drawImage(mediaObj.element, src.sx, src.sy, src.sw, src.sh, -(dw - width) / 2, -(dh - height) / 2, dw, dh);
    }

    if (template.scrim === 'full') {
      ctx.fillStyle = 'rgba(20,35,31,0.62)';
      ctx.fillRect(0, 0, width, height);
    } else if (template.scrim === 'bottom') {
      const bandTop = Math.max(0, height - textHeight - padding * 3);
      const gradient = ctx.createLinearGradient(0, bandTop, 0, height);
      gradient.addColorStop(0, 'rgba(20,35,31,0)');
      gradient.addColorStop(1, 'rgba(20,35,31,0.85)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, bandTop, width, height - bandTop);
    }

    // 'duyuru' ortada, 'aci' sol altta.
    const centered = template.scrim === 'full';
    const startY = centered ? (height - textHeight) / 2 : height - padding * 2 - textHeight;
    const x = centered ? width / 2 : padding;
    const align: CanvasTextAlign = centered ? 'center' : 'left';

    let cursorY = startY;
    if (headline) {
      paintBlock(ctx, headline, x, cursorY, family, align, headlineReveal);
      cursorY += headline.height + (subline ? blockGap : 0);
    }
    if (subline) paintBlock(ctx, subline, x, cursorY, family, align, sublineReveal);

    paintWordmark(ctx, width, height, padding, family, template.wordmarkColor, centered ? 'center' : 'right');
    return;
  }

  // imageMode 'none' — görselsiz, metin dikey ortalı.
  let cursorY = (height - textHeight) / 2;
  if (headline) {
    paintBlock(ctx, headline, padding, cursorY, family, 'left', headlineReveal);
    cursorY += headline.height + (subline ? blockGap : 0);
  }
  if (subline) paintBlock(ctx, subline, padding, cursorY, family, 'left', sublineReveal);
  paintWordmark(ctx, width, height, padding, family, template.wordmarkColor, 'left');
}

/** Tuvali PNG blob'a çevirir. */
export function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG üretilemedi.'))), 'image/png');
  });
}

export { BRAND };
