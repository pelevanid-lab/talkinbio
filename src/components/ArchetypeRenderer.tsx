'use client';

import { DEFAULT_THEME, Theme, resolveThemeColors } from '@/config/archetypes';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Mail, MessageCircle, Link as LinkIcon, AtSign } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useLocale } from 'next-intl';
import { renderColoredSegments, toColorMarkdown, colorLinkComponents, stripColorSyntax, styleUrlTransform } from '@/utils/coloredText';
import { defaultTitleFor, getHoursLabels, type DayKey } from '@/config/localeTitles';
import { isVideoUrl } from '@/utils/mediaType';
import { iconForLinkUrl } from '@/utils/linkIcon';

type RenderCtx = {
  locale: string;
  radiusClass: string;
  headingFont: string;
  theme: Theme;
  // true when theme.layoutStyle === 'card-heavy' — consumed by renderers whose default look
  // (about-standard, contact/custom text) has no card chrome of its own. Renderers that already
  // wrap their items in cards/chips (services, gallery, testimonials, hours, faq, links) ignore it.
  cardWrap: boolean;
};

// Static Tailwind class lookups (never string-interpolated — Tailwind needs literal class names to compile them).
const SECTION_GAP_CLASS: Record<string, string> = {
  compact: 'gap-6',
  spacious: 'gap-16',
  'card-heavy': 'gap-8',
  flat: 'gap-10',
};

// Each block type is rendered by a small, self-contained function registered below.
// New block types should only need to add a function + a registry entry here —
// an unregistered type logs a dev warning instead of silently disappearing (see BLOCK_RENDERERS usage below).
const CONTACT_METHOD_LABELS: Record<string, Record<string, string>> = {
  whatsapp: { tr: 'Telefon & WhatsApp', en: 'Phone & WhatsApp', ru: 'Телефон и WhatsApp' },
  instagram: { tr: 'Instagram', en: 'Instagram', ru: 'Instagram' },
  email: { tr: 'E-posta', en: 'Email', ru: 'Email' },
  telegram: { tr: 'Telegram', en: 'Telegram', ru: 'Telegram' },
};

// Falls back to the locale's fixed section label (shared with Beiwe's tools and the editor
// modal) for rows saved before per-locale titles were stored in content, or after a locale's
// title was cleared in the editor to reset it.
function blockTitleOf(block: any, locale: string) {
  return block.content?.[locale]?.title || defaultTitleFor(block.type, locale) || block.title || block.type;
}

// Wraps bare content in a surface card when the archetype's layoutStyle calls for it (see RenderCtx.cardWrap).
function withCardWrap(content: React.ReactNode, blockId: string, ctx: RenderCtx) {
  if (!ctx.cardWrap) {
    return <section key={blockId} className="pt-4">{content}</section>;
  }
  return (
    <div key={blockId} className={`border p-6 sm:p-8 ${ctx.radiusClass}`} style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
      {content}
    </div>
  );
}

type BackgroundOverlay = 'dark' | 'light' | 'tint' | 'none';

// Wraps content with an optional background image + overlay (content.backgroundImage / content.backgroundOverlay).
// Falls back to withCardWrap when there's no background image, so callers can use this unconditionally
// regardless of which layoutVariant they ended up rendering.
function withSectionBackground(
  content: React.ReactNode,
  blockId: string,
  ctx: RenderCtx,
  backgroundImage: string | undefined,
  overlay: BackgroundOverlay = 'dark'
) {
  if (!backgroundImage) {
    return withCardWrap(content, blockId, ctx);
  }
  return (
    <div key={blockId} className={`relative overflow-hidden ${ctx.radiusClass} p-6 sm:p-10`}>
      <div className="absolute inset-0 z-0">
        <img src={backgroundImage} alt="" className="w-full h-full object-cover" />
        {overlay === 'dark' && <div className="absolute inset-0 bg-black/60" />}
        {overlay === 'light' && <div className="absolute inset-0 bg-white/70" />}
        {overlay === 'tint' && <div className="absolute inset-0" style={{ backgroundColor: ctx.theme.colors.primary, opacity: 0.55 }} />}
      </div>
      <div className="relative z-10" style={overlay === 'light' ? undefined : { color: '#fff' }}>
        {content}
      </div>
    </div>
  );
}

function renderAbout(block: any, ctx: RenderCtx) {
  const { locale, radiusClass, headingFont } = ctx;
  const blockTitle = blockTitleOf(block, locale);
  const layoutVariant = block.content?.layoutVariant || 'standard';
  const pos = block.content?.mediaPosition || 'middle';
  const aboutText = block.content?.[locale]?.text || block.content?.text || '';
  const mediaUrl = block.content?.mediaUrl;
  // content.items (optional): extra small images for the `image-grid` variant, e.g. [{ url }, { url }, { url }]
  const galleryItems: any[] = block.content?.items || [];

  if (layoutVariant === 'big-statement') {
    return (
      <section key={block.id} className="pt-8 pb-4 text-center max-w-2xl mx-auto">
        <h2 className={`text-5xl sm:text-6xl leading-[1.05] mb-6 font-bold ${headingFont}`} style={{ color: 'var(--text)' }}>
          {renderColoredSegments(blockTitle)}
        </h2>
        <div className="markdown-body opacity-80 text-lg leading-relaxed">
          <ReactMarkdown components={colorLinkComponents} urlTransform={styleUrlTransform}>{toColorMarkdown(aboutText)}</ReactMarkdown>
        </div>
      </section>
    );
  }

  if (layoutVariant === 'image-grid') {
    const images = (mediaUrl ? [{ url: mediaUrl }] : []).concat(galleryItems).slice(0, 3);
    return (
      <section key={block.id} className="pt-4">
        <h2 className={`text-3xl mb-6 font-bold ${headingFont}`} style={{ color: 'var(--text)' }}>
          {renderColoredSegments(blockTitle)}
        </h2>
        {images.length > 0 && (
          <div className={`grid ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-3 mb-6`}>
            {images.map((img, idx) => (
              <div
                key={idx}
                className={`overflow-hidden ${radiusClass} ${images.length === 3 && idx === 0 ? 'col-span-2 h-48' : 'h-32'}`}
              >
                <img src={img.url} alt={blockTitle} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}
        <div className="markdown-body opacity-90 text-[15px]">
          <ReactMarkdown components={colorLinkComponents} urlTransform={styleUrlTransform}>{toColorMarkdown(aboutText)}</ReactMarkdown>
        </div>
      </section>
    );
  }

  if (layoutVariant === 'hero-overlay' && mediaUrl) {
    // Fixed height rather than `vh` — this section always renders inside a narrow, already-scrollable
    // column (editor mockup frame or the live page's own scroll area, both with a fixed-height chat
    // dock reserved below), so viewport-height units measure the wrong box and can make the hero
    // balloon far taller than the space actually available.
    return (
      <section key={block.id} className={`relative overflow-hidden ${radiusClass} h-[440px] shadow-xl flex items-end group`}>
        <div className="absolute inset-0 z-0">
          {isVideoUrl(mediaUrl) ? (
            <video src={mediaUrl} className="w-full h-full object-cover" autoPlay loop muted playsInline />
          ) : (
            <img src={mediaUrl} alt={blockTitle} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
        </div>
        <div className="relative z-10 p-6 sm:p-8 w-full text-white">
          <h2 className={`text-4xl sm:text-5xl mb-4 font-bold ${headingFont}`}>{renderColoredSegments(blockTitle)}</h2>
          <div className="markdown-body opacity-90 text-[15px] sm:text-base text-white/90">
            <ReactMarkdown components={colorLinkComponents} urlTransform={styleUrlTransform}>{toColorMarkdown(aboutText)}</ReactMarkdown>
          </div>
        </div>
      </section>
    );
  }

  if (layoutVariant === 'split-card' && mediaUrl) {
    // Always side-by-side: this renders inside a narrow (max-w-md) column in every real
    // usage (editor mockup + published page), so a `md:` viewport breakpoint never reflects
    // the actual available width — it used to squeeze the image into a sliver whenever the
    // surrounding browser window was wide, regardless of how narrow this column actually was.
    return (
      <section key={block.id} className="pt-4">
        <div className={`flex flex-row overflow-hidden border shadow-md ${radiusClass}`} style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="w-2/5 shrink-0 relative">
            {isVideoUrl(mediaUrl) ? (
              <video src={mediaUrl} className="w-full h-full object-cover absolute inset-0" autoPlay loop muted playsInline />
            ) : (
              <img src={mediaUrl} alt={blockTitle} className="w-full h-full object-cover absolute inset-0" />
            )}
          </div>
          <div className="w-3/5 p-4 sm:p-6 flex flex-col justify-center">
            <h2 className={`text-xl sm:text-2xl mb-2 font-bold ${headingFont}`} style={{ color: 'var(--text)' }}>
              {renderColoredSegments(blockTitle)}
            </h2>
            <div className="markdown-body opacity-90 text-sm">
              <ReactMarkdown components={colorLinkComponents} urlTransform={styleUrlTransform}>{toColorMarkdown(aboutText)}</ReactMarkdown>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Standard layout
  const MediaElement = mediaUrl ? (
    <div className={`overflow-hidden shadow-sm ${radiusClass} ${pos === 'middle' ? 'my-6' : pos === 'top' ? 'mb-6' : 'mt-6'}`}>
      {isVideoUrl(mediaUrl) ? (
        <video src={mediaUrl} className="w-full max-h-96 object-cover" controls />
      ) : (
        <img src={mediaUrl} alt={blockTitle} className="w-full max-h-96 object-cover" />
      )}
    </div>
  ) : null;

  return withSectionBackground(
    <>
      {pos === 'top' && MediaElement}
      <h2 className={`text-3xl mb-6 font-bold ${headingFont}`} style={{ color: 'var(--text)' }}>
        {renderColoredSegments(blockTitle)}
      </h2>
      {pos === 'middle' && MediaElement}
      <div className="markdown-body opacity-90 text-[15px]">
        <ReactMarkdown components={colorLinkComponents} urlTransform={styleUrlTransform}>{toColorMarkdown(aboutText)}</ReactMarkdown>
      </div>
      {pos === 'bottom' && MediaElement}
    </>,
    block.id,
    ctx,
    block.content?.backgroundImage,
    block.content?.backgroundOverlay
  );
}

// Shared by `contact` and `custom` — a simple text section, same content shape/locale reading as `about`'s standard layout.
// `custom` also supports an in-flow mediaUrl/mediaPosition now (BlockEditorModal), same
// before/between/after placement as `about`'s standard layout — it used to only support a
// full-bleed backgroundImage, with no way to put an actual photo next to the text.
function renderTextBlock(block: any, ctx: RenderCtx) {
  const { locale, headingFont, radiusClass } = ctx;
  const blockTitle = blockTitleOf(block, locale);
  const text = block.content?.[locale]?.text || block.content?.text || '';
  if (!text) return null;

  const mediaUrl = block.content?.mediaUrl;
  const pos = block.content?.mediaPosition || 'middle';
  const MediaElement = mediaUrl ? (
    <div className={`overflow-hidden shadow-sm ${radiusClass} ${pos === 'middle' ? 'my-6' : pos === 'top' ? 'mb-6' : 'mt-6'}`}>
      {isVideoUrl(mediaUrl) ? (
        <video src={mediaUrl} className="w-full max-h-96 object-cover" controls />
      ) : (
        <img src={mediaUrl} alt={blockTitle} className="w-full max-h-96 object-cover" />
      )}
    </div>
  ) : null;

  return withSectionBackground(
    <>
      {pos === 'top' && MediaElement}
      <h2 className={`text-3xl mb-6 font-bold ${headingFont}`} style={{ color: 'var(--text)' }}>
        {renderColoredSegments(blockTitle)}
      </h2>
      {pos === 'middle' && MediaElement}
      <div className="markdown-body opacity-90 text-[15px]">
        <ReactMarkdown components={colorLinkComponents} urlTransform={styleUrlTransform}>{toColorMarkdown(text)}</ReactMarkdown>
      </div>
      {pos === 'bottom' && MediaElement}
    </>,
    block.id,
    ctx,
    block.content?.backgroundImage,
    block.content?.backgroundOverlay
  );
}

function renderServices(block: any, ctx: RenderCtx) {
  const { locale, radiusClass, headingFont, theme } = ctx;
  const blockTitle = blockTitleOf(block, locale);
  const layoutVariant = block.content?.layoutVariant || 'grid-cards';
  const items: any[] = block.content?.items || [];

  let inner: React.ReactNode;

  if (layoutVariant === 'numbered-list') {
    inner = (
      <>
        <h2 className={`text-2xl mb-6 font-bold ${headingFont}`}>{renderColoredSegments(blockTitle)}</h2>
        <div className="space-y-6">
          {items.map((item, idx) => {
            const itemLoc = item[locale] || item;
            return (
              <div key={idx} className="flex items-start gap-4 pb-6 border-b last:border-0 last:pb-0" style={{ borderColor: 'var(--border)' }}>
                <span className={`text-4xl leading-none opacity-30 shrink-0 ${headingFont}`} style={{ color: 'var(--primary)' }}>
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div className="flex-1">
                  <div className="flex justify-between items-start gap-4">
                    <h4 className={`font-semibold text-lg ${headingFont}`}>{renderColoredSegments(itemLoc.title || item.title)}</h4>
                    {item.price && <span className="font-mono text-sm shrink-0" style={{ color: 'var(--text-muted)' }}>{item.price}</span>}
                  </div>
                  {(itemLoc.description || item.description) && (
                    <p className="text-sm mt-1 opacity-80" style={{ color: 'var(--text-muted)' }}>{renderColoredSegments(itemLoc.description || item.description)}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  } else if (layoutVariant === 'feature-split') {
    inner = (
      <>
        <h2 className={`text-2xl mb-6 font-bold ${headingFont}`}>{renderColoredSegments(blockTitle)}</h2>
        <div className="flex flex-col gap-8">
          {items.map((item, idx) => {
            const itemLoc = item[locale] || item;
            const reverse = idx % 2 === 1;
            return (
              <div key={idx} className={`flex ${reverse ? 'flex-row-reverse' : 'flex-row'} gap-4 items-center`}>
                {item.mediaUrl && (
                  <div className={`w-2/5 shrink-0 h-32 overflow-hidden ${radiusClass}`}>
                    {isVideoUrl(item.mediaUrl) ? (
                      <video src={item.mediaUrl} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                    ) : (
                      <img src={item.mediaUrl} alt={itemLoc.title || ''} className="w-full h-full object-cover" />
                    )}
                  </div>
                )}
                <div className={item.mediaUrl ? 'w-3/5' : 'w-full'}>
                  <h4 className={`text-xl font-semibold mb-2 ${headingFont}`}>{renderColoredSegments(itemLoc.title || item.title)}</h4>
                  {(itemLoc.description || item.description) && (
                    <p className="text-sm opacity-80 mb-3" style={{ color: 'var(--text-muted)' }}>{renderColoredSegments(itemLoc.description || item.description)}</p>
                  )}
                  {item.price && (
                    <span className="font-mono px-3 py-1 rounded-full text-sm inline-block" style={{ backgroundColor: 'var(--primary)', color: '#fff' }}>
                      {item.price}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  } else if (layoutVariant === 'price-table') {
    inner = (
      <>
        <h2 className={`text-2xl mb-6 font-bold ${headingFont}`}>{renderColoredSegments(blockTitle)}</h2>
        <div className="space-y-1">
          {items.map((item, idx) => {
            const itemLoc = item[locale] || item;
            return (
              <div key={idx} className="flex items-baseline gap-3 py-3 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                <span className={`font-semibold ${headingFont}`}>{renderColoredSegments(itemLoc.title || item.title)}</span>
                <span className="flex-1 border-b border-dotted opacity-30 translate-y-[-4px]" style={{ borderColor: 'var(--text-muted)' }} />
                {item.price && <span className="font-mono text-sm shrink-0">{item.price}</span>}
                {(itemLoc.description || item.description) && (
                  <span className="w-full basis-full text-sm mt-1 opacity-70" style={{ color: 'var(--text-muted)' }}>{renderColoredSegments(itemLoc.description || item.description)}</span>
                )}
              </div>
            );
          })}
        </div>
      </>
    );
  } else {
    inner = (
      <>
        <h2 className={`text-2xl mb-6 font-bold ${headingFont}`}>{renderColoredSegments(blockTitle)}</h2>
        <div className={layoutVariant === 'grid-cards' ? "grid grid-cols-1 sm:grid-cols-2 gap-4" : "space-y-4"}>
          {items.map((item: any, idx: number) => {
            const itemLoc = item[locale] || item;
            const pos = item.mediaPosition || 'top';
            
            // "top"/"bottom" is documented (and labeled in the editor) as before/after the text,
            // i.e. vertical stacking — 'list' used to instead render it as a small side-by-side
            // thumbnail (flex-row/flex-row-reverse on wider screens), which silently ignored the
            // picked position and contradicted its own "alt alta" (stacked) design intent.
            // aspect-square (not a fixed h-40 band) — a fixed short height on a full-width card
            // crops a landscape photo down to a thin strip; a square crop, Instagram-style, keeps
            // enough of the actual photo visible regardless of the card's width.
            const MediaEl = item.mediaUrl && theme.mediaProfile !== 'minimal' ? (
              isVideoUrl(item.mediaUrl) ? (
                <video src={item.mediaUrl} className={`object-cover ${radiusClass} w-full aspect-square ${pos === 'bottom' ? 'mt-4' : 'mb-4'}`} autoPlay loop muted playsInline />
              ) : (
                <img src={item.mediaUrl} alt={itemLoc.title || ''} className={`object-cover ${radiusClass} w-full aspect-square ${pos === 'bottom' ? 'mt-4' : 'mb-4'}`} />
              )
            ) : null;

            return (
              <div
                key={idx}
                className={`p-5 border transition-transform hover:-translate-y-1 ${radiusClass} flex flex-col`}
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
              >
                {pos !== 'bottom' && MediaEl}
                <div className={`flex-1 ${layoutVariant === 'list' ? 'w-full' : 'flex justify-between items-start gap-4 w-full'}`}>
                  <div>
                    <h4 className={`font-semibold text-lg ${headingFont}`}>{renderColoredSegments(itemLoc.title || item.title)}</h4>
                    {(itemLoc.description || item.description) && (
                      <p className="text-sm mt-2 opacity-80" style={{ color: 'var(--text-muted)' }}>
                        {renderColoredSegments(itemLoc.description || item.description)}
                      </p>
                    )}
                  </div>
                  {item.price && (
                    <div className={layoutVariant === 'list' ? 'mt-3 sm:mt-0 sm:ml-auto shrink-0' : 'shrink-0'}>
                      <span
                        className="font-mono font-medium px-3 py-1 rounded-full text-sm whitespace-nowrap inline-block"
                        style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
                      >
                        {item.price}
                      </span>
                    </div>
                  )}
                </div>
                {pos === 'bottom' && MediaEl}
              </div>
            );
          })}
        </div>
      </>
    );
  }

  return withSectionBackground(inner, block.id, ctx, block.content?.backgroundImage, block.content?.backgroundOverlay);
}

const DAY_KEYS_BY_JS_INDEX: DayKey[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function renderHours(block: any, ctx: RenderCtx) {
  const { locale, radiusClass, headingFont } = ctx;
  const blockTitle = blockTitleOf(block, locale);
  const layoutVariant = block.content?.layoutVariant || 'table';
  const labels = getHoursLabels(locale);

  if (layoutVariant === 'pill-row') {
    return (
      <section key={block.id}>
        <h2 className={`text-2xl mb-6 font-bold ${headingFont}`}>{renderColoredSegments(blockTitle)}</h2>
        <div className="flex flex-wrap gap-2">
          {DAY_KEYS_BY_JS_INDEX.slice(1).concat(DAY_KEYS_BY_JS_INDEX[0]).map((day) => {
            const data = block.content?.schedule?.[day];
            return (
              <span
                key={day}
                title={data?.isOpen ? `${data.openTime} - ${data.closeTime}` : labels.closed}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border ${data?.isOpen ? '' : 'opacity-50'}`}
                style={{
                  backgroundColor: data?.isOpen ? 'var(--primary)' : 'var(--surface)',
                  color: data?.isOpen ? '#fff' : 'var(--text-muted)',
                  borderColor: 'var(--border)',
                }}
              >
                {labels.dayAbbr[day] || day}
              </span>
            );
          })}
        </div>
      </section>
    );
  }

  if (layoutVariant === 'compact-badge') {
    const todayKey = DAY_KEYS_BY_JS_INDEX[new Date().getDay()];
    const todayData = block.content?.schedule?.[todayKey];
    return (
      <section key={block.id}>
        <h2 className={`text-2xl mb-6 font-bold ${headingFont}`}>{renderColoredSegments(blockTitle)}</h2>
        <details className={`border ${radiusClass} overflow-hidden`} style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <summary className="cursor-pointer list-none p-4 flex items-center justify-between [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2 text-sm font-medium">
              <span className={`w-2 h-2 rounded-full ${todayData?.isOpen ? 'bg-green-500' : 'bg-red-500'}`} />
              {todayData?.isOpen ? `${labels.todayOpen} · ${todayData.openTime} - ${todayData.closeTime}` : labels.todayClosed}
            </span>
            <span className="text-xs opacity-60">{labels.allHours}</span>
          </summary>
          <div className="px-4 pb-4 pt-3 border-t space-y-2 font-mono text-xs" style={{ borderColor: 'var(--border)' }}>
            {Object.entries(block.content?.schedule || {}).map(([day, data]: [string, any]) => (
              <div key={day} className="flex justify-between">
                <span className="opacity-70">{labels.days[day as DayKey] || day}</span>
                <span>{data.isOpen ? `${data.openTime} - ${data.closeTime}` : labels.closed}</span>
              </div>
            ))}
          </div>
        </details>
      </section>
    );
  }

  return (
    <section key={block.id}>
      <h2 className={`text-2xl mb-6 font-bold ${headingFont}`}>{renderColoredSegments(blockTitle)}</h2>
      <div
        className={`border p-6 ${radiusClass}`}
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="space-y-3 font-mono text-sm">
          {Object.entries(block.content?.schedule || {}).map(([day, data]: [string, any]) => (
            <div key={day} className="flex justify-between border-b pb-3 last:border-0 last:pb-0" style={{ borderColor: 'var(--border)' }}>
              <span className="capitalize" style={{ color: 'var(--text-muted)' }}>{labels.days[day as DayKey] || day}</span>
              <span className={data.isOpen ? 'font-medium' : 'opacity-60'}>
                {data.isOpen ? `${data.openTime} - ${data.closeTime}` : labels.closed}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function renderFAQ(block: any, ctx: RenderCtx) {
  const { locale, radiusClass, headingFont } = ctx;
  const blockTitle = blockTitleOf(block, locale);
  const layoutVariant = block.content?.layoutVariant || 'chips';

  if (layoutVariant === 'numbered') {
    return (
      <section key={block.id}>
        <h2 className={`text-2xl mb-6 font-bold ${headingFont}`}>{renderColoredSegments(blockTitle)}</h2>
        <div className="space-y-6">
          {(block.content?.items || []).map((item: any, idx: number) => {
            const question = item.question?.[locale] || item.question;
            const answer = item.answer?.[locale] || item.answer;
            return (
            <div key={idx} className="flex items-start gap-4 pb-6 border-b last:border-0 last:pb-0" style={{ borderColor: 'var(--border)' }}>
              <span className={`text-4xl leading-none opacity-30 shrink-0 ${headingFont}`} style={{ color: 'var(--primary)' }}>
                {String(idx + 1).padStart(2, '0')}
              </span>
              <div>
                <h4 className="font-semibold text-base mb-1">{renderColoredSegments(question)}</h4>
                <p className="text-sm opacity-80" style={{ color: 'var(--text-muted)' }}>{renderColoredSegments(answer)}</p>
              </div>
            </div>
            );
          })}
        </div>
      </section>
    );
  }

  if (layoutVariant === 'accordion') {
    return (
      <section key={block.id}>
        <h2 className={`text-2xl mb-6 font-bold ${headingFont}`}>{renderColoredSegments(blockTitle)}</h2>
        <div className="space-y-2">
          {(block.content?.items || []).map((item: any, idx: number) => {
            const question = item.question?.[locale] || item.question;
            const answer = item.answer?.[locale] || item.answer;
            return (
            <details key={idx} className={`border ${radiusClass} overflow-hidden`} style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
              <summary className="cursor-pointer list-none p-4 font-medium text-sm flex justify-between items-center gap-3 [&::-webkit-details-marker]:hidden">
                <span>{renderColoredSegments(question)}</span>
                <span className="opacity-40 shrink-0" style={{ color: 'var(--primary)' }}>+</span>
              </summary>
              <div className="px-4 pb-4 text-sm opacity-80" style={{ color: 'var(--text-muted)' }}>{renderColoredSegments(answer)}</div>
            </details>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section key={block.id}>
      <h2 className={`text-2xl mb-6 font-bold ${headingFont}`}>{renderColoredSegments(blockTitle)}</h2>
      <div className="flex flex-wrap gap-2">
        {(block.content?.items || []).map((item: any, idx: number) => {
          const question = item.question?.[locale] || item.question;
          return (
          <button
            key={idx}
            onClick={() => window.dispatchEvent(new CustomEvent('sendToChat', { detail: stripColorSyntax(question) }))}
            className={`text-left px-4 py-2 border transition-all hover:scale-105 ${radiusClass}`}
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--primary)' }}
          >
            <span className="font-medium text-sm">{renderColoredSegments(question)}</span>
          </button>
          );
        })}
      </div>
    </section>
  );
}

function renderGallery(block: any, ctx: RenderCtx) {
  const { locale, radiusClass, headingFont } = ctx;
  const blockTitle = blockTitleOf(block, locale);
  const layoutVariant = block.content?.layoutVariant || 'grid';

  if (layoutVariant === 'fullbleed-carousel') {
    return (
      <section key={block.id} className="pt-4">
        <h2 className={`text-2xl mb-6 font-bold ${headingFont}`}>{renderColoredSegments(blockTitle)}</h2>
        <div className="flex overflow-x-auto snap-x gap-0 hide-scrollbar -mx-4" style={{ scrollbarWidth: 'none' }}>
          {(block.content?.items || []).map((item: any, idx: number) => {
            const caption = item.caption?.[locale] || item.caption;
            return (
              <div key={idx} className="relative shrink-0 w-[85%] h-72 snap-center group overflow-hidden">
                {isVideoUrl(item.url) ? (
                  <video src={item.url} className="w-full h-full object-cover" controls />
                ) : (
                  <img src={item.url} alt={caption || 'Gallery'} className="w-full h-full object-cover" />
                )}
                {caption && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <p className="text-white text-xs font-medium">{renderColoredSegments(caption)}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  if (layoutVariant === 'stacked-fullwidth') {
    return (
      <section key={block.id} className="pt-4">
        <h2 className={`text-2xl mb-6 font-bold ${headingFont}`}>{renderColoredSegments(blockTitle)}</h2>
        <div className="flex flex-col gap-4">
          {(block.content?.items || []).map((item: any, idx: number) => {
            const caption = item.caption?.[locale] || item.caption;
            return (
              <div key={idx} className={`relative overflow-hidden group h-64 sm:h-80 ${radiusClass}`}>
                {isVideoUrl(item.url) ? (
                  <video src={item.url} className="w-full h-full object-cover" controls />
                ) : (
                  <img src={item.url} alt={caption || 'Gallery'} className="w-full h-full object-cover" />
                )}
                {caption && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                    <p className="text-white text-sm font-medium">{renderColoredSegments(caption)}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  if (layoutVariant === 'masonry') {
    return (
      <section key={block.id} className="pt-4">
        <h2 className={`text-2xl mb-6 font-bold ${headingFont}`}>{renderColoredSegments(blockTitle)}</h2>
        <div className="columns-2 gap-3 space-y-3">
          {(block.content?.items || []).map((item: any, idx: number) => {
            const caption = item.caption?.[locale] || item.caption;
            return (
              <div key={idx} className={`break-inside-avoid relative group overflow-hidden ${radiusClass}`}>
                {isVideoUrl(item.url) ? (
                  <video src={item.url} className="w-full object-cover" controls />
                ) : (
                  <img src={item.url} alt={caption || 'Gallery'} className="w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                )}
                {caption && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <p className="text-white text-xs font-medium">{renderColoredSegments(caption)}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section key={block.id} className="pt-4">
      <h2 className={`text-2xl mb-6 font-bold ${headingFont}`}>{renderColoredSegments(blockTitle)}</h2>
      <div className="grid grid-cols-2 gap-2 md:gap-4">
        {(block.content?.items || []).map((item: any, idx: number) => {
          const caption = item.caption?.[locale] || item.caption;
          return (
            <div key={idx} className={`relative overflow-hidden group ${radiusClass}`}>
              {isVideoUrl(item.url) ? (
                <video src={item.url} className="w-full h-40 md:h-64 object-cover" controls />
              ) : (
                <img src={item.url} alt={caption || 'Gallery'} className="w-full h-40 md:h-64 object-cover transition-transform duration-500 group-hover:scale-105" />
              )}
              {caption && (
                <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <p className="text-white text-xs text-center">{renderColoredSegments(caption)}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function renderTestimonials(block: any, ctx: RenderCtx) {
  const { locale, radiusClass, headingFont } = ctx;
  const blockTitle = blockTitleOf(block, locale);
  const layoutVariant = block.content?.layoutVariant || 'scroll-cards';
  const items: any[] = block.content?.items || [];

  let inner: React.ReactNode;

  if (layoutVariant === 'big-quote') {
    inner = (
      <>
        <h2 className={`text-2xl mb-8 font-bold text-center ${headingFont}`}>{renderColoredSegments(blockTitle)}</h2>
        <div className="flex flex-col gap-12">
          {items.map((item, idx) => {
            const quote = item.quote?.[locale] || item.quote;
            const role = item.role?.[locale] || item.role;
            return (
              <div key={idx} className="text-center max-w-lg mx-auto">
                <div className="text-5xl mb-3 opacity-30 font-serif leading-none" style={{ color: 'var(--primary)' }}>"</div>
                <p className={`text-2xl leading-snug italic mb-4 ${headingFont}`}>{renderColoredSegments(quote)}</p>
                <div className="font-semibold text-sm">{item.author}</div>
                {role && <div className="text-xs opacity-70 mt-1" style={{ color: 'var(--text-muted)' }}>{renderColoredSegments(role)}</div>}
              </div>
            );
          })}
        </div>
      </>
    );
  } else if (layoutVariant === 'grid-quotes') {
    inner = (
      <>
        <h2 className={`text-2xl mb-6 font-bold ${headingFont}`}>{renderColoredSegments(blockTitle)}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map((item, idx) => {
            const quote = item.quote?.[locale] || item.quote;
            const role = item.role?.[locale] || item.role;
            return (
              <div key={idx} className={`p-4 border ${radiusClass}`} style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                <p className="text-sm italic mb-3 opacity-90 leading-relaxed">{renderColoredSegments(quote)}</p>
                <div className="font-semibold text-xs">{item.author}</div>
                {role && <div className="text-[11px] opacity-70 mt-0.5" style={{ color: 'var(--text-muted)' }}>{renderColoredSegments(role)}</div>}
              </div>
            );
          })}
        </div>
      </>
    );
  } else {
    inner = (
      <>
        <h2 className={`text-2xl mb-6 font-bold ${headingFont}`}>{renderColoredSegments(blockTitle)}</h2>
        <div className="flex overflow-x-auto gap-4 pb-4 snap-x hide-scrollbar" style={{ scrollbarWidth: 'none' }}>
          {items.map((item: any, idx: number) => {
            const quote = item.quote?.[locale] || item.quote;
            const role = item.role?.[locale] || item.role;
            return (
              <div
                key={idx}
                className={`min-w-[85%] md:min-w-[300px] p-6 border snap-center ${radiusClass}`}
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
              >
                <div className="text-[var(--primary)] text-3xl mb-2 opacity-50 leading-none font-serif">"</div>
                <p className="text-[15px] italic mb-4 opacity-90 leading-relaxed">{renderColoredSegments(quote)}</p>
                <div className="font-bold text-sm">{item.author}</div>
                {role && <div className="text-xs mt-1 opacity-70" style={{ color: 'var(--text-muted)' }}>{renderColoredSegments(role)}</div>}
              </div>
            );
          })}
        </div>
      </>
    );
  }

  return withSectionBackground(inner, block.id, ctx, block.content?.backgroundImage, block.content?.backgroundOverlay);
}

function renderLinks(block: any, ctx: RenderCtx) {
  const { locale, radiusClass, headingFont } = ctx;
  const blockTitle = blockTitleOf(block, locale);
  const items = block.content?.items || [];
  if (items.length === 0) return null;
  const layoutVariant = block.content?.layoutVariant || 'stacked';

  if (layoutVariant === 'two-col-grid') {
    return (
      <section key={block.id}>
        <h2 className={`text-2xl mb-6 font-bold ${headingFont}`}>{renderColoredSegments(blockTitle)}</h2>
        <div className="grid grid-cols-2 gap-3">
          {items.map((item: any, idx: number) => (
            <a
              key={idx}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`p-4 text-center font-semibold border shadow-sm transition hover:scale-[1.02] ${radiusClass}`}
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--primary)' }}
            >
              {renderColoredSegments(item.label)}
            </a>
          ))}
        </div>
      </section>
    );
  }

  if (layoutVariant === 'icon-row') {
    return (
      <section key={block.id}>
        <h2 className={`text-2xl mb-6 font-bold ${headingFont}`}>{renderColoredSegments(blockTitle)}</h2>
        <div className="flex flex-wrap gap-3 justify-center">
          {items.map((item: any, idx: number) => {
            const Icon = iconForLinkUrl(item.url);
            return (
              <a
                key={idx}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                title={item.label}
                className="w-14 h-14 rounded-full border flex items-center justify-center transition hover:scale-110"
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--primary)' }}
              >
                <Icon className="w-6 h-6" />
              </a>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section key={block.id}>
      <h2 className={`text-2xl mb-6 font-bold ${headingFont}`}>{renderColoredSegments(blockTitle)}</h2>
      <div className="flex flex-col gap-3">
        {items.map((item: any, idx: number) => (
          <a
            key={idx}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full p-4 text-center font-semibold border shadow-sm transition hover:scale-[1.02] ${radiusClass}`}
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--primary)' }}
          >
            {renderColoredSegments(item.label)}
          </a>
        ))}
      </div>
    </section>
  );
}

function contactHref(method: string, value: string) {
  switch (method) {
    case 'whatsapp': return `https://wa.me/${value.replace(/\D/g, '')}`;
    case 'instagram': return `https://instagram.com/${value.replace(/^@/, '')}`;
    case 'telegram': return `https://t.me/${value.replace(/^@/, '')}`;
    case 'email': return `mailto:${value}`;
    default: return '#';
  }
}

function contactIcon(method: string) {
  switch (method) {
    case 'whatsapp': return MessageCircle;
    case 'instagram': return AtSign;
    case 'email': return Mail;
    default: return LinkIcon;
  }
}

// Synthetic block (see `visibleBlocks` below) built from business.contact_method/contact_value —
// not a real `blocks` row, so it reads its data from block.content.method/.value instead of the
// usual per-locale content shape.
function renderContact(block: any, ctx: RenderCtx) {
  const { locale, radiusClass, headingFont } = ctx;
  const methodKeys: string[] = (block.content?.method || '').split(',').filter(Boolean);
  let values: Record<string, string> = {};
  try { values = block.content?.value ? JSON.parse(block.content.value) : {}; } catch { values = {}; }
  const items = methodKeys.map((key) => ({ key, value: values[key] })).filter((i) => i.value?.trim());
  if (items.length === 0) return null;

  return (
    <section key={block.id}>
      <h2 className={`text-2xl mb-6 font-bold ${headingFont}`}>{defaultTitleFor('contact', locale)}</h2>
      <div className="flex flex-col gap-3">
        {items.map(({ key, value }) => {
          const Icon = contactIcon(key);
          return (
            <a
              key={key}
              href={contactHref(key, value)}
              target="_blank"
              rel="noopener noreferrer"
              className={`w-full p-4 flex items-center gap-3 font-semibold border shadow-sm transition hover:scale-[1.02] ${radiusClass}`}
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--primary)' }}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span>{CONTACT_METHOD_LABELS[key]?.[locale] || key}: {value}</span>
            </a>
          );
        })}
      </div>
    </section>
  );
}

const BLOCK_RENDERERS: Record<string, (block: any, ctx: RenderCtx) => React.ReactNode> = {
  about: renderAbout,
  services: renderServices,
  pricing: renderServices,
  hours: renderHours,
  faq: renderFAQ,
  gallery: renderGallery,
  testimonials: renderTestimonials,
  links: renderLinks,
  contact: renderContact,
  custom: renderTextBlock,
};

export default function ArchetypeRenderer({
  blocks,
  theme: themeProp,
  businessName,
  activeBlockId: controlledActiveBlockId,
  onActiveBlockChange,
  contactMethod,
  contactValue,
}: {
  blocks: any[],
  theme?: Theme | null,
  businessName: string,
  // Optional controlled active-block state, so a parent header (page title row) can render the
  // "back" control itself instead of it floating inside the scrollable block content. Falls back
  // to internal state when omitted.
  activeBlockId?: string | null,
  onActiveBlockChange?: (id: string | null) => void,
  // business.contact_method / business.contact_value — rendered as a real page section (like any
  // other block) when at least one method has a value, positioned right after services.
  contactMethod?: string | null,
  contactValue?: string | null,
}) {
  const [internalActiveBlockId, setInternalActiveBlockId] = useState<string | null>(null);
  const activeBlockId = controlledActiveBlockId !== undefined ? controlledActiveBlockId : internalActiveBlockId;
  const setActiveBlockId = onActiveBlockChange || setInternalActiveBlockId;
  const locale = useLocale();

  // Linktree tiles open the full page (like website mode) scrolled to the tapped section, rather
  // than isolating just that block — so visitors can still scroll up/down to the neighboring
  // sections from there. This ref+effect jumps to the tapped section right after it mounts.
  const activeBlockNodeRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (activeBlockId && activeBlockNodeRef.current) {
      activeBlockNodeRef.current.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  }, [activeBlockId]);

  const theme = themeProp || DEFAULT_THEME;

  const layoutMode = useMemo(() => {
    const settingsBlock = blocks.find(b => b.type === 'settings');
    return settingsBlock?.content?.layoutMode || 'linktree';
  }, [blocks]);

  const radiusClass = useMemo(() => {
    switch (theme.borderRadius) {
      case 'none': return 'rounded-none';
      case 'sm': return 'rounded-md';
      case 'md': return 'rounded-xl';
      case 'xl': return 'rounded-2xl';
      case 'full': return 'rounded-3xl';
      default: return 'rounded-2xl';
    }
  }, [theme]);

  // `contact` is no longer a real row in `blocks` (edited as business.contact_method/contact_value
  // in the dashboard's fixed "İletişim" section instead) — synthesize a virtual block for it here
  // so it renders as a real page section/tile like everything else, always last. A fixed order
  // (e.g. 2.5, "right after services") used to place it — but custom sections can land on either
  // side of any fixed number, so it drifted into the middle of the page instead of staying at the
  // bottom. Sorting the real blocks first and appending contact after guarantees "always last"
  // regardless of what order values the other blocks end up with.
  const visibleBlocks = useMemo(() => {
    const real = blocks
      .filter(b => b.type !== 'settings' && b.type !== 'contact' && b.is_visible !== false)
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    let values: Record<string, string> = {};
    try { values = contactValue ? JSON.parse(contactValue) : {}; } catch { values = {}; }
    const hasAnyValue = (contactMethod || '').split(',').filter(Boolean).some((k) => values[k]?.trim());
    if (!hasAnyValue) return real;
    const contactBlock = { id: '__contact__', type: 'contact', content: { method: contactMethod, value: contactValue } };
    return [...real, contactBlock];
  }, [blocks, contactMethod, contactValue]);

  const styleVars = useMemo(() => {
    const c = resolveThemeColors(theme);
    return {
      '--bg': c.background,
      '--surface': c.surface,
      '--primary': c.primary,
      '--text': c.text,
      '--text-muted': c.textMuted,
      '--border': c.border,
      '--heading-font': `"${theme.headingFont}", sans-serif`,
      '--body-font': `"${theme.bodyFont}", sans-serif`,
    } as React.CSSProperties;
  }, [theme]);

  // Fixed hook classes (see the <style> block below) — the actual font-family comes from the
  // AI-generated --heading-font/--body-font CSS variables above, not from a Tailwind class,
  // since theme.headingFont/bodyFont are arbitrary Google Font names rather than a fixed set.
  const headingFont = 'tb-heading';
  const bodyFont = 'tb-body';
  const cardWrap = theme.layoutStyle === 'card-heavy';
  const sectionGapClass = SECTION_GAP_CLASS[theme.layoutStyle] || 'gap-10';
  const renderCtx: RenderCtx = { locale, radiusClass, headingFont, theme, cardWrap };

  const renderBlock = (block: any) => {
    const renderFn = BLOCK_RENDERERS[block.type];
    if (!renderFn) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`ArchetypeRenderer: "${block.type}" blok tipi için bir render fonksiyonu kayıtlı değil, gösterilmeyecek.`);
      }
      return null;
    }
    return renderFn(block, renderCtx);
  };

  return (
    <div
      className={`min-h-full pb-20 ${bodyFont}`}
      style={{
        ...styleVars,
        backgroundColor: 'var(--bg)',
        color: 'var(--text)'
      }}
    >
      <style>{`
        .markdown-body p { margin-bottom: 1rem; line-height: 1.6; }
        .markdown-body ul { list-style-type: disc; margin-left: 1.5rem; margin-bottom: 1rem; }
        .markdown-body ol { list-style-type: decimal; margin-left: 1.5rem; margin-bottom: 1rem; }
        .markdown-body strong { font-weight: 700; color: inherit; }
        .markdown-body em { font-style: italic; }
        .markdown-body a { color: inherit; text-decoration: underline; }
        .tb-heading { font-family: var(--heading-font); }
        .tb-body { font-family: var(--body-font); }
      `}</style>

      <div className="flex flex-col gap-10">
        {layoutMode === 'linktree' && !activeBlockId && (
          <div className="flex flex-col gap-3 mt-2">
            {visibleBlocks.map(block => {
              const blockTitle = blockTitleOf(block, locale);
              return (
                <button
                  key={block.id}
                  onClick={() => setActiveBlockId(block.id)}
                  className="w-full py-3 px-4 rounded-2xl text-base font-semibold border shadow-sm transition hover:scale-[1.02]"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  {renderColoredSegments(blockTitle)}
                </button>
              );
            })}
          </div>
        )}

        {(layoutMode === 'website' || activeBlockId) && (
          <div className={`flex flex-col ${sectionGapClass}`}>
            {visibleBlocks.map(block => (
              <div key={block.id} ref={block.id === activeBlockId ? activeBlockNodeRef : undefined}>
                {renderBlock(block)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
