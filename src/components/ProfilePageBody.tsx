'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import ArchetypeRenderer from './ArchetypeRenderer';
import ProfileHeader from './ProfileHeader';
import LanguageSwitcher from './LanguageSwitcher';
import { Theme, DEFAULT_THEME, resolveThemeColors } from '@/config/archetypes';
import { avatarFromBlocks } from '@/utils/avatarFromBlocks';
import { resolveShortcuts } from '@/utils/shortcuts';

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
      <ProfileHeader
        avatarUrl={avatarUrl}
        name={pageTitle}
        description={description}
        theme={resolvedTheme}
        activeBlockId={activeBlockId}
        onBack={() => setActiveBlockId(null)}
        topRight={
          <div className="flex items-center px-2.5 py-1 rounded-full border" style={{ borderColor: c.border, backgroundColor: c.surface }}>
            <LanguageSwitcher compact />
          </div>
        }
        shortcuts={shortcuts}
        onShortcutSelect={setActiveBlockId}
        minimal={minimalHeader}
      />

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
