'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Link, routing } from '@/i18n/routing';
import { LayoutDashboard, Inbox, BarChart3, CreditCard, TrendingUp, Sparkles, Volume2, Type, Film, Users, type LucideIcon } from 'lucide-react';

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Yalnız tam eşleşmede vurgulan — aksi halde `/admin` her alt sayfayla eşleşir. */
  exact?: boolean;
  /** Birden çok namespace'e yayılan bölümler için ek eşleşme kökleri. */
  matchPrefixes?: string[];
  children?: { label: string; href: string; icon?: LucideIcon }[];
};

const LOCALE_PREFIX = new RegExp(`^/(${routing.locales.join('|')})(?=/|$)`);

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // usePathname (next/navigation) locale önekini içerir; navItems yolları locale'siz.
  const path = pathname.replace(LOCALE_PREFIX, '') || '/';
  const matches = (href: string, exact?: boolean) =>
    exact ? path === href : path === href || path.startsWith(`${href}/`);

  const navItems: NavItem[] = [
    { label: 'Genel Bakış', href: '/admin', icon: LayoutDashboard, exact: true },
    { label: 'Talepler', href: '/admin/requests', icon: Inbox },
    { label: 'Analitik', href: '/admin/analytics', icon: BarChart3 },
    { label: 'Abonelikler', href: '/admin/subscriptions', icon: CreditCard },
    {
      label: 'Talkinbio Lab',
      href: '/admin/beiwe-lab/saule-voice-packages',
      icon: Sparkles,
      // Lab iki namespace'e yayılıyor: eski oda `/admin/characters`, yeni katmanlar
      // `/admin/beiwe-lab`. Grup, ikisinde de vurgulu kalsın.
      matchPrefixes: ['/admin/characters', '/admin/beiwe-lab', '/admin/talkinbio-lab'],
      children: [
        { label: 'Saule Ses Paketleri', href: '/admin/beiwe-lab/saule-voice-packages', icon: Volume2 },
        { label: 'Post', href: '/admin/beiwe-lab/post', icon: Type },
        { label: 'Motion', href: '/admin/beiwe-lab/motion', icon: Film },
        { label: 'Yardımcı Oyuncular', href: '/admin/beiwe-lab/cast', icon: Users },
      ],
    },
    { label: 'Sürekli Gelişim', href: '/admin/continuous-improvement', icon: TrendingUp },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold tracking-tight">Talkinbio Admin</h2>
        </div>
        <nav className="flex-1 py-4">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => {
              const isActive = (item.matchPrefixes ?? [item.href]).some((href) =>
                matches(href, item.exact),
              );
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                  {item.children && (
                    <ul className="mt-1 ml-6 space-y-1 border-l border-slate-800 pl-3">
                      {item.children.map((child) => {
                        const isChildActive = matches(child.href);
                        return (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              className={`block px-3 py-1.5 rounded-lg text-sm transition ${
                                isChildActive
                                  ? 'bg-blue-600/80 text-white'
                                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                              }`}
                            >
                              <span className="inline-flex items-center gap-2">
                                {child.icon && <child.icon className="w-3.5 h-3.5" />}
                                {child.label}
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
          &copy; 2026 Talkinbio
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
