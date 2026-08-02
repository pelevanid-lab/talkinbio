import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { deductCredits, SAULE_VOICE_CREDIT_COST, SAULE_CREDIT_COST } from '@/agents/shared/credits';
import { SAULE_VOICE_MAX_SECONDS } from '@/agents/shared/limits';

export const maxDuration = 30;

// POST /api/chat/voice/transcribe
// Body: FormData with `audio` (Blob) + `businessId` (string)
// Returns: { text: string }
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const visitorSessionId = cookieStore.get('visitor_session_id')?.value;
    if (!visitorSessionId) {
      return new Response('Missing visitor_session_id', { status: 401 });
    }

    const formData = await req.formData();
    const audio = formData.get('audio') as File | null;
    const businessId = formData.get('businessId') as string | null;
    const durationSeconds = Number(formData.get('durationSeconds') || 0);

    if (!audio || !businessId) {
      return new Response('Missing audio or businessId', { status: 400 });
    }
    if (durationSeconds > SAULE_VOICE_MAX_SECONDS) {
      return new Response('Voice input is limited to 8 minutes per session', { status: 413 });
    }
    if (audio.size > 25 * 1024 * 1024) {
      return new Response('Voice input is too large', { status: 413 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify business and check voice enabled
    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('saule_settings, credit_balance')
      .eq('id', businessId)
      .single();

    if (!business?.saule_settings?.voiceEnabled) {
      return new Response('Voice not enabled for this business', { status: 403 });
    }

    // Check conversation voice status. Voice input costs more than a text session because STT runs
    // before the normal chat turn. If there is no conversation yet, the following chat turn will
    // create one and charge the base SAULE_CREDIT_COST, so this route charges only the voice extra.
    const { data: conversation } = await supabaseAdmin
      .from('conversations')
      .select('id, has_voice_interaction')
      .eq('business_id', businessId)
      .eq('visitor_session_id', visitorSessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const extraCreditsToDeduct = Math.max(0, SAULE_VOICE_CREDIT_COST - SAULE_CREDIT_COST);
    const requiredCreditsBeforeTranscribe = !conversation
      ? SAULE_VOICE_CREDIT_COST
      : conversation.has_voice_interaction
      ? 0
      : extraCreditsToDeduct;

    if (requiredCreditsBeforeTranscribe > 0 && (business.credit_balance ?? 0) < requiredCreditsBeforeTranscribe) {
      return new Response('Insufficient credits for voice input', { status: 402 });
    }

    // fal.ai Wizper multipart/form-data DOSYA YÜKLEMESİ KABUL ETMİYOR — JSON body içinde
    // "audio_url" bekliyor (hosted bir URL ya da base64 data URI). Eskiden burada FormData
    // ile ham dosya gönderiliyordu; fal.ai bunu her zaman 422 ile reddediyordu ("Input should
    // be a valid dictionary or object") — yani basılı-tut hiçbir zaman gerçekten çalışmamış,
    // transkripsiyon sessizce başarısız oluyordu (üretimde doğrulandı, 2026-08-01).
    const audioBuffer = Buffer.from(await audio.arrayBuffer());
    // Gerçek tarayıcıların MediaRecorder'ı mimeType'ı hep codec parametresiyle birlikte
    // veriyor (ör. "audio/webm;codecs=opus"). Bunu olduğu gibi data URI'ye koymak
    // ("data:audio/webm;codecs=opus;base64,...") fal.ai'nin ayrıştırıcısını bozup yine 422/502
    // döndürüyordu — sadece kodeksiz temel medya tipini kullanmalıyız.
    const baseMimeType = (audio.type || 'audio/webm').split(';')[0].trim();
    const audioDataUri = `data:${baseMimeType};base64,${audioBuffer.toString('base64')}`;

    const falResponse = await fetch('https://fal.run/fal-ai/elevenlabs/speech-to-text/scribe-v2', {
      method: 'POST',
      headers: {
        Authorization: `Key ${process.env.FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ audio_url: audioDataUri }),
    });

    if (!falResponse.ok) {
      const err = await falResponse.text();
      console.error('fal.ai STT error:', err);
      return new Response('Transcription failed', { status: 502 });
    }

    const result = await falResponse.json();
    const text = result.text as string;

    if (requiredCreditsBeforeTranscribe > 0) {
      if (!conversation) {
        await supabaseAdmin.from('conversations').insert({
          business_id: businessId,
          visitor_session_id: visitorSessionId,
          channel: 'web',
          has_voice_interaction: true,
        });
        await deductCredits(supabaseAdmin, businessId, SAULE_VOICE_CREDIT_COST);
      } else if (!conversation.has_voice_interaction && extraCreditsToDeduct > 0) {
        await supabaseAdmin
          .from('conversations')
          .update({ has_voice_interaction: true })
          .eq('id', conversation.id);
        await deductCredits(supabaseAdmin, businessId, extraCreditsToDeduct);
      }
    }

    if (!text?.trim()) {
      return Response.json({ text: '' });
    }

    return Response.json({ text: text.trim() });
  } catch (error) {
    console.error('Voice transcribe error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
