import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createClient as createServerSupabase } from '@/utils/supabase/server';

export const maxDuration = 30;

// POST /api/chat/voice/speak
// Body: JSON { text: string, businessId: string, preview?: boolean }
// Returns: JSON { audioUrl: string }
export async function POST(req: Request) {
  try {
    const { text, businessId, preview } = await req.json();

    if (!text || !businessId) {
      return new Response('Missing text or businessId', { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (preview) {
      // For preview in dashboard, verify owner
      const supabaseAuth = await createServerSupabase();
      const { data: { user } } = await supabaseAuth.auth.getUser();
      const { data: business } = await supabaseAdmin
        .from('businesses')
        .select('owner_id')
        .eq('id', businessId)
        .single();

      if (!business || !user || user.id !== business.owner_id) {
        return new Response('Preview unauthorized', { status: 403 });
      }
    } else {
      // For visitors, check visitor_session_id and voiceEnabled setting
      const cookieStore = await cookies();
      const visitorSessionId = cookieStore.get('visitor_session_id')?.value;
      if (!visitorSessionId) {
        return new Response('Missing visitor_session_id', { status: 401 });
      }

      const { data: business } = await supabaseAdmin
        .from('businesses')
        .select('saule_settings')
        .eq('id', businessId)
        .single();

      if (!business?.saule_settings?.voiceEnabled) {
        return new Response('Voice not enabled for this business', { status: 403 });
      }
    }

    // Call fal.ai ElevenLabs Turbo v2.5 TTS endpoint
    const falResponse = await fetch('https://fal.run/fal-ai/elevenlabs/tts/turbo-v2.5', {
      method: 'POST',
      headers: {
        Authorization: `Key ${process.env.FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          text: text.slice(0, 4000),
        },
      }),
    });

    if (!falResponse.ok) {
      const err = await falResponse.text();
      console.error('fal.ai ElevenLabs TTS error:', err);
      return new Response('TTS failed', { status: 502 });
    }

    const result = await falResponse.json();
    const audioUrl = result.audio?.url || result.audio_url || result.url;

    if (!audioUrl) {
      console.error('No audio URL returned from fal.ai:', result);
      return new Response('No audio generated', { status: 500 });
    }

    return Response.json({ audioUrl });
  } catch (error) {
    console.error('Voice speak error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
