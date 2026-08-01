import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { deductCredits, SAULE_VOICE_CREDIT_COST, SAULE_CREDIT_COST } from '@/agents/shared/credits';

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

    if (!audio || !businessId) {
      return new Response('Missing audio or businessId', { status: 400 });
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

    // Check conversation voice status & deduct extra 4 credits if first voice message in session
    const { data: conversation } = await supabaseAdmin
      .from('conversations')
      .select('id, has_voice_interaction')
      .eq('business_id', businessId)
      .eq('visitor_session_id', visitorSessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (conversation && !conversation.has_voice_interaction) {
      // Mark session as containing voice interaction
      await supabaseAdmin
        .from('conversations')
        .update({ has_voice_interaction: true })
        .eq('id', conversation.id);

      // Deduct the difference between voice credit cost (5) and normal text cost (1) = 4 credits
      const extraCreditsToDeduct = SAULE_VOICE_CREDIT_COST - SAULE_CREDIT_COST;
      await deductCredits(supabaseAdmin, businessId, extraCreditsToDeduct);
    }

    // Send to fal.ai Wizper (optimized Whisper) for transcription. Dosya adı istemcinin
    // gerçekte kaydettiği formatla eşleşmeli (bkz. ChatWidget.tsx startRecording) — sabit
    // "recording.webm" kullanmak, iOS Safari gibi audio/mp4 üreten tarayıcılarda Wizper'ın
    // sesi çözemeyip sessizce boş metin dönmesine yol açıyordu.
    const falFormData = new FormData();
    falFormData.append('audio', audio, audio.name || 'recording.webm');

    const falResponse = await fetch('https://fal.run/fal-ai/wizper', {
      method: 'POST',
      headers: {
        Authorization: `Key ${process.env.FAL_KEY}`,
      },
      body: falFormData,
    });

    if (!falResponse.ok) {
      const err = await falResponse.text();
      console.error('fal.ai STT error:', err);
      return new Response('Transcription failed', { status: 502 });
    }

    const result = await falResponse.json();
    const text = result.text as string;

    if (!text?.trim()) {
      return Response.json({ text: '' });
    }

    return Response.json({ text: text.trim() });
  } catch (error) {
    console.error('Voice transcribe error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
