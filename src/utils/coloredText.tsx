'use client';

import React, { useEffect, useRef, useState } from 'react';
import { defaultUrlTransform } from 'react-markdown';
import { useTranslations } from 'next-intl';
import { Bold, Underline, Eraser, List, Minus, Check } from 'lucide-react';

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

// react-markdown sanitizes every link/image URL through `urlTransform` before it ever reaches
// `colorLinkComponents.a` above, and its default only allows http(s)/ircs/mailto/xmpp — our
// `style:` pseudo-scheme gets silently blanked to `""`, which is why styled runs rendered as
// plain (unstyled) clickable links to nowhere. Pass our own `style:` URLs through untouched and
// defer to the default sanitizer for everything else, so real links stay protected.
export function styleUrlTransform(url: string): string {
  return url.startsWith('style:') ? url : defaultUrlTransform(url);
}

// Brand orange (--coral in landing.css / the logo's message-bubble color) always listed first.
// `labelKey` resolves via useTranslations('BlockEditor.colorToolbar') in ColoredTextField below —
// kept as translation keys rather than raw strings so the swatch tooltips follow the dashboard's
// selected UI language instead of always showing Turkish.
export const TEXT_COLOR_PRESETS = [
  { labelKey: 'presetBrand', hex: '#FF6A5C' },
  { labelKey: 'presetNavy', hex: '#14231F' },
  { labelKey: 'presetGreen', hex: '#2B6F5C' },
  { labelKey: 'presetWhite', hex: '#FFFFFF' },
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
    // Represent embedded newlines as real <br> elements rather than a literal '\n' character
    // inside a text node — serializeDom already reads BR back as '\n' (see below), and the bullet
    // toolbar's line-detection depends on every line boundary being a real DOM node it can locate,
    // not a character it would have to scan text content for.
    const lines = seg.text.split('\n');
    lines.forEach((line, i) => {
      if (i > 0) root.appendChild(document.createElement('br'));
      if (!line) return;
      if (seg.color || seg.bold || seg.underline) {
        const span = document.createElement('span');
        applyAttrsToSpan(span, seg);
        span.textContent = line;
        root.appendChild(span);
      } else {
        root.appendChild(document.createTextNode(line));
      }
    });
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
  // A styled span can end up empty — contentEditable keeps a dangling `<span>` around after every
  // character inside it is deleted, so the formatting "sticks" for whatever gets typed next. With
  // no text to carry, `[[|b]]` would otherwise get written into the stored string as literal,
  // unparseable content (the syntax requires a non-empty label) — so this drops the marker rather
  // than serializing it, matching the fact that there's nothing there to format.
  if ((attrs.color || attrs.bold || attrs.underline) && el.textContent) {
    parts.push(`[[${el.textContent}|${serializeAttrs(attrs)}]]`);
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

// Plain-text line prefixes toggled by the bullet toolbar buttons below — rendered as literal
// characters (not HTML list markup), since downstream description text is displayed via
// `renderColoredSegments` + `whitespace-pre-line`, not markdown, and needs to survive being
// copy-pasted verbatim into WhatsApp/etc.
const BULLET_PREFIXES = ['• ', '- ', '✓ '];

// Finds the "block" scope that contains `node` for line-splitting purposes: the DIV/P ancestor
// that's a direct child of `root` (contentEditable's one-DIV/P-per-line-on-Enter behavior in
// Chrome/Safari), or `root` itself when there's no such wrapper yet — a single-line field, a
// multiline field before the user has pressed Enter, or Firefox's flat bare-<br> style. `root`
// can itself hold several <br>-separated lines, which findCurrentLine below splits out.
function lineContainerOf(root: HTMLElement, node: Node): HTMLElement {
  // A collapsed selection at the very end of the field commonly reports its container as `root`
  // itself (offset = childNodes.length) rather than inside the last text node — walking up from
  // `root` via parentNode would otherwise escape the field entirely.
  if (node === root) return root;
  let n: Node | null = node;
  while (n && n.parentNode !== root) n = n.parentNode;
  if (n && n.nodeType === Node.ELEMENT_NODE && /^(DIV|P)$/.test((n as HTMLElement).tagName)) {
    return n as HTMLElement;
  }
  return root;
}

// Locates the single line touched by a collapsed point within `block` (a DIV/P line, or root
// itself when lines are just <br>-separated) — the `<br>` immediately before/after the point (if
// any), plus the line's first text node so a bullet prefix can be read/written there. `point` must
// be a collapsed Range at the position to test.
function findCurrentLine(block: HTMLElement, point: Range): { startMarker: HTMLElement | null; textNode: Text | null } {
  let startMarker: HTMLElement | null = null;
  let endMarker: HTMLElement | null = null;
  for (const br of Array.from(block.querySelectorAll('br'))) {
    const parent = br.parentNode;
    if (!parent) continue;
    const idx = Array.prototype.indexOf.call(parent.childNodes, br);
    if (point.comparePoint(parent, idx) < 0) {
      startMarker = br;
    } else {
      endMarker = br;
      break;
    }
  }

  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  walker.currentNode = startMarker || block;
  let textNode = walker.nextNode() as Text | null;
  // A text node found here could belong to the *next* line if the current line is empty —
  // discard it unless it actually precedes this line's end marker.
  if (textNode && endMarker && !(endMarker.compareDocumentPosition(textNode) & Node.DOCUMENT_POSITION_PRECEDING)) {
    textNode = null;
  }
  return { startMarker, textNode };
}

// Toggles `prefix` at the start of the line found by `findCurrentLine`: replaces any other bullet
// prefix already there, or removes `prefix` itself if it's already present (so clicking the same
// bullet button twice turns it back off).
function setLineBullet(block: HTMLElement, point: Range, prefix: string) {
  const { startMarker, textNode } = findCurrentLine(block, point);
  if (textNode) {
    const current = textNode.nodeValue || '';
    const existing = BULLET_PREFIXES.find((p) => current.startsWith(p));
    const stripped = existing ? current.slice(existing.length) : current;
    textNode.nodeValue = existing === prefix ? stripped : prefix + stripped;
    return;
  }
  // Empty line — nothing to toggle off, just insert the marker.
  const newText = document.createTextNode(prefix);
  if (startMarker) {
    startMarker.parentNode!.insertBefore(newText, startMarker.nextSibling);
  } else {
    block.insertBefore(newText, block.firstChild);
  }
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
  const t = useTranslations('BlockEditor.colorToolbar');
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

  // Grabs the current selection, provided it's inside this field and non-empty. Returns the
  // range and its plain text, or null if there's nothing usable to act on.
  const currentSelection = (): { sel: Selection; range: Range; text: string } | null => {
    const root = rootRef.current;
    if (!root) return null;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
    const range = sel.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) return null;
    const text = range.toString();
    if (!text) return null;
    return { sel, range, text };
  };

  // Wraps the current selection in a span carrying `overlay` merged on top of whatever attrs the
  // selection already had (only inherited when the selection exactly matches one existing styled
  // span — a mixed/plain selection just gets `overlay` applied fresh).
  const applyFormat = (overlay: Attrs) => {
    const picked = currentSelection();
    if (!picked) return;
    const { sel, range, text } = picked;

    // Inherit existing attrs when the selection is exactly one styled span (whole or partial —
    // cloneContents normalizes container-level selections like Ctrl+A the same as a text-node
    // drag-select, so both resolve to a single cloned element here). A mixed/plain selection
    // clones to more than one top-level node and falls back to a fresh, unstyled base.
    const clone = range.cloneContents();
    const base: Attrs =
      clone.childNodes.length === 1 && clone.childNodes[0].nodeType === Node.ELEMENT_NODE && (clone.childNodes[0] as HTMLElement).textContent === text
        ? attrsOf(clone.childNodes[0] as HTMLElement)
        : {};

    const merged: Attrs = { ...base, ...overlay };
    const span = document.createElement('span');
    applyAttrsToSpan(span, merged);
    span.textContent = text;
    range.deleteContents();
    range.insertNode(span);
    range.setStartAfter(span);
    range.setEndAfter(span);
    sel.removeAllRanges();
    sel.addRange(range);
    emitChange();
  };

  // Strips all formatting (color/bold/underline) from the current selection — the reliable
  // "undo" for the toolbar buttons above, since re-clicking the same button on a reselected run
  // depends on the selection lining up exactly with an existing styled span, which real
  // click-and-drag selections don't always do.
  const clearFormat = () => {
    const picked = currentSelection();
    if (!picked) return;
    const { sel, range, text } = picked;
    range.deleteContents();
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    sel.removeAllRanges();
    sel.addRange(range);
    emitChange();
  };

  // Toggles a bullet prefix on the line under the caret (or the start of the current selection) —
  // unlike applyFormat/clearFormat this doesn't need a non-empty text selection, since it acts on
  // the whole line rather than a run of characters.
  const toggleBullet = (prefix: string) => {
    const root = rootRef.current;
    if (!root) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) return;

    const block = lineContainerOf(root, range.startContainer);
    const point = document.createRange();
    point.setStart(range.startContainer, range.startOffset);
    point.collapse(true);

    setLineBullet(block, point, prefix);
    emitChange();
  };

  const swatchSize = compact ? 'w-4 h-4' : 'w-6 h-6';
  const formatBtnSize = compact ? 'w-4 h-4' : 'w-6 h-6';
  const formatIconSize = compact ? 10 : 14;

  return (
    <div>
      <div className={`flex items-center gap-1.5 flex-wrap ${compact ? 'mb-1' : 'mb-2'}`}>
        {!compact && <span className="text-xs text-slate-400">{t('label')}</span>}
        {TEXT_COLOR_PRESETS.map((c) => (
          <button
            key={c.hex}
            type="button"
            title={t(c.labelKey)}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat({ color: c.hex })}
            className={`rounded-full border border-slate-300 shadow-sm shrink-0 ${swatchSize}`}
            style={{ backgroundColor: c.hex }}
          />
        ))}
        <CustomColorButton compact={compact} onApply={(hex) => applyFormat({ color: hex })} />
        <button
          type="button"
          title={t('boldTitle')}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyFormat({ bold: true })}
          className={`flex items-center justify-center rounded border border-slate-300 shadow-sm shrink-0 text-slate-600 hover:bg-slate-50 ${formatBtnSize}`}
        >
          <Bold size={formatIconSize} />
        </button>
        <button
          type="button"
          title={t('underlineTitle')}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyFormat({ underline: true })}
          className={`flex items-center justify-center rounded border border-slate-300 shadow-sm shrink-0 text-slate-600 hover:bg-slate-50 ${formatBtnSize}`}
        >
          <Underline size={formatIconSize} />
        </button>
        {multiline && (
          <>
            <button
              type="button"
              title={t('bulletDotTitle')}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => toggleBullet('• ')}
              className={`flex items-center justify-center rounded border border-slate-300 shadow-sm shrink-0 text-slate-600 hover:bg-slate-50 ${formatBtnSize}`}
            >
              <List size={formatIconSize} />
            </button>
            <button
              type="button"
              title={t('bulletDashTitle')}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => toggleBullet('- ')}
              className={`flex items-center justify-center rounded border border-slate-300 shadow-sm shrink-0 text-slate-600 hover:bg-slate-50 ${formatBtnSize}`}
            >
              <Minus size={formatIconSize} />
            </button>
            <button
              type="button"
              title={t('bulletCheckTitle')}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => toggleBullet('✓ ')}
              className={`flex items-center justify-center rounded border border-slate-300 shadow-sm shrink-0 text-slate-600 hover:bg-slate-50 ${formatBtnSize}`}
            >
              <Check size={formatIconSize} />
            </button>
          </>
        )}
        <button
          type="button"
          title={t('clearFormatTitle')}
          onMouseDown={(e) => e.preventDefault()}
          onClick={clearFormat}
          className={`flex items-center justify-center rounded border border-slate-300 shadow-sm shrink-0 text-slate-600 hover:bg-slate-50 ${formatBtnSize}`}
        >
          <Eraser size={formatIconSize} />
        </button>
        {!compact && <span className="text-[10px] text-slate-400">{t('hint')}</span>}
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
        className={`whitespace-pre-wrap overflow-y-auto empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none ${className}`}
      />
    </div>
  );
}

function CustomColorButton({ compact, onApply }: { compact: boolean; onApply: (hex: string) => void }) {
  const t = useTranslations('BlockEditor.colorToolbar');
  const [hex, setHex] = useState('#FF6A5C');
  return (
    <>
      <input
        type="color"
        value={hex}
        onChange={(e) => setHex(e.target.value)}
        onMouseDown={(e) => e.preventDefault()}
        className={`rounded border border-slate-300 cursor-pointer p-0 shrink-0 ${compact ? 'w-4 h-4' : 'w-6 h-6'}`}
        title={t('customColorTitle')}
      />
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onApply(hex)}
        className="text-xs text-[var(--coral)] font-medium hover:underline shrink-0"
      >
        {t('applyBtn')}
      </button>
    </>
  );
}
