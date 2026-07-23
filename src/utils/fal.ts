// Faz S.4 — fal.ai istemcisi (Karakter Odası görsel üretimi).
//
// Bilerek `@fal-ai/client` paketi kurulmadı: kod dondurma döneminde (Faz T) yeni bir
// runtime bağımlılığı eklememek için queue REST API'si düz `fetch` ile konuşuluyor.
// Sözleşme: https://fal.ai/docs/model-endpoints/queue

import { readFile } from 'node:fs/promises';
import path from 'node:path';

const QUEUE_BASE = 'https://queue.fal.run';

/** Poll aralığı ve üst sınır — route'un maxDuration=300 bütçesinin altında kalır. */
const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 240_000;

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
      throw new FalError('fal.ai isteği doğrulayamadı — prompt veya referans görseller geçersiz.', body);
    }
    if (res.status === 429) {
      throw new FalError('fal.ai hız sınırına takıldı, biraz bekleyip tekrar dene.', body);
    }
    throw new FalError(`fal.ai isteği başarısız oldu (HTTP ${res.status}).`, body);
  }

  return res;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Queue'ya iş bırakır, bitene kadar durum yoklar, sonucu döner.
 * Senkron `fal.run` yerine queue kullanılıyor — fal dokümantasyonu üretim için bunu öneriyor
 * (otomatik yeniden deneme ve durum görünürlüğü).
 */
export async function generateCharacterImage(
  params: GenerateCharacterImageParams,
): Promise<GenerateCharacterImageResult> {
  const { model, prompt, imageUrls, aspectRatio, resolution, numImages, seed } = params;

  if (imageUrls.length === 0) {
    throw new FalError('En az bir referans görsel gerekli.');
  }

  const submitRes = await falFetch(`${QUEUE_BASE}/${model}`, {
    method: 'POST',
    body: JSON.stringify({
      prompt,
      image_urls: imageUrls,
      num_images: numImages,
      aspect_ratio: aspectRatio,
      resolution,
      output_format: 'png',
      ...(typeof seed === 'number' ? { seed } : {}),
    }),
  });

  const submitted = (await submitRes.json()) as {
    request_id?: string;
    status_url?: string;
    response_url?: string;
  };
  const requestId = submitted.request_id;
  if (!requestId) {
    throw new FalError('fal.ai istek kimliği döndürmedi.');
  }

  // fal'ın submit cevabındaki status_url/response_url'i kullanıyoruz, kendimiz
  // inşa etmiyoruz: fal bu URL'lerde model kimliğini action eki (ör. "/edit")
  // OLMADAN döndürüyor ("fal-ai/nano-banana-pro", "fal-ai/nano-banana-pro/edit"
  // değil) — bunu `${model}/requests/...` ile kendimiz kurunca 405 alıyorduk.
  const statusUrl = submitted.status_url || `${QUEUE_BASE}/${model}/requests/${requestId}/status`;
  const resultUrl = submitted.response_url || `${QUEUE_BASE}/${model}/requests/${requestId}`;

  const startedAt = Date.now();
  for (;;) {
    if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
      throw new FalError('fal.ai üretimi zaman aşımına uğradı (4 dk). Daha basit bir sahneyle tekrar dene.');
    }

    await sleep(POLL_INTERVAL_MS);

    const statusRes = await falFetch(statusUrl);
    const status = (await statusRes.json()) as { status?: string };

    if (status.status === 'COMPLETED') break;
    if (status.status && !['IN_QUEUE', 'IN_PROGRESS'].includes(status.status)) {
      throw new FalError('fal.ai üretimi başarısız oldu.', JSON.stringify(status));
    }
  }

  const resultRes = await falFetch(resultUrl);
  const result = (await resultRes.json()) as {
    images?: FalImage[];
    seed?: number;
    description?: string;
  };

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
