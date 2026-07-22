import { streamText, isStepCount, convertToModelMessages, createUIMessageStreamResponse, toUIMessageStream } from 'ai';
import { createClient } from '@supabase/supabase-js';
import { getModel } from '@/utils/ai';
import { buildBeiweStaticPrompt, buildBeiweDynamicContext, buildReadinessSummary } from '@/agents/beiwe/prompt';
import { createBeiweTools } from '@/agents/beiwe/tools';
import { getUIMessageText } from '@/agents/shared/uiMessages';
import { BEIWE_MAX_INPUT_CHARS, BEIWE_HISTORY_WINDOW } from '@/agents/shared/limits';
import { recordUsageEvent } from '@/agents/shared/usage';
import { beiweCreditCost, deductCredits } from '@/agents/shared/credits';

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

    // Fetch existing blocks + business to give context to the AI. Only the columns the
    // prompt/readiness summary actually read — id/business_id/singleton_key are pure noise
    // once this is serialized into the prompt (every block repeats the same business_id).
    const [{ data: blocks }, { data: business }] = await Promise.all([
      supabase.from('blocks').select('type, title, content, order, is_visible').eq('business_id', businessId).order('order', { ascending: true }),
      supabase.from('businesses').select('contact_method, contact_value, category, theme, is_published, credit_balance').eq('id', businessId).single(),
    ]);

    // Faz 4.3: kredi bitince Beiwe (sahip-yüzlü dashboard aracı) düz bir yükseltme
    // mesajıyla durur — Saule'nin ziyaretçi-yüzlü "fiili ücretsiz katman"ı burada geçerli değil.
    if (business && business.credit_balance <= 0) {
      return new Response('Krediniz tükendi. Devam etmek için planınızı yükseltin.', { status: 402 });
    }

    const currentLocale = (locale as string) || 'tr';

    // Persist the conversation so returning to this tab (or reloading the page) doesn't lose context.
    const lastUserMessage = messages[messages.length - 1];
    const lastUserText = getUIMessageText(lastUserMessage);
    if (lastUserMessage && lastUserMessage.role === 'user' && lastUserText.length > BEIWE_MAX_INPUT_CHARS) {
      return new Response('Message too long', { status: 400 });
    }
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

    // Faz 2.3 prompt caching: persona + kural seti (business.category dışında oturum boyunca
    // sabit) ayrı bir cache'lenmiş system mesajı; mevcut bloklar/tema/yayına hazırlık durumu
    // (hemen her turda değişir) ayrı, cache'siz bir kuyruk mesajı — ikisi TEK bir metinde
    // birleştirilirse blok değişikliği her turda ~18-19K token'lık tüm cache'i bozuyordu.
    const staticPrompt = buildBeiweStaticPrompt({ business: business || null, locale: currentLocale });
    const dynamicContext = buildBeiweDynamicContext({ business: business || null, blocks: blockList, readinessSummary });

    // Unlike Saule (DB-side HISTORY_WINDOW, shared/history.ts), Beiwe had no cap at all —
    // the client's full session transcript was resent, in full, on every single turn, so a
    // long setup conversation made every subsequent turn more expensive than the last. Each
    // UIMessage here is one self-contained role turn (a tool call + its result live together
    // as parts of the SAME assistant message, not as separate array entries), so slicing by
    // count can't split a tool call from its result.
    const recentMessages = messages.length > BEIWE_HISTORY_WINDOW ? messages.slice(-BEIWE_HISTORY_WINDOW) : messages;

    const modelMessages = [
      { role: 'system' as const, content: staticPrompt, providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' as const } } } },
      { role: 'system' as const, content: dynamicContext },
      ...(await convertToModelMessages(recentMessages)),
    ];

    const result = await streamText({
      model: getModel('beiwe'),
      stopWhen: isStepCount(20),
      // Faz: A single tool call (e.g. addSection with a long product description + full
      // ingredient list, repeated across tr/en/ru) can run well past 8192 output tokens on
      // its own — hitting that cap mid-JSON truncates the tool call's arguments, which then
      // fails to parse and crashes the whole stream. claude-sonnet-4-5 supports up to 64k.
      maxOutputTokens: 32000,
      allowSystemInMessages: true,
      messages: modelMessages,
      tools: createBeiweTools({ supabase, businessId, locale: currentLocale }),
      onFinish: async ({ text, toolCalls, usage, model }) => {
        await recordUsageEvent(supabase, { businessId, agent: 'beiwe', channel: 'web', model: model.modelId, usage });
        await deductCredits(supabase, businessId, beiweCreditCost(toolCalls.length));
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

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({
        stream: result.stream,
        // Default masks every mid-stream error as "An error occurred." — surface the real
        // reason (matches the pre-stream error responses above, e.g. the credit-exhausted
        // message) so failures are diagnosable instead of silently generic.
        onError: (error) => {
          console.error('Setup agent stream error:', error);
          return error instanceof Error ? error.message : 'Bir hata oluştu, lütfen tekrar deneyin.';
        },
      }),
    });
  } catch (error) {
    console.error('Setup agent error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return new Response(message, { status: 500 });
  }
}
