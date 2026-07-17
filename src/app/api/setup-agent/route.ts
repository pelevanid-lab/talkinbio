import { streamText, isStepCount, convertToModelMessages, createUIMessageStreamResponse, toUIMessageStream } from 'ai';
import { createClient } from '@supabase/supabase-js';
import { getModel } from '@/utils/ai';
import { buildBeiwePrompt, buildReadinessSummary } from '@/agents/beiwe/prompt';
import { createBeiweTools } from '@/agents/beiwe/tools';
import { getUIMessageText } from '@/agents/shared/uiMessages';

// Large pastes (e.g. a business owner dropping in several long service descriptions at once,
// each needing translation into 3 languages) can take the model well past a minute to finish
// all its tool calls — bumped from 60s to reduce timeout failures on those turns.
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const { messages, businessId, locale = 'tr', sessionId } = await req.json();

    if (!sessionId) {
      return new Response('Missing sessionId', { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch existing blocks + business to give context to the AI
    const [{ data: blocks }, { data: business }] = await Promise.all([
      supabase.from('blocks').select('*').eq('business_id', businessId).order('order', { ascending: true }),
      supabase.from('businesses').select('contact_method, contact_value, category, theme, is_published').eq('id', businessId).single(),
    ]);

    const currentLocale = (locale as string) || 'tr';

    // Persist the conversation so returning to this tab (or reloading the page) doesn't lose context.
    const lastUserMessage = messages[messages.length - 1];
    const lastUserText = getUIMessageText(lastUserMessage);
    if (lastUserMessage && lastUserMessage.role === 'user') {
      const meaningfulUserMsgs = messages
        .filter((m: { role: string }) => m.role === 'user')
        .map((m: { role: string; parts?: { type: string; text?: string }[] }) => getUIMessageText(m))
        .filter((text: string) => text && text.length > 10 && text !== '__DEVAM__');
      const sessionTitle = meaningfulUserMsgs.length > 0
        ? (meaningfulUserMsgs[0].length > 45 ? meaningfulUserMsgs[0].substring(0, 45).trim() + '...' : meaningfulUserMsgs[0])
        : 'Sohbet';

      await supabase.from('setup_sessions').upsert({
        id: sessionId,
        business_id: businessId,
        title: sessionTitle,
      }, { onConflict: 'id' });

      await supabase.from('setup_messages').insert({
        business_id: businessId,
        session_id: sessionId,
        role: 'user',
        content: lastUserText,
      });
    }

    // Build a readiness summary (replaces the old numeric %completeness) so the AI knows
    // exactly which required/recommended sections are still missing.
    const blockList = blocks || [];
    let contactValues: Record<string, string> = {};
    try { contactValues = business?.contact_value ? JSON.parse(business.contact_value) : {}; } catch { contactValues = {}; }
    const hasContact = Object.values(contactValues).some((v) => typeof v === 'string' && v.trim().length > 0);
    const readinessSummary = buildReadinessSummary(blockList, hasContact);

    const systemPrompt = buildBeiwePrompt({ business: business || null, blocks: blockList, locale: currentLocale, readinessSummary });

    // Faz 2.3 prompt caching: Beiwe'nin sabit yükü (mevcut bloklar + kural seti) her
    // çağrıda tekrar gönderiliyor — Anthropic ephemeral cache ile bu tekrar ucuzlar.
    const modelMessages = [
      { role: 'system' as const, content: systemPrompt, providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' as const } } } },
      ...(await convertToModelMessages(messages)),
    ];

    const result = await streamText({
      model: getModel('beiwe'),
      stopWhen: isStepCount(20),
      maxOutputTokens: 8192,
      allowSystemInMessages: true,
      messages: modelMessages,
      tools: createBeiweTools({ supabase, businessId, locale: currentLocale }),
      onFinish: async ({ text, toolCalls }) => {
        if (text) {
          await supabase.from('setup_sessions').upsert({
            id: sessionId,
            business_id: businessId,
          }, { onConflict: 'id', ignoreDuplicates: true });

          await supabase.from('setup_messages').insert({
            business_id: businessId,
            session_id: sessionId,
            role: 'assistant',
            content: text,
          });
        }
        // Flag the business as having unsaved-to-live edits so the dashboard can prompt the
        // owner to re-confirm publish (mirrors the manual-edit path in EditorClient).
        if (business?.is_published && toolCalls && toolCalls.length > 0) {
          await supabase.from('businesses').update({ needs_republish: true }).eq('id', businessId);
        }
      },
    });

    return createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream }) });
  } catch (error) {
    console.error('Setup agent error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return new Response(message, { status: 500 });
  }
}
