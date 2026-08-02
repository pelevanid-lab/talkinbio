'use client';

import { useState } from 'react';

export default function InstagramDMSection({ copy }: any) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(copy.exampleLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="py-20 md:py-28 bg-white border-t border-[var(--border)]">
      <div className="wrap">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold text-[var(--ink)] mb-4 text-center">{copy.title}</h2>
          <p className="text-lg text-[var(--ink-soft)] leading-relaxed text-center mb-12">Şimdi sayfa linkinizi Instagram\'da bir hazır cevap olarak ekleyin; DM\'leriniz ile Talkinbio ilgilensin.</p>

          <div className="bg-[#FFF7F0] border border-[#FFEAE0] rounded-[32px] p-7 md:p-9 mb-10">
            <p className="text-sm font-bold text-[var(--muted)] mb-3">{copy.kicker}</p>
            <div className="bg-white border border-[var(--border)] rounded-[24px] p-4 md:p-5 mb-6 flex items-center justify-between gap-4">
              <code className="text-sm md:text-base font-mono text-[var(--ink)] flex-1">{copy.exampleLink}</code>
              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-[var(--ink)] text-white rounded-full text-sm font-bold whitespace-nowrap hover:opacity-90 active:scale-95 transition"
              >
                {copied ? 'Kopyalandı!' : copy.linkCopyLabel}
              </button>
            </div>

            <h3 className="text-lg font-bold text-[var(--ink)] mb-4">{copy.howLabel}</h3>
            <ol className="space-y-4 mb-6">
              {copy.automationSteps.map((step: string, index: number) => (
                <li key={index} className="flex gap-4">
                  <span className="text-[var(--teal-deep)] font-bold text-lg flex-shrink-0">{index + 1}</span>
                  <span className="text-[var(--ink-soft)] leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>

            <p className="text-xs text-[var(--muted)]">{copy.note}</p>
          </div>

          <div className="bg-[var(--paper)] border border-[var(--border)] rounded-[32px] p-5 md:p-8 shadow-sm">
            <div className="bg-white rounded-[24px] border border-[var(--border)] p-5 mb-5">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-2">Instagram DM</p>
              <p className="text-lg font-bold text-[var(--ink)]">{copy.exampleQuestion}</p>
            </div>
            <div className="bg-[#EAF8F4] rounded-[24px] border border-[#BFE9DD] p-5 mb-6">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--teal-deep)] mb-2">{copy.readyLabel}</p>
              <p className="text-[var(--ink-soft)]">{copy.exampleReply}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              {copy.steps.map((step: string) => (
                <div key={step} className="rounded-2xl bg-white border border-[var(--border)] p-3 text-center text-xs font-bold text-[var(--ink)]">
                  {step}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
