'use client';

import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import ArchetypeRenderer from './ArchetypeRenderer';
import LanguageSwitcher from './LanguageSwitcher';
import { Theme } from '@/config/archetypes';

// Owns activeBlockId so the "back" control can live in the same header row as the page
// title/language switcher instead of floating inside the scrollable block content below.
export default function ProfilePageBody({ blocks, theme, businessName, pageTitle, contactMethod, contactValue }: { blocks: any[], theme?: Theme | null, businessName: string, pageTitle: string, contactMethod?: string | null, contactValue?: string | null }) {
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  return (
    <>
      <div className="flex justify-between items-center mb-6 px-2 gap-3">
        <div className="flex items-center gap-1 min-w-0">
          {activeBlockId && (
            <button
              type="button"
              onClick={() => setActiveBlockId(null)}
              className="p-1 -ml-1 shrink-0 text-slate-800 hover:opacity-70 transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <span className="text-sm font-semibold truncate text-slate-800">{pageTitle}</span>
        </div>
        <LanguageSwitcher />
      </div>

      <div className="w-full">
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
