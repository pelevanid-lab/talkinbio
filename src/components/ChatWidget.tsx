'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Send } from 'lucide-react';
import { useOptionalPublicPageRuntime } from './PublicPageRuntime';

type LocalizedGreeting = Partial<Record<'tr' | 'en' | 'ru', string>>;

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .trim();
}

// Local lightweight fallback lexical matching loop in case API endpoint fails
function findMatchingBlockFallback(
  query: string,
  blocks: any[],
  locale: 'tr' | 'en' | 'ru'
): { blockId?: string; itemId?: string; title: string; answer?: string } | null {
  const q = normalizeString(query);
  for (const block of blocks) {
    if (!block.is_visible) continue;
    const blockTitle = block.content?.title?.[locale] || block.content?.title?.tr || block.title || '';
    if (blockTitle && normalizeString(blockTitle).includes(q)) {
      return { blockId: block.id, title: blockTitle };
    }
  }
  return null;
}

export default function ChatWidget({
  businessId,
  locale,
  customGreeting,
  sauleSettings,
  variant = 'sheet',
  preview = false,
}: {
  businessId: string;
  locale: string;
  customGreeting?: LocalizedGreeting | null;
  sauleSettings?: any;
  variant?: 'sheet' | 'inline';
  preview?: boolean;
}) {
  const t = useTranslations('PublicPage');
  const [input, setInput] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pageRuntime = useOptionalPublicPageRuntime();
  const welcomeTimerRef = useRef<any>(null);

  const activeLocale = (locale === 'en' || locale === 'ru' ? locale : 'tr') as 'tr' | 'en' | 'ru';

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  };

  // Automated welcome greeting after 10 seconds (only if user hasn't queried anything yet)
  const welcomeFiredRef = useRef(false);

  useEffect(() => {
    if (welcomeFiredRef.current) return;

    welcomeTimerRef.current = setTimeout(() => {
      if (welcomeFiredRef.current) return;
      const greetingText = customGreeting?.[activeLocale] || t('greetingFallback');
      pageRuntime?.setSauleText(greetingText);
      pageRuntime?.setSauleState('idle');
      pageRuntime?.setSauleActive(true);
      pageRuntime?.triggerGlitch();
      welcomeFiredRef.current = true;
    }, 10000); // 10 seconds
    return () => {
      if (welcomeTimerRef.current) {
        clearTimeout(welcomeTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customGreeting, activeLocale, pageRuntime]);
  
  // Watch and trigger external queries (such as suggested questions in the header)
  useEffect(() => {
    if (pageRuntime?.queryTrigger?.query) {
      processQuery(pageRuntime.queryTrigger.query);
      pageRuntime.setQueryTrigger(null);
    }
  }, [pageRuntime?.queryTrigger, pageRuntime]);

  // Server-Side Semantic Query Routing
  const processQuery = async (query: string) => {
    if (!query.trim() || isQuerying) return;

    welcomeFiredRef.current = true;
    if (welcomeTimerRef.current) {
      clearTimeout(welcomeTimerRef.current);
      welcomeTimerRef.current = null;
    }

    pageRuntime?.triggerGlitch();
    pageRuntime?.setSauleActive(true);
    pageRuntime?.setSauleQuestion(query.trim());
    pageRuntime?.setSauleText('');
    pageRuntime?.setSauleSuggestions([]);
    pageRuntime?.setSauleMatchedBlock(null);
    pageRuntime?.setSauleState('loading');
    setIsQuerying(true);

    try {
      const response = await fetch('/api/chat/semantic-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          locale: activeLocale,
          query: query.trim(),
          preview,
        }),
      });

      if (!response.ok) throw new Error('API request failed');

      const data = await response.json();
      
      pageRuntime?.setSauleSuggestions(data.suggestedQuestions || []);
      pageRuntime?.setSauleMatchedBlock(data.matchedBlock || null);

      if (data.type === 'match') {
        pageRuntime?.setSauleText(data.text);
        pageRuntime?.setSauleState('response');
        pageRuntime?.recordSuccessfulAnswer();
      } else if (data.type === 'clarification') {
        pageRuntime?.setSauleText(data.text);
        pageRuntime?.setSauleState('response');
      } else {
        // Fallback — cevap bulunamadı VEYA kredi bitti (bkz. semantic-query'nin 402
        // yanıtındaki `reason`). Analiz sayfasında ayrı raporlanabilsin diye lead formu
        // buradan açılırsa hangi sebepten açıldığı işaretlenir.
        if (pageRuntime?.leadCaptureEnabled) {
          pageRuntime?.setSauleText(data.text || t('noMatchLead'));
          pageRuntime?.setSauleState('lead_form');
          pageRuntime?.setLeadFormReason(data.reason === 'credits_exhausted' ? 'credits_exhausted' : 'no_match');
        } else if (pageRuntime?.contactValue) {
          pageRuntime?.setSauleText(data.text || t('noMatchContact'));
          pageRuntime?.setSauleState('response');
        } else {
          pageRuntime?.setSauleText(data.text || t('noMatchFallback'));
          pageRuntime?.setSauleState('idle');
        }
      }
    } catch (err) {
      console.error('Semantic query processing failed, running local fallback:', err);

      // Local fallback lexical match if the backend is down / fails
      const fallbackMatch = findMatchingBlockFallback(query, pageRuntime?.blocks || [], activeLocale);

      if (fallbackMatch) {
        pageRuntime?.setSauleText(t('matchingBlock', { title: fallbackMatch.title }));
        pageRuntime?.setSauleState('idle');
        if (fallbackMatch.blockId) {
          pageRuntime?.openBlock(fallbackMatch.blockId, fallbackMatch.itemId);
        }
      } else {
        pageRuntime?.setSauleText(t('noMatchFallback'));
        pageRuntime?.setSauleState('idle');
      }
    } finally {
      setIsQuerying(false);
    }
  };

  // Mesaj kutusu sadece henüz hiçbir şey sorulmamış karşılama/blok-listesi görünümünde
  // görünür. Bir blok tam sayfa açıldığında (activeBlockId) YA DA Saule bir soruya
  // cevap verdiğinde (sauleQuestion) kaybolur — geri dönünce (ikisi de sıfırlanınca)
  // dock kendiliğinden geri gelir. Önerilen soru kartları (suggestions) ve "geri" oku
  // bu kutuya ihtiyaç duymadan çalışmaya devam eder.
  if (pageRuntime?.activeBlockId || pageRuntime?.sauleQuestion) return null;

  return (
    <div className={variant === 'sheet' ? 'w-full p-4 flex flex-col justify-end group' : 'w-full p-3 flex flex-col justify-end group shrink-0'}>


      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim()) return;
          processQuery(input);
          setInput('');
          if (textareaRef.current) {
            textareaRef.current.style.height = '46px';
          }
        }}
        className="flex relative items-center gap-2"
      >
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder={t('chatPlaceholder')}
            rows={1}
            style={{ height: '46px' }}
            className="w-full pl-4 pr-12 py-[11px] bg-white/95 backdrop-blur border border-[rgba(20,35,31,0.10)] rounded-[23px] text-sm placeholder-[var(--muted)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--coral)]/20 focus:border-[var(--coral)] resize-none max-h-[150px] overflow-y-auto block leading-relaxed text-[var(--ink)]"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="absolute right-1 bottom-1 w-[38px] h-[38px] bg-[var(--coral)] text-white rounded-full flex items-center justify-center disabled:opacity-50 transition-colors shadow-sm"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </div>
      </form>
    </div>
  );
}
