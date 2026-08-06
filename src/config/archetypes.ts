// Previously an 11-fixed-archetype lookup table. Each business now picks its own
// theme (colors + light/dark mode) manually in the editor, so this file only keeps
// the shared type + a fallback used when a business has no theme set yet.

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
    gradientMid?: string;
    gradientTo: string;
    hueShift?: number;
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
  const [from, mid, to] = resolveAccentGradientColors(theme);
  return `linear-gradient(135deg, ${from} 0%, ${mid} 48%, ${to} 100%)`;
}

function clampHueShift(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(-180, Math.min(180, Math.round(value)));
}

function isHexColor(value: string | undefined): value is string {
  return /^#[0-9a-fA-F]{6}$/.test(value || '');
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
  else if (max === gn) h = ((bn - rn) / d + 2) * 60;
  else h = ((rn - gn) / d + 4) * 60;
  return [h, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function shiftColor(hex: string, deg: number): string {
  if (!deg) return hex;
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  return hslToHex((h + deg + 360) % 360, s, l);
}

export function resolveAccentGradientColors(theme: Theme): [string, string, string] {
  const primary = theme.colors.primary;
  const from = isHexColor(theme.accent?.gradientFrom) ? theme.accent.gradientFrom : primary;
  const mid = isHexColor(theme.accent?.gradientMid) ? theme.accent.gradientMid : '#7C3AED';
  const to = isHexColor(theme.accent?.gradientTo) ? theme.accent.gradientTo : '#14B8A6';
  const hueShift = clampHueShift(theme.accent?.hueShift);
  return [shiftColor(from, hueShift), shiftColor(mid, hueShift), shiftColor(to, hueShift)];
}

export function resolvePageCanvases(theme: Theme): { pageCanvas: string; stickyCanvas: string } {
  const c = resolveThemeColors(theme);
  if (theme.mode === 'dark') {
    return { pageCanvas: c.background, stickyCanvas: c.background };
  }

  if (theme.accent?.mode === 'gradient') {
    const [accentFrom, accentMid, accentTo] = resolveAccentGradientColors(theme);
    return {
      pageCanvas: `radial-gradient(circle at 15% 12%, color-mix(in srgb, ${accentFrom} 18%, transparent) 0%, transparent 34%), radial-gradient(circle at 86% 18%, color-mix(in srgb, ${accentMid} 15%, transparent) 0%, transparent 32%), radial-gradient(circle at 60% 82%, color-mix(in srgb, ${accentTo} 14%, transparent) 0%, transparent 38%), linear-gradient(160deg, color-mix(in srgb, ${accentFrom} 8%, #ffffff) 0%, color-mix(in srgb, ${accentMid} 6%, ${c.background}) 48%, color-mix(in srgb, ${accentTo} 6%, ${c.background}) 100%)`,
      stickyCanvas: `linear-gradient(150deg, color-mix(in srgb, ${accentFrom} 8%, ${c.background}) 0%, color-mix(in srgb, ${accentMid} 6%, ${c.background}) 50%, color-mix(in srgb, ${accentTo} 6%, ${c.background}) 100%)`,
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
    gradientMid: '#7C3AED',
    gradientTo: '#14B8A6',
    hueShift: 0,
  },
};
