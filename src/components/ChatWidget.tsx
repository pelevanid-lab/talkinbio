'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat, UIMessage } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { motion, AnimatePresence } from 'framer-motion';
import { SauleIcon } from './AgentIcons';
import { Send, X, MessageCircle, User, RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import AgentMarkdown from './AgentMarkdown';

type LegacyMessage = { id: string; role: string; content: string };

function toUIMessage(m: LegacyMessage): UIMessage {
  return { id: m.id, role: m.role as UIMessage['role'], parts: [{ type: 'text', text: m.content }] };
}

function getMessageText(m: UIMessage): string {
  return m.parts.filter((p) => p.type === 'text').map((p) => (p as { text: string }).text).join('');
}

type LocalizedGreeting = Partial<Record<'tr' | 'en' | 'ru', string>>;

export default function ChatWidget({ businessId, businessName, locale, initialMessages = [], customGreeting, variant = 'sheet', preview = false, initialCreditsExhausted = false }: { businessId: string, businessName: string, locale: string, initialMessages?: LegacyMessage[], customGreeting?: LocalizedGreeting | null, variant?: 'sheet' | 'inline', preview?: boolean, initialCreditsExhausted?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const t = useTranslations('ChatWidget');

  // Mobil klavye düzeltmesi: bazı tarayıcılarda (örn. Instagram in-app WebView)
  // klavye açılınca layout viewport küçülmüyor, sadece visual viewport küçülüyor.
  // "fixed bottom-0" ve "dvh" bu durumda klavyenin arkasında kalıyor — giriş alanı
  // görünmez oluyor. VisualViewport API ile gerçek görünür alanı takip edip sheet'i
  // buna göre konumlandırıyoruz.
  const [keyboardGap, setKeyboardGap] = useState(0);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const vv = window.visualViewport;
    const update = () => {
      const gap = window.innerHeight - vv.height - vv.offsetTop;
      setKeyboardGap(Math.max(0, Math.round(gap)));
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  const pendingNewConversationRef = useRef(false);

  // Faz 4.3: kredi bitince (fiili ücretsiz katman) sohbet yerine LLM'siz bir
  // isim/iletişim/mesaj formuna dönülür — sohbet kapanmaz, ziyaretçi duvara çarpmaz.
  const [creditsExhausted, setCreditsExhausted] = useState(initialCreditsExhausted);
  const [exhaustedMessage, setExhaustedMessage] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const submitDirectCapture = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formName.trim() || !formContact.trim() || formSubmitting) return;
    setFormSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch('/api/leads/direct-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, name: formName.trim(), contact: formContact.trim(), message: formMessage.trim() }),
      });
      if (!res.ok) throw new Error(await res.text());
      setFormSubmitted(true);
    } catch {
      setFormError(t('formErrorGeneric'));
    } finally {
      setFormSubmitting(false);
    }
  };

  const welcomeMessage = (): UIMessage => ({
    id: `welcome-${Date.now()}`,
    role: 'assistant',
    parts: [{ type: 'text', text: customGreeting?.[locale as 'tr' | 'en' | 'ru'] || t('welcome', { name: businessName }) }],
  });

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      prepareSendMessagesRequest: ({ id, messages }) => {
        // Bayrak burada okunup burada sıfırlanmalı: prepareSendMessagesRequest,
        // sendMessage() çağrısından SONRA (asenkron gönderim akışının içinde)
        // çalışıyor. Sıfırlamayı onFormSubmit'e koymak bayrağı okunmadan önce
        // false'a çekiyordu — "Yeni sohbet" butonu sunucuya hiç ulaşmıyor, sadece
        // ekranı temizliyordu; Saule aynı konuşmadan devam edip önceki ziyaretçiyi
        // hatırlamaya devam ediyordu.
        const isNewConversation = pendingNewConversationRef.current;
        pendingNewConversationRef.current = false;
        return {
          body: {
            id,
            messages,
            businessId,
            locale,
            preview,
            newConversation: isNewConversation,
          },
        };
      },
    }),
    messages: initialMessages.length > 0 ? initialMessages.map(toUIMessage) : [welcomeMessage()],
    // Faz 4.1: sert kalkanlar (flood/oturum açma/günlük tavan) 429 + düz metin döner;
    // bunu normal bir Saule balonu gibi göster (LLM streami yok, tek seferlik metin).
    // Faz 4.3: kredi bitince sunucu 402 + JSON payload döner — form moduna geç.
    onError: (error) => {
      try {
        const parsed = JSON.parse(error.message);
        if (parsed && parsed.code === 'credits_exhausted') {
          setCreditsExhausted(true);
          setExhaustedMessage(parsed.message);
          return;
        }
      } catch {
        // Not a credits_exhausted payload — fall through to the plain-text bubble below.
      }
      setMessages((prev) => [
        ...prev,
        { id: `error-${Date.now()}`, role: 'assistant', parts: [{ type: 'text', text: error.message }] },
      ]);
    },
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  const handleNewChat = () => {
    setMessages([welcomeMessage()]);
    pendingNewConversationRef.current = true;
  };

  const onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput('');
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isExpanded) {
      scrollToBottom();
    }
  }, [messages, isExpanded]);

  useEffect(() => {
    const handleSendToChat = (e: any) => {
      setIsExpanded(true);
      sendMessage({ text: e.detail });
    };
    window.addEventListener('sendToChat', handleSendToChat);
    return () => window.removeEventListener('sendToChat', handleSendToChat);
  }, [sendMessage]);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <>
      {/* Expanded Bottom Sheet (or, for variant="inline", a panel bounded to the parent frame) */}
      <AnimatePresence>
        {isExpanded && (
          <>
            {/* Backdrop */}
            {variant === 'sheet' && (
              <motion.div
                key="chat-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={toggleExpand}
                className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[60]"
              />
            )}

            {/* Sheet */}
            <motion.div
              key="chat-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={variant === 'sheet'
                ? 'fixed left-0 right-0 h-[85dvh] bg-white rounded-t-3xl shadow-2xl z-[70] flex flex-col overflow-hidden'
                : 'absolute inset-0 bg-white z-20 flex flex-col overflow-hidden'}
              style={variant === 'sheet' ? { bottom: keyboardGap, maxHeight: keyboardGap > 0 ? `calc(100dvh - ${keyboardGap}px)` : undefined } : undefined}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-[var(--border-light)] bg-white">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-[var(--border-light)] p-[2px] bg-[var(--paper)] flex items-center justify-center">
                    <SauleIcon size={34} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--ink)] font-bricolage">Saule</h3>
                    <p className="text-xs text-[var(--teal)] font-medium flex items-center">
                      <span className="w-2 h-2 rounded-full bg-[var(--teal)] mr-1"></span> {t('online')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleNewChat}
                    title={t('newChat')}
                    className="w-10 h-10 rounded-full bg-[var(--paper)] flex items-center justify-center text-[var(--ink-soft)] hover:bg-slate-200 transition"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={toggleExpand}
                    className="w-10 h-10 rounded-full bg-[var(--paper)] flex items-center justify-center text-[var(--ink-soft)] hover:bg-slate-200 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Faz 4.3: kredi bitince (fiili ücretsiz katman) sohbet yerine LLM'siz form */}
              {creditsExhausted ? (
                <div className="flex-1 overflow-y-auto p-4 bg-[var(--paper)]/50 flex flex-col justify-center">
                  {formSubmitted ? (
                    <p className="text-center text-sm text-[var(--ink)]">{t('formSuccess')}</p>
                  ) : (
                    <form onSubmit={submitDirectCapture} className="space-y-3">
                      {exhaustedMessage && <p className="text-sm text-[var(--ink-soft)] mb-2">{exhaustedMessage}</p>}
                      <input
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder={t('formName')}
                        className="w-full px-4 py-3 bg-white border border-[var(--border-light)] rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--coral)]/20 focus:border-[var(--coral)]"
                        required
                      />
                      <input
                        value={formContact}
                        onChange={(e) => setFormContact(e.target.value)}
                        placeholder={t('formContact')}
                        className="w-full px-4 py-3 bg-white border border-[var(--border-light)] rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--coral)]/20 focus:border-[var(--coral)]"
                        required
                      />
                      <textarea
                        value={formMessage}
                        onChange={(e) => setFormMessage(e.target.value)}
                        placeholder={t('formMessage')}
                        rows={3}
                        className="w-full px-4 py-3 bg-white border border-[var(--border-light)] rounded-2xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--coral)]/20 focus:border-[var(--coral)]"
                      />
                      {formError && <p className="text-xs text-red-500">{formError}</p>}
                      <button
                        type="submit"
                        disabled={formSubmitting || !formName.trim() || !formContact.trim()}
                        className="w-full py-3 bg-[var(--coral)] text-white rounded-2xl text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
                      >
                        {formSubmitting ? t('formSubmitting') : t('formSubmit')}
                      </button>
                    </form>
                  )}
                </div>
              ) : (
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[var(--paper)]/50">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
                      <div className={`w-8 h-8 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 ${m.role === 'user' ? 'bg-slate-200 text-slate-600' : 'border border-[var(--border-light)] bg-[var(--paper)] p-0.5'}`}>
                        {m.role === 'user' ? <User className="w-4 h-4" /> : <SauleIcon size={32} className="w-full h-full" />}
                      </div>
                      <div className={`px-4 py-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-[var(--ink)] text-white rounded-br-sm' : 'bg-white border border-[var(--border-light)] text-[var(--ink)] shadow-sm rounded-bl-sm'}`}>
                        {m.role === 'user' ? getMessageText(m) : (
                          <AgentMarkdown>{getMessageText(m)}</AgentMarkdown>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="flex items-end gap-2">
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-[var(--border-light)] bg-[var(--paper)] p-0.5 flex items-center justify-center flex-shrink-0">
                        <SauleIcon size={32} className="w-full h-full" />
                      </div>
                      <div className="px-4 py-3 bg-white border border-[var(--border-light)] rounded-2xl rounded-bl-sm shadow-sm flex space-x-1">
                        <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              )}

              <div className="p-4 bg-white border-t border-[var(--border-light)]">
                {!creditsExhausted && (
                <form onSubmit={onFormSubmit} className="flex relative items-end">
                  <textarea
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = `${e.target.scrollHeight}px`;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (input.trim() && !isLoading) {
                          e.currentTarget.form?.requestSubmit();
                        }
                      }
                    }}
                    rows={1}
                    placeholder={t('placeholder')}
                    className="w-full pl-4 pr-12 py-3 bg-[var(--paper)] border border-[var(--border-light)] rounded-3xl focus:outline-none focus:ring-2 focus:ring-[var(--coral)]/20 focus:border-[var(--coral)] transition-all text-sm resize-none overflow-hidden min-h-[46px] max-h-[150px]"
                    style={{ maxHeight: '150px' }}
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="absolute right-1 bottom-1 w-10 h-10 bg-[var(--coral)] text-white rounded-full flex items-center justify-center hover:bg-orange-600 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    <Send className="w-4 h-4 ml-0.5" />
                  </button>
                </form>
                )}
                <p className="text-center text-[10px] text-[var(--muted)] mt-2">
                  {t('signature')} — <a href="https://talkinbio.com/?utm_source=widget&utm_medium=signature&utm_campaign=saule_signature" target="_blank" rel="noreferrer" className="underline hover:text-[var(--coral)]">talkinbio.com</a>
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Collapsed State — plain flow block for BOTH variants, sized by its own content (preview
          card + input). "inline" used to self-position with `absolute bottom-0 ... h-[31%]`
          against the nearest positioned ancestor (the editor preview's whole phone frame, not
          just its own reserved slot) — since this element contributed no flow height while
          collapsed, the sibling content area's `flex-1` filled the ENTIRE frame instead of
          leaving room for it, so the invisible dock's absolute hit-box floated on top of
          whatever page block happened to render in that bottom band (e.g. "İletişim"), stealing
          its clicks and opening the chat instead. Keeping this in normal flow makes it a real
          flex sibling that the content area's `flex-1` correctly shrinks around. */}
      {!isExpanded && (
        <div
          onClick={toggleExpand}
          className={variant === 'sheet' ? 'w-full p-4 flex flex-col justify-end cursor-pointer group' : 'w-full p-3 flex flex-col justify-end cursor-pointer group shrink-0'}
        >
          {/* Quick preview of last message */}
          <div className="bg-white border border-[var(--border-light)] rounded-2xl shadow-lg p-4 flex items-center justify-between mb-4 transform transition group-hover:-translate-y-1">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-[var(--border-light)] bg-[var(--paper)] p-[2px]">
                <SauleIcon size={40} className="w-full h-full" />
              </div>
              <div className="truncate">
                <p className="text-xs text-[var(--teal)] font-medium mb-0.5">Saule</p>
                <p className="text-sm text-[var(--ink)] truncate">
                  {(messages.length > 0 ? getMessageText(messages[messages.length - 1]) : '').substring(0, 40) || t('defaultPreview')}...
                </p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-[var(--paper)] flex items-center justify-center flex-shrink-0 text-[var(--ink-soft)] group-hover:bg-[var(--coral-tint)] group-hover:text-[var(--coral)] transition">
              <MessageCircle className="w-4 h-4" />
            </div>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); toggleExpand(); }} className="flex relative items-center pointer-events-none">
            <input
              placeholder={t('placeholder')}
              className="w-full pl-4 pr-12 py-3.5 bg-[var(--paper)] border border-[var(--border-light)] rounded-full text-sm placeholder-[var(--muted)]"
              readOnly
            />
            <button
              type="button"
              className="absolute right-1.5 w-10 h-10 bg-[var(--coral)] text-white rounded-full flex items-center justify-center"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
