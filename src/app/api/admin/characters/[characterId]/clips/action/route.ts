import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { FalError, generateCharacterImage, generateCharacterPerformance, generateSceneVideo } from '@/utils/fal';
import { CHARACTERS, buildNegativePrompt, isCharacterId } from '@/config/characters';
import { PERFORMANCE_MODELS, SCENE_VIDEO_MODELS, findPerformanceModel, findSceneVideoModel } from '@/config/clips';
import { DEFAULT_MOTION_STYLE_ID, MOTION_STYLES, findMotionStyle, type MotionIdentityMode } from '@/config/motionStyles';

export const maxDuration = 300;

async function requireAdminApi(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get('admin_session')?.value === process.env.ADMIN_PASSWORD;
}

/** nano-banana-pro'nun "/edit" soneki referans görsel ister; jenerik modda referans yok. */
const GENERIC_IMAGE_MODEL_FALLBACK = 'fal-ai/nano-banana-pro';

async function uploadBufferToMedia(
  path: string,
  bytes: Buffer,
  contentType: string,
): Promise<string> {
  const { error } = await supabaseAdmin.storage.from('media').upload(path, bytes, {
    contentType,
    cacheControl: '31536000',
  });
  if (error) throw error;
  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from('media').getPublicUrl(path);
  return publicUrl;
}

async function downloadToMedia(url: string, characterId: string, ext: string, contentType: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Üretilen dosya indirilemedi.');
  const bytes = Buffer.from(await res.arrayBuffer());
  const objectPath = `characters/${characterId}/action/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  return uploadBufferToMedia(objectPath, bytes, contentType);
}

/**
 * Action Room — "Beiwe Motion" katmanının üretim hattı.
 *
 * İki aşama: (1) stilize kaynak görsel — Twin kimliğini (galeri karesi) ya da jenerik bir
 * personayı seçilen stille (anime/çizgi film/cinematic/fantastic) yeniden üretir; (2) hareket —
 * `mode==='reference'` ise yüklenen bir örnek/trend videonun hareketini `generateCharacterPerformance`
 * (wan-motion) ile bu görsele giydirir, `mode==='scenario'` ise sürücü video olmadan yalnızca
 * senaryo metninden `generateSceneVideo` ile video üretir (DOĞRULANMADI — bkz. o fonksiyonun yorumu).
 *
 * Çıktı ortak klip havuzuna `room: 'action'` ile yazılır — bu oda DB şemasında zaten
 * öngörülmüştü (bkz. `00050_character_clips.sql`), yalnızca üretici tarafı eksikti.
 */
export async function POST(req: Request, { params }: { params: Promise<{ characterId: string }> }) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { characterId } = await params;
  if (!isCharacterId(characterId)) {
    return NextResponse.json({ error: 'Bilinmeyen karakter.' }, { status: 400 });
  }

  let styledImageUrl: string | undefined;
  let drivingVideoUrl: string | undefined;

  try {
    const formData = await req.formData();

    const mode = formData.get('mode') === 'scenario' ? 'scenario' : 'reference';
    const identityMode: MotionIdentityMode = formData.get('identityMode') === 'generic' ? 'generic' : 'twin';
    const style = findMotionStyle(formData.get('styleId')) || MOTION_STYLES.find((s) => s.id === DEFAULT_MOTION_STYLE_ID)!;
    const scenario = (formData.get('scenario') as string | null)?.trim().slice(0, 800) || '';
    const sourceShotUrl = (formData.get('sourceShotUrl') as string | null) || undefined;
    const personaDescription = (formData.get('personaDescription') as string | null)?.trim().slice(0, 500) || '';

    if (!scenario) {
      return NextResponse.json({ error: 'Senaryo/detay metni gerekli.' }, { status: 400 });
    }
    if (identityMode === 'twin' && !sourceShotUrl) {
      return NextResponse.json({ error: 'Twin kimliği için galeriden bir kare seçilmedi.' }, { status: 400 });
    }
    if (identityMode === 'generic' && !personaDescription) {
      return NextResponse.json({ error: 'Jenerik karakter için bir persona tarifi gerekli.' }, { status: 400 });
    }

    /* 1 — Stilize kaynak görsel. */
    const character = { ...CHARACTERS[characterId] };
    if (identityMode === 'twin') {
      const { data: profile } = await supabaseAdmin
        .from('character_profiles')
        .select('identity_prompt')
        .eq('id', characterId)
        .maybeSingle();
      if (profile?.identity_prompt) character.identityPrompt = profile.identity_prompt;
      if (!character.identityPrompt) {
        return NextResponse.json(
          { error: 'Twin kimliği (identity_prompt) bulunamadı. Önce Beiwe Twin\'de yüz tanıtılmalı.' },
          { status: 400 },
        );
      }
    }

    const stylePrompt = [
      identityMode === 'twin' ? character.identityPrompt : personaDescription,
      style.prompt,
      buildNegativePrompt(),
    ]
      .filter(Boolean)
      .join('\n\n');

    const imageModel =
      identityMode === 'twin'
        ? process.env.CHARACTER_IMAGE_MODEL || 'fal-ai/nano-banana-pro/edit'
        : GENERIC_IMAGE_MODEL_FALLBACK;

    const imageResult = await generateCharacterImage({
      model: imageModel,
      prompt: stylePrompt,
      imageUrls: identityMode === 'twin' && sourceShotUrl ? [sourceShotUrl] : [],
      aspectRatio: '4:5',
      resolution: '1K',
      numImages: 1,
    });

    if (!imageResult.images[0]?.url) {
      return NextResponse.json({ error: 'Stilize görsel üretilemedi.' }, { status: 502 });
    }
    styledImageUrl = await downloadToMedia(imageResult.images[0].url, characterId, 'png', 'image/png');

    /* 2 — Hareket. */
    let finalVideoUrl: string;
    let usedModel: string;

    if (mode === 'reference') {
      const file = formData.get('drivingVideo');
      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'Örnek/trend video dosyası bulunamadı.' }, { status: 400 });
      }
      if (!file.type.startsWith('video/')) {
        return NextResponse.json({ error: 'Bu dosya bir video değil.' }, { status: 400 });
      }
      const MAX_BYTES = 150 * 1024 * 1024;
      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: 'Örnek video 150MB sınırını aşıyor.' }, { status: 400 });
      }

      const performanceModel = findPerformanceModel(formData.get('performanceModelId')) || PERFORMANCE_MODELS[0];
      const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4';
      drivingVideoUrl = await uploadBufferToMedia(
        `characters/${characterId}/action/driving/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`,
        Buffer.from(await file.arrayBuffer()),
        file.type,
      );

      const performance = await generateCharacterPerformance({
        modelId: performanceModel.id,
        imageUrl: styledImageUrl,
        videoUrl: drivingVideoUrl,
        prompt: scenario,
      });
      finalVideoUrl = await downloadToMedia(performance.videoUrl, characterId, 'mp4', 'video/mp4');
      usedModel = performanceModel.id;
    } else {
      const sceneModel = findSceneVideoModel(formData.get('sceneVideoModelId')) || SCENE_VIDEO_MODELS[0];
      const scene = await generateSceneVideo({
        modelId: sceneModel.id,
        imageUrl: styledImageUrl,
        prompt: scenario,
      });
      finalVideoUrl = await downloadToMedia(scene.videoUrl, characterId, 'mp4', 'video/mp4');
      usedModel = sceneModel.id;
    }

    /* 3 — Ortak klip havuzuna kaydet. */
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('character_clips')
      .insert({
        character_id: characterId,
        room: 'action',
        source: 'generated',
        model: usedModel,
        video_url: finalVideoUrl,
        audio_url: drivingVideoUrl ?? null,
        source_image_url: styledImageUrl,
        label: `${style.label} · ${identityMode === 'twin' ? 'twin' : 'jenerik'}`,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ clip: inserted });
  } catch (err) {
    const context = `character=${characterId} styledImageUrl=${styledImageUrl} drivingVideoUrl=${drivingVideoUrl}`;
    if (err instanceof FalError) {
      console.error('[clips/action] fal failed', err.message, context);
      return NextResponse.json({ error: err.userMessage }, { status: 502 });
    }
    console.error('[clips/action] failed', err, context);
    return NextResponse.json({ error: 'Action Room üretimi sırasında bir hata oluştu.' }, { status: 500 });
  }
}
