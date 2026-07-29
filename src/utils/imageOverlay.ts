// Faz S.4 — Görsel + metin katmanını tarayıcıda Canvas 2D ile birleştirir.
//
// Metin neden görsel modeline yazdırılmıyor: her üretimde tipografi değişir (marka
// tutarlılığı biter), düzeltmek için yeniden üretim gerekir (yeniden ödeme), ve modeller
// Türkçe ı/ğ/ş/İ ile Kiril karakterlerde sık hata yapar. Katman olarak bindirince tek
// üretimden tr/en/ru üç kare bedavaya çıkıyor ve metin sonradan düzenlenebiliyor.
//
// Bağımlılıksız: html2canvas benzeri bir paket eklenmedi (kod dondurma dönemi).

import type { OverlayConfig, OverlayFont, OverlayLocale } from '@/config/characters';

/** Kenar boşluğu, kısa kenarın yüzdesi olarak. Studio wordmark'ı da aynı oranı kullanıyor. */
export const PADDING_RATIO = 0.06;
const LINE_HEIGHT = 1.15;
const SUBLINE_GAP = 0.45;

/**
 * next/font, aile adını derleme sırasında hash'liyor (`__Bricolage_Grotesque_abc123`),
 * bu yüzden canvas'a "Bricolage Grotesque" yazmak tutmaz. Gerçek adı CSS
 * değişkeninden okuyoruz — değişkenler `<html>` üzerinde tanımlı (layout.tsx).
 */
// `getComputedStyle` zorla stil yeniden hesaplatıyor (forced reflow) — CSS değişkenleri
// oturum boyunca DEĞİŞMEDİĞİ için sonucu önbelleklemek güvenli. Studio'nun `drawFrame`'i
// bunu wordmark/altyazı/metin overlay'i için HER KAREDE çağırıyordu; gerçek zamanlı export
// sırasında saniyede 30 kez gereksiz reflow tetiklemek, ölçülen kare donmalarının (bkz.
// studioRenderer.ts export tick döngüsü) bilinen katkılarından biriydi.
const fontFamilyCache = new Map<OverlayFont, string>();

export function resolveFontFamily(font: OverlayFont): string {
  const cached = fontFamilyCache.get(font);
  if (cached) return cached;
  const variable =
    font === 'bricolage' ? '--font-bricolage' : font === 'mono' ? '--font-ibm-plex-mono' : '--font-inter';
  const resolved = getComputedStyle(document.documentElement).getPropertyValue(variable).trim() || 'sans-serif';
  fontFamilyCache.set(font, resolved);
  return resolved;
}

/**
 * Export edildi: Studio'nun cutaway/overlay görsellerini önceden yüklerken aynı CORS-güvenli
 * kalıbı kullanıyoruz. `crossOrigin` `src` atanmadan ÖNCE set edilmeli, yoksa retroaktif
 * uygulanmıyor — bu inceliği burada bırakıp tekrar yazmamak riski azaltıyor.
 */
export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    // Supabase storage public nesneleri CORS başlığı gönderiyor; bu olmadan canvas
    // "tainted" olur ve toBlob güvenlik hatası verir.
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Görsel yüklenemedi.'));
    img.src = url;
  });
}

export type LoadedMedia = { element: HTMLImageElement | HTMLVideoElement; width: number; height: number };

export function loadMedia(url: string, isVideo: boolean = false): Promise<LoadedMedia> {
  if (isVideo) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.playsInline = true;
      video.onloadeddata = () => {
        video.currentTime = Math.min(0.1, video.duration || 0);
      };
      video.onseeked = () => resolve({ element: video, width: video.videoWidth, height: video.videoHeight });
      video.onerror = reject;
      video.src = url;
      video.load();
    });
  }
  return loadImage(url).then(img => ({ element: img, width: img.naturalWidth, height: img.naturalHeight }));
}

/**
 * Satır sarma, karartma şeridi ve wordmark aşağıda EXPORT edildi — Studio (post-prodüksiyon,
 * bkz. `src/utils/studioRenderer.ts`) video karesine aynı görsel dili bindirirken bunları
 * yeniden yazmak yerine buradan çağırıyor. `composeOverlayPng`'in kendi çizim akışı bilerek
 * DOKUNULMADAN bırakıldı — davranışı değişmesin diye, yeni ihtiyaç `drawTextBlock` ile
 * ayrı bir yoldan karşılanıyor (aşağıda).
 */
export function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];

  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }

    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      // `!current` koşulu: tek başına sığmayan uzun kelime de olsa bir satır açılsın,
      // yoksa sonsuz boş satır üretilir.
      if (!current || ctx.measureText(candidate).width <= maxWidth) {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
  }

  return lines;
}

export type TextBlockStyle = {
  fontFamily: string;
  /** Piksel cinsinden punto — çağıran taraf yüzdeyi (headlineSize gibi) zaten piksele çevirmiş olmalı. */
  sizePx: number;
  weight?: number;
  color: string;
  align: CanvasTextAlign;
};

export type DrawTextBlockParams = {
  text: string;
  /** Çizimin başlayacağı üst-sol köşe değil, `align`'a göre hizalama noktası (composeOverlayPng'teki anchorX/cursorY ile aynı kalıp). */
  x: number;
  y: number;
  maxWidth: number;
  style: TextBlockStyle;
};

/**
 * `composeOverlayPng`'in headline/subline'a özel akışından bilerek AYRI: Studio'nun
 * serbest konumlu tek metin overlay'i (StudioTextOverlay) başlık/alt satır ayrımı değil,
 * tek bir bloktur. Sarma (`wrapLines`) ve punto/hizalama mantığı aynı kalsın diye buraya
 * çıkarıldı, ama composeOverlayPng'in kendi çizim döngüsü davranış değişmesin diye
 * DOKUNULMADAN bırakıldı.
 *
 * Çizilen toplam yüksekliği (px) döner — çağıran taraf sonraki elemanı buna göre konumlayabilsin diye.
 */
export function drawTextBlock(ctx: CanvasRenderingContext2D, { text, x, y, maxWidth, style }: DrawTextBlockParams): number {
  const weight = style.weight ?? 700;
  ctx.font = `${weight} ${style.sizePx}px ${style.fontFamily}`;
  ctx.textAlign = style.align;
  ctx.textBaseline = 'top';
  ctx.fillStyle = style.color;

  const lines = wrapLines(ctx, text, maxWidth);
  let cursorY = y;
  for (const line of lines) {
    ctx.fillText(line, x, cursorY);
    cursorY += style.sizePx * LINE_HEIGHT;
  }
  return cursorY - y;
}

type Block = { text: string; size: number; weight: number };

export type ComposeParams = {
  imageUrl: string;
  overlay: OverlayConfig;
  locale: OverlayLocale;
};

/**
 * Görseli tam çözünürlükte alır, metin katmanını bindirir, PNG blob döner.
 * Metin boşsa görsel olduğu gibi döner — "metinsiz indir" ayrı bir yol gerektirmesin.
 */
export async function composeOverlayPng({ imageUrl, overlay, locale }: ComposeParams): Promise<Blob> {
  const img = await loadImage(imageUrl);

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas oluşturulamadı.');

  ctx.drawImage(img, 0, 0);

  const { headline, subline } = overlay.texts[locale];
  const hasText = Boolean(headline.trim() || subline.trim());

  if (hasText || overlay.wordmark) {
    // Fontlar hazır olmadan measureText yanlış ölçer ve metin taşar.
    await document.fonts.ready;

    const family = resolveFontFamily(overlay.font);
    const padding = Math.round(Math.min(canvas.width, canvas.height) * PADDING_RATIO);
    const maxWidth = canvas.width - padding * 2;

    const blocks: Block[] = [];
    if (headline.trim()) {
      blocks.push({ text: headline.trim(), size: (canvas.height * overlay.headlineSize) / 100, weight: 700 });
    }
    if (subline.trim()) {
      blocks.push({ text: subline.trim(), size: (canvas.height * overlay.sublineSize) / 100, weight: 400 });
    }

    // Ölçüm önce, çizim sonra: karartma şeridinin yüksekliği için toplam blok yüksekliği lazım.
    const measured = blocks.map((block) => {
      ctx.font = `${block.weight} ${block.size}px ${family}`;
      return { ...block, lines: wrapLines(ctx, block.text, maxWidth) };
    });

    const totalHeight = measured.reduce(
      (sum, block, index) =>
        sum + block.lines.length * block.size * LINE_HEIGHT + (index > 0 ? block.size * SUBLINE_GAP : 0),
      0,
    );

    const [vertical, horizontal] = overlay.position.split('-') as [
      'top' | 'center' | 'bottom',
      'left' | 'center' | 'right',
    ];

    let cursorY =
      vertical === 'top'
        ? padding
        : vertical === 'center'
          ? (canvas.height - totalHeight) / 2
          : canvas.height - padding - totalHeight;

    if (overlay.scrim && hasText) {
      drawScrim(ctx, canvas, vertical, cursorY, totalHeight, padding);
    }

    const x = horizontal === 'left' ? padding : horizontal === 'right' ? canvas.width - padding : canvas.width / 2;
    ctx.textAlign = overlay.align;
    ctx.textBaseline = 'top';
    ctx.fillStyle = overlay.color;

    // Hizalama noktası: metin bloğunun kendi hizası kutunun konumundan bağımsız
    // seçilebiliyor (ör. sağ alta yerleşip sola hizalı yazmak).
    const anchorX = overlay.align === 'left' ? padding : overlay.align === 'right' ? canvas.width - padding : x;

    measured.forEach((block, index) => {
      if (index > 0) cursorY += block.size * SUBLINE_GAP;
      ctx.font = `${block.weight} ${block.size}px ${family}`;
      for (const line of block.lines) {
        ctx.fillText(line, anchorX, cursorY);
        cursorY += block.size * LINE_HEIGHT;
      }
    });

    if (overlay.wordmark) drawWordmark(ctx, canvas, family, padding, vertical);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG üretilemedi.'))), 'image/png');
  });
}

/** Metnin arkasına yumuşak karartma — açık zeminlerde okunabilirliği kurtarır. */
export function drawScrim(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  vertical: 'top' | 'center' | 'bottom',
  textTop: number,
  textHeight: number,
  padding: number,
) {
  const bandTop = Math.max(0, textTop - padding);
  const bandHeight = Math.min(canvas.height - bandTop, textHeight + padding * 2);

  const gradient = ctx.createLinearGradient(0, bandTop, 0, bandTop + bandHeight);
  if (vertical === 'bottom') {
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.62)');
  } else if (vertical === 'top') {
    gradient.addColorStop(0, 'rgba(0,0,0,0.62)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
  } else {
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.5, 'rgba(0,0,0,0.5)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, bandTop, canvas.width, bandHeight);
}

export function drawWordmark(
  ctx: CanvasRenderingContext2D,
  canvas: { width: number; height: number },
  family: string,
  padding: number,
  textVertical: 'top' | 'center' | 'bottom',
) {
  const size = canvas.height * 0.022;
  ctx.font = `500 ${size}px ${family}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = size * 0.5;

  // Metin altta duruyorsa wordmark üste kaçar, üst üste binmesin.
  const y = textVertical === 'bottom' ? padding + size : canvas.height - padding;
  ctx.fillText('talkinbio.com', canvas.width - padding, y);

  ctx.shadowBlur = 0;
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
