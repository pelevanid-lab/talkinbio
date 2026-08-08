// Faz S.4 — fal.ai istemcisi (Karakter Odası görsel üretimi).
//
// Bilerek `@fal-ai/client` paketi kurulmadı: kod dondurma döneminde (Faz T) yeni bir
// runtime bağımlılığı eklememek için queue REST API'si düz `fetch` ile konuşuluyor.
// Sözleşme: https://fal.ai/docs/model-endpoints/queue

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { MotionModel, MotionResolution } from '@/config/motionModels';

const QUEUE_BASE = 'https://queue.fal.run';

/** Poll aralığı ve üst sınır — route'un maxDuration=300 bütçesinin altında kalır. */
const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 240_000;

/**
 * Motion görselden çok daha yavaş (30s'lik 1080p video birkaç dakika sürebiliyor).
 *
 * Bu değer route'taki `maxDuration=300` ile UYUMLU DEĞİL — bilerek. `maxDuration` Next.js'in
 * route segment ayarı ve SADECE Vercel'e deploy edilince işliyor; `next dev`/`next start`'ta
 * (yani local test ve kendi sunucumuzda) hiçbir etkisi yok, gerçek bir tavan yok. Burayı
 * cömert tuttuk ki local'de ağır model/uzun ses kombinasyonları zaman aşımına takılmasın.
 *
 * DİKKAT: Vercel'e deploy edildiğinde `maxDuration=300` yine devreye girer ve bu süreden
 * önce isteği keser — o zaman bu değerin bir önemi kalmaz. Ağır modellerle (1080p, uzun ses)
 * production'a çıkmadan önce isteğin hemen dönüp durumun ayrıca sorgulandığı arka plan
 * iş mimarisine geçilmeli; bu sadece local test için bir rahatlatma.
 */
const MOTION_POLL_TIMEOUT_MS = 540_000;

/**
 * Performans aktarımı (video-to-video) ses-güdümlüden ÇOK daha yavaş — gerçek testte
 * 10 sn'lik bir sürücü video ~10-15 dk sürdü (bkz. proje geçmişi, 2026-07-29 wan-motion
 * testi). Yukarıdaki MOTION_POLL_TIMEOUT_MS yorumundaki DİKKAT aynen burada da geçerli:
 * Vercel'de maxDuration=300 devreye girince bu değerin önemi kalmıyor, bu sadece local
 * test için cömert bir üst sınır.
 */
const PERFORMANCE_POLL_TIMEOUT_MS = 1_200_000;

export class FalError extends Error {
  readonly userMessage: string;
  constructor(userMessage: string, technical?: string) {
    super(technical || userMessage);
    this.name = 'FalError';
    this.userMessage = userMessage;
  }
}

export type FalImage = {
  url: string;
  width?: number;
  height?: number;
  content_type?: string;
};

export type GenerateCharacterImageParams = {
  model: string;
  prompt: string;
  /** Kimlik referansları önce, sahne referansları sonra — sıra prompt'taki rol etiketiyle eşleşmeli. */
  imageUrls: string[];
  aspectRatio: string;
  resolution: '1K' | '2K';
  numImages: number;
  seed?: number;
  loraUrl?: string;
};

export type GenerateCharacterImageResult = {
  images: FalImage[];
  seed?: number;
  requestId: string;
  description?: string;
};

function falKey(): string {
  const key = process.env.FAL_KEY;
  if (!key) {
    throw new FalError(
      'FAL_KEY tanımlı değil — .env.local dosyasına fal.ai anahtarını ekleyip sunucuyu yeniden başlat.',
    );
  }
  return key;
}

async function falFetch(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Key ${falKey()}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    if (res.status === 401 || res.status === 403) {
      throw new FalError('fal.ai anahtarı reddedildi (401/403). Anahtarı kontrol et.', body);
    }
    if (res.status === 422) {
      throw new FalError(
        'fal.ai isteği doğrulayamadı (422) — prompt, referans görsel veya ses dosyası geçersiz olabilir.',
        body,
      );
    }
    if (res.status === 429) {
      throw new FalError('fal.ai hız sınırına takıldı, biraz bekleyip tekrar dene.', body);
    }
    throw new FalError(`fal.ai isteği başarısız oldu (HTTP ${res.status}).`, body);
  }

  return res;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type SubmitResponse = {
  request_id?: string;
  status_url?: string;
  response_url?: string;
};

/**
 * Queue'ya iş bırakır, COMPLETED olana kadar yoklar, ham sonuç gövdesini döner.
 *
 * fal'ın submit cevabındaki status_url/response_url'i kullanıyoruz, kendimiz
 * inşa etmiyoruz: fal bu URL'lerde model kimliğini action eki (ör. "/edit")
 * OLMADAN döndürüyor ("fal-ai/nano-banana-pro", "fal-ai/nano-banana-pro/edit"
 * değil) — bunu `${model}/requests/...` ile kendimiz kurunca 405 alıyorduk.
 */
async function submitAndPoll<T>(
  model: string,
  input: unknown,
  opts: { timeoutMs: number; timeoutMessage: string; failMessage: string },
): Promise<{ result: T; requestId: string }> {
  const submitRes = await falFetch(`${QUEUE_BASE}/${model}`, {
    method: 'POST',
    body: JSON.stringify(input),
  });

  const submitted = (await submitRes.json()) as SubmitResponse;
  const requestId = submitted.request_id;
  if (!requestId) {
    throw new FalError('fal.ai istek kimliği döndürmedi.');
  }

  const statusUrl = submitted.status_url || `${QUEUE_BASE}/${model}/requests/${requestId}/status`;
  const resultUrl = submitted.response_url || `${QUEUE_BASE}/${model}/requests/${requestId}`;

  const startedAt = Date.now();
  for (;;) {
    if (Date.now() - startedAt > opts.timeoutMs) {
      // requestId'yi hata mesajına gömüyoruz: iş fal tarafında bizim sınırımızdan
      // sonra bitmiş olabilir (para zaten harcandı), bu tek kurtarma ipucu —
      // console.error zaten err.message'ı logluyor, oradan okunabilir olsun.
      throw new FalError(opts.timeoutMessage, `requestId=${requestId} model=${model}`);
    }

    await sleep(POLL_INTERVAL_MS);

    const statusRes = await falFetch(statusUrl);
    const status = (await statusRes.json()) as { status?: string };

    if (status.status === 'COMPLETED') break;
    if (status.status && !['IN_QUEUE', 'IN_PROGRESS'].includes(status.status)) {
      throw new FalError(opts.failMessage, `requestId=${requestId} ${JSON.stringify(status)}`);
    }
  }

  const resultRes = await falFetch(resultUrl);
  return { result: (await resultRes.json()) as T, requestId };
}

/**
 * Queue'ya iş bırakır, bitene kadar durum yoklar, sonucu döner.
 * Senkron `fal.run` yerine queue kullanılıyor — fal dokümantasyonu üretim için bunu öneriyor
 * (otomatik yeniden deneme ve durum görünürlüğü).
 */
export async function generateCharacterImage(
  params: GenerateCharacterImageParams,
): Promise<GenerateCharacterImageResult> {
  const { model, prompt, imageUrls, aspectRatio, resolution, numImages, seed, loraUrl } = params;

  // Yalnızca "/edit" modelleri (img2img) referans görsel şart koşar — düz nano-banana-pro
  // gibi metinden-görsele modeller referanssız da çalışır (bkz. Action Room jenerik mod,
  // `GENERIC_IMAGE_MODEL_FALLBACK`, ve Yardımcı Oyuncular'ın avatar bootstrap üretimi).
  const requiresReference = model.endsWith('/edit');
  if (requiresReference && imageUrls.length === 0 && !loraUrl) {
    throw new FalError('En az bir referans görsel veya aktif LoRA gerekli.');
  }

  const { result, requestId } = await submitAndPoll<{
    images?: FalImage[];
    seed?: number;
    description?: string;
  }>(
    model,
    {
      prompt,
      ...(imageUrls.length > 0 ? { image_urls: imageUrls } : {}),
      num_images: numImages,
      aspect_ratio: aspectRatio,
      resolution,
      output_format: 'png',
      ...(typeof seed === 'number' ? { seed } : {}),
      ...(loraUrl ? { loras: [{ path: loraUrl, scale: 1 }] } : {}),
    },
    {
      timeoutMs: POLL_TIMEOUT_MS,
      timeoutMessage: 'fal.ai üretimi zaman aşımına uğradı (4 dk). Daha basit bir sahneyle tekrar dene.',
      failMessage: 'fal.ai üretimi başarısız oldu.',
    },
  );

  if (!result.images?.length) {
    throw new FalError('fal.ai görsel döndürmedi.', JSON.stringify(result));
  }

  return {
    images: result.images,
    seed: result.seed,
    requestId,
    description: result.description,
  };
}

/**
 * `public/` altındaki kanonik avatarı base64 data-URI'ye çevirir.
 *
 * URL yerine data-URI kullanmamızın sebebi: localhost'ta çalışırken fal'ın erişebileceği
 * public bir adres yok; base64 hem geliştirmede hem üretimde aynı şekilde çalışır.
 * fal `image_urls` alanı base64 data-URI kabul ediyor.
 */
export async function publicImageAsDataUri(fileName: string): Promise<string> {
  // Eğer Supabase (veya başka bir uzak sunucu) URL'si ise, doğrudan URL'yi döndür.
  // Fal AI herkese açık URL'leri doğrudan indirebilir.
  if (fileName.startsWith('http://') || fileName.startsWith('https://')) {
    return fileName;
  }

  // Yol geçişini engelle — dosya adı config'ten geliyor ama savunmayı burada tut.
  const safeName = path.basename(fileName);
  const filePath = path.join(process.cwd(), 'public', safeName);

  try {
    const bytes = await readFile(filePath);
    const ext = path.extname(safeName).toLowerCase();
    const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : 'image/png';
    return `data:${mime};base64,${bytes.toString('base64')}`;
  } catch {
    throw new FalError(`Kanonik referans görsel okunamadı: public/${safeName}`);
  }
}

export type GenerateMotionParams = {
  /** Model kaydı — endpoint ve hangi alanların gönderileceği buradan geliyor. */
  model: MotionModel;
  imageUrl: string;
  audioUrl: string;
  resolution: MotionResolution;
  /** Duygu/jest yönlendirmesi. Boşsa gönderilmiyor — model sesin tonundan çıkarım yapıyor. */
  prompt?: string;
  /** Daha hızlı üretim, bir tık düşük kalite. Zaman aşımına takılıyorsan aç. */
  turboMode?: boolean;
};

export type GenerateMotionResult = {
  videoUrl: string;
  /** fal'ın faturaladığı süre (saniye) — maliyet takibi için. */
  durationSeconds?: number;
  requestId: string;
};

export type GenerateVoiceParams = {
  prompt: string;
  referenceAudioUrl: string;
  /**
   * Referans kaydın deşifresi. Verilirse whisper adımı tamamen atlanır.
   *
   * Referans bir kere yüklenip defalarca kullanılıyor; deşifreyi her üretimde yeniden
   * hesaplamak aynı işi tekrar tekrar yaptırmak demekti (her "Seslendir" = iki kuyruk
   * işi + iki bekleme). Çağıran taraf bunu `character_profiles.voice_ref_text`'ten
   * geçirir; boşsa eski davranışa düşülür.
   */
  referenceText?: string;
};

export type GenerateVoiceResult = {
  audioUrl: string;
  requestId: string;
  /** Whisper bu çağrıda çalıştıysa çıkan deşifre — çağıran taraf saklayabilsin diye. */
  transcribedRefText?: string;
};

/** Referans sesin deşifresi — F5-TTS'in dili doğru anlaması için gerekli. */
export async function transcribeReferenceAudio(referenceAudioUrl: string): Promise<string> {
  const { result } = await submitAndPoll<{ text?: string }>(
    'fal-ai/whisper',
    {
      audio_url: referenceAudioUrl,
      task: 'transcribe',
    },
    {
      timeoutMs: 60000,
      timeoutMessage: 'fal.ai ses analizi (whisper) zaman aşımına uğradı.',
      failMessage: 'fal.ai referans sesi analiz edemedi.',
    }
  );
  return result?.text || '';
}

export async function generateCharacterVoice(params: GenerateVoiceParams): Promise<GenerateVoiceResult> {
  const { prompt, referenceAudioUrl, referenceText } = params;

  // 1. Referans deşifresi — elde varsa whisper'a hiç gitmiyoruz.
  const cached = referenceText?.trim();
  const refText = cached || (await transcribeReferenceAudio(referenceAudioUrl));

  // 2. F5-TTS ile yeni sesi üretiyoruz
  const { result, requestId } = await submitAndPoll<any>(
    'fal-ai/f5-tts',
    {
      gen_text: prompt.trim(),
      ref_audio_url: referenceAudioUrl,
      ref_text: refText,
      model_type: 'F5-TTS',
    },
    {
      timeoutMs: 180000,
      timeoutMessage: 'fal.ai ses üretimi zaman aşımına uğradı.',
      failMessage: 'fal.ai ses üretimi başarısız oldu.',
    }
  );

  const audioObj = result?.audio_url || result?.audio || result?.audio_file;
  const audioUrl = typeof audioObj === 'string' ? audioObj : audioObj?.url;

  if (!audioUrl || typeof audioUrl !== 'string') {
    throw new FalError('fal.ai ses döndürmedi.', `requestId=${requestId} ${JSON.stringify(result)}`);
  }

  return {
    audioUrl,
    requestId,
    // Deşifreyi bu çağrıda biz çıkardıysak geri veriyoruz ki çağıran saklayıp
    // sonraki üretimlerde whisper'ı bir daha çalıştırmasın.
    transcribedRefText: cached ? undefined : refText,
  };
}

/* ------------------------------------------------------------------ */
/* MiniMax ses klonlama — Beiwe Voice                                   */
/* ------------------------------------------------------------------ */
//
// F5-TTS'ten (yukarısı) farkı: burada gerçek bir "klon" var. `voice-clone` referans
// sesi bir kez işleyip kalıcı bir `custom_voice_id` döndürüyor; sonraki üretimler
// ses dosyasını değil, bu kimliği kullanıyor. Süreç eğitim değil (model ağırlığı
// çıkmıyor), ama F5-TTS'in aksine referansı her çağrıda yeniden kodlamıyor.
//
// 2026-07-29 testinde: F5-TTS Türkçe'de anlamsız hece çıkardı (dil desteği yetersiz),
// MiniMax Türkçe'yi doğru okudu (`language_boost: 'Turkish'` ile) ama benzerlik
// sınırlıydı. En iyi sonuç ham (temizlik kapalı) + uzun referanstan geldi — bu yüzden
// burada `noise_reduction`/`need_volume_normalization` bilerek kapalı: fal'ın kendi
// gürültü temizliği ses dokusunu (identity texture) siliyor gibi görünüyor.
//
// Kalıcılık riski: yeni bir `custom_voice_id` gerçek bir TTS çağrısında kullanılmazsa
// 7 gün içinde fal/MiniMax tarafında siliniyor. Önizleme (clone sırasındaki `text`)
// bunu saymıyor — o yüzden clone çağrısında `text: null` bırakıp önizlemeyi atlıyoruz;
// kimliği mühürleyen ilk gerçek çağrı, doğrulama aşamasındaki ilk "Seslendir".

export type MinimaxCloneParams = {
  referenceAudioUrl: string;
};

export type MinimaxCloneResult = {
  customVoiceId: string;
  requestId: string;
};

export async function cloneMinimaxVoice(params: MinimaxCloneParams): Promise<MinimaxCloneResult> {
  const { referenceAudioUrl } = params;

  const { result, requestId } = await submitAndPoll<{ custom_voice_id?: string }>(
    'fal-ai/minimax/voice-clone',
    {
      audio_url: referenceAudioUrl,
      noise_reduction: false,
      need_volume_normalization: false,
      text: null,
    },
    {
      timeoutMs: 120000,
      timeoutMessage: 'fal.ai ses klonlama zaman aşımına uğradı.',
      failMessage: 'fal.ai referans sesi klonlayamadı.',
    },
  );

  if (!result?.custom_voice_id) {
    throw new FalError('fal.ai klon kimliği döndürmedi.', `requestId=${requestId} ${JSON.stringify(result)}`);
  }

  return { customVoiceId: result.custom_voice_id, requestId };
}

export type MinimaxSpeakParams = {
  text: string;
  voiceId: string;
  /** fal `language_boost` enum'unun bir üyesi — bkz. `src/config/beiweLab.ts`. */
  languageBoost?: string;
};

export type MinimaxSpeakResult = {
  audioUrl: string;
  durationMs: number;
  requestId: string;
};

export async function generateMinimaxSpeech(params: MinimaxSpeakParams): Promise<MinimaxSpeakResult> {
  const { text, voiceId, languageBoost = 'Turkish' } = params;

  const { result, requestId } = await submitAndPoll<{
    audio?: { url?: string };
    duration_ms?: number;
  }>(
    'fal-ai/minimax/speech-02-hd',
    {
      text,
      voice_setting: { voice_id: voiceId, speed: 1, vol: 1, pitch: 0 },
      language_boost: languageBoost,
      output_format: 'url',
    },
    {
      timeoutMs: 120000,
      timeoutMessage: 'fal.ai ses üretimi zaman aşımına uğradı.',
      failMessage: 'fal.ai ses üretemedi.',
    },
  );

  const audioUrl = result?.audio?.url;
  if (!audioUrl) {
    throw new FalError('fal.ai ses döndürmedi.', `requestId=${requestId} ${JSON.stringify(result)}`);
  }

  return { audioUrl, durationMs: result.duration_ms ?? 0, requestId };
}

export type TranscribeWord = { text: string; start: number; end: number };

export type TranscribeAudioWordsParams = {
  audioUrl: string;
};

export type TranscribeAudioWordsResult = {
  words: TranscribeWord[];
  requestId: string;
};

/**
 * Karaoke altyazı için kelime bazlı zaman damgası — `chunk_level: 'word'` whisper'ın
 * segment yerine HER kelime için ayrı `timestamp: [start, end]` döndürmesini sağlıyor.
 * `audio_url` mp4 kabul ediyor (fal dokümantasyonu) ama biz zaten motion'ın kendi
 * `audio_url`'ini (ses-only, videoyu süren orijinal dosya) gönderiyoruz — hem daha ucuz
 * hem zamanlaması videoyla bire bir örtüşüyor.
 */
export async function transcribeAudioWords(params: TranscribeAudioWordsParams): Promise<TranscribeAudioWordsResult> {
  const { result, requestId } = await submitAndPoll<{
    chunks?: { text?: string; timestamp?: [number, number] }[];
  }>(
    'fal-ai/whisper',
    {
      audio_url: params.audioUrl,
      task: 'transcribe',
      chunk_level: 'word',
    },
    {
      timeoutMs: 120_000,
      timeoutMessage: 'fal.ai altyazı çıkarımı (whisper) zaman aşımına uğradı.',
      failMessage: 'fal.ai altyazı çıkarımı başarısız oldu.',
    },
  );

  const words: TranscribeWord[] = [];
  for (const chunk of result.chunks || []) {
    const text = chunk.text?.trim();
    const [start, end] = chunk.timestamp || [];
    if (text && typeof start === 'number' && typeof end === 'number' && end > start) {
      words.push({ text, start, end });
    }
  }

  if (!words.length) {
    throw new FalError('fal.ai altyazı üretmedi — ses boş ya da anlaşılmamış olabilir.', `requestId=${requestId}`);
  }

  return { words, requestId };
}

/**
 * `audio_url` VEYA `video_url`'den biri yeterli. Ortak klip havuzundaki harici yüklemelerin
 * ayrı bir `audio_url`'i olmuyor (sadece `video_url`), o klipler için ikinci yol gerekiyor.
 */
export type EnhanceAudioParams = { audioUrl: string; videoUrl?: never } | { audioUrl?: never; videoUrl: string };

export type EnhanceAudioResult = {
  audioUrl: string;
  requestId: string;
};

export async function enhanceAudio(params: EnhanceAudioParams): Promise<EnhanceAudioResult> {
  // deepfilternet3 gürültü temizliğinin yanında ucuz mikrofonların ince/cılız kalan sesini
  // 48kHz'e upsample ederek de düzeltiyor (ElevenLabs audio-isolation sadece arka plan
  // gürültüsü/müziği ayıklıyor, mikrofon kaynaklı kalite sorununa dokunmuyor). Ama SADECE
  // `audio_url` kabul ediyor — video kabul etmiyor — o yüzden `video_url` durumunda (harici
  // yüklenen klip'lerin ayrı ses dosyası olmadığı hal) audio-isolation'da kalıyoruz.
  const { result, requestId } = params.audioUrl
    ? await submitAndPoll<any>(
        'fal-ai/deepfilternet3',
        { audio_url: params.audioUrl },
        {
          timeoutMs: 120000,
          timeoutMessage: 'fal.ai ses iyileştirme (DeepFilterNet3) işlemi zaman aşımına uğradı.',
          failMessage: 'fal.ai ses iyileştirme (DeepFilterNet3) işlemi başarısız oldu.',
        }
      )
    : await submitAndPoll<any>(
        'fal-ai/elevenlabs/audio-isolation',
        { video_url: params.videoUrl },
        {
          timeoutMs: 120000,
          timeoutMessage: 'fal.ai ses temizleme (ElevenLabs) işlemi zaman aşımına uğradı.',
          failMessage: 'fal.ai ses temizleme (ElevenLabs) işlemi başarısız oldu.',
        }
      );

  const audioObj = result?.audio_file?.url || result?.audio?.url || result?.audio_url;
  const audioUrl = typeof audioObj === 'string' ? audioObj : audioObj?.url;

  if (!audioUrl || typeof audioUrl !== 'string') {
    throw new FalError('fal.ai temizlenmiş ses döndürmedi.', `requestId=${requestId} ${JSON.stringify(result)}`);
  }

  return {
    audioUrl,
    requestId,
  };
}

/**
 * Dublaj süresi tahmin edilemiyor (transkript+çeviri+TTS videonun tamamı için) — bir
 * dakikalık bir klip birkaç dakika sürebilir. `MOTION_POLL_TIMEOUT_MS` ile aynı gerekçe:
 * Vercel'de `maxDuration` yine devreye girip bunu geçersiz kılacak, bu sadece local test
 * için cömert bir üst sınır.
 */
const DUB_POLL_TIMEOUT_MS = 600_000;

export type DubVideoParams = {
  videoUrl: string;
  /** ISO 639-1 hedef dil kodu (ör. 'en', 'ru'). */
  targetLang: string;
  /** Verilmezse fal otomatik algılar. */
  sourceLang?: string;
};

export type DubVideoResult = {
  videoUrl: string;
  requestId: string;
};

/**
 * `fal-ai/elevenlabs/dubbing` — Düzenle → Redub. Transkripsiyon, çeviri ve orijinal
 * konuşmacının ses karakterini koruyan TTS'i TEK çağrıda yapıyor; ayrı bir ses klonu
 * adımına (MiniMax `custom_voice_id`) bağımlı DEĞİL. $/dk fiyatı DOĞRULANMADI — bkz.
 * `STUDIO_DUB_COST_USD_PER_MINUTE` (config/beiweLab.ts) yorumu.
 */
export async function dubVideo(params: DubVideoParams): Promise<DubVideoResult> {
  const { videoUrl, targetLang, sourceLang } = params;

  const { result, requestId } = await submitAndPoll<{ video?: { url?: string } }>(
    'fal-ai/elevenlabs/dubbing',
    {
      video_url: videoUrl,
      target_lang: targetLang,
      ...(sourceLang ? { source_lang: sourceLang } : {}),
    },
    {
      timeoutMs: DUB_POLL_TIMEOUT_MS,
      timeoutMessage: 'fal.ai video dublajı zaman aşımına uğradı.',
      failMessage: 'fal.ai videoyu dublajlayamadı.',
    },
  );

  const dubbedUrl = result?.video?.url;
  if (!dubbedUrl) {
    throw new FalError('fal.ai dublajlı video döndürmedi.', `requestId=${requestId} ${JSON.stringify(result)}`);
  }

  return { videoUrl: dubbedUrl, requestId };
}

/* ------------------------------------------------------------------ */
/* Obje/arka plan kesme — Beiwe Post                                    */
/* ------------------------------------------------------------------ */
//
// DOĞRULANDI (2026-07-31, kurucu testi) — model çalışıyor, gerçek maliyet $0,0045/görsel
// (bkz. config/post.ts ESTIMATED_BG_REMOVAL_COST_USD). Hangi `result` alanının (`image.url`
// vs `image_url` vs `image`) gerçekte döndüğü loglanmadı, o yüzden çoklu-alan toleransı
// bilerek KORUNUYOR — `enhanceAudio` ile aynı gerekçe, tek bir alana daraltmak riskli.

export type RemoveBackgroundResult = {
  url: string;
  requestId: string;
};

export async function removeImageBackground(imageUrl: string): Promise<RemoveBackgroundResult> {
  const { result, requestId } = await submitAndPoll<any>(
    'fal-ai/imageutils/rembg',
    { image_url: imageUrl },
    {
      timeoutMs: 60000,
      timeoutMessage: 'fal.ai arka plan kaldırma işlemi zaman aşımına uğradı.',
      failMessage: 'fal.ai arka planı kaldıramadı.',
    },
  );

  const imageObj = result?.image?.url || result?.image_url || result?.image;
  const url = typeof imageObj === 'string' ? imageObj : imageObj?.url;

  if (!url || typeof url !== 'string') {
    throw new FalError('fal.ai işlenmiş görsel döndürmedi.', `requestId=${requestId} ${JSON.stringify(result)}`);
  }

  return { url, requestId };
}

export async function generateCharacterMotion(params: GenerateMotionParams): Promise<GenerateMotionResult> {
  const { model, imageUrl, audioUrl, resolution, prompt, turboMode } = params;

  // Kling `resolution`/`turbo_mode` kabul etmiyor; tanımadığı alanı göndermek 422'ye
  // yol açıyor, o yüzden gövdeyi model kaydının yeteneklerine göre kuruyoruz.
  const { result, requestId } = await submitAndPoll<{
    video?: { url?: string };
    duration?: number;
  }>(
    model.id,
    {
      image_url: imageUrl,
      audio_url: audioUrl,
      ...(model.sendsResolution ? { resolution } : {}),
      ...(prompt?.trim() ? { prompt: prompt.trim() } : {}),
      ...(model.supportsTurbo && turboMode ? { turbo_mode: true } : {}),
    },
    {
      timeoutMs: MOTION_POLL_TIMEOUT_MS,
      timeoutMessage:
        'fal.ai video üretimi zaman aşımına uğradı. Daha kısa bir ses dosyası dene, düşük çözünürlük seç ya da hızlı modu aç.',
      failMessage: 'fal.ai video üretimi başarısız oldu.',
    },
  );

  if (!result.video?.url) {
    throw new FalError('fal.ai video döndürmedi.', `requestId=${requestId} ${JSON.stringify(result)}`);
  }

  return {
    videoUrl: result.video.url,
    durationSeconds: result.duration,
    requestId,
  };
}

export type GenerateSceneVideoParams = {
  /** fal queue endpoint kimliği — bkz. `config/clips.ts` SCENE_VIDEO_MODELS. */
  modelId: string;
  /** Stilize kaynak görsel (Action Room'un "scenario" modunda sürücü video yerine tek girdi). */
  imageUrl: string;
  /** Sahneyi anlatan senaryo/detay metni. */
  prompt: string;
};

export type GenerateSceneVideoResult = {
  videoUrl: string;
  requestId: string;
};

/**
 * Sürücü videosuz, yalnız görsel + metinden video (Action Room'un "scenario" modu).
 *
 * DOĞRULANMADI — `generateCharacterPerformance`'ın aksine (wan-motion gerçek testle
 * kanıtlandı) bu yol henüz gerçek bir üretimle denenmedi. Girdi alanları fal'ın Kling
 * image-to-video şemasına göre TAHMİN edildi; ilk gerçek çağrıda 422 dönerse şema
 * `config/clips.ts`'teki yorumla birlikte güncellenmeli (bkz. `generateCharacterMotion`
 * ve `generateCharacterPerformance`'daki aynı "modele göre gövde kur" gerekçesi).
 */
export async function generateSceneVideo(params: GenerateSceneVideoParams): Promise<GenerateSceneVideoResult> {
  const { result, requestId } = await submitAndPoll<{ video?: { url?: string } }>(
    params.modelId,
    { image_url: params.imageUrl, prompt: params.prompt },
    {
      timeoutMs: PERFORMANCE_POLL_TIMEOUT_MS,
      timeoutMessage: 'Senaryodan video üretimi zaman aşımına uğradı (20 dk). Daha kısa bir senaryo dene.',
      failMessage: 'Senaryodan video üretimi başarısız oldu.',
    },
  );

  if (!result.video?.url) {
    throw new FalError('fal.ai video döndürmedi.', `requestId=${requestId} ${JSON.stringify(result)}`);
  }

  return {
    videoUrl: result.video.url,
    requestId,
  };
}

export type GeneratePerformanceParams = {
  /** fal queue endpoint kimliği — bkz. `config/clips.ts` PERFORMANCE_MODELS. */
  modelId: string;
  /** Kanon kare — karakterin kimliği buradan geliyor. */
  imageUrl: string;
  /** Sürücü video — kullanıcının gerçek performansı (kafa/el hareketi, mimik). */
  videoUrl: string;
  /**
   * wan-motion'ın üretimi yönlendiren opsiyonel metin alanı (OmniHuman'daki "Yönlendirme"
   * ile aynı fikir) — gerçek kullanıcı testinde mimikler abartılı çıktı, bunu bir prompt'la
   * ("sakin, ölçülü mimikler") yumuşatmayı deniyoruz. fal ayrı bir "motion strength" parametresi
   * sunmuyor, bu şu an elimizdeki tek doz kontrolü. DreamActor bu alanı desteklemiyor, o modelde
   * sessizce yok sayılıyor.
   */
  prompt?: string;
  /** Sürücü video ile karakterin vücut oranı farklıysa hareketi uyarlıyor. Sadece wan-motion'da var, fal varsayılanı true. */
  adaptMotion?: boolean;
};

export type GeneratePerformanceResult = {
  /** wan-motion çıktısı SESSİZ — anlatım sesi için sürücü videonun kendi ses parçası kullanılmalı. */
  videoUrl: string;
  requestId: string;
};

/**
 * Ses-güdümlü avatar (OmniHuman/Kling) yerine performans aktarımı: ağız/mimik/jest
 * kullanıcının GERÇEK performansından geliyor, sesin tahmininden değil. Gerçek testte
 * (bkz. proje geçmişi) OmniHuman'ın "ağız abartılı" sorunu bu yolla kökten çözüldü.
 */
export async function generateCharacterPerformance(
  params: GeneratePerformanceParams,
): Promise<GeneratePerformanceResult> {
  // DreamActor'ın prompt/adapt_motion alanları YOK (bkz. şeması: sadece image_url, video_url,
  // trim_first_second) — bilinmeyen alan göndermek diğer modellerde 422'ye yol açtığı için
  // (bkz. generateCharacterMotion'daki aynı gerekçe) model bazlı gövde kuruluyor.
  const isDreamActor = params.modelId === 'fal-ai/bytedance/dreamactor/v2';
  const input = isDreamActor
    ? { image_url: params.imageUrl, video_url: params.videoUrl }
    : {
        image_url: params.imageUrl,
        video_url: params.videoUrl,
        ...(params.prompt?.trim() ? { prompt: params.prompt.trim() } : {}),
        ...(params.adaptMotion === false ? { adapt_motion: false } : {}),
      };

  const { result, requestId } = await submitAndPoll<{ video?: { url?: string } }>(params.modelId, input, {
    timeoutMs: PERFORMANCE_POLL_TIMEOUT_MS,
    timeoutMessage: 'Performans aktarımı zaman aşımına uğradı (20 dk). Daha kısa bir sürücü video dene.',
    failMessage: 'Performans aktarımı başarısız oldu.',
  });

  if (!result.video?.url) {
    throw new FalError('fal.ai video döndürmedi.', `requestId=${requestId} ${JSON.stringify(result)}`);
  }

  return {
    videoUrl: result.video.url,
    requestId,
  };
}
