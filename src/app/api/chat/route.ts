import { createClient } from '@supabase/supabase-js';
import { createUIMessageStreamResponse, toUIMessageStream } from 'ai';
import { cookies } from 'next/headers';
import { createClient as createServerSupabase } from '@/utils/supabase/server';
import { runSauleTurn } from '@/agents/saule/run';
import { AgentTurnError } from '@/agents/shared/errors';
import { getUIMessageText } from '@/agents/shared/uiMessages';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages, businessId, locale, newConversation, preview } = await req.json();

    if (!businessId) {
      return new Response('Missing businessId', { status: 400 });
    }

    const cookieStore = await cookies();
    const visitorSessionId = cookieStore.get('visitor_session_id')?.value;

    if (!visitorSessionId) {
      return new Response('Missing visitor_session_id', { status: 401 });
    }

    // Only the visitor's latest message is trusted; the rest of the client-sent
    // array is ignored to prevent a visitor from injecting fake assistant turns.
    const lastUserMessage = messages[messages.length - 1];
    const lastUserText = getUIMessageText(lastUserMessage);
    if (!lastUserMessage || lastUserMessage.role !== 'user' || !lastUserText) {
      return new Response('Invalid message', { status: 400 });
    }

    // Initialize Supabase client with Service Role Key to bypass RLS for visitor operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Faz 1.7: editör önizlemesi — yalnızca işletmenin sahibi, kendi işletmesi için preview isteyebilir.
    let isPreview = false;
    if (preview) {
      const { data: businessData } = await supabaseAdmin.from('businesses').select('owner_id').eq('id', businessId).single();
      const supabaseAuth = await createServerSupabase();
      const { data: { user } } = await supabaseAuth.auth.getUser();
      if (!businessData || !user || user.id !== businessData.owner_id) {
        return new Response('Preview not allowed', { status: 403 });
      }
      isPreview = true;
    }
    const conversationKey = isPreview ? `preview:${businessId}` : visitorSessionId;

    const result = await runSauleTurn({
      supabaseAdmin,
      businessId,
      channel: 'web',
      conversationKey,
      userMessage: lastUserText,
      locale: locale || null,
      newConversation: !!newConversation,
      isPreview,
    });

    return createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream }) });
  } catch (error) {
    if (error instanceof AgentTurnError) {
      return new Response(error.message, { status: error.status });
    }
    console.error('Chat API Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
