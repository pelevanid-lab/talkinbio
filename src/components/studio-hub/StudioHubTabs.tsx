'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';

// 3 sekme, birbirine bağlı bir hub — Planla (ne paylaşayım) → Düzenle (elimdeki
// çekimi düzelt/seslendir/altyazıla) → Üret (yayına hazır son hâle paketle). Sıra
// bilinçli: pipeline mantığını yansıtıyor, alfabetik değil.
const TABS = [
  { key: 'planla', href: '/dashboard/studio/planla', labelKey: 'tabPlanla' },
  { key: 'duzenle', href: '/dashboard/studio/duzenle', labelKey: 'tabDuzenle' },
  { key: 'uret', href: '/dashboard/studio/uret', labelKey: 'tabUret' },
] as const;

export default function StudioHubTabs() {
  const pathname = usePathname();
  const t = useTranslations('StudioHub');

  return (
    <div className="flex items-center gap-1 mb-6 border-b border-[#E4E1D8]">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              isActive ? 'border-[#14231F] text-[#14231F]' : 'border-transparent text-[#8A8880] hover:text-[#14231F]'
            }`}
          >
            {t(tab.labelKey)}
          </Link>
        );
      })}
    </div>
  );
}
