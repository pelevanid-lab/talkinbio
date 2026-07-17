import type { SupabaseClient } from '@supabase/supabase-js';

// Faz 1.2: geçmiş her zaman DB'den kurulur, istemciden gelen dizi güvenilmez.
export const HISTORY_WINDOW = 30;

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

export async function loadConversationHistory(
  supabase: SupabaseClient,
  conversationId: string,
  limit: number = HISTORY_WINDOW
): Promise<ChatMessage[]> {
  const { data } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return ((data || []) as ChatMessage[]).reverse();
}
