import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { FalError, generateCharacterMotion } from '@/utils/fal';
import { isCharacterId } from '@/config/characters';
import { findMotionModel, motionMaxSeconds, motionResolutions } from '@/config/motionModels';

export const maxDuration = 300;

export async function POST(req: Request, { params }: { params: Promise<{ characterId: string }> }) {
  const cookieStore = await cookies();
  if (cookieStore.get('admin_session')?.value !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { characterId } = await params;
  if (!isCharacterId(characterId)) {
    return NextResponse.json({ error: 'Bilinmeyen karakter.' }, { status: 400 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('audio') as File;
    const sourceImageUrl = formData.get('sourceImageUrl') as string;

    if (!file || !sourceImageUrl) {
      return NextResponse.json({ error: 'Ses dosyası ve kaynak görsel zorunludur.' }, { status: 400 });
    }

    // MP4 videolarının da ses (audio_url) olarak kabul edilmesini destekliyoruz
    if (!file.type.startsWith('audio/') && file.type !== 'video/mp4') {
      return NextResponse.json({ error: 'Lütfen geçerli bir ses dosyası veya MP4 yükleyin.' }, { status: 400 });
    }

    const model = findMotionModel(formData.get('model'));
    if (!model) {
      return NextResponse.json({ error: 'Bilinmeyen model.' }, { status: 400 });
    }

    // Boyut ve süre sınırları modele göre değişiyor: Kling ses dosyasını 5MB ve 2-60 sn
    // ile sınırlıyor, OmniHuman çok daha cömert ama 1080p'de 30 sn'de kesiyor.
    if (file.size > model.maxAudioMb * 1024 * 1024) {
      return NextResponse.json(
        { error: `${model.label} için ses dosyası en fazla ${model.maxAudioMb}MB olabilir.` },
        { status: 400 },
      );
    }

    // Model `resolution` kabul etmiyorsa gövdeye eklenmiyor, ama süre sınırı yine
    // çözünürlük anahtarından okunduğu için geçerli bir değere indiriyoruz.
    const requested = formData.get('resolution');
    const allowed = motionResolutions(model);
    const resolution = allowed.find((r) => r === requested) ?? allowed[0];

    const prompt = (formData.get('prompt') as string | null)?.slice(0, 600) || undefined;
    const turboMode = formData.get('turboMode') === 'true';

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

    // 1 - Yüklenen ses dosyasını Supabase'e kaydet
    const audioBuffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop() || 'mp3';
    const audioPath = `characters/${characterId}/audios/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    
    const { error: uploadError } = await supabaseAdmin.storage
      .from('media')
      .upload(audioPath, audioBuffer, { contentType: file.type, cacheControl: '31536000' });
      
    if (uploadError) throw uploadError;

    const { data: { publicUrl: audioUrl } } = supabaseAdmin.storage.from('media').getPublicUrl(audioPath);

    // 2 - fal.ai konuşan-avatar çağrısı
    const result = await generateCharacterMotion({
      model,
      imageUrl: sourceImageUrl,
      audioUrl,
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
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ motion: inserted });

  } catch (err) {
    if (err instanceof FalError) {
      console.error('[characters/motion] fal failed', err.message);
      return NextResponse.json({ error: err.userMessage }, { status: 502 });
    }
    console.error('[characters/motion] failed', err);
    return NextResponse.json({ error: 'Video üretilirken bir hata oluştu.' }, { status: 500 });
  }
}
