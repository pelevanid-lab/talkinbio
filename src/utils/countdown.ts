// "3 — 2 — 1 — yayın" intro geri sayımı: canvas'a çizilen noktalar + osilatörle sentezlenen
// klasik yayın sayacı bipi.
//
// TEK ZAMAN PLANI: noktaların yanma anı ile biplerin çalma anı aynı `countdownPlan()`
// çıktısından okunuyor. Görüntü rAF saatiyle, ses ise AudioContext saatiyle ilerlediği için
// iki ayrı yerde "0.6 sn'de bir" yazsaydık, biri diğerinden kayınca sebebini bulmak
// imkânsıza yakın olurdu — plan tek yerde üretilip ikisine de veriliyor.
//
// Ses neden dosya değil: klasik sayaç bipi (BBC "pips" ailesi) 1000 Hz saf bir sinüs. Asset
// olarak tutmak yükleme/telif/önizleme-export'un aynı dosyayı beklemesi gibi bir sürü sorunu
// bedavaya getirirdi; osilatörle üretmek hem sıfır bağımlılık hem de süreye göre esneyebiliyor.

import type { StudioCountdown } from '@/config/studio';

export type CountdownPlan = {
  /** Her noktanın yandığı an (saniye, intro başlangıcına göre). */
  steps: number[];
  /** Sondaki uzun "yayına giriyoruz" bipi. */
  finale: { at: number; duration: number };
};

/** Nokta yanarken büyüyüp yerine oturma süresi — bipin algılanan uzunluğuyla aynı mertebede. */
const POP_SECONDS = 0.18;
/** Finalde tüm noktaların birlikte attığı nabız. */
const FINALE_PULSE_SECONDS = 0.3;

/**
 * Süreyi (adım + 1) vuruşa böler: son vuruş kısa biplerin değil, uzun "yayın" bipinin yeri.
 * Yani 3 adım / 2.5 sn'de noktalar 0 — 0.625 — 1.25'te yanar, uzun bip 1.875'te başlayıp
 * intro biterken (2.5) susar; hemen ardından video görünür.
 */
export function countdownPlan(duration: number, steps: number): CountdownPlan {
  const beat = duration / (steps + 1);
  return {
    steps: Array.from({ length: steps }, (_, i) => i * beat),
    finale: { at: steps * beat, duration: beat },
  };
}

function smoothstep(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

/** `#RRGGBB` + alfa → `rgba(...)`. Sönük noktalar için ayrı bir renk alanı tutmak yerine yanmış renkten türetiliyor. */
function withAlpha(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Sönük (henüz yanmamış) noktanın opaklığı — tamamen görünmez olsa kaç nokta kaldığı okunmazdı. */
const DIM_ALPHA = 0.16;
// talkinbio wordmark'ındaki üç noktayla (bkz. `LogoSVG` — page.tsx) AYNI oran: r=5.5,
// merkezler arası 22 birim → kenar boşluğu/yarıçap = 2.0. Marka zaten bu üç noktayı
// kullandığı için geri sayım da birebir aynı geometriyle çizilirse "aynı işaret" gibi okunur.
const DOT_RADIUS_RATIO = 0.075;
const DOT_GAP_RATIO = 2.0; // yarıçap cinsinden kenar boşluğu (logoyla birebir aynı oran)

/**
 * Geri sayım noktalarını çizer. `time` intro başlangıcına göre saniye.
 * Arka planı ÇİZMEZ — onu çağıran taraf (görsel ya da düz renk) zaten halletmiş olur.
 */
export function drawCountdownDots(
  ctx: CanvasRenderingContext2D,
  countdown: StudioCountdown,
  plan: CountdownPlan,
  time: number,
  width: number,
  height: number,
): void {
  const radius = Math.min(width, height) * DOT_RADIUS_RATIO;
  const gap = radius * DOT_GAP_RATIO;
  const spacing = radius * 2 + gap;
  const totalWidth = spacing * (plan.steps.length - 1);
  const startX = width / 2 - totalWidth / 2;
  const centerY = height / 2;

  // Finalde tüm noktalar birlikte bir nabız atar — "yayın" vurgusu. Uzun bip başladığı anda
  // tetiklendiği için ses ve görüntü aynı kareye denk gelir.
  const finaleElapsed = time - plan.finale.at;
  const finalePulse =
    finaleElapsed >= 0 && finaleElapsed < FINALE_PULSE_SECONDS
      ? 1 - smoothstep(finaleElapsed / FINALE_PULSE_SECONDS)
      : 0;

  const count = plan.steps.length;

  ctx.save();
  for (let i = 0; i < count; i += 1) {
    // Her noktanın DEĞİŞİM anı. `fill`'de nokta kendi vuruşunda yanar (soldan sağa).
    // `drain`'de ilk vuruş hiçbir noktayı söndürmez — o "3"ün kendisi, tüm noktalar yanık;
    // sonraki her vuruşta sağdan bir nokta söner, en soldaki de finalde gider. Dolayısıyla
    // i. noktanın sönme anı steps[count - i], en soldaki (i=0) için ise finale.
    const changeAt = countdown.direction === 'fill' ? plan.steps[i] : i === 0 ? plan.finale.at : plan.steps[count - i];
    const elapsed = time - changeAt;
    const changed = elapsed >= 0;
    const progress = changed ? smoothstep(Math.min(1, elapsed / POP_SECONDS)) : 0;

    // `fill`: sönükten yanığa. `drain`: yanıktan sönüğe. İkisinde de geçiş anında hafif bir
    // taşma var (overshoot) — düz bir alfa geçişi bipin perküsif karakterinin yanında
    // cansız kalıyordu.
    const alpha =
      countdown.direction === 'fill'
        ? DIM_ALPHA + (1 - DIM_ALPHA) * progress
        : 1 - (1 - DIM_ALPHA) * progress;
    const scale = (changed ? 1 + 0.4 * (1 - progress) : 1) + 0.25 * finalePulse;

    ctx.fillStyle = withAlpha(countdown.color, alpha);
    ctx.beginPath();
    ctx.arc(startX + i * spacing, centerY, radius * scale, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Klasik yayın sayacı tonu (BBC "pips" ile aynı frekans). */
const BEEP_FREQUENCY = 1000;
const SHORT_BEEP_SECONDS = 0.09;
/** Uzun bip `finale.duration` kadar sürebilir ama sınırsız uzamasın — 0.55 sn'den sonrası bunaltıcı oluyor. */
const MAX_FINALE_BEEP_SECONDS = 0.55;
const BEEP_PEAK_GAIN = 0.35;

/**
 * Geri sayım biplerini `startAt` (AudioContext saati) referansıyla zamanlar ve iptal
 * fonksiyonu döner. `fromTime`, intro içinde ATLANAN süredir: kullanıcı önizlemeyi ortadan
 * başlattığında geçmiş bipler çalmasın diye.
 *
 * Not: her bip kendi GainNode'uyla zarflanıyor (5 ms açılış + üstel sönüm). Zarfsız bir
 * osilatör başlangıç/bitişte "klik" çıkarır — sayacın kendisinden daha çok duyulurdu.
 */
export function scheduleCountdownBeeps(
  audioCtx: BaseAudioContext,
  destination: AudioNode,
  plan: CountdownPlan,
  startAt: number,
  fromTime = 0,
): () => void {
  const scheduled: OscillatorNode[] = [];

  const beep = (offset: number, seconds: number) => {
    if (offset < fromTime) return;
    const at = startAt + (offset - fromTime);
    const osc = audioCtx.createOscillator();
    osc.frequency.value = BEEP_FREQUENCY;

    const env = audioCtx.createGain();
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(BEEP_PEAK_GAIN, at + 0.005);
    env.gain.setValueAtTime(BEEP_PEAK_GAIN, at + seconds * 0.7);
    // exponentialRamp 0'a inemez (spec) — duyulamayacak kadar küçük bir değere iniyoruz.
    env.gain.exponentialRampToValueAtTime(0.0001, at + seconds);

    osc.connect(env).connect(destination);
    osc.start(at);
    osc.stop(at + seconds + 0.02);
    scheduled.push(osc);
  };

  for (const at of plan.steps) beep(at, SHORT_BEEP_SECONDS);
  beep(plan.finale.at, Math.min(MAX_FINALE_BEEP_SECONDS, plan.finale.duration));

  return () => {
    for (const osc of scheduled) {
      try {
        osc.stop();
      } catch {
        // Zaten durmuş/hiç başlamamış osilatör — iptal ederken önemsiz.
      }
    }
  };
}
