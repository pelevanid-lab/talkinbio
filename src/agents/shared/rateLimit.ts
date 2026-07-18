import type { SupabaseClient } from '@supabase/supabase-js';
import {
  SESSION_OPEN_RATE_LIMIT,
  SESSION_OPEN_RATE_WINDOW_MS,
  SHORT_TERM_FLOOD_LIMIT,
  SHORT_TERM_FLOOD_WINDOW_MS,
  BUSINESS_DAILY_MESSAGE_CAP,
} from './limits';

// Faz 4.1 kötüye kullanım koruması: framework-agnostik kontroller (Faz 2 taşınabilirlik
// kuralına uygun — next/headers gibi Next.js import'u yok, Supabase istemcisi parametre).

export async function checkShortTermFlood(
  supabaseAdmin: SupabaseClient,
  businessId: string,
  visitorSessionId: string
): Promise<boolean> {
  const { data: convs } = await supabaseAdmin
    .from('conversations')
    .select('id')
    .eq('business_id', businessId)
    .eq('visitor_session_id', visitorSessionId);
  const conversationIds = (convs || []).map((c: { id: string }) => c.id);
  if (conversationIds.length === 0) return true;

  const since = new Date(Date.now() - SHORT_TERM_FLOOD_WINDOW_MS).toISOString();
  const { count } = await supabaseAdmin
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .in('conversation_id', conversationIds)
    .eq('role', 'user')
    .gte('created_at', since);

  return (count || 0) < SHORT_TERM_FLOOD_LIMIT;
}

export async function checkSessionOpenRateLimit(
  supabaseAdmin: SupabaseClient,
  businessId: string,
  visitorSessionId: string
): Promise<boolean> {
  const since = new Date(Date.now() - SESSION_OPEN_RATE_WINDOW_MS).toISOString();
  const { count } = await supabaseAdmin
    .from('conversations')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('visitor_session_id', visitorSessionId)
    .gte('created_at', since);

  return (count || 0) < SESSION_OPEN_RATE_LIMIT;
}

export async function checkBusinessDailyCap(
  supabaseAdmin: SupabaseClient,
  businessId: string
): Promise<boolean> {
  const startOfDayUtc = new Date();
  startOfDayUtc.setUTCHours(0, 0, 0, 0);

  const { count } = await supabaseAdmin
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('role', 'user')
    .gte('created_at', startOfDayUtc.toISOString());

  return (count || 0) < BUSINESS_DAILY_MESSAGE_CAP;
}

export type AbuseLimitReason = 'flood' | 'session-open' | 'daily-cap';

const MESSAGES: Record<AbuseLimitReason, Record<'tr' | 'en' | 'ru', string>> = {
  flood: {
    tr: 'Kısa sürede çok fazla mesaj gönderildi. Lütfen birkaç dakika sonra tekrar deneyin.',
    en: 'Too many messages sent in a short time. Please try again in a few minutes.',
    ru: 'Слишком много сообщений за короткое время. Пожалуйста, попробуйте снова через несколько минут.',
  },
  'session-open': {
    tr: 'Çok fazla yeni sohbet açıldı. Lütfen bir süre sonra tekrar deneyin.',
    en: 'Too many new chats were started. Please try again later.',
    ru: 'Слишком много новых чатов было открыто. Пожалуйста, попробуйте позже.',
  },
  'daily-cap': {
    tr: 'Bugün için mesaj sınırına ulaşıldı. Lütfen yarın tekrar deneyin veya işletmeyle doğrudan iletişime geçin.',
    en: "Today's message limit has been reached. Please try again tomorrow or contact the business directly.",
    ru: 'Достигнут дневной лимит сообщений. Пожалуйста, попробуйте завтра или свяжитесь с бизнесом напрямую.',
  },
};

export function getAbuseLimitMessage(
  reason: AbuseLimitReason,
  locale: string | null,
  directLinks: string[] = []
): string {
  const localeKey = (locale === 'en' || locale === 'ru' ? locale : 'tr') as 'tr' | 'en' | 'ru';
  const base = MESSAGES[reason][localeKey];
  if (reason === 'daily-cap' && directLinks.length > 0) {
    return `${base} ${directLinks.join(', ')}`;
  }
  return base;
}
