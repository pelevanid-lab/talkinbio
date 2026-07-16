import { useMemo } from 'react';
import { hasRealContent } from '@/config/blockTypes';

export type SuggestionType = 'warning' | 'info' | 'success';

export interface Suggestion {
  id: string;
  message: string;
  type: SuggestionType;
  triggerMessage: string;
  icon: string;
}

const VISUAL_SECTORS = ['beauty_salon', 'photographer', 'tattoo_artist', 'architect', 'restaurant'];
const TRUST_SECTORS = ['consultant', 'lawyer', 'therapist', 'real_estate', 'financial_advisor', 'health'];

export function useBeiweSuggestions(
  blocks: any[],
  businessCategory: string | null,
  contactValue: string | null,
  locale: string,
  hasCustomTheme: boolean
) {
  return useMemo(() => {
    const suggestions: Suggestion[] = [];

    // Helper to find block
    const getBlock = (type: string) => blocks.find(b => b.type === type && hasRealContent(b));
    const aboutBlock = getBlock('about');
    const servicesBlock = getBlock('services');
    const galleryBlock = getBlock('gallery');
    const testimonialsBlock = getBlock('testimonials');
    const linksBlock = getBlock('links');

    // 1. About text is too short
    if (aboutBlock) {
      const text = aboutBlock.content?.[locale]?.text || '';
      if (text.length > 0 && text.length < 60) {
        suggestions.push({
          id: 'short-about',
          message: 'Hakkımda metniniz oldukça kısa. Biraz daha hikayenizi anlatmak güven verir.',
          type: 'warning',
          triggerMessage: 'Hakkımda metnimi genişletmek için bana birkaç soru sorar mısın?',
          icon: '✍️'
        });
      }
    }

    // 2. Services without image or price
    if (servicesBlock) {
      const items = servicesBlock.content?.items || [];
      const hasImage = items.some((item: any) => item.mediaUrl);
      const hasPrice = items.some((item: any) => item.price);

      if (items.length > 0 && (!hasImage && !hasPrice)) {
        suggestions.push({
          id: 'bland-services',
          message: 'Hizmetlerinizde görsel veya fiyat bilgisi yok. Bunları eklemek dönüşümü artırabilir.',
          type: 'info',
          triggerMessage: 'Mevcut hizmetlerime fiyat ve detay eklemek istiyorum.',
          icon: '🛍️'
        });
      }
    }

    // 3. Visual sectors without gallery
    if (businessCategory && VISUAL_SECTORS.includes(businessCategory) && !galleryBlock) {
      suggestions.push({
        id: 'missing-gallery',
        message: 'Sektörünüz gereği işlerinizi sergilemek önemli. Bir Fotoğraf Galerisi ekleyelim.',
        type: 'warning',
        triggerMessage: 'Sayfama bir fotoğraf galerisi eklemek istiyorum.',
        icon: '📸'
      });
    }

    // 4. Trust sectors without testimonials
    if (businessCategory && TRUST_SECTORS.includes(businessCategory) && !testimonialsBlock) {
      suggestions.push({
        id: 'missing-testimonials',
        message: 'Müşteri yorumları potansiyel müşterilere güven verir. Referanslarınızı eklemeyi düşünün.',
        type: 'info',
        triggerMessage: 'Sayfama müşteri yorumları (Testimonials) ekleyelim.',
        icon: '⭐'
      });
    }

    // 5. No links
    if (!linksBlock) {
      suggestions.push({
        id: 'missing-links',
        message: 'Sosyal medya hesaplarınızı veya randevu bağlantılarınızı eklemediniz.',
        type: 'info',
        triggerMessage: 'Sosyal medya ve randevu bağlantılarımı eklemek istiyorum.',
        icon: '🔗'
      });
    }

    // 6. Theme Suggestion (Generic)
    if (!hasCustomTheme) {
      suggestions.push({
        id: 'missing-theme',
        message: 'Sayfanıza henüz özgün bir renk paleti ve font çifti atanmamış.',
        type: 'warning',
        triggerMessage: 'İşletmeme uygun özgün bir tasarım (renk ve font) tasarlar mısın?',
        icon: '🎨'
      });
    }

    return suggestions;
  }, [blocks, businessCategory, contactValue, locale, hasCustomTheme]);
}
