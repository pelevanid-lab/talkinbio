'use client';

import { ReactNode, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/utils/supabase/client';
import {
  Inbox,
  BarChart3,
  Coins,
  Sparkles,
  Pencil,
  ExternalLink,
  LogOut,
  Menu,
  X,
  Home,
  type LucideIcon,
} from 'lucide-react';
import CreditBadge from '@/components/CreditBadge';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export type DashboardSection = 'leads' | 'analytics' | 'billing' | 'creative-studio';

type NavItem = {
  key: DashboardSection;
  label: string;
  href: string;
  icon: LucideIcon;
};

type Business = {
  id: string;
  name: string;
  username: string;
  credit_balance: number;
};

// Leads/Analytics/Billing üç ayrı `<header>` kopyalıyordu (aynı pill-nav deseni üç
// yerde bakım gerektiriyordu — ekrandaki dağınıklığın kaynağı buydu). Bu shell tek
// kaynak: sol sidebar (masaüstü) + üstte açılır menü (mobil), sayfalar sadece
// içeriklerini `children` olarak verir.
export default function DashboardShell({ business, active, children }: { business: Business; active: DashboardSection; children: ReactNode }) {
  const t = useTranslations('Leads');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const navItems: NavItem[] = [
    { key: 'leads', label: t('headerTitle'), href: '/dashboard/leads', icon: Inbox },
    { key: 'analytics', label: t('navAnalytics'), href: '/dashboard/analytics', icon: BarChart3 },
    { key: 'billing', label: t('navBilling'), href: '/dashboard/billing', icon: Coins },
    { key: 'creative-studio', label: t('navCreativeStudio'), href: '/dashboard/creative-studio', icon: Sparkles },
  ];

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const SidebarContent = () => (
    <>
      <div className="px-5 pt-6 pb-5">
        <p className="text-lg font-[800] tracking-[-0.02em] text-[#14231F] font-['Bricolage_Grotesque'] truncate">{business.name}</p>
        <p className="text-xs text-[#8A8880] font-mono mt-0.5">talkinbio.com/{business.username}</p>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        <a
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#4B5A55] hover:bg-[#F4F2ED] transition-colors"
        >
          <Home className="w-4 h-4 shrink-0" />
          {t('navHome')}
        </a>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <a
              key={item.key}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive ? 'bg-[#14231F] text-white' : 'text-[#4B5A55] hover:bg-[#F4F2ED]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </a>
          );
        })}
        <a
          href="/dashboard/editor"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#4B5A55] hover:bg-[#F4F2ED] transition-colors"
        >
          <Pencil className="w-4 h-4 shrink-0" />
          {t('navEditor')}
        </a>
        <div className="pt-6 px-3 text-[#8A8880]">
          <LanguageSwitcher />
        </div>
      </nav>

      <div className="px-3 pb-5 pt-3 border-t border-[rgba(20,35,31,0.10)] flex flex-col gap-2">
        <CreditBadge balance={business.credit_balance ?? 0} />
        <a
          href={`/${business.username}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-[#FF6A5C] bg-[#FFEDE9] hover:bg-orange-100 transition"
        >
          <ExternalLink className="w-4 h-4" />
          {t('navViewProfile')}
        </a>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-[#4B5A55] hover:bg-red-50 hover:text-red-600 transition"
        >
          <LogOut className="w-4 h-4" />
          {t('logout')}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-[#F4F2ED]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-white border-r border-[rgba(20,35,31,0.10)] sticky top-0 h-screen">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-30 bg-white border-b border-[rgba(20,35,31,0.10)] flex items-center justify-between px-4 py-3">
        <p className="font-[800] text-[#14231F] font-['Bricolage_Grotesque']">{business.name}</p>
        <button onClick={() => setMobileNavOpen(true)} className="p-2 text-[#14231F]" aria-label="Menu">
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile nav drawer */}
      {mobileNavOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileNavOpen(false)} />
          <aside className="relative w-72 max-w-[85vw] bg-white flex flex-col h-full shadow-xl">
            <div className="flex justify-end px-3 pt-3">
              <button onClick={() => setMobileNavOpen(false)} className="p-2 text-[#8A8880]" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 pt-14 lg:pt-0">{children}</div>
    </div>
  );
}
