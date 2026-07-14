'use client';

import { ARCHETYPES, DEFAULT_ARCHETYPE } from '@/config/archetypes';
import { useMemo, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useLocale } from 'next-intl';

export default function ArchetypeRenderer({ blocks, archetypeId, businessName }: { blocks: any[], archetypeId: string, businessName: string }) {
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const locale = useLocale();
  
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
      <style>{`
        .markdown-body p { margin-bottom: 1rem; line-height: 1.6; }
        .markdown-body ul { list-style-type: disc; margin-left: 1.5rem; margin-bottom: 1rem; }
        .markdown-body ol { list-style-type: decimal; margin-left: 1.5rem; margin-bottom: 1rem; }
        .markdown-body strong { font-weight: 700; color: inherit; }
        .markdown-body em { font-style: italic; }
        .markdown-body a { color: inherit; text-decoration: underline; }
      `}</style>
      
      <div className="flex flex-col gap-10">
        {layoutMode === 'linktree' && !activeBlockId && (
          <div className="flex flex-col gap-4 mt-8">
            {visibleBlocks.map(block => {
              const blockTitle = block.content?.[locale]?.title || block.title || block.type;
              return (
                <button
                  key={block.id}
                  onClick={() => setActiveBlockId(block.id)}
                  className="w-full p-4 rounded-2xl text-lg font-semibold border shadow-sm transition hover:scale-[1.02]"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  {blockTitle}
                </button>
              );
            })}
          </div>
        )}

        {(layoutMode === 'website' || activeBlockId) && (
          <div className="flex flex-col gap-12">
            {layoutMode === 'linktree' && activeBlockId && (
              <button 
                onClick={() => setActiveBlockId(null)}
                className="flex items-center text-sm font-medium hover:opacity-80 transition mt-6"
                style={{ color: 'var(--primary)' }}
              >
                <ChevronLeft className="w-5 h-5 mr-1" /> Geri Dön
              </button>
            )}
            
            {(layoutMode === 'website' ? visibleBlocks : visibleBlocks.filter(b => b.id === activeBlockId)).map((block) => {
              const blockTitle = block.content?.[locale]?.title || block.title || block.type;

              if (block.type === 'about') {
                const layoutVariant = block.content?.layoutVariant || 'standard';
                const pos = block.content?.mediaPosition || 'middle';
                const aboutText = block.content?.[locale]?.text || block.content?.text || '';
                const mediaUrl = block.content?.mediaUrl;

                if (layoutVariant === 'hero-overlay' && mediaUrl) {
                  return (
                    <section key={block.id} className={`relative overflow-hidden ${radiusClass} h-[70vh] min-h-[500px] shadow-xl flex items-end group`}>
                      <div className="absolute inset-0 z-0">
                        {mediaUrl.match(/\.(mp4|webm|ogg)$/i) ? (
                          <video src={mediaUrl} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                        ) : (
                          <img src={mediaUrl} alt={blockTitle} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                      </div>
                      <div className="relative z-10 p-6 sm:p-8 w-full text-white">
                        <h2 className={`text-4xl sm:text-5xl mb-4 font-bold ${headingFont}`}>{blockTitle}</h2>
                        <div className="markdown-body opacity-90 text-[15px] sm:text-base text-white/90">
                          <ReactMarkdown>{aboutText}</ReactMarkdown>
                        </div>
                      </div>
                    </section>
                  );
                }

                if (layoutVariant === 'split-card' && mediaUrl) {
                  return (
                    <section key={block.id} className="pt-4">
                      <div className={`flex flex-col md:flex-row overflow-hidden border shadow-md ${radiusClass}`} style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                        <div className="w-full md:w-1/2 h-64 md:h-auto relative">
                          {mediaUrl.match(/\.(mp4|webm|ogg)$/i) ? (
                            <video src={mediaUrl} className="w-full h-full object-cover absolute inset-0" autoPlay loop muted playsInline />
                          ) : (
                            <img src={mediaUrl} alt={blockTitle} className="w-full h-full object-cover absolute inset-0" />
                          )}
                        </div>
                        <div className="w-full md:w-1/2 p-6 sm:p-8 flex flex-col justify-center">
                          <h2 className={`text-3xl mb-4 font-bold ${headingFont}`} style={{ color: 'var(--text)' }}>
                            {blockTitle}
                          </h2>
                          <div className="markdown-body opacity-90 text-[15px]">
                            <ReactMarkdown>{aboutText}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    </section>
                  );
                }

                // Standard layout
                const MediaElement = mediaUrl ? (
                  <div className={`overflow-hidden shadow-sm ${radiusClass} ${pos === 'middle' ? 'my-6' : pos === 'top' ? 'mb-6' : 'mt-6'}`}>
                    {mediaUrl.match(/\.(mp4|webm|ogg)$/i) ? (
                      <video src={mediaUrl} className="w-full max-h-96 object-cover" controls />
                    ) : (
                      <img src={mediaUrl} alt={blockTitle} className="w-full max-h-96 object-cover" />
                    )}
                  </div>
                ) : null;

                return (
                  <section key={block.id} className="pt-4">
                    {pos === 'top' && MediaElement}
                    <h2 className={`text-3xl mb-6 font-bold ${headingFont}`} style={{ color: 'var(--text)' }}>
                      {blockTitle}
                    </h2>
                    {pos === 'middle' && MediaElement}
                    <div className="markdown-body opacity-90 text-[15px]">
                      <ReactMarkdown>{aboutText}</ReactMarkdown>
                    </div>
                    {pos === 'bottom' && MediaElement}
                  </section>
                );
              }

              if (block.type === 'services' || block.type === 'pricing') {
                const layoutVariant = block.content?.layoutVariant || 'grid-cards';
                
                return (
                  <section key={block.id}>
                    <h2 className={`text-2xl mb-6 font-bold ${headingFont}`}>{blockTitle}</h2>
                    <div className={layoutVariant === 'grid-cards' ? "grid grid-cols-1 sm:grid-cols-2 gap-4" : "space-y-4"}>
                      {(block.content?.items || []).map((item: any, idx: number) => {
                        const itemLoc = item[locale] || item;
                        return (
                          <div 
                            key={idx} 
                            className={`p-5 border transition-transform hover:-translate-y-1 ${radiusClass} ${layoutVariant === 'list' ? 'flex flex-col sm:flex-row gap-4 items-start sm:items-center' : ''}`}
                            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                          >
                            {item.mediaUrl && archetype.mediaProfile !== 'minimal' && (
                              <img src={item.mediaUrl} alt={itemLoc.title} className={`object-cover ${radiusClass} ${layoutVariant === 'list' ? 'w-full sm:w-32 h-32 mb-0' : 'w-full h-40 mb-4'}`} />
                            )}
                            <div className={`flex-1 ${layoutVariant === 'list' ? 'w-full' : 'flex justify-between items-start gap-4'}`}>
                              <div>
                                <h4 className={`font-semibold text-lg ${headingFont}`}>{itemLoc.title || item.title}</h4>
                                {(itemLoc.description || item.description) && (
                                  <p className="text-sm mt-2 opacity-80" style={{ color: 'var(--text-muted)' }}>
                                    {itemLoc.description || item.description}
                                  </p>
                                )}
                              </div>
                              {item.price && (
                                <div className={layoutVariant === 'list' ? 'mt-3 sm:mt-0 sm:ml-auto' : ''}>
                                  <span 
                                    className="font-mono font-medium px-3 py-1 rounded-full text-sm whitespace-nowrap inline-block"
                                    style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
                                  >
                                    {item.price}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              }

              if (block.type === 'hours') {
                return (
                  <section key={block.id}>
                    <h2 className={`text-2xl mb-6 font-bold ${headingFont}`}>{blockTitle}</h2>
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
                    <h2 className={`text-2xl mb-6 font-bold ${headingFont}`}>{blockTitle}</h2>
                    <div className="flex flex-wrap gap-2">
                      {(block.content?.items || []).map((item: any, idx: number) => (
                        <button 
                          key={idx} 
                          onClick={() => window.dispatchEvent(new CustomEvent('sendToChat', { detail: item.question }))}
                          className={`text-left px-4 py-2 border transition-all hover:scale-105 ${radiusClass}`}
                          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--primary)' }}
                        >
                          <span className="font-medium text-sm">{item.question}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                );
              }

              if (block.type === 'gallery') {
                const layoutVariant = block.content?.layoutVariant || 'grid';

                if (layoutVariant === 'masonry') {
                  return (
                    <section key={block.id} className="pt-4">
                      <h2 className={`text-2xl mb-6 font-bold ${headingFont}`}>{blockTitle}</h2>
                      <div className="columns-2 gap-3 space-y-3">
                        {(block.content?.items || []).map((item: any, idx: number) => {
                          const caption = item.caption?.[locale] || item.caption;
                          return (
                            <div key={idx} className={`break-inside-avoid relative group overflow-hidden ${radiusClass}`}>
                              {item.url?.match(/\.(mp4|webm|ogg)$/i) ? (
                                <video src={item.url} className="w-full object-cover" controls />
                              ) : (
                                <img src={item.url} alt={caption || 'Gallery'} className="w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                              )}
                              {caption && (
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                  <p className="text-white text-xs font-medium">{caption}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                }

                // Standard Grid
                return (
                  <section key={block.id} className="pt-4">
                    <h2 className={`text-2xl mb-6 font-bold ${headingFont}`}>{blockTitle}</h2>
                    <div className="grid grid-cols-2 gap-2 md:gap-4">
                      {(block.content?.items || []).map((item: any, idx: number) => {
                        const caption = item.caption?.[locale] || item.caption;
                        return (
                          <div key={idx} className={`relative overflow-hidden group ${radiusClass}`}>
                            {item.url?.match(/\.(mp4|webm|ogg)$/i) ? (
                              <video src={item.url} className="w-full h-40 md:h-64 object-cover" controls />
                            ) : (
                              <img src={item.url} alt={caption || 'Gallery'} className="w-full h-40 md:h-64 object-cover transition-transform duration-500 group-hover:scale-105" />
                            )}
                            {caption && (
                              <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                                <p className="text-white text-xs text-center">{caption}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              }

              if (block.type === 'testimonials') {
                return (
                  <section key={block.id} className="pt-4 overflow-hidden">
                    <h2 className={`text-2xl mb-6 font-bold ${headingFont}`}>{blockTitle}</h2>
                    <div className="flex overflow-x-auto gap-4 pb-4 snap-x hide-scrollbar" style={{ scrollbarWidth: 'none' }}>
                      {(block.content?.items || []).map((item: any, idx: number) => {
                        const quote = item.quote?.[locale] || item.quote;
                        const role = item.role?.[locale] || item.role;
                        return (
                          <div 
                            key={idx} 
                            className={`min-w-[85%] md:min-w-[300px] p-6 border snap-center ${radiusClass}`}
                            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                          >
                            <div className="text-[var(--primary)] text-3xl mb-2 opacity-50 leading-none font-serif">"</div>
                            <p className="text-[15px] italic mb-4 opacity-90 leading-relaxed">{quote}</p>
                            <div className="font-bold text-sm">{item.author}</div>
                            {role && <div className="text-xs mt-1 opacity-70" style={{ color: 'var(--text-muted)' }}>{role}</div>}
                          </div>
                        );
                      })}
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
