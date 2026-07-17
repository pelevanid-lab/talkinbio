'use client';

import { useState } from 'react';
import ChatWidget from './ChatWidget';
import ArchetypeRenderer from './ArchetypeRenderer';
import { DEFAULT_THEME, Theme } from '@/config/archetypes';

export default function LandingMockup({
  businessId,
  businessName,
  locale,
  initialMessages,
  blocks = [],
  theme,
}: {
  businessId: string | null;
  businessName: string;
  locale: string;
  initialMessages: any[];
  blocks?: any[];
  theme?: Theme | null;
}) {
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  return (
    <div className="phone-stage">
      <div className="phone">
        <div className="phone-screen">
          <div className="phone-topbar"><div className="phone-notch"></div></div>
          <div className="phone-content">
            <div className="profile-row">
              <div className="avatar">{businessName.charAt(0).toUpperCase()}</div>
              <div>
                <div className="profile-name">{businessName}</div>
                <div className="profile-handle mono">talkinbio.com/talkinbio</div>
              </div>
            </div>
            {/* Gerçek, canlı sayfa içeriği — kurulum sihirbazından geçen aynı bloklar (Faz 1.6 dogfooding) */}
            <ArchetypeRenderer
              blocks={blocks}
              theme={theme || DEFAULT_THEME}
              businessName={businessName}
              activeBlockId={activeBlockId}
              onActiveBlockChange={setActiveBlockId}
            />
          </div>
          {/* Real Saule, live — this is the product, not a screenshot (Faz 1.6) */}
          {businessId && (
            <ChatWidget
              variant="inline"
              businessId={businessId}
              businessName={businessName}
              locale={locale}
              initialMessages={initialMessages}
            />
          )}
        </div>
      </div>
    </div>
  );
}
