'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, MessageCircle, Bot, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';

export default function ChatWidget({ businessId, businessName, locale, initialMessages = [], customGreeting }: { businessId: string, businessName: string, locale: string, initialMessages?: any[], customGreeting?: string | null }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const t = useTranslations('ChatWidget');

  const { messages, input, handleInputChange, handleSubmit, isLoading, append } = useChat({
    api: '/api/chat',
    body: { businessId, locale },
    initialMessages: initialMessages.length > 0 ? initialMessages : [
      {
        id: 'welcome',
        role: 'assistant',
        content: customGreeting || t('welcome', { name: businessName })
      }
    ]
  });

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
      append({ role: 'user', content: e.detail });
    };
    window.addEventListener('sendToChat', handleSendToChat);
    return () => window.removeEventListener('sendToChat', handleSendToChat);
  }, [append]);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <>
      {/* Expanded Bottom Sheet */}
      <AnimatePresence>
        {isExpanded && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={toggleExpand}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[60]"
            />
            
            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 h-[85dvh] bg-white rounded-t-3xl shadow-2xl z-[70] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-[var(--border-light)] bg-white">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-[var(--border-light)]">
                    <Image src="/saule-avatar-v1.png" alt="Saule" width={40} height={40} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--ink)] font-bricolage">Saule</h3>
                    <p className="text-xs text-[var(--teal)] font-medium flex items-center">
                      <span className="w-2 h-2 rounded-full bg-[var(--teal)] mr-1"></span> {t('online')}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={toggleExpand}
                  className="w-10 h-10 rounded-full bg-[var(--paper)] flex items-center justify-center text-[var(--ink-soft)] hover:bg-slate-200 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[var(--paper)]/50">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
                      <div className={`w-8 h-8 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 ${m.role === 'user' ? 'bg-slate-200 text-slate-600' : 'border border-[var(--border-light)]'}`}>
                        {m.role === 'user' ? <User className="w-4 h-4" /> : <Image src="/saule-avatar-v1.png" alt="Saule" width={32} height={32} className="w-full h-full object-cover" />}
                      </div>
                      <div className={`px-4 py-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-[var(--ink)] text-white rounded-br-sm' : 'bg-white border border-[var(--border-light)] text-[var(--ink)] shadow-sm rounded-bl-sm'}`}>
                        {m.role === 'user' ? m.content : (
                          <ReactMarkdown components={{
                            p: ({node, ...props}) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2 last:mb-0" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-2 last:mb-0" {...props} />,
                            li: ({node, ...props}) => <li className="mb-1 last:mb-0" {...props} />,
                            a: ({node, ...props}) => <a className="text-[var(--coral)] underline hover:text-orange-600 transition" target="_blank" rel="noreferrer" {...props} />,
                            strong: ({node, ...props}) => <strong className="font-semibold text-[var(--ink)]" {...props} />
                          }}>
                            {m.content}
                          </ReactMarkdown>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="flex items-end gap-2">
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-[var(--border-light)] flex items-center justify-center flex-shrink-0">
                        <Image src="/saule-avatar-v1.png" alt="Saule" width={32} height={32} className="w-full h-full object-cover" />
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

              <div className="p-4 bg-white border-t border-[var(--border-light)]">
                <form onSubmit={handleSubmit} className="flex relative items-end">
                  <textarea
                    value={input}
                    onChange={(e) => {
                      handleInputChange(e);
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
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Collapsed State (Bottom 30% area inside parent) */}
      {!isExpanded && (
        <div 
          onClick={toggleExpand}
          className="w-full h-full p-4 flex flex-col justify-end cursor-pointer group"
        >
          {/* Quick preview of last message */}
          <div className="bg-white border border-[var(--border-light)] rounded-2xl shadow-lg p-4 flex items-center justify-between mb-4 transform transition group-hover:-translate-y-1">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-[var(--border-light)]">
                <Image src="/saule-avatar-v1.png" alt="Saule" width={40} height={40} className="w-full h-full object-cover" />
              </div>
              <div className="truncate">
                <p className="text-xs text-[var(--teal)] font-medium mb-0.5">Saule</p>
                <p className="text-sm text-[var(--ink)] truncate">
                  {messages[messages.length - 1]?.content.substring(0, 40) || t('defaultPreview')}...
                </p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-[var(--paper)] flex items-center justify-center flex-shrink-0 text-[var(--ink-soft)] group-hover:bg-[var(--coral-tint)] group-hover:text-[var(--coral)] transition">
              <MessageCircle className="w-4 h-4" />
            </div>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); toggleExpand(); }} className="flex relative items-center pointer-events-none">
            <input
              placeholder="Bir mesaj yazın..."
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
