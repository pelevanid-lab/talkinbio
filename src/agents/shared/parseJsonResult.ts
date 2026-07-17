/**
 * Models occasionally wrap JSON in prose or a ```json fence despite instructions.
 * Extracts the first {...} or [...] block and parses it; returns null on any failure
 * so callers (cron jobs, content generation) can skip/log instead of throwing.
 */
export function parseJsonResult<T = unknown>(text: string): T | null {
  const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}
