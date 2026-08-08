import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { FalError, enhanceAudio } from '@/utils/fal';
import { recordUsageEvent } from '@/agents/shared/usage';
import { AUDIO_ENHANCE_COST_USD } from '@/config/beiweLab';
import { authorizeCharacterRequest } from '@/utils/creativeStudioScope';
import { assertSufficientCredits, deductForGeneration, InsufficientCreditsError } from '@/utils/creativeStudioCredits';

export const maxDuration = 300;

/**
 * Post-prodüksiyonda "sesi iyileştir" — klibin `audio_url`'ini (yoksa `video_url`'ini —
 * fal-ai/elevenlabs/audio-isolation ikisini de kabul ediyor, video verilirse ses parçasını
 * kendi çıkarıyor; ortak klip havuzundaki harici yüklemelerin ayrı bir `audio_url`'i yok)
 * fal-ai/elevenlabs/audio-isolation'dan geçirip temizlenmiş sesi döner. `StudioEditor`
 * bunu `timeline.enhancedAudioUrl`'e yazıp orijinal video sesinin YERİNE bunu çalar/kaydeder
 * (bkz. studioRenderer.ts'teki gain yönlendirmesi).
 */
export async function POST(req: Request, { params }: { params: Promise<{ characterId: string }> }) {
  const { characterId } = await params;
  const auth = await authorizeCharacterRequest(characterId);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { audioUrl?: string; videoUrl?: string } | null;
  const audioUrl = typeof body?.audioUrl === 'string' && body.audioUrl.startsWith('http') ? body.audioUrl : undefined;
  const videoUrl = typeof body?.videoUrl === 'string' && body.videoUrl.startsWith('http') ? body.videoUrl : undefined;
  if (!audioUrl && !videoUrl) {
    return NextResponse.json({ error: 'Ses ya da video URL\'i geçersiz.' }, { status: 400 });
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
    const { audioUrl: enhancedAudioUrl } = audioUrl
      ? await enhanceAudio({ audioUrl })
      : await enhanceAudio({ videoUrl: videoUrl! });
    if (auth.mode === 'business') {
      const { creditsCharged } = await deductForGeneration(auth.business.id, AUDIO_ENHANCE_COST_USD);
      await recordUsageEvent(supabaseAdmin, {
        businessId: auth.business.id,
        agent: 'beiwe',
        channel: 'web',
        model: audioUrl ? 'fal-ai/deepfilternet3' : 'fal-ai/elevenlabs/audio-isolation',
        usage: {},
        creditsCharged,
      });
    }
    return NextResponse.json({ audioUrl: enhancedAudioUrl });
  } catch (err) {
    const context = `audioUrl=${audioUrl} videoUrl=${videoUrl}`;
    if (err instanceof FalError) {
      console.error('[studio/enhance-audio] fal failed', err.message, context);
      return NextResponse.json({ error: err.userMessage }, { status: 502 });
    }
    console.error('[studio/enhance-audio] failed', err, context);
    return NextResponse.json({ error: 'Ses iyileştirilirken bir hata oluştu.' }, { status: 500 });
  }
}
