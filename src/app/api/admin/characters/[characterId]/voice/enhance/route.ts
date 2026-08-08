import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { FalError, enhanceAudio } from '@/utils/fal';
import { recordUsageEvent } from '@/agents/shared/usage';
import { isKnownCharacterId } from '@/utils/knownCharacter';
import { motionAudioMime, MOTION_AUDIO_EXTENSIONS } from '@/config/motionModels';
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

  if (auth.mode === 'business') {
    try {
      await assertSufficientCredits(auth.business.id, AUDIO_ENHANCE_COST_USD);
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

  try {
    const formData = await req.formData();
    const file = formData.get('audio') as File;

    if (!file) {
      return NextResponse.json({ error: 'Ses dosyası zorunludur.' }, { status: 400 });
    }

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

    // 1 - Yüklenen ses dosyasını Supabase'e kaydet
    const audioBuffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop()!.toLowerCase();
    const audioPath = `characters/${characterId}/audios/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('media')
      .upload(audioPath, audioBuffer, { contentType, cacheControl: '31536000' });
      
    if (uploadError) throw uploadError;

    const { data: { publicUrl: audioUrl } } = supabaseAdmin.storage.from('media').getPublicUrl(audioPath);

    // 2 - fal.ai ile sesi temizle (deepfilternet3)
    const enhanced = await enhanceAudio({ audioUrl });

    if (auth.mode === 'business') {
      const { creditsCharged } = await deductForGeneration(auth.business.id, AUDIO_ENHANCE_COST_USD);
      await recordUsageEvent(supabaseAdmin, {
        businessId: auth.business.id,
        agent: 'beiwe',
        channel: 'web',
        model: 'fal-ai/deepfilternet3',
        usage: {},
        creditsCharged,
      });
    }

    return NextResponse.json({ audioUrl: enhanced.audioUrl });

  } catch (err) {
    if (err instanceof FalError) {
      console.error('[characters/voice/enhance] fal failed', err.message);
      return NextResponse.json({ error: err.userMessage }, { status: 502 });
    }
    console.error('[characters/voice/enhance] failed', err);
    return NextResponse.json({ error: 'Ses temizlenirken bir hata oluştu.' }, { status: 500 });
  }
}
