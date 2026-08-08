import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { FalError, transcribeAudioWords } from '@/utils/fal';
import { recordUsageEvent } from '@/agents/shared/usage';
import { STUDIO_TRANSCRIBE_COST_USD } from '@/config/beiweLab';
import { authorizeCharacterRequest } from '@/utils/creativeStudioScope';
import { assertSufficientCredits, deductForGeneration, InsufficientCreditsError } from '@/utils/creativeStudioCredits';

export const maxDuration = 300;

/**
 * Karaoke altyazı için kelime bazlı transkripsiyon — istemci (StudioEditor) motion'ın
 * kendi `audio_url`'ini gönderir, biz fal-ai/whisper'ı `chunk_level: 'word'` ile çağırıp
 * ham kelime listesini döneriz. Zaman çizelgesine (trim'e göre) çevirme işini istemci
 * yapıyor — `parseStudioTimeline` zaten sunucu tarafında son doğrulamayı yapacak.
 */
export async function POST(req: Request, { params }: { params: Promise<{ characterId: string }> }) {
  const { characterId } = await params;
  const auth = await authorizeCharacterRequest(characterId);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { audioUrl?: string } | null;
  const audioUrl = body?.audioUrl;
  if (typeof audioUrl !== 'string' || !audioUrl.startsWith('http')) {
    return NextResponse.json({ error: 'Ses URL\'i geçersiz.' }, { status: 400 });
  }

  if (auth.mode === 'business') {
    try {
      await assertSufficientCredits(auth.business.id, STUDIO_TRANSCRIBE_COST_USD);
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
    const { words } = await transcribeAudioWords({ audioUrl });
    if (auth.mode === 'business') {
      const { creditsCharged } = await deductForGeneration(auth.business.id, STUDIO_TRANSCRIBE_COST_USD);
      await recordUsageEvent(supabaseAdmin, {
        businessId: auth.business.id,
        agent: 'beiwe',
        channel: 'web',
        model: 'fal-ai/whisper',
        usage: {},
        creditsCharged,
      });
    }
    return NextResponse.json({ words });
  } catch (err) {
    if (err instanceof FalError) {
      console.error('[studio/transcribe] fal failed', err.message, `audioUrl=${audioUrl}`);
      return NextResponse.json({ error: err.userMessage }, { status: 502 });
    }
    console.error('[studio/transcribe] failed', err, `audioUrl=${audioUrl}`);
    return NextResponse.json({ error: 'Altyazı çıkarılırken bir hata oluştu.' }, { status: 500 });
  }
}
