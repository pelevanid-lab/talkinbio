'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, Square, Loader2 } from 'lucide-react';
import { useOptionalPublicPageRuntime } from './PublicPageRuntime';

type LocalizedGreeting = Partial<Record<'tr' | 'en' | 'ru', string>>;

const translations = {
  tr: {
    matchingBlock: 'İlgili bölümü açıyorum:\n\n✨ {title}',
    matchingFAQ: 'Cevabınızı ilgili bölümde buldum:\n\n💬 {title}\n\n📝 {answer}',
    noMatchLead: 'Aradığınız konuyu doğrudan sayfa üzerinde bulamadım. Ancak bana bilgilerinizi iletirseniz size en kısa sürede geri dönüş sağlayabiliriz:',
    noMatchContact: 'Aradığınız konuyu bulamadım. Detaylı bilgi almak için bizimle doğrudan iletişime geçebilirsiniz:',
    noMatchFallback: 'Aradığınız konuyu şu anda bulamadım. Lütfen sayfa üzerindeki diğer bölümleri inceleyin.',
    listening: 'Dinliyorum...',
    placeholder: 'Bir mesaj yazın...',
    welcomeFallback: 'Hoşgeldiniz, size nasıl yardımcı olabilirim?',
  },
  en: {
    matchingBlock: 'Opening the relevant section:\n\n✨ {title}',
    matchingFAQ: 'I found the answer you were looking for:\n\n💬 {title}\n\n📝 {answer}',
    noMatchLead: 'I could not find the exact topic on the page. However, if you leave your contact details, we will get back to you as soon as possible:',
    noMatchContact: 'I could not find the topic. For detailed information, you can contact us directly:',
    noMatchFallback: 'I could not find what you are looking for at the moment. Please explore other sections of the page.',
    listening: 'Listening...',
    placeholder: 'Write a message...',
    welcomeFallback: 'Welcome, how can I help you?',
  },
  ru: {
    matchingBlock: 'Открываю соответствующий раздел:\n\n✨ {title}',
    matchingFAQ: 'Я нашел ответ на ваш вопрос:\n\n💬 {title}\n\n📝 {answer}',
    noMatchLead: 'Я не смог найти эту тему на странице. Однако, если вы оставите свои контактные данные, мы свяжемся с вами в ближайшее время:',
    noMatchContact: 'Я не смог найти тему. Для получения подробной информации вы можете связаться с нами напрямую:',
    noMatchFallback: 'В настоящее время я не могу найти то, что вы ищете. Пожалуйста, изучите другие разделы страницы.',
    listening: 'Слушаю...',
    placeholder: 'Напишите сообщение...',
    welcomeFallback: 'Добро пожаловать, чем я могу вам помочь?',
  }
};

const EXPLICIT_CHANNELS_KEYWORDS = {
  whatsapp: {
    tr: ['whatsapp', 'whatsapp numarasi', 'whatsapptan nasil ulasirim', 'whatsapp var mi', 'whatsapp iletisim', 'telefon ve whatsapp', 'whatsapp numarası'],
    en: ['whatsapp', 'whatsapp number', 'how to reach on whatsapp', 'do you have whatsapp', 'whatsapp contact'],
    ru: ['whatsapp', 'ватсап', 'номер ватсап', 'как связаться через ватсап', 'есть ли ватсап', 'контакт ватсап']
  },
  telegram: {
    tr: ['telegram', 'telegram adresi', 'telegram iletisim'],
    en: ['telegram', 'telegram contact', 'telegram address'],
    ru: ['телеграм', 'telegram', 'контакт телеграм']
  },
  email: {
    tr: ['email', 'e-posta', 'e-posta adresi', 'eposta', 'mail', 'mail adresi', 'e-mail'],
    en: ['email', 'e-mail', 'email address', 'mail'],
    ru: ['почта', 'email', 'электронная почта', 'емейл']
  },
  phone: {
    tr: ['telefon', 'telefon numarasi', 'ara', 'arama', 'numara', 'cep', 'gsm'],
    en: ['phone', 'phone number', 'call', 'number', 'mobile'],
    ru: ['телефон', 'номер телефона', 'позвонить', 'номер', 'мобильный']
  },
  instagram: {
    tr: ['instagram', 'instagram adresi', 'instagram hesabi', 'insta'],
    en: ['instagram', 'instagram address', 'instagram account', 'insta'],
    ru: ['инстаграм', 'инста', 'instagram']
  }
};

const GENERIC_CONTACT_KEYWORDS = {
  tr: ['iletisim', 'ulasim', 'ulas', 'bize ulas', 'nasil ulasabilirim', 'irtibat', 'iletisime gec', 'bana yaz', 'ulasmak', 'nasıl ulaşırım'],
  en: ['contact', 'reach', 'how to reach', 'get in touch', 'how can i contact', 'contact info'],
  ru: ['контакт', 'контакты', 'связь', 'связаться', 'как связаться', 'напишите', 'связи']
};

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
  knowledge: any[],
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
  businessName,
  locale,
  initialMessages = [],
  customGreeting,
  sauleSettings,
  variant = 'sheet',
  preview = false,
  initialCreditsExhausted = false,
}: {
  businessId: string;
  businessName: string;
  locale: string;
  initialMessages?: any[];
  customGreeting?: LocalizedGreeting | null;
  sauleSettings?: any;
  variant?: 'sheet' | 'inline';
  preview?: boolean;
  initialCreditsExhausted?: boolean;
}) {
  const [input, setInput] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pageRuntime = useOptionalPublicPageRuntime();
  const welcomeTimerRef = useRef<any>(null);

  const activeLocale = (locale === 'en' || locale === 'ru' ? locale : 'tr') as 'tr' | 'en' | 'ru';
  const loc = translations[activeLocale];

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
      const greetingText = customGreeting?.[activeLocale] || loc.welcomeFallback;
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
  }, [customGreeting, activeLocale, pageRuntime, loc.welcomeFallback]);
  
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
      } else if (data.type === 'clarification') {
        pageRuntime?.setSauleText(data.text);
        pageRuntime?.setSauleState('response');
      } else {
        // Fallback
        if (pageRuntime?.leadCaptureEnabled) {
          pageRuntime?.setSauleText(data.text || loc.noMatchLead);
          pageRuntime?.setSauleState('lead_form');
        } else if (pageRuntime?.contactValue) {
          pageRuntime?.setSauleText(data.text || loc.noMatchContact);
          pageRuntime?.setSauleState('response');
        } else {
          pageRuntime?.setSauleText(data.text || loc.noMatchFallback);
          pageRuntime?.setSauleState('idle');
        }
      }
    } catch (err) {
      console.error('Semantic query processing failed, running local fallback:', err);
      
      // Local fallback lexical match if the backend is down / fails
      const fallbackMatch = findMatchingBlockFallback(
        query,
        pageRuntime?.blocks || [],
        pageRuntime?.knowledge || [],
        activeLocale
      );

      if (fallbackMatch) {
        pageRuntime?.setSauleText(loc.matchingBlock.replace('{title}', fallbackMatch.title));
        pageRuntime?.setSauleState('idle');
        if (fallbackMatch.blockId) {
          pageRuntime?.openBlock(fallbackMatch.blockId, fallbackMatch.itemId);
        }
      } else {
        pageRuntime?.setSauleText(loc.noMatchFallback);
        pageRuntime?.setSauleState('idle');
      }
    } finally {
      setIsQuerying(false);
    }
  };

  // Voice recording & transcription (utilizing Wizper API)
  const isVoiceInputEnabled = !!sauleSettings?.voiceEnabled;
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressActiveRef = useRef(false);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const supportedMimeType = ['audio/webm', 'audio/mp4', 'audio/ogg'].find(
        (type) => typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(type)
      );
      const mediaRecorder = supportedMimeType ? new MediaRecorder(stream, { mimeType: supportedMimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const usedMimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: usedMimeType });
        const extension = usedMimeType.includes('mp4') ? 'm4a' : usedMimeType.includes('ogg') ? 'ogg' : 'webm';
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
        setIsTranscribing(true);

        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, `recording.${extension}`);
          formData.append('businessId', businessId);

          const res = await fetch('/api/chat/voice/transcribe', {
            method: 'POST',
            body: formData,
          });

          if (!res.ok) throw new Error();
          const { text } = await res.json();

          if (text?.trim()) {
            processQuery(text.trim());
          }
        } catch (err) {
          console.error('Voice transcription error:', err);
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      recordingTimeoutRef.current = setTimeout(() => stopRecording(), 8 * 60 * 1000);
      setIsRecording(true);
      if (!pressActiveRef.current) {
        stopRecording();
      }
    } catch (err) {
      console.error('Mic access denied:', err);
      alert('Mikrofon erişimi izni gerekli.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
  };

  const handleMicPressStart = () => {
    pressActiveRef.current = true;
    startRecording();
  };

  const handleMicPressEnd = () => {
    pressActiveRef.current = false;
    stopRecording();
  };

  return (
    <div className={variant === 'sheet' ? 'w-full p-4 flex flex-col justify-end group' : 'w-full p-3 flex flex-col justify-end group shrink-0'}>


      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim() || isRecording || isTranscribing) return;
          processQuery(input);
          setInput('');
          if (textareaRef.current) {
            textareaRef.current.style.height = '46px';
          }
        }}
        className="flex relative items-center gap-2"
      >
        {isVoiceInputEnabled && (
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => { e.stopPropagation(); handleMicPressStart(); }}
            onPointerUp={(e) => { e.stopPropagation(); handleMicPressEnd(); }}
            onPointerLeave={(e) => { e.stopPropagation(); handleMicPressEnd(); }}
            onPointerCancel={(e) => { e.stopPropagation(); handleMicPressEnd(); }}
            onContextMenu={(e) => e.preventDefault()}
            disabled={isTranscribing}
            className={`touch-none w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all shadow-sm ${
              isRecording
                ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-200'
                : isTranscribing
                ? 'bg-amber-100 text-amber-600'
                : 'bg-[var(--paper)] text-[var(--ink-soft)] hover:bg-[var(--coral-tint)] hover:text-[var(--coral)]'
            }`}
            title="Mikrofon (Basılı Tut ve Konuş)"
          >
            {isTranscribing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isRecording ? (
              <Square className="w-4 h-4 fill-white" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </button>
        )}
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
            placeholder={isRecording ? loc.listening : loc.placeholder}
            disabled={isRecording || isTranscribing}
            rows={1}
            style={{ height: '46px' }}
            className="w-full pl-4 pr-12 py-[11px] bg-white/95 backdrop-blur border border-[rgba(20,35,31,0.10)] rounded-[23px] text-sm placeholder-[var(--muted)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--coral)]/20 focus:border-[var(--coral)] resize-none max-h-[150px] overflow-y-auto block leading-relaxed text-[var(--ink)]"
          />
          <button
            type="submit"
            disabled={!input.trim() || isRecording || isTranscribing}
            className="absolute right-1 bottom-1 w-[38px] h-[38px] bg-[var(--coral)] text-white rounded-full flex items-center justify-center disabled:opacity-50 transition-colors shadow-sm"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </div>
      </form>
    </div>
  );
}
