// AI SDK v5+: client-sent messages are UIMessage objects with a `parts` array
// (text/tool/file parts) instead of a plain `content` string.
export type UIMessagePart = { type: string; text?: string };
export type IncomingUIMessage = { id?: string; role: string; parts?: UIMessagePart[] };

export function getUIMessageText(message: IncomingUIMessage | undefined): string {
  if (!message?.parts) return '';
  return message.parts.filter((p) => p.type === 'text').map((p) => p.text || '').join('');
}
