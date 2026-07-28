export type StudioTemplateId = 'talkinbio-split-vertical' | 'talkinbio-pip-circle' | 'talkinbio-text-overlay' | 'talkinbio-news-ticker' | 'talkinbio-qa-bubble';

export interface StudioTemplate {
  id: StudioTemplateId;
  name: string;
  description: string;
  layers: TemplateLayer[];
}

export type LayerType = 'background' | 'character' | 'text' | 'subtitle' | 'shape';

export interface TemplateLayer {
  id: string;
  type: LayerType;
  x: number | string; // % or px
  y: number | string; // % or px
  width: number | string; // % or px
  height: number | string; // % or px
  zIndex: number;
  properties: any;
}

export const STUDIO_TEMPLATES: StudioTemplate[] = [
  {
    id: 'talkinbio-pip-circle',
    name: 'Picture in Picture (Daire)',
    description: 'Arka planda ana olay dönerken, köşede yuvarlak bir çerçevede karakter konuşur.',
    layers: [
      {
        id: 'bg-layer',
        type: 'background',
        x: 0, y: 0, width: '100%', height: '100%',
        zIndex: 1,
        properties: { backgroundColor: '#F4F2ED' }
      },
      {
        id: 'character-layer',
        type: 'character',
        x: '70%', y: '10%', width: '25%', height: '25%', // yuvarlak oranlanacak
        zIndex: 2,
        properties: { borderRadius: '50%', border: '4px solid #FF6A5C' }
      },
      {
        id: 'subtitle-layer',
        type: 'subtitle',
        x: '10%', y: '80%', width: '80%', height: '15%',
        zIndex: 3,
        properties: { 
          fontFamily: 'Inter, sans-serif', 
          fontSize: '24px',
          color: '#14231F',
          backgroundColor: '#FFEDE9',
          textAlign: 'center'
        }
      }
    ]
  },
  {
    id: 'talkinbio-split-vertical',
    name: 'Bölünmüş Ekran (Dikey)',
    description: 'TikTok/Reels için üstte ana olay, altta konuşan karakter.',
    layers: [
      {
        id: 'bg-layer',
        type: 'background',
        x: 0, y: 0, width: '100%', height: '50%',
        zIndex: 1,
        properties: { backgroundColor: '#14231F' }
      },
      {
        id: 'character-layer',
        type: 'character',
        x: 0, y: '50%', width: '100%', height: '50%',
        zIndex: 1,
        properties: {}
      },
      {
        id: 'subtitle-layer',
        type: 'subtitle',
        x: '10%', y: '45%', width: '80%', height: '10%',
        zIndex: 3,
        properties: { 
          fontFamily: 'Bricolage Grotesque, sans-serif', 
          fontSize: '28px',
          color: '#F4F2ED',
          backgroundColor: '#FF6A5C',
          textAlign: 'center'
        }
      }
    ]
  },
  {
    id: 'talkinbio-text-overlay',
    name: 'Klasik Metin Bindirme',
    description: 'Tam ekran karakter ve üzerinde vurucu bir başlık.',
    layers: [
      {
        id: 'character-layer',
        type: 'character',
        x: 0, y: 0, width: '100%', height: '100%',
        zIndex: 1,
        properties: {}
      },
      {
        id: 'title-layer',
        type: 'text',
        x: '10%', y: '10%', width: '80%', height: '20%',
        zIndex: 2,
        properties: {
          text: 'Başlık Buraya',
          fontFamily: 'Bricolage Grotesque, sans-serif',
          fontSize: '48px',
          fontWeight: '800',
          color: '#FF6A5C'
        }
      }
    ]
  },
  {
    id: 'talkinbio-news-ticker',
    name: 'Haber Bülteni',
    description: 'Altta kayan yazı (veya sabit haber bandı) ve büyük karakter.',
    layers: [
      {
        id: 'bg-layer',
        type: 'background',
        x: 0, y: 0, width: '100%', height: '100%',
        zIndex: 1,
        properties: { backgroundColor: '#14231F' }
      },
      {
        id: 'character-layer',
        type: 'character',
        x: '5%', y: '5%', width: '90%', height: '70%',
        zIndex: 2,
        properties: { borderRadius: '16px', border: '2px solid #4B5A55' }
      },
      {
        id: 'ticker-layer',
        type: 'subtitle',
        x: 0, y: '85%', width: '100%', height: '15%',
        zIndex: 3,
        properties: { 
          fontFamily: 'IBM Plex Mono, monospace', 
          fontSize: '22px',
          color: '#14231F',
          backgroundColor: '#FF6A5C',
          textAlign: 'center',
          fontWeight: '700'
        }
      }
    ]
  },
  {
    id: 'talkinbio-qa-bubble',
    name: 'Soru & Cevap (Baloncuk)',
    description: 'Üstte soru baloncuğu, altta tam ekran karakter.',
    layers: [
      {
        id: 'character-layer',
        type: 'character',
        x: 0, y: 0, width: '100%', height: '100%',
        zIndex: 1,
        properties: {}
      },
      {
        id: 'question-layer',
        type: 'text',
        x: '10%', y: '10%', width: '80%', height: '15%',
        zIndex: 2,
        properties: { 
          text: 'Soru: Yeni özellikler ne zaman geliyor?',
          fontFamily: 'Inter, sans-serif', 
          fontSize: '20px',
          color: '#14231F',
          backgroundColor: '#F4F2ED',
          textAlign: 'left',
          borderRadius: '16px',
          border: '1px solid rgba(20, 35, 31, 0.10)'
        }
      }
    ]
  }
];
