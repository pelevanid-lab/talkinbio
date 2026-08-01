'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { LORA_MIN_SCORE, TWIN_VERIFIED_SCORE } from '@/config/beiweLab';

// Not: Karakter Odası'nda da benzer bir puanlama widget'ı var (CharacterRoomClient
// içinde, dışa aktarılmamış). Eski oda yeni tasarım bitene kadar dokunulmadan
// duracağı için burada ayrı bir kopya yaşıyor; oda kaldırılınca tekilleştirilecek.

const defaultBarColor = (n: number) => {
  if (n < LORA_MIN_SCORE) return 'bg-slate-400';
  if (n < TWIN_VERIFIED_SCORE) return 'bg-emerald-500';
  return 'bg-amber-400';
};

const defaultCaption = (display: number | null, t: any) => {
  if (display === null) return t('simCaptionDefault');
  if (display >= TWIN_VERIFIED_SCORE) return `${display}/10 · ${t('simCaptionVerified')}`;
  if (display >= LORA_MIN_SCORE) return `${display}/10 · ${t('simCaptionLoraOK')}`;
  return `${display}/10 · ${t('simCaptionLoraFail')}`;
};

export default function SimilarityRating({
  score,
  disabled,
  onChange,
  getCaption,
  getColor = defaultBarColor,
}: {
  score: number | null;
  disabled?: boolean;
  onChange: (score: number) => void;
  /** Twin'in "benzerlik" metnini farklı bir bağlamda (ör. Podcast'in "beğenme") yeniden kullanmak için. */
  getCaption?: (display: number | null, t?: any) => string;
  getColor?: (n: number) => string;
}) {
  const t = useTranslations('BeiweLab');
  const [hovered, setHovered] = useState<number | null>(null);
  const display = hovered ?? score;

  const captionText = getCaption ? getCaption(display, t) : defaultCaption(display, t);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-0.5" onMouseLeave={() => setHovered(null)}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onMouseEnter={() => setHovered(n)}
            onClick={() => onChange(n)}
            title={`${n}/10`}
            className={`h-2 flex-1 rounded-full transition-all disabled:cursor-not-allowed ${
              display !== null && n <= display ? getColor(display) : 'bg-slate-200 hover:bg-slate-300'
            }`}
          />
        ))}
      </div>
      <p className="text-[10px] text-slate-400 text-center">{captionText}</p>
    </div>
  );
}
