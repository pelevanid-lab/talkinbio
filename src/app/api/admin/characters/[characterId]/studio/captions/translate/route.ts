import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { generateOnce } from '@/agents/shared/generateOnce';
import { recordUsageEvent } from '@/agents/shared/usage';
import { parseJsonResult } from '@/agents/shared/parseJsonResult';
import { buildCaptionTranslatePrompt, applyCaptionTranslations, isLocaleKey } from '@/agents/saule/modes/studio/captionTranslate';
import { MAX_CAPTIONS, MAX_OVERLAY_TEXT_LENGTH, type StudioCaption } from '@/config/studio';
import { STUDIO_CAPTION_TRANSLATE_COST_USD } from '@/config/beiweLab';
import { authorizeCharacterRequest } from '@/utils/creativeStudioScope';
import { assertSufficientCredits, deductForGeneration, InsufficientCreditsError } from '@/utils/creativeStudioCredits';

export const maxDuration = 60;

type Body = { captions?: unknown; targetLocale?: string };

/** Route-local, hafif doğrulama — `config/studio.ts`'in `parseCaption`'ı burada bilerek
 *  tekrar kullanılmıyor (private/export edilmemiş): whisper zaten sunucuda üretilmiş bir
 *  diziyi geri gönderiyoruz, tam `parseStudioTimeline` sertliği gerekmiyor. */
function isCaptionArray(v: unknown): v is StudioCaption[] {
  return (
    Array.isArray(v) &&
    v.every(
      (c) =>
        c &&
        typeof c === 'object' &&
        typeof (c as StudioCaption).id === 'string' &&
        typeof (c as StudioCaption).text === 'string' &&
        Number.isFinite((c as StudioCaption).startTime) &&
        Number.isFinite((c as StudioCaption).endTime),
    )
  );
}

/**
 * Düzenle → çok dilli altyazı. ElevenLabs GEREKMİYOR — mevcut whisper transkriptinin
 * (`timeline.captions`) `text` alanlarını `generateOnce`/Gemini flash ile çeviriyoruz,
 * zaman damgaları hiç modele gönderilmeden kaynaktan aynen kopyalanıyor (bkz.
 * `captionTranslate.ts`). `/api/content/translate` route'uyla AYNI çağrı deseni, ama
 * o business-owner-only iken bu `authorizeCharacterRequest` (admin+business dual-mode)
 * kullanıyor — studio route'larının geri kalanıyla tutarlı olsun diye.
 */
export async function POST(req: Request, { params }: { params: Promise<{ characterId: string }> }) {
  const { characterId } = await params;
  const auth = await authorizeCharacterRequest(characterId);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!isCaptionArray(body?.captions) || body!.captions.length === 0) {
    return NextResponse.json({ error: 'Altyazı listesi geçersiz.' }, { status: 400 });
  }
  if (!isLocaleKey(body?.targetLocale)) {
    return NextResponse.json({ error: 'Desteklenmeyen hedef dil.' }, { status: 400 });
  }
  const targetLocale = body!.targetLocale;
  const captions = (body!.captions as StudioCaption[])
    .slice(0, MAX_CAPTIONS)
    .map((c) => ({ ...c, text: c.text.slice(0, MAX_OVERLAY_TEXT_LENGTH) }));

  if (auth.mode === 'business') {
    try {
      await assertSufficientCredits(auth.business.id, STUDIO_CAPTION_TRANSLATE_COST_USD);
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
    const { system, prompt } = buildCaptionTranslatePrompt({
      captions: captions.map((c) => ({ id: c.id, text: c.text })),
      targetLocale,
    });
    const { text, model, usage } = await generateOnce({ task: 'saule', system, prompt });
    const parsed = parseJsonResult<Record<string, string>>(text);
    const translated = parsed ? applyCaptionTranslations(captions, parsed) : [];

    if (translated.length === 0) {
      return NextResponse.json({ error: 'Altyazı çevrilemedi, lütfen tekrar dene.' }, { status: 502 });
    }

    if (auth.mode === 'business') {
      const { creditsCharged } = await deductForGeneration(auth.business.id, STUDIO_CAPTION_TRANSLATE_COST_USD);
      await recordUsageEvent(supabaseAdmin, { businessId: auth.business.id, agent: 'beiwe', channel: 'web', model, usage, creditsCharged });
    }

    return NextResponse.json({ locale: targetLocale, captions: translated });
  } catch (err) {
    console.error('[studio/captions/translate] failed', err, `targetLocale=${targetLocale}`);
    return NextResponse.json({ error: 'Altyazı çevrilirken bir hata oluştu.' }, { status: 500 });
  }
}
