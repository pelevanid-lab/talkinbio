'use client';

export default function LandingMockup({
  locale,
}: {
  businessId?: string | null;
  businessName?: string;
  locale: string;
  initialMessages?: any[];
  blocks?: any[];
  theme?: any;
}) {
  return (
    <div className="phone-stage">
      <div className="phone">
        <div className="phone-screen">
          <div className="phone-topbar"><div className="phone-notch"></div></div>
          <iframe 
            src={`/${locale}/talkinbio`} 
            style={{ flex: 1, width: '100%', border: 'none' }} 
            title="Talkinbio Demo"
          />
        </div>
      </div>
    </div>
  );
}
