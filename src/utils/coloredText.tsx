import React from 'react';

// Shared authoring syntax for inline text color, entered via the manual editor's color picker
// (or typed by hand): `[[metin|#RRGGBB]]`. Two render paths consume it — plain headings/titles
// (renderColoredSegments, no markdown) and full markdown bodies (toColorMarkdown + colorLinkComponents,
// piggybacking on ReactMarkdown's own link syntax so bold/italic/lists inside the same text still work).
const COLOR_SYNTAX = /\[\[([^\]]+?)\|(#[0-9a-fA-F]{6})\]\]/g;

export function renderColoredSegments(text: string): React.ReactNode {
  if (!text || !text.includes('[[')) return text;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(COLOR_SYNTAX);
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    parts.push(<span key={key++} style={{ color: match[2] }}>{match[1]}</span>);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length ? parts : text;
}

export function toColorMarkdown(text: string): string {
  if (!text) return text;
  return text.replace(COLOR_SYNTAX, (_m, label, hex) => `[${label}](color:${hex})`);
}

// Plain text with the color markup removed — for places that need the raw string, not a rendered
// node (e.g. the FAQ "chips" variant sends item.question verbatim into the chat as a visitor message).
export function stripColorSyntax(text: string): string {
  if (!text) return text;
  return text.replace(COLOR_SYNTAX, (_m, label) => label);
}

export const colorLinkComponents = {
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => {
    if (typeof href === 'string' && href.startsWith('color:')) {
      return <span style={{ color: href.slice('color:'.length) }}>{children}</span>;
    }
    return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
  },
};

// Brand orange (--coral in landing.css / the logo's message-bubble color) always listed first.
export const TEXT_COLOR_PRESETS = [
  { label: 'Marka Turuncusu', hex: '#FF6A5C' },
  { label: 'Koyu Lacivert', hex: '#14231F' },
  { label: 'Yeşil', hex: '#2B6F5C' },
  { label: 'Beyaz', hex: '#FFFFFF' },
] as const;

// Wraps the currently-selected substring of a focused input/textarea with the color syntax.
// No-op if nothing is selected in that field.
export function wrapSelectionWithColor(
  el: HTMLTextAreaElement | HTMLInputElement | null,
  value: string,
  hex: string
): string | null {
  if (!el) return null;
  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? 0;
  if (start === end) return null;
  const selected = value.slice(start, end);
  return value.slice(0, start) + `[[${selected}|${hex}]]` + value.slice(end);
}
