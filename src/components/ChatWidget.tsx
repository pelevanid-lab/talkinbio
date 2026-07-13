'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, MessageCircle, Bot, User } from 'lucide-react';

export default function ChatWidget({ businessId, businessName }: { businessId: string, businessName: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // @ts-ignore: Version mismatch causes type inference issues with useChat return type
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    body: { businessId },
    initialMessages: [
      {
        id: 'welcome',
        role: 'assistant',
        content: `Merhaba! Ben ${businessName} asistanıyım. Size nasıl yardımcı olabilirim?`
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
              <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{businessName} Asistanı</h3>
                    <p className="text-xs text-green-500 font-medium flex items-center">
                      <span className="w-2 h-2 rounded-full bg-green-500 mr-1"></span> Çevrimiçi
                    </p>
                  </div>
                </div>
                <button 
                  onClick={toggleExpand}
                  className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-blue-100 text-blue-600'}`}>
                        {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </div>
                      <div className={`px-4 py-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-slate-900 text-white rounded-br-sm' : 'bg-white border border-slate-100 text-slate-800 shadow-sm rounded-bl-sm'}`}>
                        {m.content}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="flex items-end gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div className="px-4 py-3 bg-white border border-slate-100 rounded-2xl rounded-bl-sm shadow-sm flex space-x-1">
                        <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-white border-t border-slate-100">
                <form onSubmit={handleSubmit} className="flex relative items-center">
                  <input
                    value={input}
                    onChange={handleInputChange}
                    placeholder="Bir mesaj yazın..."
                    className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                  />
                  <button 
                    type="submit" 
                    disabled={isLoading || !input.trim()}
                    className="absolute right-1 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors shadow-sm"
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
          <div className="bg-white border border-slate-100 rounded-2xl shadow-lg p-4 flex items-center justify-between mb-4 transform transition group-hover:-translate-y-1">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 flex-shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div className="truncate">
                <p className="text-xs text-slate-500 font-medium mb-0.5">{businessName} Asistanı</p>
                <p className="text-sm text-slate-800 truncate">
                  {messages[messages.length - 1]?.content.substring(0, 40) || "Size nasıl yardımcı olabilirim?"}...
                </p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center flex-shrink-0 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition">
              <MessageCircle className="w-4 h-4" />
            </div>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); toggleExpand(); }} className="flex relative items-center pointer-events-none">
            <input
              placeholder="Bir mesaj yazın..."
              className="w-full pl-4 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-full text-sm"
              readOnly
            />
            <button 
              type="button" 
              className="absolute right-1.5 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
