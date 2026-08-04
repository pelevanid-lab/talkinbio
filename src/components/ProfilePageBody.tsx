'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocale } from 'next-intl';
import ArchetypeRenderer from './ArchetypeRenderer';
import ProfileHeader from './ProfileHeader';
import LanguageSwitcher from './LanguageSwitcher';
import { Theme, DEFAULT_THEME, resolveThemeColors } from '@/config/archetypes';
import { avatarFromBlocks } from '@/utils/avatarFromBlocks';
import { resolveShortcuts } from '@/utils/shortcuts';
import { hasRealContentForLocale } from '@/config/blockTypes';
import { defaultTitleFor } from '@/config/localeTitles';
import { Menu, X } from 'lucide-react';
import { useOptionalPublicPageRuntime } from './PublicPageRuntime';

function BlockMenu({ blocks, locale, c, onSelect }: { blocks: any[], locale: string, c: any, onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const visibleBlocks = blocks.filter(b => b.type !== 'settings' && b.type !== 'contact' && b.is_visible !== false && hasRealContentForLocale(b, locale));

  if (visibleBlocks.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center p-1.5 rounded-full border transition hover:opacity-70"
        style={{ borderColor: c.border, backgroundColor: c.surface, color: c.text }}
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>
      {open && (
        <div 
          className="absolute top-full right-0 mt-2 w-48 rounded-xl border shadow-lg overflow-hidden flex flex-col py-1 z-50"
          style={{ backgroundColor: c.surface, borderColor: c.border }}
        >
          <div className="px-4 py-3 border-b flex justify-center" style={{ borderColor: c.border }}>
            <LanguageSwitcher compact />
          </div>
          {visibleBlocks.map(b => {
            const title = b.content?.[locale]?.title || defaultTitleFor(b.type, locale) || b.title || b.type;
            return (
              <button
                key={b.id}
                onClick={() => { setOpen(false); onSelect(b.id); }}
                className="text-left px-4 py-2 text-sm font-medium transition hover:brightness-95"
                style={{ color: c.text }}
              >
                {title}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

type LocalizedText = Partial<Record<'tr' | 'en' | 'ru', string>> | null;

// Owns activeBlockId so the "back" control can live in the same header (ProfileHeader) as the
// avatar/name/language switcher instead of floating inside the scrollable block content below.
export default function ProfilePageBody({ blocks, theme, businessName, pageTitle, tagline, category, contactMethod, contactValue, orderNowBehavior, locale }: { blocks: any[], theme?: Theme | null, businessName: string, pageTitle: string, tagline?: LocalizedText, category?: string | null, contactMethod?: string | null, contactValue?: string | null, orderNowBehavior?: string | null, locale: 'tr' | 'en' | 'ru' }) {
  const [localActiveBlockId, setLocalActiveBlockId] = useState<string | null>(null);
  const pageRuntime = useOptionalPublicPageRuntime();
  const activeBlockId = pageRuntime?.activeBlockId ?? localActiveBlockId;
  const setActiveBlockId = (id: string | null) => {
    if (pageRuntime) {
      if (id) pageRuntime.openBlock(id);
      else pageRuntime.clearActiveBlock();
      return;
    }
    setLocalActiveBlockId(id);
  };
  const resolvedTheme = theme || DEFAULT_THEME;

  const avatarUrl = avatarFromBlocks(blocks);
  const description = tagline?.[locale] || category || undefined;
  const shortcuts = resolveShortcuts(blocks);
  const c = resolveThemeColors(resolvedTheme);

  const minimalHeader = activeBlockId != null;

  const filteredBlocks = useMemo(() => {
    if (!pageRuntime?.sauleQuestion) return blocks;
    const matchedBlockId = pageRuntime?.sauleMatchedBlock?.blockId;
    if (!matchedBlockId) return [];
    return blocks.filter((b) => b.id === matchedBlockId || b.type === matchedBlockId);
  }, [blocks, pageRuntime?.sauleQuestion, pageRuntime?.sauleMatchedBlock?.blockId]);

  return (
    <>
      <div className="sticky top-0 z-40 pt-4 pb-3 -mt-4 -mx-4 px-4" style={{ background: `var(--tb-page-bg-sticky, ${c.background})` }}>
        <ProfileHeader
          avatarUrl={avatarUrl}
          name={pageTitle}
          description={description}
          theme={resolvedTheme}
          activeBlockId={activeBlockId}
          onBack={() => setActiveBlockId(null)}
          topRight={<BlockMenu blocks={blocks} locale={locale} c={c} onSelect={setActiveBlockId} />}
          shortcuts={shortcuts}
          onShortcutSelect={setActiveBlockId}
          minimal={minimalHeader}
        />
      </div>

      {pageRuntime?.sauleQuestion ? (
        pageRuntime?.sauleMatchedBlock?.blockId && (
          <div 
            onClick={() => {
              const targetBlockId = pageRuntime.sauleMatchedBlock!.blockId;
              const targetItemId = pageRuntime.sauleMatchedBlock!.itemId;
              
              // Clear active question/chat state
              pageRuntime.setSauleQuestion('');
              pageRuntime.setQueryTrigger(null);
              pageRuntime.setSauleSuggestions([]);
              pageRuntime.setSauleMatchedBlock(null);
              const greetingText = pageRuntime.customGreeting?.[locale] || pageRuntime.customGreeting?.tr || 'Hoşgeldiniz, size nasıl yardımcı olabilirim?';
              pageRuntime.setSauleText(greetingText);
              pageRuntime.setSauleState('idle');
              pageRuntime.triggerGlitch();
              
              // Transition to full-page website view focused on the block
              pageRuntime.openBlock(targetBlockId, targetItemId);
            }}
            className="w-full mt-5 border border-dashed border-[rgba(20,35,31,0.12)] hover:border-[#FF6A5C]/40 hover:shadow-md rounded-[20px] overflow-hidden cursor-pointer transition duration-300 relative group bg-white"
          >
            {/* Elegant pill indicator explaining click interaction to transition */}
            <div className="absolute top-3.5 right-4.5 z-10 px-2.5 py-1 rounded-full bg-[#FF6A5C] text-white text-[9px] font-mono font-bold tracking-wide uppercase shadow-sm opacity-80 group-hover:opacity-100 group-hover:scale-105 transition duration-200 select-none">
              Tam Sayfada Gör ↗
            </div>
            
            <div className="pointer-events-none p-1">
              <ArchetypeRenderer
                blocks={filteredBlocks}
                theme={resolvedTheme}
                businessName={businessName}
                activeBlockId={pageRuntime.sauleMatchedBlock.blockId}
                activeItemId={pageRuntime.sauleMatchedBlock.itemId ?? null}
                activeOpenSequence={pageRuntime.openSequence ?? 0}
                onActiveBlockChange={() => {}}
                contactMethod={contactMethod}
                contactValue={contactValue}
                orderNowBehavior={orderNowBehavior}
              />
            </div>
          </div>
        )
      ) : (
        <div className="w-full mt-3">
          {((blocks && blocks.length > 0) || (contactMethod && contactValue)) && (
            <ArchetypeRenderer
              blocks={blocks}
              theme={theme}
              businessName={businessName}
              activeBlockId={activeBlockId}
              activeItemId={pageRuntime?.activeItemId ?? null}
              activeOpenSequence={pageRuntime?.openSequence ?? 0}
              onActiveBlockChange={setActiveBlockId}
              contactMethod={contactMethod}
              contactValue={contactValue}
              orderNowBehavior={orderNowBehavior}
            />
          )}
        </div>
      )}
    </>
  );
}
