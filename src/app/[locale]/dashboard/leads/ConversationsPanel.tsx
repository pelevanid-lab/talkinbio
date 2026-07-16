'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Bot, Loader2, MessageCircle, User as UserIcon } from 'lucide-react';

type ConversationRow = {
  id: string;
  visitor_session_id: string;
  last_message_at: string | null;
  is_read: boolean;
  is_preview: boolean;
  created_at: string;
};

type LeadRow = {
  id: string;
  name: string;
  conversation_id: string;
};

type MessageRow = {
  id: string;
  role: string;
  content: string;
  created_at: string;
};

export default function ConversationsPanel({
  conversations,
  leads,
  selectedConversationId,
  onSelectConversation,
}: {
  conversations: ConversationRow[];
  leads: LeadRow[];
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
}) {
  const supabase = createClient();
  const [readMap, setReadMap] = useState<Record<string, boolean>>(
    Object.fromEntries(conversations.map((c) => [c.id, c.is_read]))
  );
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const leadByConversationId = Object.fromEntries(
    leads.filter((l) => l.conversation_id).map((l) => [l.conversation_id, l.name])
  );

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    setIsLoadingMessages(true);

    supabase
      .from('messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', selectedConversationId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error(error);
          setMessages([]);
        } else {
          setMessages(data || []);
        }
        setIsLoadingMessages(false);
      });

    if (!readMap[selectedConversationId]) {
      supabase
        .from('conversations')
        .update({ is_read: true })
        .eq('id', selectedConversationId)
        .then(({ error }) => {
          if (!error) {
            setReadMap((prev) => ({ ...prev, [selectedConversationId]: true }));
          }
        });
    }

    return () => {
      cancelled = true;
    };
  }, [selectedConversationId]);

  if (conversations.length === 0) {
    return (
      <div className="bg-white border border-[rgba(20,35,31,0.10)] rounded-[20px] p-12 flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-[#F4F2ED] rounded-full flex items-center justify-center text-[#8A8880] mb-4">
          <MessageCircle className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-[800] text-[#14231F] mb-2 font-['Bricolage_Grotesque']">Henüz hiç konuşma yok</h2>
        <p className="text-[#4B5A55] max-w-sm">Ziyaretçileriniz Saule ile konuşmaya başladığında transkriptler burada görünecek.</p>
      </div>
    );
  }

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId);

  return (
    <div className="bg-white border border-[rgba(20,35,31,0.10)] rounded-[20px] shadow-sm overflow-hidden flex flex-col md:flex-row h-[70vh]">
      {/* Left: conversation list */}
      <div className="w-full md:w-72 border-b md:border-b-0 md:border-r border-[rgba(20,35,31,0.10)] overflow-y-auto shrink-0">
        {conversations.map((c) => {
          const isSelected = c.id === selectedConversationId;
          const isRead = readMap[c.id];
          const leadName = leadByConversationId[c.id];
          return (
            <button
              key={c.id}
              onClick={() => onSelectConversation(c.id)}
              className={`w-full text-left px-4 py-3 border-b border-[rgba(20,35,31,0.06)] transition-colors ${isSelected ? 'bg-[#FFEDE9]' : 'hover:bg-[#F4F2ED]'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-[#14231F] truncate">
                  {c.is_preview ? 'Test Konuşması' : (leadName || `Ziyaretçi #${c.visitor_session_id.slice(-6)}`)}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {c.is_preview && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">Test</span>
                  )}
                  {!isRead && <span className="w-2 h-2 rounded-full bg-[#FF6A5C]" />}
                </div>
              </div>
              <p className="text-xs text-[#8A8880] mt-1 font-mono">
                {c.last_message_at
                  ? formatDistanceToNow(new Date(c.last_message_at), { addSuffix: true, locale: tr })
                  : formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: tr })}
              </p>
            </button>
          );
        })}
      </div>

      {/* Right: transcript */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedConversation ? (
          <div className="flex-1 flex items-center justify-center text-[#8A8880] text-sm">
            Görüntülemek için soldan bir konuşma seçin.
          </div>
        ) : isLoadingMessages ? (
          <div className="flex-1 flex items-center justify-center text-[#8A8880]">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F4F2ED]/50">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex max-w-[80%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-[#FFEDE9] text-[#FF6A5C]'}`}>
                    {m.role === 'user' ? <UserIcon className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>
                  <div className={`px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-[#14231F] text-white rounded-br-sm' : 'bg-white border border-[rgba(20,35,31,0.10)] text-[#14231F] shadow-sm rounded-bl-sm'}`}>
                    {m.content}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
