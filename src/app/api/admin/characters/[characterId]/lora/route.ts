import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { createZip } from '@/utils/zip';
import { authorizeCharacterRequest } from '@/utils/creativeStudioScope';
import { assertSufficientCredits, deductForGeneration, InsufficientCreditsError } from '@/utils/creativeStudioCredits';
import { LORA_TRAINING_COST_USD } from '@/config/beiweLab';

const FAL_KEY = process.env.FAL_KEY;
const LORA_TRAINING_MODEL = 'fal-ai/flux-lora-fast-training';

interface TrainBody {
  /** Supabase'deki fotoğraf URL'leri — yüksek puanlılar önce gelsin */
  photoUrls: string[];
  /** Opsiyonel: trigger kelime override */
  triggerWord?: string;
  /** Eğitim adımı — varsayılan 1500 */
  steps?: number;
}

/**
 * POST /api/admin/characters/[characterId]/lora
 * LoRA eğitimini başlatır.
 * 1. Fotoğrafları indir
 * 2. Görselleri + caption .txt dosyalarını ZIP'e paketle
 * 3. ZIP'i Supabase `media` bucket'ına yükle, public URL'ini al
 * 4. fal queue'ya eğitim isteği gönder (async, 20-30 dk)
 * 5. request_id ve lora_status='queued' olarak character_profiles'a yaz
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ characterId: string }> },
) {
  const { characterId } = await params;
  const auth = await authorizeCharacterRequest(characterId);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!FAL_KEY) {
    return NextResponse.json({ error: 'FAL_KEY ayarlı değil.' }, { status: 500 });
  }

  const body = await req.json() as TrainBody;
  const { photoUrls, triggerWord, steps = 1500 } = body;

  if (!photoUrls || photoUrls.length < 5) {
    return NextResponse.json(
      { error: 'LoRA eğitimi için en az 5 fotoğraf gerekli.' },
      { status: 400 },
    );
  }

  if (auth.mode === 'business') {
    try {
      await assertSufficientCredits(auth.business.id, LORA_TRAINING_COST_USD);
    } catch (err) {
      if (err instanceof InsufficientCreditsError) {
        return NextResponse.json(
          { error: 'Yetersiz kredi.', requiredCredits: err.requiredCredits, balance: err.balance },
          { status: 402 },
        );
      }
      throw err;
    }
  }

  const trigger = (triggerWord ?? `${characterId}person`).replace(/[^a-z0-9]/gi, '');

  // 1 — Eğitim görsellerini indir
  console.log(`[lora] ${photoUrls.length} fotoğraf indiriliyor...`);

  const imageBuffers: Array<{ name: string; data: Buffer; caption: string }> = [];
  for (let i = 0; i < Math.min(photoUrls.length, 30); i++) {
    try {
      const res = await fetch(photoUrls[i], { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) {
        console.warn(`[lora] Fotoğraf indirilemedi (${res.status}): ${photoUrls[i]}`);
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      // Yüksek sıradaki fotoğraflar daha iyi — caption'da belirt
      const rank = i < 10 ? 'high-quality portrait' : 'portrait';
      imageBuffers.push({
        name: `photo_${i.toString().padStart(3, '0')}.jpg`,
        data: buf,
        caption: `photo of ${trigger}, ${rank}, natural lighting, face clearly visible`,
      });
    } catch (e) {
      console.warn(`[lora] Fotoğraf indirme hatası:`, e);
    }
  }

  if (imageBuffers.length < 5) {
    return NextResponse.json(
      { error: `Yalnızca ${imageBuffers.length} fotoğraf indirilebildi, en az 5 gerekli.` },
      { status: 400 },
    );
  }

  // 2 — Eğitim arşivini kur.
  // fal-ai/flux-lora-fast-training `images_data_url` alanında bir ZIP URL'i bekliyor:
  // her görselin yanında aynı adı taşıyan bir .txt caption dosyası olur, o dosya yoksa
  // model yalnız trigger_word ile eğitilir. ZIP'i `src/utils/zip.ts` kuruyor (yeni bir
  // npm bağımlılığı eklemeden — bkz. oradaki gerekçe).
  const zip = createZip(
    imageBuffers.flatMap((img) => [
      { name: img.name, data: img.data },
      { name: img.name.replace(/\.jpg$/, '.txt'), data: Buffer.from(img.caption, 'utf8') },
    ]),
  );

  // 3 — Arşivi Supabase'e yükle; fal'ın indirebilmesi için public URL gerekiyor.
  // Yol zaman damgalı: her eğitim kendi arşivini alır, böylece süren bir eğitimin
  // veri seti bir sonraki denemeyle (ya da CDN önbelleğiyle) karışmaz.
  const zipPath = `characters/${characterId}/lora-dataset/${Date.now()}.zip`;
  const { error: zipUploadError } = await supabaseAdmin.storage
    .from('media')
    .upload(zipPath, zip, {
      contentType: 'application/zip',
      cacheControl: '31536000',
      upsert: true,
    });

  if (zipUploadError) {
    console.error('[lora] ZIP yüklenemedi', zipUploadError.message);
    return NextResponse.json(
      { error: 'Eğitim arşivi yüklenemedi.' },
      { status: 500 },
    );
  }

  const { data: { publicUrl: zipUrl } } = supabaseAdmin.storage.from('media').getPublicUrl(zipPath);

  console.log(`[lora] ZIP hazır: ${imageBuffers.length} fotoğraf, ${(zip.length / 1024 / 1024).toFixed(1)} MB → ${zipPath}`);

  // 4 — fal queue'ya eğitim isteğini gönder (async, 20-30 dk)
  const submitRes = await fetch(
    `https://queue.fal.run/${LORA_TRAINING_MODEL}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        images_data_url: zipUrl,
        trigger_word: trigger,
        is_style: false,
        steps,
      }),
    },
  );

  if (!submitRes.ok) {
    const txt = await submitRes.text().catch(() => '');
    console.error('[lora] fal submit failed', submitRes.status, txt);
    return NextResponse.json(
      { error: `LoRA eğitimi başlatılamadı (${submitRes.status}).` },
      { status: 502 },
    );
  }

  const { request_id } = await submitRes.json() as { request_id: string };

  // 5 — Durumu DB'ye kaydet
  await supabaseAdmin
    .from('character_profiles')
    .upsert({
      id: characterId,
      lora_request_id: request_id,
      lora_status: 'queued',
      lora_trigger_word: trigger,
      lora_started_at: new Date().toISOString(),
    }, { onConflict: 'id' });

  console.log(`[lora] Eğitim başlatıldı. request_id=${request_id}, trigger=${trigger}, photos=${imageBuffers.length}`);

  // fal kuyruğu isteği kabul etti — eğitim gerçekten başladı, kredi burada düşülür.
  if (auth.mode === 'business') {
    await deductForGeneration(auth.business.id, LORA_TRAINING_COST_USD);
  }

  return NextResponse.json({
    requestId: request_id,
    triggerWord: trigger,
    photosUsed: imageBuffers.length,
    status: 'queued',
  });
}

/**
 * GET /api/admin/characters/[characterId]/lora
 * Eğitim durumunu sorgular. fal queue'dan güncel durum çeker.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ characterId: string }> },
) {
  const { characterId } = await params;
  if (!(await authorizeCharacterRequest(characterId))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabaseAdmin
    .from('character_profiles')
    .select('lora_request_id, lora_status, lora_url, lora_trigger_word, lora_started_at, lora_completed_at')
    .eq('id', characterId)
    .single();

  if (!profile?.lora_request_id) {
    return NextResponse.json({ status: 'none', lora: null });
  }

  if (profile.lora_status === 'ready' || profile.lora_status === 'failed') {
    return NextResponse.json({
      status: profile.lora_status,
      loraUrl: profile.lora_url,
      triggerWord: profile.lora_trigger_word,
      startedAt: profile.lora_started_at,
      completedAt: profile.lora_completed_at,
    });
  }

  // Eğitim hâlâ devam ediyorsa fal'dan güncel durumu çek
  if (!FAL_KEY) {
    return NextResponse.json({ status: profile.lora_status });
  }

  try {
    const statusRes = await fetch(
      `https://queue.fal.run/${LORA_TRAINING_MODEL}/requests/${profile.lora_request_id}/status`,
      { headers: { Authorization: `Key ${FAL_KEY}` } },
    );

    if (!statusRes.ok) {
      return NextResponse.json({ status: profile.lora_status });
    }

    const falStatus = await statusRes.json() as {
      status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
      logs?: Array<{ message: string }>;
    };

    if (falStatus.status === 'COMPLETED') {
      // Sonuçları çek
      const resultRes = await fetch(
        `https://queue.fal.run/${LORA_TRAINING_MODEL}/requests/${profile.lora_request_id}`,
        { headers: { Authorization: `Key ${FAL_KEY}` } },
      );
      if (resultRes.ok) {
        const result = await resultRes.json() as {
          diffusers_lora_file?: { url: string };
          config_file?: { url: string };
        };
        const loraUrl = result.diffusers_lora_file?.url;

        if (loraUrl) {
          await supabaseAdmin
            .from('character_profiles')
            .update({
              lora_status: 'ready',
              lora_url: loraUrl,
              lora_completed_at: new Date().toISOString(),
            })
            .eq('id', characterId);

          return NextResponse.json({
            status: 'ready',
            loraUrl,
            triggerWord: profile.lora_trigger_word,
          });
        }
      }
    }

    if (falStatus.status === 'FAILED') {
      await supabaseAdmin
        .from('character_profiles')
        .update({ lora_status: 'failed' })
        .eq('id', characterId);
      return NextResponse.json({ status: 'failed' });
    }

    const newStatus = falStatus.status === 'IN_PROGRESS' ? 'training' : 'queued';
    if (newStatus !== profile.lora_status) {
      await supabaseAdmin
        .from('character_profiles')
        .update({ lora_status: newStatus })
        .eq('id', characterId);
    }

    return NextResponse.json({
      status: newStatus,
      logs: falStatus.logs?.slice(-5).map((l) => l.message) ?? [],
    });
  } catch (e) {
    console.error('[lora] status check failed', e);
    return NextResponse.json({ status: profile.lora_status });
  }
}
