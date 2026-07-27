'use client';

import { useState } from 'react';
import { Link } from '@/i18n/routing';
import LandingMockup from './LandingMockup';

export default function LandingHeroTabs({
  texts,
  demoBusinessId,
  locale,
  demoInitialMessages,
  demoBlocks,
  demoTheme,
}: any) {
  const [activeTab, setActiveTab] = useState<'beiwe' | 'saule'>('saule');

  return (
    <div className="hero-demo-container bg-white rounded-[40px] md:rounded-[48px] p-4 md:p-8 border border-slate-200/60 shadow-[0_20px_40px_-15px_rgba(20,35,31,0.05)] mt-12">
      <div className="hero-tabs-nav mb-8 md:mb-12">
        <button
          className={`hero-tab ${activeTab === 'saule' ? 'active' : ''}`}
          onClick={() => setActiveTab('saule')}
        >
          <div className="orb-icon">
            <div className="orb-container orb-saule"></div>
          </div>
          Saule Assistant
        </button>
        <button
          className={`hero-tab ${activeTab === 'beiwe' ? 'active' : ''}`}
          onClick={() => setActiveTab('beiwe')}
        >
          <div className="orb-icon">
            <div className="orb-container orb-beiwe"></div>
          </div>
          Beiwe Creative
        </button>
      </div>

      <div className="hero-demo-content relative w-full max-w-[1000px] mx-auto">
        {activeTab === 'saule' ? (
          <LandingMockup
            businessId={demoBusinessId}
            businessName="Talkinbio"
            locale={locale}
            initialMessages={demoInitialMessages}
            blocks={demoBlocks}
            theme={demoTheme}
          />
        ) : (
          <div className="beiwe-demo-box py-12 md:py-24">
            <div className="beiwe-demo-inner group mx-auto">
              <div style={{ width: '100px', height: '100px', margin: '0 auto 28px', transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }} className="group-hover:scale-110 group-hover:-translate-y-2">
                <div className="orb-container orb-beiwe shadow-2xl shadow-[#38F9D7]/30"></div>
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', textAlign: 'center', marginBottom: '12px', letterSpacing: '-0.02em', fontFamily: 'var(--font-bricolage)' }}>
                Sihirli Kurulum
              </h3>
              <p style={{ textAlign: 'center', fontSize: '0.95rem', color: '#64748b', marginBottom: '32px', padding: '0 16px', lineHeight: '1.5' }}>
                Instagram profilinizi veya web sitenizi verin, sayfanızı <strong className="text-slate-700 font-semibold">saniyeler içinde</strong> kuralım.
              </p>
              <div style={{ display: 'flex', gap: '6px', padding: '6px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '9999px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), inset 0 2px 4px rgba(0,0,0,0.02)' }} className="focus-within:ring-2 focus-within:ring-[#38F9D7]/50 focus-within:border-[#38F9D7] transition-all max-w-[400px] mx-auto">
                <input
                  type="text"
                  placeholder="instagram.com/kullaniciadi"
                  style={{ width: '100%', padding: '10px 18px', backgroundColor: 'transparent', fontSize: '0.9rem', outline: 'none', border: 'none', color: '#0f172a' }}
                  className="placeholder:text-slate-400 font-medium"
                />
                <button style={{ backgroundColor: '#0f172a', color: 'white', padding: '10px 24px', borderRadius: '9999px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', border: 'none', transition: 'all 0.2s' }} className="hover:bg-slate-800 hover:shadow-lg active:scale-95">
                  Hemen Kur
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
