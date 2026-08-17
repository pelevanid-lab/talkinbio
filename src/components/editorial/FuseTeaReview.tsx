import type { RoutingLocale } from '@/i18n/locales';
import AdReviewArticle from './AdReviewArticle';

export default function FuseTeaReview({ locale }: { locale: RoutingLocale }) {
  return <AdReviewArticle locale={locale} reviewKey="fuseTea" />;
}
