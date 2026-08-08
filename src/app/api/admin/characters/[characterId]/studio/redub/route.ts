import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { FalError, dubVideo } from '@/utils/fal';
import { recordUsageEvent } from '@/agents/shared/usage';
import { STUDIO_DUB_COST_USD_PER_MINUTE } from '@/config/beiweLab';
import { OVERLAY_LOCALES, type OverlayLocale } from '@/config/characters';
import type { StudioDub } from '@/config/studio';
import { authorizeCharacterRequest } from '@/utils/creativeStudioScope';
import { assertSufficientCredits, deductForGeneration, InsufficientCreditsError } from '@/utils/creativeStudioCredits';

export const maxDuration = 300;

function isOverlayLocale(v: unknown): v is OverlayLocale {
  return typeof v === 'string' && (OVERLAY_LOCALES as string[]).includes(v);
}

type Body = { videoUrl?: string; targetLang?: string; sourceLang?: string; durationSeconds?: number };

/**
 * Düzenle → Redub. `fal-ai/elevenlabs/dubbing`'i sarar (bkz. `dubVideo`, fal.ts) — ayrı bir
 * ses klonu adımına bağımlı DEĞİL, orijinal konuşmacının sesini kendi başına koruyor.
 * Maliyet dakika bazlı olduğu için istemci `durationSeconds`'ı gönderiyor (video elementi
 * üzerinden zaten biliniyor) — `transcribe`/`enhance-audio` route'larının aksine burada
 * sabit bir $ maliyeti yok, `Math.ceil` ile dakikaya yukarı yuvarlanıyor (fal'ın kendi
 * faturalama biçimiyle aynı varsayım).
 */
export async function POST(req: Request, { params }: { params: Promise<{ characterId: string }> }) {
  const { characterId } = await params;
  const auth = await authorizeCharacterRequest(characterId);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as Body | null;
  const videoUrl = body?.videoUrl;
  if (typeof videoUrl !== 'string' || !videoUrl.startsWith('http')) {
    return NextResponse.json({ error: 'Video URL\'i geçersiz.' }, { status: 400 });
  }
  if (!isOverlayLocale(body?.targetLang)) {
    return NextResponse.json({ error: 'Desteklenmeyen hedef dil.' }, { status: 400 });
  }
  const targetLang = body!.targetLang as OverlayLocale;
  const sourceLang = isOverlayLocale(body?.sourceLang) ? body!.sourceLang : undefined;
  const durationSeconds = body?.durationSeconds;
  if (typeof durationSeconds !== 'number' || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return NextResponse.json({ error: 'Video süresi geçersiz.' }, { status: 400 });
  }

  const costUsd = Math.ceil(durationSeconds / 60) * STUDIO_DUB_COST_USD_PER_MINUTE;

  if (auth.mode === 'business') {
    try {
      await assertSufficientCredits(auth.business.id, costUsd);
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
    const { videoUrl: dubbedUrl } = await dubVideo({ videoUrl, targetLang, sourceLang });
    if (auth.mode === 'business') {
      const { creditsCharged } = await deductForGeneration(auth.business.id, costUsd);
      await recordUsageEvent(supabaseAdmin, {
        businessId: auth.business.id,
        agent: 'beiwe',
        channel: 'web',
        model: 'fal-ai/elevenlabs/dubbing',
        usage: {},
        creditsCharged,
      });
    }
    const dub: StudioDub = {
      id: crypto.randomUUID(),
      locale: targetLang,
      sourceUrl: videoUrl,
      videoUrl: dubbedUrl,
      createdAt: new Date().toISOString(),
    };
    return NextResponse.json({ dub });
  } catch (err) {
    if (err instanceof FalError) {
      console.error('[studio/redub] fal failed', err.message, `videoUrl=${videoUrl} targetLang=${targetLang}`);
      return NextResponse.json({ error: err.userMessage }, { status: 502 });
    }
    console.error('[studio/redub] failed', err, `videoUrl=${videoUrl} targetLang=${targetLang}`);
    return NextResponse.json({ error: 'Video yeniden seslendirilirken bir hata oluştu.' }, { status: 500 });
  }
}
