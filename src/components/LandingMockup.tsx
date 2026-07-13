'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

export default function LandingMockup() {
  const t = useTranslations('Landing.mockup');
  const [messages, setMessages] = useState<{role: string, text: string}[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const exchanges = [
      {role:'visitor', text: t('msg1')},
      {role:'agent', text: t('msg2')},
    ];
    let i = 0;
    let timeoutId: NodeJS.Timeout;

    function playNext() {
      if (i >= exchanges.length) {
        timeoutId = setTimeout(() => {
          setMessages([]);
          i = 0;
          playNext();
        }, 2600);
        return;
      }
      const currentExchange = exchanges[i];
      setMessages(prev => [...prev, currentExchange]);
      i++;
      timeoutId = setTimeout(playNext, 1500);
    }

    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!mql.matches) {
      timeoutId = setTimeout(playNext, 900);
    } else {
      setMessages(exchanges);
    }

    return () => clearTimeout(timeoutId);
  }, [t]);

  return (
    <div className="phone-stage">
      <div className="phone">
        <div className="phone-screen">
          <div className="phone-topbar"><div className="phone-notch"></div></div>
          <div className="phone-content">
            <div className="profile-row">
              <div className="avatar">U</div>
              <div>
                <div className="profile-name">Uliana Studio</div>
                <div className="profile-handle mono">talkinbio.com/uliana</div>
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
          <div className="chatbar">
            <div className="chatbar-handle"></div>
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
              {messages.map((m, idx) => {
                if (!m) return null;
                return (
                  <div key={idx} className={`bubble ${m.role}`}>
                    {m.text}
                  </div>
                );
              })}
            </div>
            <div className="type-row">
              <div className="type-dots"><span></span><span></span><span></span></div>
              <span className="type-placeholder">{t('typing')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
