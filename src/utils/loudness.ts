// ITU-R BS.1770-4 "integrated loudness" (LUFS) ölçümü — post-prodüksiyon export'undan önce
// anlatım sesinin ne kadar yükseltilmesi gerektiğini bulmak için.
//
// Neden gerekli: Instagram yüklenen videoyu ~-14 LUFS'a normalize ediyor. Ham Motion çıktısı
// tipik olarak -22 LUFS civarında geliyor; platform aradaki ~9 dB'yi KENDİ yükseltiyor ve
// oda gürültüsünü, nefesleri de beraberinde kaldırıyor. Aynı yükseltmeyi export sırasında
// temiz kaynak üzerinde biz yaparsak (üstüne limitleyici — bkz. studioRenderer) sonuç
// feed'de hem daha yüksek hem daha temiz duyuluyor.
//
// Neden basit RMS değil: BS.1770 K-ağırlıklaması insan kulağının duyarlı olduğu bandı öne
// çıkarır ve sessizlikleri kapı (gate) ile ölçüm dışında bırakır. Konuşma ağırlıklı bir
// klipte düz RMS, duraklamalar yüzünden sesi olduğundan kısık ölçüp fazla yükseltmeye
// yol açardı.

/** Instagram/TikTok'un oynatma normalizasyon hedefi. */
export const PLATFORM_TARGET_LUFS = -14;

// K-ağırlıklama katsayıları standartta 48 kHz için tanımlı. Ölçüm bağlamını her zaman
// 48 kHz açtığımız için katsayıları yeniden türetmeye gerek yok — `decodeAudioData` kaynağı
// bağlamın örnekleme hızına kendisi çeviriyor. `BiquadFilterNode` ham katsayı kabul
// etmediğinden `IIRFilterNode` kullanılıyor.
const MEASURE_SAMPLE_RATE = 48000;
const SHELF_FEEDFORWARD = [1.53512485958697, -2.69169618940638, 1.19839281085285];
const SHELF_FEEDBACK = [1, -1.69065929318241, 0.73248077421585];
const HIGHPASS_FEEDFORWARD = [1, -2, 1];
const HIGHPASS_FEEDBACK = [1, -1.99004745483398, 0.99007225036621];

/** Kanal ağırlıkları (L, R, C = 1; surround = 1.41). Studio çıktısı stereo ama kaynak çok kanallı gelirse formül yine doğru çalışsın diye tablo tam. */
const CHANNEL_WEIGHTS = [1, 1, 1, 1.41, 1.41];

const BLOCK_SECONDS = 0.4;
const BLOCK_STEP_RATIO = 0.25; // %75 örtüşme
const ABSOLUTE_GATE_LUFS = -70;
const RELATIVE_GATE_LU = -10;

/** Ağırlıklı ortalama kareden blok/entegre gürlüğe — standarttaki -0.691 dB kalibrasyon ofseti dahil. */
function toLoudness(meanSquare: number): number {
  return -0.691 + 10 * Math.log10(meanSquare);
}

/**
 * Verilen ses/video URL'inin [startTime, endTime] aralığındaki entegre gürlüğünü LUFS olarak
 * döner. Ölçülemeyen her durumda (CORS, çözülemeyen kodek, ses parçası yok, 0.4 sn'den kısa
 * aralık, tam sessizlik) `null` döner — çağıran taraf o zaman normalizasyonu ATLAMALI;
 * yanlış bir tahminle sesi yükseltmektense hiç dokunmamak daha güvenli.
 *
 * Kaynak yeniden indirilir, ama element zaten oynattığı için pratikte HTTP önbelleğinden gelir.
 */
export async function measureIntegratedLoudness(
  url: string,
  startTime: number,
  endTime: number,
): Promise<number | null> {
  if (typeof OfflineAudioContext === 'undefined') return null;

  let decoded: AudioBuffer;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const raw = await res.arrayBuffer();
    decoded = await new OfflineAudioContext(1, 1, MEASURE_SAMPLE_RATE).decodeAudioData(raw);
  } catch {
    return null;
  }

  const start = Math.max(0, Math.min(startTime, decoded.duration));
  const end = endTime > start ? Math.min(endTime, decoded.duration) : decoded.duration;
  const duration = end - start;
  if (!(duration > BLOCK_SECONDS)) return null;

  // Bağlam kanal sayısı kaynağınkiyle BİREBİR: daha az verilirse Web Audio kanalları
  // otomatik karıştırır (down-mix) ve kanal ağırlıkları anlamını yitirir.
  const ctx = new OfflineAudioContext(
    decoded.numberOfChannels,
    Math.floor(duration * MEASURE_SAMPLE_RATE),
    MEASURE_SAMPLE_RATE,
  );
  const source = ctx.createBufferSource();
  source.buffer = decoded;
  source
    .connect(ctx.createIIRFilter(SHELF_FEEDFORWARD, SHELF_FEEDBACK))
    .connect(ctx.createIIRFilter(HIGHPASS_FEEDFORWARD, HIGHPASS_FEEDBACK))
    .connect(ctx.destination);
  source.start(0, start, duration);

  let filtered: AudioBuffer;
  try {
    filtered = await ctx.startRendering();
  } catch {
    return null;
  }

  const channels: Float32Array[] = [];
  for (let c = 0; c < filtered.numberOfChannels; c += 1) channels.push(filtered.getChannelData(c));

  const blockSize = Math.round(BLOCK_SECONDS * MEASURE_SAMPLE_RATE);
  const step = Math.round(blockSize * BLOCK_STEP_RATIO);

  // Mutlak kapıyı (-70 LUFS) geçen blokların ağırlıklı ortalama kareleri.
  const blocks: number[] = [];
  for (let offset = 0; offset + blockSize <= filtered.length; offset += step) {
    let weighted = 0;
    for (let c = 0; c < channels.length; c += 1) {
      const samples = channels[c];
      let square = 0;
      for (let i = offset; i < offset + blockSize; i += 1) square += samples[i] * samples[i];
      weighted += (CHANNEL_WEIGHTS[c] ?? 1) * (square / blockSize);
    }
    if (weighted > 0 && toLoudness(weighted) > ABSOLUTE_GATE_LUFS) blocks.push(weighted);
  }
  if (!blocks.length) return null;

  const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;

  // İkinci (göreli) kapı: ortalamanın 10 LU altındaki bloklar da atılır — böylece konuşma
  // aralarındaki fısıltı/oda tonu ölçümü aşağı çekmez.
  const relativeGate = toLoudness(mean(blocks)) + RELATIVE_GATE_LU;
  const gated = blocks.filter((b) => toLoudness(b) > relativeGate);
  if (!gated.length) return null;

  return toLoudness(mean(gated));
}

/** Normalizasyon kazancının sınırları — gürültülü/çok sessiz bir kaynağı sınırsız yükseltip oda tonunu öne çıkarmamak için. */
const MAX_BOOST_DB = 14;
const MAX_CUT_DB = -12;

/** Ölçülen gürlükten hedefe götüren lineer kazanç çarpanı (Web Audio `GainNode.gain` için). */
export function loudnessNormalizationGain(measuredLufs: number, targetLufs: number = PLATFORM_TARGET_LUFS): number {
  const db = Math.max(MAX_CUT_DB, Math.min(MAX_BOOST_DB, targetLufs - measuredLufs));
  return 10 ** (db / 20);
}
