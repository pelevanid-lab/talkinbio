'use client';

import { useState, useEffect, useRef } from 'react';
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
          className="absolute top-full left-0 mt-2 w-48 rounded-xl border shadow-lg overflow-hidden flex flex-col py-1 z-50"
          style={{ backgroundColor: c.surface, borderColor: c.border }}
        >
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
export default function ProfilePageBody({ blocks, theme, businessName, pageTitle, tagline, category, contactMethod, contactValue, orderNowBehavior }: { blocks: any[], theme?: Theme | null, businessName: string, pageTitle: string, tagline?: LocalizedText, category?: string | null, contactMethod?: string | null, contactValue?: string | null, orderNowBehavior?: string | null }) {
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const locale = useLocale() as 'tr' | 'en' | 'ru';
  const resolvedTheme = theme || DEFAULT_THEME;

  const avatarUrl = avatarFromBlocks(blocks);
  const description = tagline?.[locale] || category || undefined;
  const shortcuts = resolveShortcuts(blocks);
  const c = resolveThemeColors(resolvedTheme);

  // Yeni profil-başlığı özellikleri yalnız blog (linktree liste) görünümünde. Web sitesi modunda
  // veya bir blok açık (detay) iken minimal başlık gösterilir.
  const layoutMode = blocks.find((b) => b?.type === 'settings')?.content?.layoutMode || 'linktree';
  const minimalHeader = layoutMode === 'website' || activeBlockId != null;

  return (
    <>
      <div className="sticky top-0 z-40 pt-4 pb-3 -mt-4 -mx-4 px-4" style={{ backgroundColor: c.background }}>
        <ProfileHeader
          avatarUrl={avatarUrl}
          name={pageTitle}
          description={description}
          theme={resolvedTheme}
          activeBlockId={activeBlockId}
          onBack={() => setActiveBlockId(null)}
          topLeft={<BlockMenu blocks={blocks} locale={locale} c={c} onSelect={setActiveBlockId} />}
          topRight={
            <div className="flex items-center px-2.5 py-1 rounded-full border" style={{ borderColor: c.border, backgroundColor: c.surface }}>
              <LanguageSwitcher compact />
            </div>
          }
          shortcuts={shortcuts}
          onShortcutSelect={setActiveBlockId}
          minimal={minimalHeader}
        />
      </div>

      <div className="w-full mt-3">
        {((blocks && blocks.length > 0) || (contactMethod && contactValue)) && (
          <ArchetypeRenderer
            blocks={blocks}
            theme={theme}
            businessName={businessName}
            activeBlockId={activeBlockId}
            onActiveBlockChange={setActiveBlockId}
            contactMethod={contactMethod}
            contactValue={contactValue}
            orderNowBehavior={orderNowBehavior}
          />
        )}
      </div>
    </>
  );
}
