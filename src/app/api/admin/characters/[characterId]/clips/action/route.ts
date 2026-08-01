import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { FalError, generateCharacterImage, generateCharacterPerformance, generateSceneVideo, publicImageAsDataUri } from '@/utils/fal';
import { CHARACTERS, ESTIMATED_COST_PER_IMAGE_USD, buildNegativePrompt, isCharacterId } from '@/config/characters';
import { isKnownCharacterId } from '@/utils/knownCharacter';
import { FULL_BODY_MOTION_MODELS, SCENE_VIDEO_MODELS, findFullBodyMotionModel, findSceneVideoModel } from '@/config/clips';
import { DEFAULT_MOTION_STYLE_ID, MOTION_STYLES, findMotionStyle, type MotionIdentityMode } from '@/config/motionStyles';
import { authorizeCharacterRequest } from '@/utils/creativeStudioScope';
import { assertSufficientCredits, deductForGeneration, InsufficientCreditsError } from '@/utils/creativeStudioCredits';

/** Senaryo modunda (metinden video) ve süre ölçülemediğinde sunucu girdi süresini
 * bilmiyor — model çıktısı tipik olarak birkaç saniye; ücretlendirmede muhafazakar
 * bir taban olarak kullanılıyor. */
const DEFAULT_BILLED_SECONDS_FALLBACK = 5;

export const maxDuration = 300;

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
 * ile bu görsele giydirir (Podcast'in yüz/mimik odaklı `PERFORMANCE_MODELS`'i DEĞİL,
 * boydan/gövde hareketine uygun ayrı `FULL_BODY_MOTION_MODELS` — bkz. `config/clips.ts`),
 * `mode==='scenario'` ise sürücü video olmadan yalnızca senaryo metninden `generateSceneVideo`
 * ile video üretir (ikisi de DOĞRULANMADI — bkz. ilgili config kayıtlarının yorumu).
 *
 * Çıktı ortak klip havuzuna `room: 'action'` ile yazılır — bu oda DB şemasında zaten
 * öngörülmüştü (bkz. `00050_character_clips.sql`), yalnızca üretici tarafı eksikti.
 */
export async function POST(req: Request, { params }: { params: Promise<{ characterId: string }> }) {
  const { characterId } = await params;
  const auth = await authorizeCharacterRequest(characterId);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await isKnownCharacterId(characterId))) {
    return NextResponse.json({ error: 'Bilinmeyen karakter.' }, { status: 400 });
  }

  let styledImageUrl: string | undefined;
  let drivingVideoUrl: string | undefined;

  try {
    const formData = await req.formData();

    const mode = formData.get('mode') === 'scenario' ? 'scenario' : 'reference';
    const identityModeRaw = formData.get('identityMode');
    const identityMode: MotionIdentityMode =
      identityModeRaw === 'generic' ? 'generic' : identityModeRaw === 'cast' ? 'cast' : 'twin';
    const style = findMotionStyle(formData.get('styleId')) || MOTION_STYLES.find((s) => s.id === DEFAULT_MOTION_STYLE_ID)!;
    const scenario = (formData.get('scenario') as string | null)?.trim().slice(0, 800) || '';
    const sourceShotUrl = (formData.get('sourceShotUrl') as string | null) || undefined;
    const personaDescription = (formData.get('personaDescription') as string | null)?.trim().slice(0, 500) || '';
    const castCharacterId = (formData.get('castCharacterId') as string | null) || undefined;

    if (!scenario) {
      return NextResponse.json({ error: 'Senaryo/detay metni gerekli.' }, { status: 400 });
    }
    if (identityMode === 'twin' && !sourceShotUrl) {
      return NextResponse.json({ error: 'Twin kimliği için galeriden bir kare seçilmedi.' }, { status: 400 });
    }
    if (identityMode === 'cast' && !castCharacterId) {
      return NextResponse.json({ error: 'Bir yardımcı oyuncu seçilmedi.' }, { status: 400 });
    }
    if (identityMode === 'generic' && !personaDescription) {
      return NextResponse.json({ error: 'Jenerik karakter için bir persona tarifi gerekli.' }, { status: 400 });
    }

    // Ücretlendirme için erken model/süre tahmini — asıl üretim aşağıda aynı seçimi tekrar yapıyor.
    const drivingSecondsField = formData.get('drivingSeconds');
    const reportedDrivingSeconds = typeof drivingSecondsField === 'string' ? Number(drivingSecondsField) : NaN;
    const billedSeconds = Number.isFinite(reportedDrivingSeconds) && reportedDrivingSeconds > 0
      ? reportedDrivingSeconds
      : DEFAULT_BILLED_SECONDS_FALLBACK;
    const videoCostUsd = mode === 'reference'
      ? (findFullBodyMotionModel(formData.get('motionModelId')) || FULL_BODY_MOTION_MODELS[0]).costPerSecondUsd * billedSeconds
      : (findSceneVideoModel(formData.get('sceneVideoModelId')) || SCENE_VIDEO_MODELS[0]).costPerSecondUsd * DEFAULT_BILLED_SECONDS_FALLBACK;
    const totalCostUsd = ESTIMATED_COST_PER_IMAGE_USD + videoCostUsd;

    if (auth.mode === 'business') {
      try {
        await assertSufficientCredits(auth.business.id, totalCostUsd);
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

    /* 1 — Stilize kaynak görsel. */
    // `characterId` artık statik CHARACTERS registry'sinde olmayan business-owned
    // Twin'leri de kapsayabiliyor (bkz. authorizeCharacterRequest) — `isCharacterId` tip
    // daraıtmasını kullanarak sadece statik karakterlerde registry'den okuyoruz.
    const character: { identityPrompt?: string } = isCharacterId(characterId) ? { ...CHARACTERS[characterId] } : {};
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

    // 'cast' — Yardımcı Oyuncular'dan (Saule/Beiwe/sanal karakter) biri: kimlik metni ve
    // kanonik avatarı `characterId` (Twin) değil, SEÇİLEN karakterden geliyor.
    let castIdentityPrompt: string | undefined;
    let castAvatarUrl: string | undefined;
    if (identityMode === 'cast' && castCharacterId) {
      if (!(await isKnownCharacterId(castCharacterId))) {
        return NextResponse.json({ error: 'Seçilen yardımcı oyuncu bulunamadı.' }, { status: 400 });
      }
      const staticCast = isCharacterId(castCharacterId) ? CHARACTERS[castCharacterId] : undefined;
      const { data: castProfile } = await supabaseAdmin
        .from('character_profiles')
        .select('identity_prompt, reference_image_url')
        .eq('id', castCharacterId)
        .maybeSingle();

      castIdentityPrompt = castProfile?.identity_prompt || staticCast?.identityPrompt;
      // Ham değer: Supabase satırı zaten tam https:// URL'i, statik config ise `public/`
      // altında bir dosya adı — `publicImageAsDataUri` ikisini de ayırt edip doğru
      // çözüyor (bkz. generate/route.ts'teki aynı kullanım).
      const castAvatarRef = castProfile?.reference_image_url || staticCast?.referenceFile;

      if (!castIdentityPrompt || !castAvatarRef) {
        return NextResponse.json(
          { error: 'Seçilen yardımcı oyuncunun kimliği ya da avatarı eksik.' },
          { status: 400 },
        );
      }
      castAvatarUrl = await publicImageAsDataUri(castAvatarRef);
    }

    const stylePrompt = [
      identityMode === 'twin' ? character.identityPrompt : identityMode === 'cast' ? castIdentityPrompt : personaDescription,
      style.prompt,
      buildNegativePrompt(),
    ]
      .filter(Boolean)
      .join('\n\n');

    const imageModel =
      identityMode === 'generic'
        ? GENERIC_IMAGE_MODEL_FALLBACK
        : process.env.CHARACTER_IMAGE_MODEL || 'fal-ai/nano-banana-pro/edit';

    const identityImageUrl = identityMode === 'twin' ? sourceShotUrl : identityMode === 'cast' ? castAvatarUrl : undefined;

    const imageResult = await generateCharacterImage({
      model: imageModel,
      prompt: stylePrompt,
      imageUrls: identityImageUrl ? [identityImageUrl] : [],
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

      const motionModel = findFullBodyMotionModel(formData.get('motionModelId')) || FULL_BODY_MOTION_MODELS[0];
      const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4';
      drivingVideoUrl = await uploadBufferToMedia(
        `characters/${characterId}/action/driving/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`,
        Buffer.from(await file.arrayBuffer()),
        file.type,
      );

      const performance = await generateCharacterPerformance({
        modelId: motionModel.id,
        imageUrl: styledImageUrl,
        videoUrl: drivingVideoUrl,
        prompt: motionModel.supportsPrompt ? scenario : undefined,
      });
      finalVideoUrl = await downloadToMedia(performance.videoUrl, characterId, 'mp4', 'video/mp4');
      usedModel = motionModel.id;
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
        business_id: auth.mode === 'business' ? auth.business.id : null,
        room: 'action',
        source: 'generated',
        model: usedModel,
        video_url: finalVideoUrl,
        audio_url: drivingVideoUrl ?? null,
        source_image_url: styledImageUrl,
        label: `${style.label} · ${identityMode === 'twin' ? 'twin' : identityMode === 'cast' ? 'yardımcı oyuncu' : 'jenerik'}`,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    if (auth.mode === 'business') {
      await deductForGeneration(auth.business.id, totalCostUsd);
    }

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
