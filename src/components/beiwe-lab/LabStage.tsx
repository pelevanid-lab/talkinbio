'use client';

import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

// Lab'ın her katmanı sıralı aşamalardan oluşuyor. Aşama başlığı bir görev adı değil,
// aşamanın cevapladığı SORU — katmanın sınırı böyle okunur kalıyor.
//
// Not: BeiweTwinClient içinde bunun yerel bir kopyası var. Twin dosyası şu anda ayrı bir
// oturumda (LoRA zip düzeltmesi) değiştirildiği için orası bilerek ellenmedi; o iş
// birleştiğinde Twin de buraya bağlanmalı.

export type StageState = 'locked' | 'open' | 'done';

export default function LabStage({
  index,
  title,
  question,
  state,
  lockedMsg,
  defaultOpen = true,
  children,
}: {
  index: number;
  title: string;
  question: string;
  state: StageState;
  lockedMsg?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const locked = state === 'locked';

  return (
    <section
      className={`rounded-2xl border overflow-hidden transition-all ${
        locked ? 'border-slate-200 bg-slate-50/70' : 'border-slate-200 bg-white shadow-sm'
      }`}
    >
      <button
        onClick={() => !locked && setOpen((v) => !v)}
        disabled={locked}
        className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 ${
              state === 'done'
                ? 'bg-emerald-500 text-white'
                : locked
                  ? 'bg-slate-200 text-slate-400'
                  : 'bg-blue-600 text-white'
            }`}
          >
            {state === 'done' ? <Check className="w-4 h-4" /> : index}
          </span>
          <div className="min-w-0">
            <h2 className={`text-sm font-semibold ${locked ? 'text-slate-400' : 'text-slate-900'}`}>
              {title}
            </h2>
            <p className="text-xs text-slate-500 truncate">{question}</p>
          </div>
        </div>
        {locked ? (
          <span className="text-xs text-slate-400 italic flex-shrink-0">{lockedMsg}</span>
        ) : (
          <ChevronDown
            className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        )}
      </button>
      {!locked && open && <div className="px-6 pb-6 space-y-5">{children}</div>}
    </section>
  );
}
