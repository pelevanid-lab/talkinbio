'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { LayoutDashboard, Inbox, BarChart3, CreditCard, TrendingUp } from 'lucide-react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Genel Bakış', href: '/admin', icon: LayoutDashboard },
    { label: 'Talepler', href: '/admin/requests', icon: Inbox },
    { label: 'Analitik', href: '/admin/analytics', icon: BarChart3 },
    { label: 'Abonelikler', href: '/admin/subscriptions', icon: CreditCard },
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
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
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
