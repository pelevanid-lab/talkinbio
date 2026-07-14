export type MediaProfile = 'gallery-first' | 'service-focused' | 'minimal';
export type LayoutStyle = 'compact' | 'spacious' | 'card-heavy' | 'flat';

export interface ArchetypeConfig {
  id: string;
  name: string;
  colors: {
    background: string;       // Sayfa arka planı
    surface: string;          // Kart ve konteyner arka planı
    primary: string;          // Vurgu rengi (butonlar vs.)
    text: string;             // Ana metin
    textMuted: string;        // İkincil/pasif metin
    border: string;           // Sınır çizgileri
  };
  typography: {
    headingFont: string;      // Tailwind font class
    bodyFont: string;         // Tailwind font class
  };
  mediaProfile: MediaProfile;
  layoutStyle: LayoutStyle;
}

export const ARCHETYPES: Record<string, ArchetypeConfig> = {
  'minimal-light': {
    id: 'minimal-light',
    name: 'Sade & Zarif',
    colors: {
      background: '#FAFAFA',
      surface: '#FFFFFF',
      primary: '#111827',
      text: '#111827',
      textMuted: '#6B7280',
      border: '#E5E7EB',
    },
    typography: { headingFont: 'font-sans font-bold', bodyFont: 'font-sans' },
    mediaProfile: 'minimal',
    layoutStyle: 'compact',
  },
  'dark-elegant': {
    id: 'dark-elegant',
    name: 'Koyu & Şık',
    colors: {
      background: '#121212',
      surface: '#1E1E1E',
      primary: '#D4AF37', // Gold
      text: '#F3F4F6',
      textMuted: '#9CA3AF',
      border: '#374151',
    },
    typography: { headingFont: 'font-serif font-semibold', bodyFont: 'font-sans' },
    mediaProfile: 'gallery-first',
    layoutStyle: 'spacious',
  },
  'warm-natural': {
    id: 'warm-natural',
    name: 'Doğal & Sıcak',
    colors: {
      background: '#FDFBF7',
      surface: '#F5F0E6',
      primary: '#8B5A2B', // Terracotta/Brown
      text: '#3E2723',
      textMuted: '#795548',
      border: '#EAE0D5',
    },
    typography: { headingFont: 'font-sans font-medium', bodyFont: 'font-sans' },
    mediaProfile: 'service-focused',
    layoutStyle: 'flat',
  },
  'vibrant-bold': {
    id: 'vibrant-bold',
    name: 'Enerjik & Canlı',
    colors: {
      background: '#0F172A',
      surface: '#1E293B',
      primary: '#10B981', // Neon green
      text: '#F8FAFC',
      textMuted: '#94A3B8',
      border: '#334155',
    },
    typography: { headingFont: 'font-bricolage font-black tracking-tight', bodyFont: 'font-sans' },
    mediaProfile: 'gallery-first',
    layoutStyle: 'card-heavy',
  },
  'soft-inviting': {
    id: 'soft-inviting',
    name: 'Yumuşak & Davetkâr',
    colors: {
      background: '#FFF0F5',
      surface: '#FFFFFF',
      primary: '#FF69B4', // Hot pink/rose
      text: '#4A0E4E',
      textMuted: '#8E5EA2',
      border: '#FADADD',
    },
    typography: { headingFont: 'font-sans font-bold', bodyFont: 'font-sans' },
    mediaProfile: 'service-focused',
    layoutStyle: 'compact',
  },
  'professional-corporate': {
    id: 'professional-corporate',
    name: 'Profesyonel',
    colors: {
      background: '#F3F4F6',
      surface: '#FFFFFF',
      primary: '#2563EB', // Blue
      text: '#1F2937',
      textMuted: '#4B5563',
      border: '#D1D5DB',
    },
    typography: { headingFont: 'font-sans font-semibold', bodyFont: 'font-sans' },
    mediaProfile: 'minimal',
    layoutStyle: 'card-heavy',
  },
  'playful-colorful': {
    id: 'playful-colorful',
    name: 'Eğlenceli & Renkli',
    colors: {
      background: '#FEF3C7', // Amber 50
      surface: '#FFFFFF',
      primary: '#F59E0B', // Amber 500
      text: '#78350F',
      textMuted: '#B45309',
      border: '#FDE68A',
    },
    typography: { headingFont: 'font-bricolage font-bold', bodyFont: 'font-sans' },
    mediaProfile: 'service-focused',
    layoutStyle: 'flat',
  },
  'artisan-rustic': {
    id: 'artisan-rustic',
    name: 'Artizan & Zanaatkâr',
    colors: {
      background: '#EAE6DF',
      surface: '#F4F1EA',
      primary: '#2F4F4F', // Dark slate gray
      text: '#1A1A1A',
      textMuted: '#4D4D4D',
      border: '#D4CFC4',
    },
    typography: { headingFont: 'font-serif font-bold', bodyFont: 'font-serif' },
    mediaProfile: 'gallery-first',
    layoutStyle: 'spacious',
  }
};

export const DEFAULT_ARCHETYPE = ARCHETYPES['minimal-light'];
