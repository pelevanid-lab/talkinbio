// Referans kaydın bariz kötü olup olmadığını PARASIZ kontrol eder — tarayıcıda,
// hiçbir fal çağrısı yapmadan (Web Audio API).
//
// Neden var: MiniMax'ın klonlama ücreti ($1.50) klonun KENDİSİNİ yaratmanın maliyeti;
// sağlayıcı tarafında ücretsiz bir önizleme/deneme katmanı yok (doğrulandı,
// platform.minimax.io/docs/guides/pricing-paygo, 2026-07-29). Yani "önce dinle sonra öde"
// diye bir seçenek fal/MiniMax'tan gelmiyor. Bu kontrol o boşluğu doldurmuyor — sadece
// parayı harcamadan ÖNCE bariz kötü adayları (çok kısa, sessiz, aşırı gürültülü) eleyip
// "en azından bunlar değil" diyor. Klonun gerçekten benzeyip benzemeyeceğini garanti etmez.

export type AudioHealth = {
  durationSeconds: number;
  /** Ortalama RMS ses seviyesi, dBFS. 0 = maksimum, negatif = daha sessiz. */
  avgVolumeDb: number;
  /** Örneklerin ne kadarı "sessiz" sayılan eşiğin altında (0-1). */
  silenceRatio: number;
  warnings: string[];
};

const SILENCE_THRESHOLD_DB = -50;
/** MiniMax'ın kendi belirttiği alt sınır (fal şeması: "should be at least 10 seconds"). */
const MIN_RECOMMENDED_SECONDS = 10;

export async function analyzeReferenceAudio(file: File): Promise<AudioHealth> {
  const AudioCtx: typeof AudioContext | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioCtx) {
    return { durationSeconds: 0, avgVolumeDb: 0, silenceRatio: 0, warnings: [] };
  }

  const ctx = new AudioCtx();
  try {
    const buffer = await ctx.decodeAudioData(await file.arrayBuffer());
    const durationSeconds = buffer.duration;

    // Kanalları mono'ya indirip RMS ve sessizlik oranını hesapla.
    const channels = buffer.numberOfChannels;
    const length = buffer.length;
    let sumSquares = 0;
    let silentSamples = 0;
    // Binlerce örnekte durmak yeterli — tüm dosyayı taramak gereksiz CPU harcar.
    const step = Math.max(1, Math.floor(length / 20000));

    let sampleCount = 0;
    for (let i = 0; i < length; i += step) {
      let sample = 0;
      for (let ch = 0; ch < channels; ch++) sample += buffer.getChannelData(ch)[i] / channels;
      sumSquares += sample * sample;
      const sampleDb = 20 * Math.log10(Math.abs(sample) || 1e-10);
      if (sampleDb < SILENCE_THRESHOLD_DB) silentSamples++;
      sampleCount++;
    }

    const rms = Math.sqrt(sumSquares / Math.max(1, sampleCount));
    const avgVolumeDb = 20 * Math.log10(rms || 1e-10);
    const silenceRatio = sampleCount > 0 ? silentSamples / sampleCount : 0;

    const warnings: string[] = [];
    if (durationSeconds < MIN_RECOMMENDED_SECONDS) {
      warnings.push(
        `Kayıt ${durationSeconds.toFixed(0)} saniye — MiniMax en az ${MIN_RECOMMENDED_SECONDS} saniye öneriyor.`,
      );
    }
    if (avgVolumeDb < -35) {
      warnings.push('Kayıt çok sessiz görünüyor — mikrofona daha yakından, daha yüksek sesle tekrar dene.');
    }
    if (silenceRatio > 0.5) {
      warnings.push('Kaydın yarısından fazlası sessizlik — konuşma boşluklarını kırpıp tekrar yükle.');
    }

    return { durationSeconds, avgVolumeDb, silenceRatio, warnings };
  } catch {
    // Çözümlenemeyen dosya — sunucu zaten doğruluyor, burada sessizce geç.
    return { durationSeconds: 0, avgVolumeDb: 0, silenceRatio: 0, warnings: [] };
  } finally {
    void ctx.close();
  }
}
