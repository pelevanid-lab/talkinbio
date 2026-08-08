'use client';

import { useState, type ComponentProps } from 'react';
import { useTranslations } from 'next-intl';
import BeiweVoiceClient from '@/components/beiwe-lab/BeiweVoiceClient';
import BeiweStudioClient from '@/components/beiwe-lab/BeiweStudioClient';

// Düzenle = Ses Klonu + Video Düzenleme. Bilerek YENİ bir route seviyesi açmıyor —
// `BeiwePostClient`'ın "tek sayfa canlı editör" deseniyle tutarlı, istemci taraflı bir
// pill-switcher. Redub/çok-dilli-altyazı Video Düzenleme'nin (StudioEditor) İÇİNDE —
// ayrı bir sekme değil, çünkü ikisi de aynı kaynak klip üzerinde çalışıyor.
type VoiceProps = ComponentProps<typeof BeiweVoiceClient>;
type StudioProps = ComponentProps<typeof BeiweStudioClient>;

export default function DuzenlePanels({ voice, studio }: { voice: Omit<VoiceProps, 'hideCost'>; studio: StudioProps }) {
  const [tab, setTab] = useState<'voice' | 'studio'>('voice');
  const t = useTranslations('StudioHub');

  const pillClass = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
      active ? 'bg-[#14231F] text-white border-[#14231F]' : 'border-[#E4E1D8] text-[#4B5A55] hover:border-[#8A8880]'
    }`;

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => setTab('voice')} className={pillClass(tab === 'voice')}>
          {t('duzenlePillVoice')}
        </button>
        <button onClick={() => setTab('studio')} className={pillClass(tab === 'studio')}>
          {t('duzenlePillStudio')}
        </button>
      </div>
      {tab === 'voice' ? <BeiweVoiceClient {...voice} hideCost /> : <BeiweStudioClient {...studio} />}
    </div>
  );
}
