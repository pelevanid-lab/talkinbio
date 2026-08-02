import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
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

export function useSauleSuggestions(
  blocks: any[],
  businessCategory: string | null,
  contactValue: string | null,
  locale: string,
  hasCustomTheme: boolean
) {
  const t = useTranslations('Editor.ruleBasedSuggestions');
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
          message: t('shortAbout.message'),
          type: 'warning',
          triggerMessage: t('shortAbout.trigger'),
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
          message: t('blandServices.message'),
          type: 'info',
          triggerMessage: t('blandServices.trigger'),
          icon: '🛍️'
        });
      }
    }

    // 3. Visual sectors without gallery
    if (businessCategory && VISUAL_SECTORS.includes(businessCategory) && !galleryBlock) {
      suggestions.push({
        id: 'missing-gallery',
        message: t('missingGallery.message'),
        type: 'warning',
        triggerMessage: t('missingGallery.trigger'),
        icon: '📸'
      });
    }

    // 4. Trust sectors without testimonials
    if (businessCategory && TRUST_SECTORS.includes(businessCategory) && !testimonialsBlock) {
      suggestions.push({
        id: 'missing-testimonials',
        message: t('missingTestimonials.message'),
        type: 'info',
        triggerMessage: t('missingTestimonials.trigger'),
        icon: '⭐'
      });
    }

    // 5. No links
    if (!linksBlock) {
      suggestions.push({
        id: 'missing-links',
        message: t('missingLinks.message'),
        type: 'info',
        triggerMessage: t('missingLinks.trigger'),
        icon: '🔗'
      });
    }

    // 6. Theme Suggestion (Generic)
    if (!hasCustomTheme) {
      suggestions.push({
        id: 'missing-theme',
        message: t('missingTheme.message'),
        type: 'warning',
        triggerMessage: t('missingTheme.trigger'),
        icon: '🎨'
      });
    }

    return suggestions;
  }, [blocks, businessCategory, contactValue, locale, hasCustomTheme, t]);
}
