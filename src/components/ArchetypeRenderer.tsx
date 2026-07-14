'use client';

import { ARCHETYPES, DEFAULT_ARCHETYPE } from '@/config/archetypes';
import { useMemo, useState } from 'react';
import { ChevronLeft } from 'lucide-react';

export default function ArchetypeRenderer({ blocks, archetypeId, businessName }: { blocks: any[], archetypeId: string, businessName: string }) {
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  
  const archetype = ARCHETYPES[archetypeId] || DEFAULT_ARCHETYPE;
  
  const layoutMode = useMemo(() => {
    const settingsBlock = blocks.find(b => b.type === 'settings');
    return settingsBlock?.content?.layoutMode || 'website';
  }, [blocks]);

  const radiusClass = useMemo(() => {
    switch (archetype.borderRadius) {
      case 'none': return 'rounded-none';
      case 'sm': return 'rounded-md';
      case 'md': return 'rounded-xl';
      case 'xl': return 'rounded-2xl';
      case 'full': return 'rounded-3xl';
      default: return 'rounded-2xl';
    }
  }, [archetype]);

  const visibleBlocks = blocks.filter(b => b.type !== 'settings' && b.is_visible !== false);

  const styleVars = useMemo(() => {
    return {
      '--bg': archetype.colors.background,
      '--surface': archetype.colors.surface,
      '--primary': archetype.colors.primary,
      '--text': archetype.colors.text,
      '--text-muted': archetype.colors.textMuted,
      '--border': archetype.colors.border,
    } as React.CSSProperties;
  }, [archetype]);

  const { headingFont, bodyFont } = archetype.typography;

  return (
    <div 
      className={`min-h-full pb-20 ${bodyFont}`}
      style={{
        ...styleVars,
        backgroundColor: 'var(--bg)',
        color: 'var(--text)'
      }}
    >
      <div className="flex flex-col gap-12">
        {layoutMode === 'linktree' && !activeBlockId && (
          <div className="flex flex-col gap-4 mt-8">
            {visibleBlocks.map(block => (
              <button
                key={block.id}
                onClick={() => setActiveBlockId(block.id)}
                className="w-full p-4 rounded-2xl text-lg font-semibold border shadow-sm transition hover:scale-[1.02]"
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                {block.title || block.type}
              </button>
            ))}
          </div>
        )}

        {(layoutMode === 'website' || activeBlockId) && (
          <div className="flex flex-col gap-12">
            {layoutMode === 'linktree' && activeBlockId && (
              <button 
                onClick={() => setActiveBlockId(null)}
                className="flex items-center text-sm font-medium mb-4 hover:opacity-80 transition"
                style={{ color: 'var(--primary)' }}
              >
                <ChevronLeft className="w-5 h-5 mr-1" /> Geri Dön
              </button>
            )}
            
            {(layoutMode === 'website' ? visibleBlocks : visibleBlocks.filter(b => b.id === activeBlockId)).map((block) => {
              if (block.type === 'about') {
            const pos = block.content?.mediaPosition || 'middle';
            const MediaElement = block.content?.mediaUrl ? (
              <div className={`overflow-hidden shadow-sm ${radiusClass} ${pos === 'middle' ? 'my-6' : pos === 'top' ? 'mb-6' : 'mt-6'}`}>
                {block.content.mediaUrl.match(/\.(mp4|webm|ogg)$/i) ? (
                  <video src={block.content.mediaUrl} className="w-full max-h-96 object-cover" controls />
                ) : (
                  <img src={block.content.mediaUrl} alt={block.title} className="w-full max-h-96 object-cover" />
                )}
              </div>
            ) : null;

            return (
              <section key={block.id} className="pt-4">
                {pos === 'top' && MediaElement}
                
                <h2 className={`text-3xl mb-4 ${headingFont}`} style={{ color: 'var(--text)' }}>
                  {block.title || `Hakkında`}
                </h2>
                
                {pos === 'middle' && MediaElement}
                
                <div className="whitespace-pre-wrap leading-relaxed opacity-90">
                  {block.content?.text || block.content}
                </div>

                {pos === 'bottom' && MediaElement}
              </section>
            );
          }

          if (block.type === 'services' || block.type === 'pricing') {
            const isGrid = archetype.layoutStyle === 'card-heavy' || archetype.layoutStyle === 'spacious';
            
            return (
              <section key={block.id}>
                <h2 className={`text-2xl mb-6 ${headingFont}`}>{block.title}</h2>
                <div className={isGrid ? "grid grid-cols-1 sm:grid-cols-2 gap-4" : "space-y-4"}>
                  {(block.content?.items || []).map((item: any, idx: number) => (
                    <div 
                      key={idx} 
                      className={`p-5 border transition-transform hover:-translate-y-1 ${radiusClass}`}
                      style={{ 
                        backgroundColor: 'var(--surface)', 
                        borderColor: 'var(--border)' 
                      }}
                    >
                      {item.mediaUrl && archetype.mediaProfile !== 'minimal' && (
                        <img src={item.mediaUrl} alt={item.title} className={`mb-4 h-40 w-full object-cover ${radiusClass}`} />
                      )}
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h4 className={`font-semibold text-lg ${headingFont}`}>{item.title}</h4>
                          {item.description && (
                            <p className="text-sm mt-2 opacity-80" style={{ color: 'var(--text-muted)' }}>
                              {item.description}
                            </p>
                          )}
                        </div>
                        {item.price && (
                          <span 
                            className="font-mono font-medium px-3 py-1 rounded-full text-sm whitespace-nowrap"
                            style={{ 
                              backgroundColor: 'var(--primary)', 
                              color: archetype.id === 'minimal-light' ? '#fff' : '#fff' // basic contrast handling
                            }}
                          >
                            {item.price}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          }

          if (block.type === 'hours') {
            return (
              <section key={block.id}>
                <h2 className={`text-2xl mb-6 ${headingFont}`}>{block.title}</h2>
                <div 
                  className={`border p-6 ${radiusClass}`}
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                >
                  <div className="space-y-3 font-mono text-sm">
                    {Object.entries(block.content?.schedule || {}).map(([day, data]: [string, any]) => (
                      <div key={day} className="flex justify-between border-b pb-3 last:border-0 last:pb-0" style={{ borderColor: 'var(--border)' }}>
                        <span className="capitalize" style={{ color: 'var(--text-muted)' }}>{
                          day === 'monday' ? 'Pazartesi' :
                          day === 'tuesday' ? 'Salı' :
                          day === 'wednesday' ? 'Çarşamba' :
                          day === 'thursday' ? 'Perşembe' :
                          day === 'friday' ? 'Cuma' :
                          day === 'saturday' ? 'Cumartesi' :
                          day === 'sunday' ? 'Pazar' : day
                        }</span>
                        <span className={data.isOpen ? 'font-medium' : 'opacity-60'}>
                          {data.isOpen ? `${data.openTime} - ${data.closeTime}` : 'Kapalı'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );
          }

          if (block.type === 'faq') {
            return (
              <section key={block.id}>
                <h2 className={`text-2xl mb-6 ${headingFont}`}>{block.title}</h2>
                <div className="flex flex-wrap gap-2">
                  {(block.content?.items || []).map((item: any, idx: number) => (
                    <button 
                      key={idx} 
                      onClick={() => window.dispatchEvent(new CustomEvent('sendToChat', { detail: item.question }))}
                      className={`text-left px-4 py-2 border transition-all hover:scale-105 ${radiusClass}`}
                      style={{ 
                        backgroundColor: 'var(--surface)', 
                        borderColor: 'var(--border)',
                        color: 'var(--primary)'
                      }}
                    >
                      <span className="font-medium text-sm">{item.question}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs mt-3 opacity-70" style={{ color: 'var(--text-muted)' }}>
                  Sorulara tıklayarak asistana iletebilirsiniz.
                </p>
              </section>
            );
          }

          if (block.type === 'gallery') {
            return (
              <section key={block.id} className="pt-4">
                <h2 className={`text-2xl mb-6 ${headingFont}`}>{block.title}</h2>
                <div className="grid grid-cols-2 gap-2 md:gap-4">
                  {(block.content?.items || []).map((item: any, idx: number) => (
                    <div key={idx} className={`overflow-hidden ${radiusClass}`}>
                      {item.url?.match(/\.(mp4|webm|ogg)$/i) ? (
                        <video src={item.url} className="w-full h-40 md:h-64 object-cover" controls />
                      ) : (
                        <img src={item.url} alt={item.caption || 'Gallery'} className="w-full h-40 md:h-64 object-cover transition-transform hover:scale-105" />
                      )}
                    </div>
                  ))}
                </div>
              </section>
            );
          }

          if (block.type === 'testimonials') {
            return (
              <section key={block.id} className="pt-4 overflow-hidden">
                <h2 className={`text-2xl mb-6 ${headingFont}`}>{block.title}</h2>
                <div className="flex overflow-x-auto gap-4 pb-4 snap-x hide-scrollbar" style={{ scrollbarWidth: 'none' }}>
                  {(block.content?.items || []).map((item: any, idx: number) => (
                    <div 
                      key={idx} 
                      className={`min-w-[85%] md:min-w-[300px] p-6 border snap-center ${radiusClass}`}
                      style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                    >
                      <div className="text-[var(--primary)] text-3xl mb-2 opacity-50 leading-none">"</div>
                      <p className="text-sm italic mb-4 opacity-90">{item.quote}</p>
                      <div className="font-medium text-sm">{item.author}</div>
                      {item.role && <div className="text-xs opacity-70" style={{ color: 'var(--text-muted)' }}>{item.role}</div>}
                    </div>
                  ))}
                </div>
              </section>
            );
          }

          return null; // Fallback
        })}
        </div>
        )}
      </div>
    </div>
  );
}
