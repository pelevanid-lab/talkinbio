// Beiwe Post — şablonlu gönderiyi Canvas 2D ile çizer.
//
// `imageOverlay.ts`'ten AYRI bir dosya, çünkü işi farklı: orası bir görselin ÜSTÜNE
// serbest metin bindiriyor (kaynak görselin boyutunu koruyor). Burası ise sabit boyutlu
// bir GÖNDERİ TUVALİ açıp görseli onun içine yerleştiriyor — ekran kayıtları 16:9 gelir,
// dikey gönderi formatına kırpılırsa arayüzün yarısı kesilir; o yüzden kırpmıyor,
// çerçeveliyoruz.
//
// Ortak parçalar (satır sarma, karartma, font çözümleme) `imageOverlay.ts`'ten
// yeniden kullanılıyor — kopyalanmadı.

import { loadMedia, resolveFontFamily, wrapLines } from '@/utils/imageOverlay';
import type { OverlayFont } from '@/config/characters';
import { BRAND, type PostFormat, type PostTemplate } from '@/config/post';

const LINE_HEIGHT = 1.14;
const PADDING_RATIO = 0.075;
/** Çerçevelenmiş görselin köşe yarıçapı — kısa kenarın yüzdesi. */
const IMAGE_RADIUS_RATIO = 0.022;

export type PostTexts = { headline: string; subline: string };

export type RenderPostParams = {
  canvas: HTMLCanvasElement;
  template: PostTemplate;
  format: PostFormat;
  texts: PostTexts;
  /** `imageMode: 'none'` şablonlarda yok sayılır. */
  imageUrl?: string | null;
  isVideo?: boolean;
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
) {
  ctx.font = `${block.weight} ${block.size}px ${family}`;
  ctx.fillStyle = block.color;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  let cursor = y;
  for (const line of block.lines) {
    ctx.fillText(line, x, cursor);
    cursor += block.size * LINE_HEIGHT;
  }
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
export async function renderPost({ canvas, template, format, texts, imageUrl, isVideo }: RenderPostParams): Promise<void> {
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

  // 1 — Zemin
  ctx.fillStyle = template.background;
  ctx.fillRect(0, 0, width, height);

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

  const mediaObj = template.imageMode !== 'none' && imageUrl ? await loadMedia(imageUrl, isVideo) : null;
  const img = mediaObj?.element || null;

  if (template.imageMode === 'contain') {
    // Başlık üstte, görsel altta kalan alanda çerçeveli.
    let cursorY = padding;
    if (headline) {
      paintBlock(ctx, headline, padding, cursorY, family, 'left');
      cursorY += headline.height;
    }
    if (subline) {
      cursorY += headline ? blockGap : 0;
      paintBlock(ctx, subline, padding, cursorY, family, 'left');
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
        ctx.save();
        roundedRectPath(ctx, padding + fit.x, boxTop + fit.y, fit.w, fit.h, radius);
        ctx.clip();
        ctx.drawImage(mediaObj.element, padding + fit.x, boxTop + fit.y, fit.w, fit.h);
        ctx.restore();
      }
    }

    paintWordmark(ctx, width, height, padding, family, template.wordmarkColor, 'right');
    return;
  }

  if (template.imageMode === 'cover') {
    if (mediaObj) {
      const src = fitCoverSource(mediaObj.width, mediaObj.height, width, height);
      ctx.drawImage(mediaObj.element, src.sx, src.sy, src.sw, src.sh, 0, 0, width, height);
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
      paintBlock(ctx, headline, x, cursorY, family, align);
      cursorY += headline.height + (subline ? blockGap : 0);
    }
    if (subline) paintBlock(ctx, subline, x, cursorY, family, align);

    paintWordmark(ctx, width, height, padding, family, template.wordmarkColor, centered ? 'center' : 'right');
    return;
  }

  // imageMode 'none' — görselsiz, metin dikey ortalı.
  let cursorY = (height - textHeight) / 2;
  if (headline) {
    paintBlock(ctx, headline, padding, cursorY, family, 'left');
    cursorY += headline.height + (subline ? blockGap : 0);
  }
  if (subline) paintBlock(ctx, subline, padding, cursorY, family, 'left');
  paintWordmark(ctx, width, height, padding, family, template.wordmarkColor, 'left');
}

/** Tuvali PNG blob'a çevirir. */
export function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG üretilemedi.'))), 'image/png');
  });
}

export { BRAND };
