'use client';

import { usePathname } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { LayoutGrid, TrendingUp, Map } from 'lucide-react';

const tabs = [
  { label: 'Yalın Kanvas', href: '/admin/continuous-improvement', icon: LayoutGrid },
  { label: 'Fermi Tahmini V.1', href: '/admin/continuous-improvement/fermi-estimation', icon: TrendingUp },
  { label: 'Çekim Gücü Yol Haritası', href: '/admin/continuous-improvement/traction-roadmap', icon: Map },
];

export default function ContinuousImprovementTabs() {
  const pathname = usePathname();

  return (
    <div className="border-b border-slate-200 mb-2">
      <div className="flex items-center gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          // Exact match for root, prefix match for sub-pages
          const isActive =
            tab.href === '/admin/continuous-improvement'
              ? pathname.endsWith('/continuous-improvement')
              : pathname.includes(tab.href.split('/admin/')[1]);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                isActive
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
