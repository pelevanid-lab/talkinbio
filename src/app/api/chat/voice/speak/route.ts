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
      // For preview in dashboard, ensure user is authenticated
      const supabaseAuth = await createServerSupabase();
      const { data: { user } } = await supabaseAuth.auth.getUser();
      if (!user) {
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

    // Try fal.ai TTS endpoints (eleven-v3 -> turbo-v2.5)
    const endpoints = [
      'https://fal.run/fal-ai/elevenlabs/tts/eleven-v3',
      'https://fal.run/fal-ai/elevenlabs/tts/turbo-v2.5',
    ];

    let audioUrl: string | null = null;
    let lastError: string = '';

    for (const endpoint of endpoints) {
      try {
        const falResponse = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Key ${process.env.FAL_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: text.slice(0, 4000),
            input: {
              text: text.slice(0, 4000),
            },
          }),
        });

        if (falResponse.ok) {
          const result = await falResponse.json();
          audioUrl = result.audio?.url || result.audio_url || result.url || result.audio?.file_url;
          if (audioUrl) break;
        } else {
          lastError = await falResponse.text();
          console.warn(`fal.ai endpoint ${endpoint} failed:`, lastError);
        }
      } catch (e) {
        console.warn(`Fetch error for ${endpoint}:`, e);
      }
    }

    if (!audioUrl) {
      console.error('All fal.ai TTS endpoints failed. Last error:', lastError);
      return new Response(`TTS failed: ${lastError}`, { status: 502 });
    }

    return Response.json({ audioUrl });
  } catch (error: any) {
    console.error('Voice speak error:', error);
    return new Response(`Internal Server Error: ${error?.message || error}`, { status: 500 });
  }
}
