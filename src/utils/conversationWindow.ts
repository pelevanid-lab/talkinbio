// Faz 1.3: bir konuşma, son mesajından 7 gün geçtiyse "aktif" sayılmaz — yeni konuşma açılır.
export const CONVERSATION_ACTIVE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function isConversationActive(lastMessageAt: string | null | undefined, createdAt: string): boolean {
  const lastActivity = new Date(lastMessageAt || createdAt).getTime();
  return Date.now() - lastActivity < CONVERSATION_ACTIVE_WINDOW_MS;
}
