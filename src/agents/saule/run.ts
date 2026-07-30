import { streamText, isStepCount } from 'ai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getModel } from '@/utils/ai';
import { isConversationActive } from '@/utils/conversationWindow';
import { loadConversationHistory } from '@/agents/shared/history';
import { AgentTurnError } from '@/agents/shared/errors';
import { SESSION_MESSAGE_CAP } from '@/agents/shared/limits';
import { checkShortTermFlood, checkSessionOpenRateLimit, checkBusinessDailyCap, getAbuseLimitMessage } from '@/agents/shared/rateLimit';
import { recordUsageEvent } from '@/agents/shared/usage';
import { notifyAdmin } from '@/agents/shared/notifyAdmin';
import { hasCredits, deductCredits, creditsExhaustedPayload, SAULE_CREDIT_COST } from '@/agents/shared/credits';
import { buildSaulePrompt, parseContactInfo } from './prompt';
import { captureLeadTool, captureAccessRequestTool } from './tools';
import { filterBlocksToLocale } from './localeFilter';

export type RunSauleTurnParams = {
  supabaseAdmin: SupabaseClient;
  businessId: string;
  channel: 'web' | 'instagram';
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

  // Faz 4.1: sert kalkanlar — gerçek ziyaretçi bunlara pratikte hiç çarpmaz, LLM
  // çağırmadan (token harcamadan) kötü niyetli 3. tarafları durdurmayı hedefler.
  // Sahibin kendi editör önizlemesi (isPreview) hiçbir limite tabi değil.
  if (!isPreview) {
    const floodOk = await checkShortTermFlood(supabaseAdmin, businessId, conversationKey);
    if (!floodOk) {
      throw new AgentTurnError(getAbuseLimitMessage('flood', locale), 429);
    }
    const dailyOk = await checkBusinessDailyCap(supabaseAdmin, businessId);
    if (!dailyOk) {
      throw new AgentTurnError(getAbuseLimitMessage('daily-cap', locale, directLinks), 429);
    }
    // Faz 4.3: kredi bitince sert blokaj değil — istemci (ChatWidget) bu JSON
    // payload'ı yakalayıp LLM'siz mesaj-bırakma formuna döner (fiili ücretsiz katman).
    if (!hasCredits(business)) {
      throw new AgentTurnError(creditsExhaustedPayload(locale, directLinks), 402);
    }
  }

  // Find the most recent conversation for this key; reuse it only if it's still
  // "active" (last activity within 7 days) and a fresh one wasn't requested.
  let conversationId: string | undefined;
  let willCreateNewConversation = true;
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
      willCreateNewConversation = false;
    }
  }

  if (willCreateNewConversation && !isPreview) {
    const sessionOpenOk = await checkSessionOpenRateLimit(supabaseAdmin, businessId, conversationKey);
    if (!sessionOpenOk) {
      throw new AgentTurnError(getAbuseLimitMessage('session-open', locale), 429);
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
    business_id: businessId,
    role: 'user',
    content: userMessage,
  });
  await supabaseAdmin.from('conversations').update({
    last_message_at: new Date().toISOString(),
    is_read: false,
  }).eq('id', conversationId);

  const persistAssistantMessage = async (text?: string) => {
    if (!text) return;
    await supabaseAdmin.from('messages').insert({ conversation_id: conversationId, business_id: businessId, role: 'assistant', content: text });
    await supabaseAdmin.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationId);
  };

  // Faz 4.1: oturum içi mesaj tavanı (soft) — dolunca sert blokaj değil, "yeni sohbet" daveti.
  // Faz 1.6'nın yalnızca demo işletmeye özel geçici tavanının yerini alır.
  if (!isPreview) {
    const { count } = await supabaseAdmin
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conversationId);
    if ((count || 0) > SESSION_MESSAGE_CAP) {
      return streamText({
        model: getModel('saule'),
        system: 'Kullanıcıya kibarca bu sohbette mesaj sınırına ulaşıldığını söyle; "Yeni sohbet" butonuyla temiz bir oturum başlatabileceğini veya erken erişim talebinde bulunmak isterse isim/e-posta bırakabileceğini belirt. Kısa ve sıcak yaz, ziyaretçinin yazdığı dilde yanıtla.',
        messages: [{ role: 'user' as const, content: userMessage }],
        onFinish: async ({ text, usage, model }) => {
          await persistAssistantMessage(text);
          await recordUsageEvent(supabaseAdmin, { businessId, agent: 'saule', channel, model: model.modelId, usage, creditsCharged: SAULE_CREDIT_COST });
          await deductCredits(supabaseAdmin, businessId, SAULE_CREDIT_COST);
        },
      });
    }
  }

  const sauleSettings = business.saule_settings || {};
  // Faz 2.3 bağlam diyeti: bloklar sadece ziyaretçinin dilinde, kompakt olarak prompt'a girer.
  const localizedBlocks = filterBlocksToLocale(blocksRes.data || [], locale || 'tr');
  const systemPrompt = buildSaulePrompt({ business, blocks: localizedBlocks, knowledge: knowledgeRes.data || [], locale, isDemoBusiness, directLinks, contactValues });
  // Faz 2.3 prompt caching: sistem prompt'u (sabit bloklar + kurallar) konuşma boyunca
  // aynı kalır — Anthropic ephemeral cache ile tekrar eden girdi ~10 kat ucuzlar.
  const modelMessages = [
    { role: 'system' as const, content: systemPrompt, providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } } },
    ...history,
    { role: 'user' as const, content: userMessage },
  ];

  const captureToolAvailable = isDemoBusiness || sauleSettings.leadCaptureEnabled !== false;
  const CONFIRMATION_PATTERN = /kaydet|aldım|alındı|iletildi|kaydedildi|saved|recorded|received/i;

  return streamText({
    model: getModel('saule'),
    stopWhen: isStepCount(4),
    allowSystemInMessages: true,
    messages: modelMessages,
    tools: isDemoBusiness
      ? { capture_access_request: captureAccessRequestTool({ supabaseAdmin, businessId, conversationId, isPreview }) }
      : sauleSettings.leadCaptureEnabled !== false
      ? { capture_lead: captureLeadTool({ supabaseAdmin, businessId, conversationId, contactValues, directLinks, isPreview, notificationEmail: sauleSettings.notificationEmail }) }
      : {},
    onFinish: async ({ text, toolCalls, usage, model }) => {
      await persistAssistantMessage(text);
      await recordUsageEvent(supabaseAdmin, { businessId, agent: 'saule', channel, model: model.modelId, usage, creditsCharged: SAULE_CREDIT_COST });
      await deductCredits(supabaseAdmin, businessId, SAULE_CREDIT_COST);
      // A tool (capture_lead / capture_access_request) was available this turn, but the model
      // never invoked it and still wrote a confirmation-sounding reply — i.e. it told the visitor
      // their info was saved when nothing was written to the DB. Log so this is visible in server
      // logs instead of silently losing real leads/access requests (caught in production, 2026-07-18).
      if (captureToolAvailable && toolCalls.length === 0 && CONFIRMATION_PATTERN.test(text || '')) {
        console.warn('[runSauleTurn] possible unconfirmed capture: model claimed success without calling a tool', {
          businessId,
          conversationId,
          isDemoBusiness,
          text,
        });
        // Faz 4.4: bu artık sadece Vercel loglarında kalmıyor — kayıp bir lead'in
        // fark edilmesi günler sürmesin diye gerçek zamanlı e-posta bildirimi de gidiyor.
        await notifyAdmin(
          '[runSauleTurn] olası kaydedilmemiş lead/erişim talebi',
          `İşletme: ${businessId}<br/>Konuşma: ${conversationId}<br/>Demo: ${isDemoBusiness}<br/>Model cevabı: ${text}`
        );
      }
    },
  });
}
