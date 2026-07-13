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
          <div key={block.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden transition-all duration-200">
            <button 
              onClick={() => toggle(block.id)}
              className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-slate-50 transition text-left"
            >
              <span className="font-semibold text-slate-900">{block.title}</span>
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>
            
            {isExpanded && (
              <div className="px-6 pb-5 pt-2 border-t border-slate-50">
                {block.type === 'services' || block.type === 'pricing' ? (
                  <div className="space-y-4">
                    {(block.content?.items || []).map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-slate-900">{item.title}</h4>
                          {item.description && <p className="text-sm text-slate-500 mt-1">{item.description}</p>}
                        </div>
                        {item.price && <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded text-sm whitespace-nowrap ml-4">{item.price}</span>}
                      </div>
                    ))}
                  </div>
                ) : block.type === 'hours' ? (
                  <div className="space-y-2 text-sm">
                    {Object.entries(block.content?.schedule || {}).map(([day, data]: [string, any]) => (
                      <div key={day} className="flex justify-between border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                        <span className="capitalize font-medium text-slate-700">{
                          day === 'monday' ? 'Pazartesi' :
                          day === 'tuesday' ? 'Salı' :
                          day === 'wednesday' ? 'Çarşamba' :
                          day === 'thursday' ? 'Perşembe' :
                          day === 'friday' ? 'Cuma' :
                          day === 'saturday' ? 'Cumartesi' :
                          day === 'sunday' ? 'Pazar' : day
                        }</span>
                        <span className={data.isOpen ? 'text-slate-900' : 'text-slate-400'}>
                          {data.isOpen ? `${data.openTime} - ${data.closeTime}` : 'Kapalı'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : block.type === 'faq' ? (
                  <div className="space-y-4">
                    {(block.content?.items || []).map((item: any, idx: number) => (
                      <div key={idx}>
                        <h4 className="font-medium text-slate-900 mb-1">{item.question}</h4>
                        <p className="text-sm text-slate-600">{item.answer}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-600 prose prose-sm max-w-none">
                    {block.content?.text || JSON.stringify(block.content)}
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
