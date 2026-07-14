'use client';

import { ARCHETYPES, DEFAULT_ARCHETYPE } from '@/config/archetypes';
import { useMemo } from 'react';

export default function ArchetypeRenderer({ blocks, archetypeId, businessName }: { blocks: any[], archetypeId: string, businessName: string }) {
  const archetype = ARCHETYPES[archetypeId] || DEFAULT_ARCHETYPE;

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
        {blocks.map((block) => {
          if (block.type === 'about') {
            return (
              <section key={block.id} className="pt-4">
                <h2 className={`text-3xl mb-4 ${headingFont}`} style={{ color: 'var(--text)' }}>
                  {block.title || `Hakkında`}
                </h2>
                
                {block.content?.mediaUrl && (
                  <div className="mb-6 rounded-2xl overflow-hidden shadow-sm">
                    {block.content.mediaUrl.match(/\.(mp4|webm|ogg)$/i) ? (
                      <video src={block.content.mediaUrl} className="w-full max-h-96 object-cover" controls />
                    ) : (
                      <img src={block.content.mediaUrl} alt={block.title} className="w-full max-h-96 object-cover" />
                    )}
                  </div>
                )}
                
                <div className="whitespace-pre-wrap leading-relaxed opacity-90">
                  {block.content?.text || block.content}
                </div>
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
                      className={`p-5 rounded-2xl border transition-transform hover:-translate-y-1`}
                      style={{ 
                        backgroundColor: 'var(--surface)', 
                        borderColor: 'var(--border)' 
                      }}
                    >
                      {item.mediaUrl && archetype.mediaProfile !== 'minimal' && (
                        <img src={item.mediaUrl} alt={item.title} className="mb-4 rounded-xl h-40 w-full object-cover" />
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
                  className="rounded-2xl border p-6"
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
                      className="text-left px-4 py-2 rounded-full border transition-all hover:scale-105"
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

          return null; // Fallback
        })}
      </div>
    </div>
  );
}
