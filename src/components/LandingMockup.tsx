'use client';

import { useTranslations } from 'next-intl';
import ChatWidget from './ChatWidget';

export default function LandingMockup({
  businessId,
  businessName,
  locale,
  initialMessages,
}: {
  businessId: string | null;
  businessName: string;
  locale: string;
  initialMessages: any[];
}) {
  const t = useTranslations('Landing.mockup');

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
            <div className="block">
              <div className="block-title">{t('services')}</div>
              <div className="block-sub">{t('servicesDesc')}</div>
            </div>
            <div className="block">
              <div className="block-title">{t('prices')}</div>
              <div className="block-sub">{t('pricesDesc')}</div>
            </div>
            <div className="block">
              <div className="block-title">{t('hours')}</div>
              <div className="block-sub">{t('hoursDesc')}</div>
            </div>
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
