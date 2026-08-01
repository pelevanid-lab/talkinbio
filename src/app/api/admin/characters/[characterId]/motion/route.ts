import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { FalError, generateCharacterMotion, enhanceAudio } from '@/utils/fal';
import { isKnownCharacterId } from '@/utils/knownCharacter';
import {
  findMotionModel,
  motionAudioMime,
  motionMaxSeconds,
  motionResolutions,
  MOTION_AUDIO_EXTENSIONS,
} from '@/config/motionModels';
import { AUDIO_ENHANCE_COST_USD } from '@/config/beiweLab';
import { authorizeCharacterRequest } from '@/utils/creativeStudioScope';
import { assertSufficientCredits, deductForGeneration, InsufficientCreditsError } from '@/utils/creativeStudioCredits';

export const maxDuration = 300;

export async function POST(req: Request, { params }: { params: Promise<{ characterId: string }> }) {
  const { characterId } = await params;
  const auth = await authorizeCharacterRequest(characterId);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await isKnownCharacterId(characterId))) {
    return NextResponse.json({ error: 'Bilinmeyen karakter.' }, { status: 400 });
  }

  // catch bloğunda hata bağlamını loglayabilmek için try dışında tanımlanıyor —
  // hatanın hangi aşamada oluştuğuna göre biri veya ikisi de tanımsız kalabilir.
  let sourceImageUrl: string | undefined;
  let audioUrl: string | undefined;

  try {
    const formData = await req.formData();
    const file = formData.get('audio') as File | null;
    sourceImageUrl = formData.get('sourceImageUrl') as string | null || undefined;
    let audioUrlStr = formData.get('audioUrl') as string | null;
    const shouldEnhance = formData.get('enhanceAudio') === 'true';

    if (!sourceImageUrl) {
      return NextResponse.json({ error: 'Kaynak görsel zorunludur.' }, { status: 400 });
    }

    if (!file && !audioUrlStr) {
      return NextResponse.json({ error: 'Ses dosyası veya ses linki zorunludur.' }, { status: 400 });
    }

    const model = findMotionModel(formData.get('model') as string);
    if (!model) {
      return NextResponse.json({ error: 'Model bulunamadı.' }, { status: 400 });
    }

    if (file) {
      // Formatı UZANTIDAN belirliyoruz, `file.type`'tan değil: tarayıcı m4a için
      // `audio/x-m4a` gibi standart olmayan bir değer verebiliyor ve dosya Supabase'ten
      // o başlıkla servis edilince fal "Audio format is invalid" ile reddediyor.
      const contentType = motionAudioMime(file.name);
      if (!contentType) {
        return NextResponse.json(
          {
            error: `Bu format desteklenmiyor. Desteklenenler: ${MOTION_AUDIO_EXTENSIONS.map((e) =>
              e.toUpperCase(),
            ).join(', ')}.`,
          },
          { status: 400 },
        );
      }

      // Boyut ve süre sınırları modele göre değişiyor: Kling ses dosyasını 5MB ve 2-60 sn
      // ile sınırlıyor, OmniHuman çok daha cömert ama 1080p'de 30 sn'de kesiyor.
      if (file.size > model.maxAudioMb * 1024 * 1024) {
        return NextResponse.json(
          { error: `${model.label} için ses dosyası en fazla ${model.maxAudioMb}MB olabilir.` },
          { status: 400 },
        );
      }
    }

    // Model `resolution` kabul etmiyorsa gövdeye eklenmiyor, ama süre sınırı yine
    // çözünürlük anahtarından okunduğu için geçerli bir değere indiriyoruz.
    const requested = formData.get('resolution');
    const allowed = motionResolutions(model);
    const resolution = allowed.find((r) => r === requested) ?? allowed[0];

    const prompt = (formData.get('prompt') as string | null)?.slice(0, 600) || undefined;
    const turboMode = formData.get('turboMode') === 'true';
    // Opsiyonel — yalnızca Beiwe Podcast gönderiyor (galeri etiketlemesi için).
    // Eski Karakter Odası (Motion) bunu hiç göndermiyor, satırları null kalır.
    const inputModeRaw = formData.get('inputMode');
    const inputMode = inputModeRaw === 'text' || inputModeRaw === 'voice' ? inputModeRaw : null;

    // Ses süresini tarayıcı ölçüyor ve buraya yazıyor; sunucuda decode etmek için
    // ek bağımlılık (ffprobe) gerekiyor ve kod dondurma döneminde onu eklemiyoruz.
    // Değer gelmezse engellemiyoruz — sınır dışı sesi fal 422 ile reddediyor.
    // `Number(null)` 0 döndüğü için alanın varlığını ayrıca kontrol ediyoruz — yoksa
    // süreyi ölçemeyen tarayıcıda istek "0 saniye" sayılıp alt sınırdan reddedilirdi.
    const secondsField = formData.get('audioSeconds');
    const maxSeconds = motionMaxSeconds(model, resolution);
    const reportedSeconds = typeof secondsField === 'string' ? Number(secondsField) : NaN;
    if (Number.isFinite(reportedSeconds) && reportedSeconds > 0) {
      if (reportedSeconds > maxSeconds) {
        return NextResponse.json(
          {
            error: `Ses ${Math.round(reportedSeconds)} saniye — ${model.label} ${resolution} için üst sınır ${maxSeconds} saniye.`,
          },
          { status: 400 },
        );
      }
      if (reportedSeconds < model.minAudioSeconds) {
        return NextResponse.json(
          { error: `${model.label} en az ${model.minAudioSeconds} saniyelik ses istiyor.` },
          { status: 400 },
        );
      }
    }

    // Süre ölçülemediyse (tarayıcı raporlamadıysa) modelin asgari süresini taban alıyoruz —
    // eksik ücretlendirmektense muhafazakar davranmak daha güvenli.
    const billedSeconds = Number.isFinite(reportedSeconds) && reportedSeconds > 0 ? reportedSeconds : model.minAudioSeconds;
    // shouldEnhance açıksa ayrı bir fal çağrısı (deepfilternet3) daha yapılıyor — maliyete ekle.
    const motionCostUsd = model.costPerSecondUsd * billedSeconds + (shouldEnhance ? AUDIO_ENHANCE_COST_USD : 0);
    if (auth.mode === 'business') {
      try {
        await assertSufficientCredits(auth.business.id, motionCostUsd);
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

    // 1 - Ses dosyasını Supabase'e kaydet (eğer dışarıdan file geldiyse)
    if (file) {
      const audioBuffer = Buffer.from(await file.arrayBuffer());
      const ext = file.name.split('.').pop()!.toLowerCase();
      const audioPath = `characters/${characterId}/audios/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from('media')
        .upload(audioPath, audioBuffer, { contentType: motionAudioMime(file.name) || 'audio/mpeg', cacheControl: '31536000' });
        
      if (uploadError) throw uploadError;

      ({ data: { publicUrl: audioUrl } } = supabaseAdmin.storage.from('media').getPublicUrl(audioPath));
      audioUrlStr = audioUrl;
    }

    // 1.5 - Ses iyileştirme isteniyorsa (deepfilternet3)
    let finalAudioUrlForMotion = audioUrlStr!;
    if (shouldEnhance) {
      const enhanced = await enhanceAudio({ audioUrl: finalAudioUrlForMotion });
      finalAudioUrlForMotion = enhanced.audioUrl;
    }
    
    // finalAudioUrlForMotion değişkenini global audioUrl olarak ayarlayalım (loglarda gözükmesi için)
    audioUrl = finalAudioUrlForMotion;

    // 2 - fal.ai konuşan-avatar çağrısı
    const result = await generateCharacterMotion({
      model,
      imageUrl: sourceImageUrl,
      audioUrl: finalAudioUrlForMotion,
      resolution,
      prompt,
      turboMode,
    });

    // 3 - Üretilen MP4 videoyu alıp kendi storage'ımıza koymak daha iyidir ama 
    // şimdilik süreci hızlandırmak için doğrudan fal.ai'ın public URL'ini kullanacağız
    // (veya kendi bucket'ımıza da çekebiliriz, resimlerde yaptığımız gibi).
    // İleride link kırılmasın diye biz kendi depomuza alıyoruz:
    const videoRes = await fetch(result.videoUrl);
    if (!videoRes.ok) throw new Error('Üretilen video indirilemedi.');
    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
    const videoPath = `characters/${characterId}/motions/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp4`;
    
    const { error: videoUploadError } = await supabaseAdmin.storage
      .from('media')
      .upload(videoPath, videoBuffer, { contentType: 'video/mp4', cacheControl: '31536000' });
      
    if (videoUploadError) throw videoUploadError;

    const { data: { publicUrl: finalVideoUrl } } = supabaseAdmin.storage.from('media').getPublicUrl(videoPath);

    // 4 - DB'ye kaydet
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('character_motions')
      .insert({
        character_id: characterId,
        source_image_url: sourceImageUrl,
        audio_url: audioUrl,
        video_url: finalVideoUrl,
        model: model.id,
        input_mode: inputMode,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    if (auth.mode === 'business') {
      await deductForGeneration(auth.business.id, motionCostUsd);
    }

    return NextResponse.json({ motion: inserted });

  } catch (err) {
    // Zaman aşımında fal'ın işi arka planda bitmiş olabilir (para zaten harcandı).
    // Kurtarma için gereken her şeyi tek satırda logluyoruz: request_id'yi FalError
    // zaten mesajına gömüyor, buraya da audio/görsel URL'lerini ekliyoruz — yoksa
    // hangi ses/kareyle üretildiği elle (storage zaman damgasına bakarak) bulunmak
    // zorunda kalıyor.
    const context = `character=${characterId} sourceImageUrl=${sourceImageUrl} audioUrl=${audioUrl}`;
    if (err instanceof FalError) {
      console.error('[characters/motion] fal failed', err.message, context);
      return NextResponse.json({ error: err.userMessage }, { status: 502 });
    }
    console.error('[characters/motion] failed', err, context);
    return NextResponse.json({ error: 'Video üretilirken bir hata oluştu.' }, { status: 500 });
  }
}
