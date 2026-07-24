'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleLanguageChange = (newLocale: 'tr' | 'en' | 'ru') => {
    router.replace(pathname, { locale: newLocale });
  };

  // Color inherit: ProfileHeader controls the text color so it matches the resolved theme
  // (light/dark) instead of the fixed global --ink. compact shrinks it to reclaim vertical space.
  return (
    <div style={{ display: 'flex', gap: compact ? '6px' : '8px', alignItems: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: compact ? '11px' : '13px', color: 'inherit' }}>
      <button 
        onClick={() => handleLanguageChange('tr')} 
        style={{ 
          fontWeight: locale === 'tr' ? 600 : 400, 
          opacity: locale === 'tr' ? 1 : 0.5, 
          background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit'
        }}
      >
        TR
      </button>
      <span style={{ opacity: 0.3 }}>|</span>
      <button 
        onClick={() => handleLanguageChange('en')} 
        style={{ 
          fontWeight: locale === 'en' ? 600 : 400, 
          opacity: locale === 'en' ? 1 : 0.5, 
          background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit'
        }}
      >
        EN
      </button>
      <span style={{ opacity: 0.3 }}>|</span>
      <button 
        onClick={() => handleLanguageChange('ru')} 
        style={{ 
          fontWeight: locale === 'ru' ? 600 : 400, 
          opacity: locale === 'ru' ? 1 : 0.5, 
          background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit'
        }}
      >
        RU
      </button>
    </div>
  );
}
