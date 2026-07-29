import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { isCharacterId } from '@/config/characters';
import { FalError, cloneMinimaxVoice, generateMinimaxSpeech } from '@/utils/fal';

export const maxDuration = 300;

async function requireAdminApi(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get('admin_session')?.value === process.env.ADMIN_PASSWORD;
}

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
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { characterId } = await params;
  if (!isCharacterId(characterId)) {
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
