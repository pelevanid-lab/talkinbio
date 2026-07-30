// Faz S.6/S.8 — Studio ve Post'un PAYLAŞTIĞI Canvas 2D efekt katmanı (grain/vignette).
//
// Önce `studioRenderer.ts`'te Studio'nun renk/efekt paneli için yazıldı, sonra Beiwe Post'un
// gradient/mesh zemin sistemi (proje planı, Faz 2) AYNI ihtiyacı duydu — buraya taşındı ki
// iki dosya birbirinden kopyalamasın.

/**
 * Grain (film dokusu) — her karede tam çözünürlükte `ImageData` üretmek (1080×1920 ≈ 2M
 * piksel) gerçek zamanlı render'da kare düşürür. Sabit TEK bir gürültü katmanı ise donuk/
 * sahte görünür (gerçek grain karede kareye TİTRER) — bu yüzden küçük bir HAVUZ (varsayılan
 * 6 kare) önceden üretilip zamana göre döngüsel seçiliyor: hem ucuz (bir kerelik üretim) hem
 * gözle "canlı" (flicker) hissi veriyor.
 */
const GRAIN_POOL_SIZE = 6;
/** Saniyede kaç farklı grain karesi gösterileceği — video kare hızından BİLEREK bağımsız,
 * sadece göze doğal bir titreşim hissi vermesi yeterli, 30fps'e kilitlenmesine gerek yok. */
const GRAIN_FLICKER_HZ = 12;
let grainPoolCache: { key: string; canvases: HTMLCanvasElement[] } | null = null;

export function getGrainFrame(width: number, height: number, time: number): HTMLCanvasElement {
  const key = `${width}x${height}`;
  if (grainPoolCache?.key !== key) {
    const canvases: HTMLCanvasElement[] = [];
    for (let f = 0; f < GRAIN_POOL_SIZE; f++) {
      const layer = document.createElement('canvas');
      layer.width = width;
      layer.height = height;
      const layerCtx = layer.getContext('2d')!;
      const imageData = layerCtx.createImageData(width, height);
      for (let i = 0; i < imageData.data.length; i += 4) {
        const v = Math.random() * 255;
        imageData.data[i] = v;
        imageData.data[i + 1] = v;
        imageData.data[i + 2] = v;
        imageData.data[i + 3] = 255;
      }
      layerCtx.putImageData(imageData, 0, 0);
      canvases.push(layer);
    }
    grainPoolCache = { key, canvases };
  }
  const frameIndex = Math.floor(Math.max(0, time) * GRAIN_FLICKER_HZ) % GRAIN_POOL_SIZE;
  return grainPoolCache.canvases[frameIndex];
}

export function drawGrain(ctx: CanvasRenderingContext2D, grain: number, time: number, width: number, height: number) {
  if (!grain) return;
  ctx.save();
  // Tam opaklıkta grain görüntüyü tamamen boğar — 0.5 tavanı "belirgin ama izlenebilir" sınırı.
  ctx.globalAlpha = Math.min(1, grain) * 0.5;
  ctx.globalCompositeOperation = 'overlay';
  ctx.drawImage(getGrainFrame(width, height, time), 0, 0);
  ctx.restore();
}

export function drawVignette(ctx: CanvasRenderingContext2D, vignette: number, width: number, height: number) {
  if (!vignette) return;
  const inner = Math.min(width, height) * 0.3;
  const outer = Math.max(width, height) * 0.75;
  const gradient = ctx.createRadialGradient(width / 2, height / 2, inner, width / 2, height / 2, outer);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, `rgba(0,0,0,${Math.min(1, vignette) * 0.7})`);
  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}
