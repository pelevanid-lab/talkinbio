'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { APP_LOCALE_COOKIE, PRODUCT_LOCALES, type ProductLocale, type RoutingLocale } from '@/i18n/locales';
import { Globe2 } from 'lucide-react';

type LocaleOption = {
  value: RoutingLocale;
  label: string;
};

const ROUTING_OPTIONS: LocaleOption[] = [
  { value: 'tr', label: 'TR' },
  { value: 'en', label: 'EN' },
  { value: 'ru', label: 'RU' },
];

const PRODUCT_OPTIONS: LocaleOption[] = [
  { value: 'en', label: 'English' },
  { value: 'tr', label: 'Türkçe' },
];

function persistAppLocale(locale: ProductLocale) {
  document.cookie = `${APP_LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; SameSite=Lax`;
}

export default function LanguageSwitcher({
  compact = false,
  scope = 'url',
}: {
  compact?: boolean;
  scope?: 'url' | 'app';
}) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const options = scope === 'app' ? PRODUCT_OPTIONS : ROUTING_OPTIONS;

  const handleLanguageChange = (newLocale: RoutingLocale) => {
    if (scope === 'app' && (PRODUCT_LOCALES as readonly string[]).includes(newLocale)) {
      persistAppLocale(newLocale as ProductLocale);
    }
    router.replace(pathname, { locale: newLocale });
    router.refresh();
  };

  // Color inherit: ProfileHeader controls the text color so it matches the resolved theme
  // (light/dark) instead of the fixed global --ink. compact shrinks it to reclaim vertical space.
  return (
    <div style={{ display: 'flex', gap: compact ? '6px' : '8px', alignItems: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: compact ? '11px' : '13px', color: 'inherit' }}>
      {scope === 'app' && <Globe2 aria-hidden className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />}
      {options.map((option, index) => (
        <span key={option.value} style={{ display: 'inline-flex', gap: compact ? '6px' : '8px', alignItems: 'center' }}>
          {index > 0 && <span style={{ opacity: 0.3 }}>|</span>}
          <button
            onClick={() => handleLanguageChange(option.value)}
            style={{
              fontWeight: locale === option.value ? 600 : 400,
              opacity: locale === option.value ? 1 : 0.5,
              background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit'
            }}
          >
            {scope === 'app' ? option.label : option.label.toUpperCase()}
          </button>
        </span>
      ))}
    </div>
  );
}
