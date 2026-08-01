import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { isKnownCharacterId } from '@/utils/knownCharacter';
import { FalError, cloneMinimaxVoice, generateMinimaxSpeech } from '@/utils/fal';
import { MINIMAX_CLONE_COST_USD, ESTIMATED_VOICE_COST_PER_1K_CHARS_USD } from '@/config/beiweLab';
import { authorizeCharacterRequest } from '@/utils/creativeStudioScope';
import { assertSufficientCredits, deductForGeneration, InsufficientCreditsError } from '@/utils/creativeStudioCredits';

export const maxDuration = 300;

type Body =
  | { action: 'clone' }
  | { action: 'speak'; text: string };

/**
 * POST /api/admin/characters/[characterId]/minimax-voice
 *
 * Referans ses yükleme burada DEĞİL — o hâlâ `.../voice` route'unda (paylaşılan
 * altyapı: Supabase'e yükleme, whisper deşifresi). Bu route yalnızca MiniMax'a özgü
 * iki adımı yürütüyor:
 *
 *   action: 'clone' — profildeki voice_url'i MiniMax'a klonlatır, kalıcı
 *                      minimax_voice_id'yi kaydeder. Ücretli (~$1.50), tekrar tekrar
 *                      çağrılacak bir şey değil — istemci bunu tek bir "Klonla"
 *                      düğmesinin arkasında tutuyor.
 *   action: 'speak' — saklı minimax_voice_id ile metni seslendirir. Klonun 7 gün
 *                      kullanılmadan silinmemesi için gereken "gerçek TTS çağrısı"
 *                      da bu.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ characterId: string }> },
) {
  const { characterId } = await params;
  const auth = await authorizeCharacterRequest(characterId);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await isKnownCharacterId(characterId))) {
    return NextResponse.json({ error: 'Bilinmeyen karakter.' }, { status: 400 });
  }

  const body = (await req.json()) as Body;

  if (body.action === 'clone') {
    const { data: profile } = await supabaseAdmin
      .from('character_profiles')
      .select('voice_url')
      .eq('id', characterId)
      .maybeSingle();

    if (!profile?.voice_url) {
      return NextResponse.json(
        { error: 'Önce bir referans ses yükle.' },
        { status: 400 },
      );
    }

    if (auth.mode === 'business') {
      try {
        await assertSufficientCredits(auth.business.id, MINIMAX_CLONE_COST_USD);
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
      const { customVoiceId } = await cloneMinimaxVoice({ referenceAudioUrl: profile.voice_url });

      await supabaseAdmin
        .from('character_profiles')
        .upsert(
          {
            id: characterId,
            minimax_voice_id: customVoiceId,
            minimax_voice_status: 'active',
            minimax_cloned_at: new Date().toISOString(),
            // Yeni klon, önceki onayı geçersiz kılar — kulakla yeniden doğrulanmalı.
            voice_status: 'none',
          },
          { onConflict: 'id' },
        );

      if (auth.mode === 'business') {
        await deductForGeneration(auth.business.id, MINIMAX_CLONE_COST_USD);
      }

      return NextResponse.json({ voiceId: customVoiceId, status: 'active' });
    } catch (err) {
      await supabaseAdmin
        .from('character_profiles')
        .upsert({ id: characterId, minimax_voice_status: 'failed' }, { onConflict: 'id' });

      if (err instanceof FalError) {
        return NextResponse.json({ error: err.userMessage }, { status: 502 });
      }
      console.error('[minimax-voice] klonlama hatası', err);
      return NextResponse.json({ error: 'Klonlama başarısız oldu.' }, { status: 500 });
    }
  }

  if (body.action === 'speak') {
    const text = body.text?.trim();
    if (!text) {
      return NextResponse.json({ error: 'Metin zorunludur.' }, { status: 400 });
    }

    const { data: profile } = await supabaseAdmin
      .from('character_profiles')
      .select('minimax_voice_id')
      .eq('id', characterId)
      .maybeSingle();

    if (!profile?.minimax_voice_id) {
      return NextResponse.json(
        { error: 'Önce sesi klonla.' },
        { status: 400 },
      );
    }

    const speakCostUsd = (text.length / 1000) * ESTIMATED_VOICE_COST_PER_1K_CHARS_USD;
    if (auth.mode === 'business') {
      try {
        await assertSufficientCredits(auth.business.id, speakCostUsd);
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
      const result = await generateMinimaxSpeech({
        text,
        voiceId: profile.minimax_voice_id,
        languageBoost: 'Turkish',
      });

      // Bu çağrı, klonu 7 günlük silinme riskinden çıkaran "gerçek kullanım"ın ta kendisi.
      await supabaseAdmin
        .from('character_profiles')
        .upsert(
          {
            id: characterId,
            minimax_voice_status: 'active',
            minimax_last_used_at: new Date().toISOString(),
          },
          { onConflict: 'id' },
        );

      if (auth.mode === 'business') {
        await deductForGeneration(auth.business.id, speakCostUsd);
      }

      return NextResponse.json({ audioUrl: result.audioUrl, durationMs: result.durationMs });
    } catch (err) {
      if (err instanceof FalError) {
        // Kaba bir sezgi: fal'ın "voice" geçen doğrulama hatası genelde silinmiş/geçersiz
        // bir voice_id işaret ediyor — kullanıcıyı yeniden klonlamaya yönlendir.
        if (/voice/i.test(err.message)) {
          await supabaseAdmin
            .from('character_profiles')
            .upsert({ id: characterId, minimax_voice_status: 'expired' }, { onConflict: 'id' });
        }
        return NextResponse.json({ error: err.userMessage }, { status: 502 });
      }
      console.error('[minimax-voice] üretim hatası', err);
      return NextResponse.json({ error: 'Ses üretilemedi.' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Geçersiz action.' }, { status: 400 });
}
