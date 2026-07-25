import { ThemeConfig } from './ThemeWrapper';

export interface BaseTemplateProps {
  theme: ThemeConfig;
  title: string;
  subtitle: string;
  ctaText: string;
  imageUrl?: string;
}
