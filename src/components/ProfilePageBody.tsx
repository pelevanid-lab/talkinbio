'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import ArchetypeRenderer from './ArchetypeRenderer';
import ProfileHeader from './ProfileHeader';
import LanguageSwitcher from './LanguageSwitcher';
import { Theme, DEFAULT_THEME } from '@/config/archetypes';
import { avatarFromBlocks } from '@/utils/avatarFromBlocks';
import { resolveShortcuts } from '@/utils/shortcuts';

type LocalizedText = Partial<Record<'tr' | 'en' | 'ru', string>> | null;

// Owns activeBlockId so the "back" control can live in the same header (ProfileHeader) as the
// avatar/name/language switcher instead of floating inside the scrollable block content below.
export default function ProfilePageBody({ blocks, theme, businessName, pageTitle, tagline, category, contactMethod, contactValue }: { blocks: any[], theme?: Theme | null, businessName: string, pageTitle: string, tagline?: LocalizedText, category?: string | null, contactMethod?: string | null, contactValue?: string | null }) {
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const locale = useLocale() as 'tr' | 'en' | 'ru';
  const resolvedTheme = theme || DEFAULT_THEME;

  const avatarUrl = avatarFromBlocks(blocks);
  const description = tagline?.[locale] || category || undefined;
  const shortcuts = resolveShortcuts(blocks);

  return (
    <>
      <ProfileHeader
        avatarUrl={avatarUrl}
        name={pageTitle}
        description={description}
        theme={resolvedTheme}
        activeBlockId={activeBlockId}
        onBack={() => setActiveBlockId(null)}
        topRight={<LanguageSwitcher compact />}
        shortcuts={shortcuts}
        onShortcutSelect={setActiveBlockId}
      />

      <div className="w-full mt-6">
        {((blocks && blocks.length > 0) || (contactMethod && contactValue)) && (
          <ArchetypeRenderer
            blocks={blocks}
            theme={theme}
            businessName={businessName}
            activeBlockId={activeBlockId}
            onActiveBlockChange={setActiveBlockId}
            contactMethod={contactMethod}
            contactValue={contactValue}
          />
        )}
      </div>
    </>
  );
}
