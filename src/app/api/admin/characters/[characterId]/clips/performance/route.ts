import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { FalError, generateCharacterPerformance } from '@/utils/fal';
import { isKnownCharacterId } from '@/utils/knownCharacter';
import { findPerformanceModel, PERFORMANCE_MODELS } from '@/config/clips';

export const maxDuration = 300;

async function requireAdminApi(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get('admin_session')?.value === process.env.ADMIN_PASSWORD;
}

/**
 * Podcast Room — performans aktarımı. Ses-güdümlü avatar (OmniHuman/Kling) YERİNE:
 * kanon kare + kullanıcının kendi sürücü videosu → seçilen model (bkz. `config/clips.ts`
 * PERFORMANCE_MODELS). Çıktı sessiz olduğu için sürücü videonun kendisi (kendi sesiyle)
 * klibin `audio_url`'i olarak saklanıyor — zamanlaması zaten birebir örtüşüyor (aynı sürücü video).
 */
export async function POST(req: Request, { params }: { params: Promise<{ characterId: string }> }) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { characterId } = await params;
  if (!(await isKnownCharacterId(characterId))) {
    return NextResponse.json({ error: 'Bilinmeyen karakter.' }, { status: 400 });
  }

  let drivingVideoUrl: string | undefined;
  let sourceImageUrl: string | undefined;

  try {
    const formData = await req.formData();
    const file = formData.get('drivingVideo');
    sourceImageUrl = (formData.get('sourceImageUrl') as string | null) || undefined;
    const prompt = (formData.get('prompt') as string | null)?.slice(0, 600) || undefined;
    const model = findPerformanceModel(formData.get('modelId')) || PERFORMANCE_MODELS[0];

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Sürücü video dosyası bulunamadı.' }, { status: 400 });
    }
    if (!file.type.startsWith('video/')) {
      return NextResponse.json({ error: 'Bu dosya bir video değil.' }, { status: 400 });
    }
    if (!sourceImageUrl) {
      return NextResponse.json({ error: 'Kanon görsel seçilmedi.' }, { status: 400 });
    }

    const MAX_BYTES = 150 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Sürücü video 150MB sınırını aşıyor.' }, { status: 400 });
    }

    // 1 - Sürücü videoyu Supabase'e yükle (fal buradan erişecek + klibin anlatım sesi olarak kullanılacak)
    const driveBuffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4';
    const drivePath = `characters/${characterId}/driving/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('media')
      .upload(drivePath, driveBuffer, { contentType: file.type, cacheControl: '31536000' });
    if (uploadError) throw uploadError;

    const { data: { publicUrl: uploadedDrivingUrl } } = supabaseAdmin.storage.from('media').getPublicUrl(drivePath);
    drivingVideoUrl = uploadedDrivingUrl;

    // 2 - fal.ai performans aktarımı
    const result = await generateCharacterPerformance({
      modelId: model.id,
      imageUrl: sourceImageUrl,
      videoUrl: drivingVideoUrl,
      prompt,
    });

    // 3 - Üretilen videoyu indirip kendi storage'ımıza koy (motion/route.ts'teki aynı desen)
    const videoRes = await fetch(result.videoUrl);
    if (!videoRes.ok) throw new Error('Üretilen video indirilemedi.');
    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
    const videoPath = `characters/${characterId}/clips/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp4`;

    const { error: videoUploadError } = await supabaseAdmin.storage
      .from('media')
      .upload(videoPath, videoBuffer, { contentType: 'video/mp4', cacheControl: '31536000' });
    if (videoUploadError) throw videoUploadError;

    const { data: { publicUrl: finalVideoUrl } } = supabaseAdmin.storage.from('media').getPublicUrl(videoPath);

    // 4 - Ortak klip havuzuna kaydet
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('character_clips')
      .insert({
        character_id: characterId,
        room: 'podcast',
        source: 'generated',
        model: model.id,
        video_url: finalVideoUrl,
        audio_url: drivingVideoUrl,
        source_image_url: sourceImageUrl,
        label: null,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ clip: inserted });
  } catch (err) {
    const context = `character=${characterId} sourceImageUrl=${sourceImageUrl} drivingVideoUrl=${drivingVideoUrl}`;
    if (err instanceof FalError) {
      console.error('[clips/performance] fal failed', err.message, context);
      return NextResponse.json({ error: err.userMessage }, { status: 502 });
    }
    console.error('[clips/performance] failed', err, context);
    return NextResponse.json({ error: 'Performans aktarımı sırasında bir hata oluştu.' }, { status: 500 });
  }
}
