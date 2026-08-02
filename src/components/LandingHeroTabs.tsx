'use client';

import { useState } from 'react';
import LandingMockup from './LandingMockup';
import { SauleIcon } from './AgentIcons';

const setupCopy = {
  tr: {
    title: 'Kolay Kurulum',
    body: 'Instagram profilinizi veya hazır metninizi verin, ilk sayfa taslağını çıkaralım.',
    placeholder: 'instagram.com/kullaniciadi',
    button: 'Başla',
    note: 'Kurulumdan sonra İnce Ayar sekmesinden eksikleri tamamlarsınız.',
  },
  en: {
    title: 'Easy Setup',
    body: 'Give us your Instagram profile or prepared text, and we will draft the first version of your page.',
    placeholder: 'instagram.com/username',
    button: 'Start',
    note: 'After setup, complete missing details from Fine Tune.',
  },
  ru: {
    title: 'Быстрый запуск',
    body: 'Укажите Instagram профиль или готовый текст, и мы подготовим первый черновик страницы.',
    placeholder: 'instagram.com/username',
    button: 'Начать',
    note: 'После настройки дополните детали во вкладке Fine Tune.',
  },
} as const;

export default function LandingHeroTabs({
  copy,
  demoBusinessId,
  locale,
  demoInitialMessages,
  demoBlocks,
  demoTheme,
  setupHref,
}: any) {
  const [activeTab, setActiveTab] = useState<'page' | 'setup'>('page');
  const texts = setupCopy[(locale === 'en' || locale === 'ru' ? locale : 'tr') as keyof typeof setupCopy];

  return (
    <div className="hero-demo-container bg-white rounded-[32px] md:rounded-[44px] p-4 md:p-8 border border-[var(--border)] shadow-[0_20px_40px_-15px_rgba(20,35,31,0.08)] mt-12">
      <div className="hero-tabs-nav mb-8 md:mb-10">
        <button className={`hero-tab ${activeTab === 'page' ? 'active' : ''}`} onClick={() => setActiveTab('page')}>
          <div className="flex-shrink-0">
            <SauleIcon size={32} />
          </div>
          {copy.pageTab}
        </button>
        <button className={`hero-tab ${activeTab === 'setup' ? 'active' : ''}`} onClick={() => setActiveTab('setup')}>
          <div className="flex-shrink-0">
            <SauleIcon size={32} />
          </div>
          {copy.setupTab}
        </button>
      </div>

      <div className="hero-demo-content relative w-full max-w-[1000px] mx-auto">
        {activeTab === 'page' ? (
          <LandingMockup
            businessId={demoBusinessId}
            businessName="Talkinbio"
            locale={locale}
            initialMessages={demoInitialMessages}
            blocks={demoBlocks}
            theme={demoTheme}
          />
        ) : (
          <div className="py-10 md:py-20">
            <div className="mx-auto max-w-[460px] rounded-[32px] border border-[var(--border)] bg-[linear-gradient(135deg,#ffffff_0%,#f4fbf8_50%,#fff1ee_100%)] p-7 md:p-9 shadow-sm">
              <div className="w-20 h-20 rounded-full bg-white border border-[var(--border)] flex items-center justify-center mx-auto mb-6 shadow-sm">
                <SauleIcon size={46} />
              </div>
              <h3 className="text-2xl font-[800] text-[var(--ink)] text-center mb-3 font-bricolage">{texts.title}</h3>
              <p className="text-center text-[var(--ink-soft)] leading-relaxed mb-7">{texts.body}</p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  window.location.href = setupHref || '/login';
                }}
                className="flex gap-2 p-1.5 bg-white border border-[var(--border)] rounded-full shadow-sm focus-within:ring-2 focus-within:ring-[var(--teal)]/30 transition-all"
              >
                <input
                  type="text"
                  placeholder={texts.placeholder}
                  className="w-full px-4 py-3 bg-transparent text-sm outline-none border-0 text-[var(--ink)] placeholder:text-[var(--muted)]"
                />
                <button type="submit" className="bg-[var(--ink)] text-white px-6 py-3 rounded-full text-sm font-bold whitespace-nowrap hover:opacity-90 active:scale-95 transition">
                  {texts.button}
                </button>
              </form>
              <p className="text-xs text-center text-[var(--muted)] mt-4">{texts.note}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
