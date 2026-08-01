// Previously an 11-fixed-archetype lookup table. The setup-agent now generates a bespoke
// theme (colors + Google Font pair) per business via the `setTheme` tool, so this file only
// keeps the shared type + a fallback used when a business has no theme set yet.

export type MediaProfile = 'gallery-first' | 'service-focused' | 'minimal';
export type LayoutStyle = 'compact' | 'spacious' | 'card-heavy' | 'flat';
export type BorderRadiusStyle = 'none' | 'sm' | 'md' | 'xl' | 'full';

export type ThemeColors = {
  background: string;    // Sayfa arka planı
  surface: string;       // Kart ve konteyner arka planı
  primary: string;       // Vurgu rengi (butonlar vs.)
  text: string;          // Ana metin
  textMuted: string;     // İkincil/pasif metin
  border: string;        // Sınır çizgileri
};

export interface Theme {
  colors: ThemeColors;
  headingFont: string;     // Google Font aile adı, örn. "Fraunces"
  bodyFont: string;        // Google Font aile adı, örn. "Mulish"
  mediaProfile: MediaProfile;
  layoutStyle: LayoutStyle;
  borderRadius: BorderRadiusStyle;
  // İşletme sahibinin editörde seçtiği tek görünüm modu. Ziyaretçiye görünen bir toggle YOK.
  // Varsayılan 'light'; AI paletleri her zaman açık mod için üretilir, koyu mod resolveThemeColors
  // ile türetilir (marka vurgusu korunur, nötrler sabit koyu bir zemine çevrilir).
  mode?: 'light' | 'dark';
  accent?: {
    mode: 'solid' | 'gradient';
    gradientFrom: string;
    gradientTo: string;
  };
}

// Sabit koyu nötr zemin — koyu modda AI paletinin nötr renkleri yerine kullanılır. Marka
// vurgusu (primary) her zaman temanın kendi renginden korunur. v1'de sabit; ileride Beiwe'nin
// markaya özel koyu palet üretmesi ayrı bir iş olarak bırakıldı.
const DARK_NEUTRALS = {
  background: '#0F1115',
  surface: '#1A1D23',
  text: '#F5F5F5',
  textMuted: '#9AA0A6',
  border: '#2A2E35',
} as const;

// Temanın seçili moduna göre efektif renk paletini döner. Açık modda temanın kendi renkleri;
// koyu modda sabit koyu nötrler + temanın primary vurgusu.
export function resolveThemeColors(theme: Theme): ThemeColors {
  if (theme.mode !== 'dark') return theme.colors;
  return {
    ...DARK_NEUTRALS,
    primary: theme.colors.primary,
  };
}

export function resolveAccentFill(theme: Theme): string {
  const primary = theme.colors.primary;
  if (theme.accent?.mode !== 'gradient') return primary;
  const from = /^#[0-9a-fA-F]{6}$/.test(theme.accent.gradientFrom || '') ? theme.accent.gradientFrom : primary;
  const to = /^#[0-9a-fA-F]{6}$/.test(theme.accent.gradientTo || '') ? theme.accent.gradientTo : primary;
  return `linear-gradient(135deg, ${from}, ${to})`;
}

export function resolvePageCanvases(theme: Theme): { pageCanvas: string; stickyCanvas: string } {
  const c = resolveThemeColors(theme);
  if (theme.mode === 'dark') {
    return { pageCanvas: c.background, stickyCanvas: c.background };
  }

  const accentFrom =
    theme.accent?.mode === 'gradient' && /^#[0-9a-fA-F]{6}$/.test(theme.accent.gradientFrom || '')
      ? theme.accent.gradientFrom
      : c.primary;
  const accentTo =
    theme.accent?.mode === 'gradient' && /^#[0-9a-fA-F]{6}$/.test(theme.accent.gradientTo || '')
      ? theme.accent.gradientTo
      : c.primary;

  if (theme.accent?.mode === 'gradient') {
    return {
      pageCanvas: `linear-gradient(160deg, color-mix(in srgb, ${accentFrom} 12%, #ffffff) 0%, color-mix(in srgb, ${accentTo} 10%, #ffffff) 38%, color-mix(in srgb, ${accentFrom} 4%, ${c.background}) 68%, ${c.background} 100%)`,
      stickyCanvas: `linear-gradient(160deg, color-mix(in srgb, ${accentFrom} 10%, ${c.background}) 0%, color-mix(in srgb, ${accentTo} 8%, ${c.background}) 100%)`,
    };
  }

  return {
    pageCanvas: `linear-gradient(180deg, color-mix(in srgb, ${c.primary} 9%, #ffffff) 0%, color-mix(in srgb, ${c.primary} 4%, ${c.background}) 44%, ${c.background} 100%)`,
    stickyCanvas: `color-mix(in srgb, ${c.primary} 6%, ${c.background})`,
  };
}

export const DEFAULT_THEME: Theme = {
  colors: {
    background: '#FAFAFA',
    surface: '#FFFFFF',
    primary: '#111827',
    text: '#111827',
    textMuted: '#6B7280',
    border: '#E5E7EB',
  },
  headingFont: 'Inter',
  bodyFont: 'Inter',
  mediaProfile: 'service-focused',
  layoutStyle: 'compact',
  borderRadius: 'xl',
  accent: {
    mode: 'solid',
    gradientFrom: '#111827',
    gradientTo: '#14B8A6',
  },
};
