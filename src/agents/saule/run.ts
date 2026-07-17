import { streamText, isStepCount } from 'ai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getModel } from '@/utils/ai';
import { isConversationActive } from '@/utils/conversationWindow';
import { loadConversationHistory } from '@/agents/shared/history';
import { AgentTurnError } from '@/agents/shared/errors';
import { buildSaulePrompt, parseContactInfo } from './prompt';
import { captureLeadTool, captureAccessRequestTool } from './tools';
import { filterBlocksToLocale } from './localeFilter';

// Faz 1.6: landing demosu için geçici, cömert oturum tavanı (Faz 4'te genel altyapıyla değişecek).
const DEMO_MESSAGE_CAP = 30;

export type RunSauleTurnParams = {
  supabaseAdmin: SupabaseClient;
  businessId: string;
  channel: 'web';
  conversationKey: string;
  userMessage: string;
  locale: string | null;
  newConversation: boolean;
  isPreview: boolean;
};

export async function runSauleTurn({
  supabaseAdmin,
  businessId,
  channel,
  conversationKey,
  userMessage,
  locale,
  newConversation,
  isPreview,
}: RunSauleTurnParams) {
  const [businessRes, blocksRes, knowledgeRes] = await Promise.all([
    supabaseAdmin.from('businesses').select('*').eq('id', businessId).single(),
    supabaseAdmin.from('blocks').select('*').eq('business_id', businessId).eq('is_visible', true).order('order', { ascending: true }),
    supabaseAdmin.from('saule_knowledge').select('title, content').eq('business_id', businessId).eq('is_active', true),
  ]);

  if (!businessRes.data) {
    throw new AgentTurnError('Business not found', 404);
  }
  const business = businessRes.data;

  const isDemoBusiness = !!process.env.TALKINBIO_BUSINESS_ID && businessId === process.env.TALKINBIO_BUSINESS_ID;
  const { contactValues, directLinks } = parseContactInfo(business.contact_value);

  // Find the most recent conversation for this key; reuse it only if it's still
  // "active" (last activity within 7 days) and a fresh one wasn't requested.
  let conversationId: string | undefined;
  if (!newConversation) {
    const { data: convData } = await supabaseAdmin
      .from('conversations')
      .select('id, last_message_at, created_at')
      .eq('business_id', businessId)
      .eq('visitor_session_id', conversationKey)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (convData && isConversationActive(convData.last_message_at, convData.created_at)) {
      conversationId = convData.id;
    }
  }

  if (!conversationId) {
    const { data: newConv } = await supabaseAdmin
      .from('conversations')
      .insert({ business_id: businessId, visitor_session_id: conversationKey, is_preview: isPreview, channel })
      .select('id')
      .single();
    conversationId = newConv?.id;
  }

  if (!conversationId) {
    throw new Error('Failed to get or create conversation');
  }

  // Reconstruct history from the DB before persisting the new message.
  const history = await loadConversationHistory(supabaseAdmin, conversationId);

  await supabaseAdmin.from('messages').insert({
    conversation_id: conversationId,
    role: 'user',
    content: userMessage,
  });
  await supabaseAdmin.from('conversations').update({
    last_message_at: new Date().toISOString(),
    is_read: false,
  }).eq('id', conversationId);

  const persistAssistantMessage = async (text?: string) => {
    if (!text) return;
    await supabaseAdmin.from('messages').insert({ conversation_id: conversationId, role: 'assistant', content: text });
    await supabaseAdmin.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationId);
  };

  // Faz 1.6: landing demosu için geçici, cömert oturum tavanı — sert blokaj değil, davet.
  if (isDemoBusiness) {
    const { count } = await supabaseAdmin
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conversationId);
    if ((count || 0) > DEMO_MESSAGE_CAP) {
      return streamText({
        model: getModel('saule'),
        system: 'Kullanıcıya kibarca bu sohbette mesaj sınırına ulaşıldığını söyle; "Yeni sohbet" butonuyla temiz bir oturum başlatabileceğini veya erken erişim talebinde bulunmak isterse isim/e-posta bırakabileceğini belirt. Kısa ve sıcak yaz, ziyaretçinin yazdığı dilde yanıtla.',
        messages: [{ role: 'user' as const, content: userMessage }],
        onFinish: async ({ text }) => { await persistAssistantMessage(text); },
      });
    }
  }

  const sauleSettings = business.saule_settings || {};
  // Faz 2.3 bağlam diyeti: bloklar sadece ziyaretçinin dilinde, kompakt olarak prompt'a girer.
  const localizedBlocks = filterBlocksToLocale(blocksRes.data || [], locale || 'tr');
  const systemPrompt = buildSaulePrompt({ business, blocks: localizedBlocks, knowledge: knowledgeRes.data || [], locale, isDemoBusiness, directLinks });
  // Faz 2.3 prompt caching: sistem prompt'u (sabit bloklar + kurallar) konuşma boyunca
  // aynı kalır — Anthropic ephemeral cache ile tekrar eden girdi ~10 kat ucuzlar.
  const modelMessages = [
    { role: 'system' as const, content: systemPrompt, providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } } },
    ...history,
    { role: 'user' as const, content: userMessage },
  ];

  return streamText({
    model: getModel('saule'),
    stopWhen: isStepCount(4),
    allowSystemInMessages: true,
    messages: modelMessages,
    tools: isDemoBusiness
      ? { capture_access_request: captureAccessRequestTool({ supabaseAdmin, businessId, conversationId }) }
      : sauleSettings.leadCaptureEnabled !== false
      ? { capture_lead: captureLeadTool({ supabaseAdmin, businessId, conversationId, contactValues, directLinks, isPreview }) }
      : {},
    onFinish: async ({ text }) => {
      await persistAssistantMessage(text);
    },
  });
}
