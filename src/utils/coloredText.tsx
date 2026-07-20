'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Bold, Underline } from 'lucide-react';

// Shared authoring syntax for inline text styling, entered via the manual editor's toolbar
// (ColoredTextField below) or typed by hand: `[[metin|attrs]]`, where attrs is a `;`-separated
// mix of an optional `#RRGGBB` color plus `b` (bold) / `u` (underline) flags, e.g. `#FF6A5C`,
// `b`, `u`, `#FF6A5C;b;u`. Two render paths consume it — plain headings/titles
// (renderColoredSegments, no markdown) and full markdown bodies (toColorMarkdown +
// colorLinkComponents, piggybacking on ReactMarkdown's own link syntax so bold/italic/lists
// inside the same text still work).
const COLOR_SYNTAX = /\[\[([^\]]+?)\|((?:#[0-9a-fA-F]{6}|b|u)(?:;(?:#[0-9a-fA-F]{6}|b|u))*)\]\]/g;

type Attrs = { color?: string; bold?: boolean; underline?: boolean };

function parseAttrs(attrs: string): Attrs {
  const tokens = attrs.split(';').filter(Boolean);
  return {
    color: tokens.find((t) => t.startsWith('#')),
    bold: tokens.includes('b'),
    underline: tokens.includes('u'),
  };
}

function serializeAttrs(attrs: Attrs): string {
  return [attrs.color, attrs.bold && 'b', attrs.underline && 'u'].filter(Boolean).join(';');
}

function styleFor(attrs: Attrs): React.CSSProperties {
  return {
    color: attrs.color,
    fontWeight: attrs.bold ? 700 : undefined,
    textDecoration: attrs.underline ? 'underline' : undefined,
  };
}

export function parseColorSegments(text: string): Array<{ text: string } & Attrs> {
  if (!text) return [];
  const segments: Array<{ text: string } & Attrs> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(COLOR_SYNTAX);
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) segments.push({ text: text.slice(lastIndex, match.index) });
    segments.push({ text: match[1], ...parseAttrs(match[2]) });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) segments.push({ text: text.slice(lastIndex) });
  return segments;
}

export function renderColoredSegments(text: string): React.ReactNode {
  if (!text || !text.includes('[[')) return text;
  const segments = parseColorSegments(text);
  return segments.map((seg, i) =>
    seg.color || seg.bold || seg.underline
      ? <span key={i} style={styleFor(seg)}>{seg.text}</span>
      : <React.Fragment key={i}>{seg.text}</React.Fragment>
  );
}

export function toColorMarkdown(text: string): string {
  if (!text) return text;
  return text.replace(COLOR_SYNTAX, (_m, label, attrs) => `[${label}](style:${attrs})`);
}

// Plain text with the color markup removed — for places that need the raw string, not a rendered
// node (e.g. the FAQ "chips" variant sends item.question verbatim into the chat as a visitor message).
export function stripColorSyntax(text: string): string {
  if (!text) return text;
  return text.replace(COLOR_SYNTAX, (_m, label) => label);
}

export const colorLinkComponents = {
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => {
    if (typeof href === 'string' && href.startsWith('style:')) {
      return <span style={styleFor(parseAttrs(href.slice('style:'.length)))}>{children}</span>;
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

// --- DOM <-> `[[text|attrs]]` syntax bridge for ColoredTextField ---------------------------

function attrsOf(el: HTMLElement): Attrs {
  return {
    color: el.getAttribute('data-color') || undefined,
    bold: el.getAttribute('data-bold') === 'true',
    underline: el.getAttribute('data-underline') === 'true',
  };
}

function applyAttrsToSpan(span: HTMLElement, attrs: Attrs) {
  if (attrs.color) span.setAttribute('data-color', attrs.color);
  if (attrs.bold) span.setAttribute('data-bold', 'true');
  if (attrs.underline) span.setAttribute('data-underline', 'true');
  Object.assign(span.style, styleFor(attrs));
}

function buildDom(root: HTMLElement, text: string) {
  root.innerHTML = '';
  for (const seg of parseColorSegments(text)) {
    if (seg.color || seg.bold || seg.underline) {
      const span = document.createElement('span');
      applyAttrsToSpan(span, seg);
      span.textContent = seg.text;
      root.appendChild(span);
    } else {
      root.appendChild(document.createTextNode(seg.text));
    }
  }
}

// Recursively flattens one inline node (text node, styled span, or a stray formatting element
// the browser inserted) back into the `[[text|attrs]]` syntax.
function serializeInline(node: ChildNode, parts: string[]) {
  if (node.nodeType === Node.TEXT_NODE) {
    parts.push(node.nodeValue || '');
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as HTMLElement;
  if (el.tagName === 'BR') {
    parts.push('\n');
    return;
  }
  const attrs = attrsOf(el);
  if (attrs.color || attrs.bold || attrs.underline) {
    parts.push(`[[${el.textContent || ''}|${serializeAttrs(attrs)}]]`);
    return;
  }
  el.childNodes.forEach((child) => serializeInline(child, parts));
}

// contentEditable inserts a <div>/<p> per line (Chrome/Safari) or bare <br> (Firefox) on Enter —
// normalize both back into plain '\n' characters so the stored string round-trips through
// parseColorSegments/buildDom the same way it would if the user had typed '\n' directly.
function serializeDom(root: HTMLElement): string {
  const parts: string[] = [];
  root.childNodes.forEach((node) => {
    const el = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : null;
    if (el && /^(DIV|P)$/.test(el.tagName)) {
      // Any content already accumulated (text or a prior block) ends at this block boundary.
      if (parts.length > 0) parts.push('\n');
      if (el.innerHTML.toLowerCase() !== '<br>') {
        el.childNodes.forEach((child) => serializeInline(child, parts));
      }
    } else {
      serializeInline(node, parts);
    }
  });
  return parts.join('');
}

// Drop-in replacement for a plain <input>/<textarea> that lets the user select a run of text and
// click color/bold/underline to style it — the field shows the actual styled text instead of the
// raw `[[text|attrs]]` syntax. The stored/emitted value still uses that syntax, so nothing
// downstream (ArchetypeRenderer, saved content) needs to change.
export function ColoredTextField({
  value,
  onChange,
  multiline = false,
  placeholder,
  className = '',
  compact = false,
}: {
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
  className?: string;
  compact?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef<string | null>(null);

  useEffect(() => {
    if (value === lastEmitted.current) return;
    if (rootRef.current) buildDom(rootRef.current, value);
    lastEmitted.current = value;
  }, [value]);

  const emitChange = () => {
    if (!rootRef.current) return;
    const next = serializeDom(rootRef.current);
    lastEmitted.current = next;
    onChange(next);
  };

  // Wraps the current selection in a span carrying `overlay` merged on top of whatever attrs the
  // selection already had (only inherited when the selection exactly matches one existing styled
  // span — a mixed/plain selection just gets `overlay` applied fresh, same as color always did).
  const applyFormat = (overlay: Attrs) => {
    const root = rootRef.current;
    if (!root) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) return;
    const text = range.toString();
    if (!text) return;

    // Inherit existing attrs when the selection is exactly one styled span (whole or partial —
    // cloneContents normalizes container-level selections like Ctrl+A the same as a text-node
    // drag-select, so both resolve to a single cloned element here). A mixed/plain selection
    // clones to more than one top-level node and falls back to a fresh, unstyled base.
    const clone = range.cloneContents();
    const base: Attrs =
      clone.childNodes.length === 1 && clone.childNodes[0].nodeType === Node.ELEMENT_NODE && (clone.childNodes[0] as HTMLElement).textContent === text
        ? attrsOf(clone.childNodes[0] as HTMLElement)
        : {};

    const span = document.createElement('span');
    applyAttrsToSpan(span, { ...base, ...overlay });
    span.textContent = text;
    range.deleteContents();
    range.insertNode(span);
    range.setStartAfter(span);
    range.setEndAfter(span);
    sel.removeAllRanges();
    sel.addRange(range);
    emitChange();
  };

  const swatchSize = compact ? 'w-4 h-4' : 'w-6 h-6';
  const formatBtnSize = compact ? 'w-4 h-4' : 'w-6 h-6';
  const formatIconSize = compact ? 10 : 14;

  return (
    <div>
      <div className={`flex items-center gap-1.5 flex-wrap ${compact ? 'mb-1' : 'mb-2'}`}>
        {!compact && <span className="text-xs text-slate-400">Renk:</span>}
        {TEXT_COLOR_PRESETS.map((c) => (
          <button
            key={c.hex}
            type="button"
            title={c.label}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat({ color: c.hex })}
            className={`rounded-full border border-slate-300 shadow-sm shrink-0 ${swatchSize}`}
            style={{ backgroundColor: c.hex }}
          />
        ))}
        <CustomColorButton compact={compact} onApply={(hex) => applyFormat({ color: hex })} />
        <button
          type="button"
          title="Kalın"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyFormat({ bold: true })}
          className={`flex items-center justify-center rounded border border-slate-300 shadow-sm shrink-0 text-slate-600 hover:bg-slate-50 ${formatBtnSize}`}
        >
          <Bold size={formatIconSize} />
        </button>
        <button
          type="button"
          title="Altı Çizili"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyFormat({ underline: true })}
          className={`flex items-center justify-center rounded border border-slate-300 shadow-sm shrink-0 text-slate-600 hover:bg-slate-50 ${formatBtnSize}`}
        >
          <Underline size={formatIconSize} />
        </button>
        {!compact && <span className="text-[10px] text-slate-400">— metni seçip bir renge/biçime tıkla</span>}
      </div>
      <div
        ref={rootRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={emitChange}
        onKeyDown={(e) => {
          if (!multiline && e.key === 'Enter') e.preventDefault();
        }}
        onPaste={(e) => {
          e.preventDefault();
          const text = e.clipboardData.getData('text/plain');
          document.execCommand('insertText', false, multiline ? text : text.replace(/\n/g, ' '));
        }}
        className={`whitespace-pre-wrap empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none ${className}`}
      />
    </div>
  );
}

function CustomColorButton({ compact, onApply }: { compact: boolean; onApply: (hex: string) => void }) {
  const [hex, setHex] = useState('#FF6A5C');
  return (
    <>
      <input
        type="color"
        value={hex}
        onChange={(e) => setHex(e.target.value)}
        onMouseDown={(e) => e.preventDefault()}
        className={`rounded border border-slate-300 cursor-pointer p-0 shrink-0 ${compact ? 'w-4 h-4' : 'w-6 h-6'}`}
        title="Özel renk"
      />
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onApply(hex)}
        className="text-xs text-[var(--coral)] font-medium hover:underline shrink-0"
      >
        Uygula
      </button>
    </>
  );
}
