// Previously an 11-fixed-archetype lookup table. The setup-agent now generates a bespoke
// theme (colors + Google Font pair) per business via the `setTheme` tool, so this file only
// keeps the shared type + a fallback used when a business has no theme set yet.

export type MediaProfile = 'gallery-first' | 'service-focused' | 'minimal';
export type LayoutStyle = 'compact' | 'spacious' | 'card-heavy' | 'flat';
export type BorderRadiusStyle = 'none' | 'sm' | 'md' | 'xl' | 'full';

export interface Theme {
  colors: {
    background: string;    // Sayfa arka planı
    surface: string;       // Kart ve konteyner arka planı
    primary: string;       // Vurgu rengi (butonlar vs.)
    text: string;          // Ana metin
    textMuted: string;     // İkincil/pasif metin
    border: string;        // Sınır çizgileri
  };
  headingFont: string;     // Google Font aile adı, örn. "Fraunces"
  bodyFont: string;        // Google Font aile adı, örn. "Mulish"
  mediaProfile: MediaProfile;
  layoutStyle: LayoutStyle;
  borderRadius: BorderRadiusStyle;
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
};
