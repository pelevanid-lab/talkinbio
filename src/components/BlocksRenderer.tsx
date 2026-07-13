'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function BlocksRenderer({ blocks }: { blocks: any[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggle = (id: string) => {
    if (expandedId === id) setExpandedId(null);
    else setExpandedId(id);
  };

  return (
    <>
      {blocks.map((block) => {
        const isExpanded = expandedId === block.id;

        return (
          <div key={block.id} className="bg-[var(--paper)] rounded-2xl shadow-sm border border-[var(--border-light)] overflow-hidden transition-all duration-200">
            <button 
              onClick={() => toggle(block.id)}
              className="w-full px-6 py-4 flex items-center justify-between bg-[var(--paper)] hover:bg-slate-100/50 transition text-left"
            >
              <span className="font-semibold text-[var(--ink)] font-bricolage">{block.title}</span>
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-[var(--ink-soft)]" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[var(--ink-soft)]" />
              )}
            </button>
            
            {isExpanded && (
              <div className="px-6 pb-5 pt-2 border-t border-[var(--border-light)]">
                {block.type === 'services' || block.type === 'pricing' ? (
                  <div className="space-y-4">
                    {(block.content?.items || []).map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-[var(--ink)]">{item.title}</h4>
                          {item.description && <p className="text-sm text-[var(--ink-soft)] mt-1">{item.description}</p>}
                          {item.mediaUrl && (
                            <img src={item.mediaUrl} alt={item.title} className="mt-3 rounded-xl max-h-48 object-cover w-full" />
                          )}
                        </div>
                        {item.price && <span className="font-mono font-medium text-[var(--teal)] bg-teal-50 px-2 py-1 rounded-md text-sm whitespace-nowrap ml-4 border border-teal-100">{item.price}</span>}
                      </div>
                    ))}
                  </div>
                ) : block.type === 'hours' ? (
                  <div className="space-y-2 text-sm font-mono">
                    {Object.entries(block.content?.schedule || {}).map(([day, data]: [string, any]) => (
                      <div key={day} className="flex justify-between border-b border-[var(--border-light)] pb-2 last:border-0 last:pb-0">
                        <span className="capitalize text-[var(--ink-soft)]">{
                          day === 'monday' ? 'Pazartesi' :
                          day === 'tuesday' ? 'Salı' :
                          day === 'wednesday' ? 'Çarşamba' :
                          day === 'thursday' ? 'Perşembe' :
                          day === 'friday' ? 'Cuma' :
                          day === 'saturday' ? 'Cumartesi' :
                          day === 'sunday' ? 'Pazar' : day
                        }</span>
                        <span className={data.isOpen ? 'text-[var(--ink)] font-medium' : 'text-[var(--muted)]'}>
                          {data.isOpen ? `${data.openTime} - ${data.closeTime}` : 'Kapalı'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : block.type === 'faq' ? (
                  <div className="space-y-2">
                    {(block.content?.items || []).map((item: any, idx: number) => (
                      <button 
                        key={idx} 
                        onClick={() => window.dispatchEvent(new CustomEvent('sendToChat', { detail: item.question }))}
                        className="w-full text-left p-3 rounded-xl bg-white border border-[var(--border-light)] hover:border-[var(--coral)] transition-colors group flex items-center justify-between"
                      >
                        <span className="font-medium text-[var(--ink)]">{item.question}</span>
                        <span className="text-[var(--coral)] opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">Asistana Sor &rarr;</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-[var(--ink-soft)] prose prose-sm max-w-none">
                    {block.content?.mediaUrl && (
                      <div className="mb-4 rounded-xl overflow-hidden bg-slate-50 flex justify-center">
                        {block.content.mediaUrl.match(/\.(mp4|webm|ogg)$/i) ? (
                          <video src={block.content.mediaUrl} className="w-full max-h-80 object-contain" controls />
                        ) : (
                          <img src={block.content.mediaUrl} alt={block.title} className="w-full max-h-80 object-contain" />
                        )}
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">
                      {block.content?.text || (typeof block.content === 'string' ? block.content : JSON.stringify(block.content))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
