'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Archive, ArchiveRestore, Bot, Loader2, MessageCircle, Trash2, User as UserIcon } from 'lucide-react';

type ConversationRow = {
  id: string;
  visitor_session_id: string;
  last_message_at: string | null;
  is_read: boolean;
  is_preview: boolean;
  is_archived: boolean;
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
  onSelectConversation: (id: string | null) => void;
}) {
  const supabase = createClient();
  const [readMap, setReadMap] = useState<Record<string, boolean>>(
    Object.fromEntries(conversations.map((c) => [c.id, c.is_read]))
  );
  const [archivedMap, setArchivedMap] = useState<Record<string, boolean>>(
    Object.fromEntries(conversations.map((c) => [c.id, c.is_archived]))
  );
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [showArchived, setShowArchived] = useState(false);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const handleToggleArchive = async (conversationId: string, archived: boolean) => {
    setArchivedMap((prev) => ({ ...prev, [conversationId]: archived }));
    const { error } = await supabase.from('conversations').update({ is_archived: archived }).eq('id', conversationId);
    if (error) {
      console.error(error);
      setArchivedMap((prev) => ({ ...prev, [conversationId]: !archived }));
      alert('İşlem sırasında bir hata oluştu.');
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    if (!window.confirm('Bu konuşmayı kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) return;
    setDeletedIds((prev) => new Set(prev).add(conversationId));
    if (selectedConversationId === conversationId) onSelectConversation(null);
    const { error } = await supabase.from('conversations').delete().eq('id', conversationId);
    if (error) {
      console.error(error);
      setDeletedIds((prev) => {
        const next = new Set(prev);
        next.delete(conversationId);
        return next;
      });
      alert('Silinirken bir hata oluştu.');
    }
  };

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

  const liveConversations = conversations.filter((c) => !deletedIds.has(c.id));
  const isArchived = (c: ConversationRow) => archivedMap[c.id] ?? c.is_archived;
  const archivedCount = liveConversations.filter(isArchived).length;
  const visibleConversations = liveConversations.filter((c) => (showArchived ? isArchived(c) : !isArchived(c)));

  if (liveConversations.length === 0) {
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

  const selectedConversation = visibleConversations.find((c) => c.id === selectedConversationId);

  return (
    <div className="bg-white border border-[rgba(20,35,31,0.10)] rounded-[20px] shadow-sm overflow-hidden flex flex-col md:flex-row h-[70vh]">
      {/* Left: conversation list */}
      <div className="w-full md:w-72 border-b md:border-b-0 md:border-r border-[rgba(20,35,31,0.10)] overflow-y-auto shrink-0 flex flex-col">
        {archivedCount > 0 && (
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="text-left px-4 py-2.5 text-xs font-medium text-[#8A8880] hover:text-[#14231F] transition flex items-center gap-1.5 border-b border-[rgba(20,35,31,0.06)] shrink-0"
          >
            {showArchived ? <><ArchiveRestore className="w-3.5 h-3.5" /> Aktif konuşmalara dön</> : <><Archive className="w-3.5 h-3.5" /> Arşivlenenleri gör ({archivedCount})</>}
          </button>
        )}
        {visibleConversations.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[#8A8880] text-center">{showArchived ? 'Arşivlenmiş konuşma yok.' : 'Aktif konuşma yok.'}</p>
        ) : visibleConversations.map((c) => {
          const isSelected = c.id === selectedConversationId;
          const isRead = readMap[c.id];
          const leadName = leadByConversationId[c.id];
          return (
            <div
              key={c.id}
              className={`group px-4 py-3 border-b border-[rgba(20,35,31,0.06)] transition-colors cursor-pointer ${isSelected ? 'bg-[#FFEDE9]' : 'hover:bg-[#F4F2ED]'}`}
              onClick={() => onSelectConversation(c.id)}
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
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-[#8A8880] font-mono">
                  {c.last_message_at
                    ? formatDistanceToNow(new Date(c.last_message_at), { addSuffix: true, locale: tr })
                    : formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: tr })}
                </p>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleArchive(c.id, !isArchived(c)); }}
                    title={isArchived(c) ? 'Arşivden çıkar' : 'Arşivle'}
                    className="p-1 text-[#8A8880] hover:text-[#14231F] rounded"
                  >
                    {isArchived(c) ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteConversation(c.id); }}
                    title="Kalıcı olarak sil"
                    className="p-1 text-[#8A8880] hover:text-red-600 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
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
