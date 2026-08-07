'use client';

import { usePathname } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { Users, Sparkles, Mic, Clapperboard, Film, Scissors, Type } from 'lucide-react';

// ContinuousImprovementTabs ile aynı sekme deseni. Fark: Lab'ın katmanları sıralı bir
// üretim hattı, o yüzden henüz yazılmamış olanlar da görünür ama tıklanamaz — hattın
// nereye gittiği baştan okunsun.
//
// Beiwe Podcast ile Beiwe Motion farklı işler: Podcast beğenilen bir sahneyi konuşan
// videoya çeviriyor (ses üstte, kimlik sabit — bkz. BeiwePodcastClient). Motion
// ("Action Room") sesle ilişkilendirilmiyor, boydan görüntü öne çıkıyor, kimlik zorunlu
// değil (Twin ya da jenerik/rastgele karakter) — AI aktör/anime/çizgi film/cinematic/
// fantastic/trend videoları için (bkz. BeiweMotionClient, config/motionStyles.ts).
const tabs = [
  { label: 'Twin', href: '/admin/beiwe-lab/twin', icon: Sparkles, ready: true },
  { label: 'Yardımcı Oyuncular', getLabel: (t: any) => t('labTabCast'), href: '/admin/beiwe-lab/cast', icon: Users, ready: true },
  { label: 'Voice', href: '/admin/beiwe-lab/voice', icon: Mic, ready: true },
  { label: 'Podcast', href: '/admin/beiwe-lab/podcast', icon: Clapperboard, ready: true },
  { label: 'Motion', href: '/admin/beiwe-lab/motion', icon: Film, ready: true },
  { label: 'Studio', href: '/admin/beiwe-lab/studio', icon: Scissors, ready: true },
  { label: 'Post', href: '/admin/beiwe-lab/post', icon: Type, ready: true },
];

export default function BeiweLabTabs() {
  const pathname = usePathname();
  const t = useTranslations('BeiweLab');

  return (
    <div className="border-b border-slate-200 mb-6">
      <div className="flex items-center gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname.includes(tab.href.split('/admin/')[1]);

          if (!tab.ready) {
            return (
              <span
                key={tab.href}
                title={t('labTabNotReady')}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 border-transparent text-slate-300 cursor-not-allowed whitespace-nowrap"
              >
                <Icon className="w-4 h-4" />
                {tab.getLabel ? tab.getLabel(t) : tab.label}
              </span>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
                isActive
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.getLabel ? tab.getLabel(t) : tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
