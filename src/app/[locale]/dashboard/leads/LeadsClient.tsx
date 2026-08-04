'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { formatDistanceToNow, type Locale } from 'date-fns';
import { tr, enUS, ru } from 'date-fns/locale';
import { useLocale, useTranslations } from 'next-intl';
import { Clock, User as UserIcon, Inbox, MessageCircle, Archive, ArchiveRestore, Trash2, StickyNote, Mail, Plus, CheckCircle2, Send, Phone } from 'lucide-react';
import ConversationsPanel from './ConversationsPanel';
import DashboardShell from '@/components/dashboard/DashboardShell';

const DATE_FNS_LOCALES: Record<string, Locale> = { tr, en: enUS, ru };

// Contact methods offered as an "Order Now" target â€” same keys as business.contact_value.
const ORDER_NOW_METHOD_LABELS: Record<string, Record<string, string>> = {
  whatsapp: { tr: 'WhatsApp', en: 'WhatsApp', ru: 'WhatsApp' },
  instagram: { tr: 'Instagram', en: 'Instagram', ru: 'Instagram' },
  telegram: { tr: 'Telegram', en: 'Telegram', ru: 'Telegram' },
  email: { tr: 'E-posta', en: 'Email', ru: 'Email' },
};

export default function LeadsClient({ business, initialLeads, initialConversations }: { business: any, initialLeads: any[], initialConversations: any[] }) {
  const supabase = createClient();
  const t = useTranslations('Leads');
  const tEditor = useTranslations('Editor');
  const locale = useLocale();
  const dateLocale = DATE_FNS_LOCALES[locale] || tr;
  const [activeTab, setActiveTab] = useState<'leads' | 'conversations'>('leads');
  const [leads, setLeads] = useState(initialLeads);
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showArchivedLeads, setShowArchivedLeads] = useState(false);

  // Supabase Realtime Subscriptions for Leads and Conversations
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Realtime channel for conversations
    const convChannel = supabase
      .channel('realtime-dashboard-conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `business_id=eq.${business.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newConv = payload.new as any;
            setConversations((prev) => {
              if (prev.some((c) => c.id === newConv.id)) return prev;
              // Prepend new conversations and order by last_message_at desc
              const updated = [newConv, ...prev];
              return updated.sort((a, b) => {
                const aTime = new Date(a.last_message_at || a.created_at).getTime();
                const bTime = new Date(b.last_message_at || b.created_at).getTime();
                return bTime - aTime;
              });
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedConv = payload.new as any;
            setConversations((prev) => {
              const updated = prev.map((c) => (c.id === updatedConv.id ? { ...c, ...updatedConv } : c));
              return updated.sort((a, b) => {
                const aTime = new Date(a.last_message_at || a.created_at).getTime();
                const bTime = new Date(b.last_message_at || b.created_at).getTime();
                return bTime - aTime;
              });
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedConv = payload.old as any;
            setConversations((prev) => prev.filter((c) => c.id !== deletedConv.id));
          }
        }
      )
      .subscribe();

    // Realtime channel for leads
    const leadsChannel = supabase
      .channel('realtime-dashboard-leads')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          filter: `business_id=eq.${business.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newLead = payload.new as any;
            setLeads((prev) => {
              if (prev.some((l) => l.id === newLead.id)) return prev;
              return [newLead, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedLead = payload.new as any;
            setLeads((prev) => prev.map((l) => (l.id === updatedLead.id ? { ...l, ...updatedLead } : l)));
          } else if (payload.eventType === 'DELETE') {
            const deletedLead = payload.old as any;
            setLeads((prev) => prev.filter((l) => l.id !== deletedLead.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(convChannel);
      supabase.removeChannel(leadsChannel);
    };
  }, [business.id, supabase]);

  const [openNoteIds, setOpenNoteIds] = useState<Set<string>>(() => new Set(initialLeads.filter((l: any) => l.notes).map((l: any) => l.id)));
  
  const profileUrl = `talkinbio.com/${business.username}`;

  


  const handleMarkSeen = async (leadId: string) => {
    // Optimistic update
    setLeads(leads.map(l => l.id === leadId ? { ...l, status: 'seen' } : l));
    const { error } = await supabase.from('leads').update({ status: 'seen' }).eq('id', leadId);
    if (error) {
      console.error(error);
      // Revert on error
      setLeads(leads);
    }
  };

  const handleArchiveLead = async (leadId: string, archived: boolean) => {
    const prev = leads;
    setLeads(leads.map(l => l.id === leadId ? { ...l, is_archived: archived } : l));
    const { error } = await supabase.from('leads').update({ is_archived: archived }).eq('id', leadId);
    if (error) {
      console.error(error);
      setLeads(prev);
      alert(t('archiveError'));
    }
  };

  const handleUpdateNotes = async (leadId: string, notes: string) => {
    const { error } = await supabase.from('leads').update({ notes }).eq('id', leadId);
    if (error) {
      console.error(error);
      alert(t('notesSaveError'));
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!window.confirm(t('deleteLeadConfirm'))) return;
    const { data, error } = await supabase.from('leads').delete().eq('id', leadId).select('id');
    if (error || !data || data.length === 0) {
      console.error(error || new Error(`Lead ${leadId} not deleted (0 rows affected)`));
      alert(t('deleteError'));
      return;
    }
    setLeads(leads.filter(l => l.id !== leadId));
  };



  return (
    <DashboardShell business={business} active="leads">
      {/* In-page tabs */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="inline-flex bg-white p-1 rounded-full border border-[rgba(20,35,31,0.10)]">
          <button
            onClick={() => setActiveTab('leads')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTab === 'leads' ? 'bg-[#14231F] text-white' : 'text-[#8A8880] hover:text-[#4B5A55]'}`}
          >
            <Inbox className="w-4 h-4" /> {t('tabRequests')}
          </button>
          <button
            onClick={() => setActiveTab('conversations')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTab === 'conversations' ? 'bg-[#14231F] text-white' : 'text-[#8A8880] hover:text-[#4B5A55]'}`}
          >
            <MessageCircle className="w-4 h-4" /> {t('tabConversations')}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-['Inter']">
        {activeTab === 'leads' ? (() => {
          const visibleLeads = (leads || []).filter((l: any) => showArchivedLeads ? l.is_archived : !l.is_archived);
          const archivedCount = (leads || []).filter((l: any) => l.is_archived).length;
          return (
          <>
          {archivedCount > 0 && (
            <button
              onClick={() => setShowArchivedLeads(!showArchivedLeads)}
              className="mb-4 text-sm font-medium text-[#8A8880] hover:text-[#14231F] transition flex items-center gap-1.5"
            >
              {showArchivedLeads ? <><ArchiveRestore className="w-4 h-4" /> {t('backToActiveLeads')}</> : <><Archive className="w-4 h-4" /> {t('viewArchived', { count: archivedCount })}</>}
            </button>
          )}
          {visibleLeads.length === 0 ? (
            <div className="bg-white border border-[rgba(20,35,31,0.10)] rounded-[20px] p-12 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-[#F4F2ED] rounded-full flex items-center justify-center text-[#8A8880] mb-4">
                <UserIcon className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-[800] text-[#14231F] mb-2 font-['Bricolage_Grotesque']">{showArchivedLeads ? t('emptyArchivedLeadsTitle') : t('emptyLeadsTitle')}</h2>
              <p className="text-[#4B5A55] max-w-sm">{showArchivedLeads ? t('emptyArchivedLeadsDescription') : t('emptyLeadsDescription')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {visibleLeads.map((lead: any) => (
                <div key={lead.id} className="bg-white border border-[rgba(20,35,31,0.10)] rounded-[20px] p-6 shadow-sm hover:shadow-md transition">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-12 h-12 bg-[#FFEDE9] text-[#FF6A5C] rounded-full flex items-center justify-center font-bold text-lg">
                        {lead.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-lg font-[800] text-[#14231F] font-['Bricolage_Grotesque']">{lead.name}</h3>
                        <div className="flex items-center text-sm text-[#8A8880] mt-0.5 font-mono text-xs">
                          <Clock className="w-3.5 h-3.5 mr-1" />
                          {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: dateLocale })}
                        </div>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                      lead.status === 'new' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      lead.status === 'seen' ? 'bg-[#FFEDE9] text-[#FF6A5C] border-[#FFEDE9]' :
                      'bg-green-50 text-green-700 border-green-200'
                    }`}>
                      {lead.status === 'new' ? t('statusNew') : lead.status === 'seen' ? t('statusSeen') : t('statusDone')}
                    </span>
                  </div>

                  <div className="bg-[#F4F2ED] rounded-xl p-4 mb-4">
                    <p className="text-[#4B5A55] text-sm">{lead.summary}</p>
                    {lead.preferred_datetime && (
                      <p className="text-[#14231F] text-xs font-medium mt-2 flex items-center">
                        <Clock className="w-3.5 h-3.5 mr-1.5" /> {t('preferredTime', { time: lead.preferred_datetime })}
                      </p>
                    )}
                  </div>

                  {openNoteIds.has(lead.id) ? (
                    <div className="mb-4">
                      <label className="text-xs font-semibold text-[#8A8880] mb-1.5 flex items-center gap-1.5 font-mono uppercase tracking-wider">
                        <StickyNote className="w-3.5 h-3.5" /> {t('notesLabel')}
                      </label>
                      <textarea
                        autoFocus={!lead.notes}
                        defaultValue={lead.notes || ''}
                        onBlur={(e) => {
                          if (e.target.value !== (lead.notes || '')) {
                            setLeads(leads.map(l => l.id === lead.id ? { ...l, notes: e.target.value } : l));
                            handleUpdateNotes(lead.id, e.target.value);
                          }
                        }}
                        placeholder={t('notesPlaceholder')}
                        className="w-full p-2.5 rounded-lg border border-[rgba(20,35,31,0.10)] focus:outline-none focus:border-[#FF6A5C] text-sm text-[#14231F] bg-white"
                        rows={2}
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => setOpenNoteIds(new Set([...openNoteIds, lead.id]))}
                      className="mb-4 text-xs font-medium text-[#8A8880] hover:text-[#14231F] transition flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> {t('notesLabel')}
                    </button>
                  )}

                  <div className="flex items-center justify-between border-t border-[rgba(20,35,31,0.10)] pt-4">
                    <div className="flex items-center gap-4">
                      {lead.source_username && (
                        <a href={`https://ig.me/m/${lead.source_username.replace('@', '')}`} target="_blank" rel="noreferrer" className="flex items-center text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 rounded-full hover:opacity-90 transition shadow-sm">
                          <Send className="w-4 h-4 mr-1.5" />
                          {t('messageBtn')}
                        </a>
                      )}
                      <a href={lead.contact.includes('@') ? `mailto:${lead.contact}` : `https://wa.me/${lead.contact.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className={`flex items-center text-sm font-medium ${lead.source_username ? 'text-[#8A8880] hover:text-[#4B5A55]' : 'text-[#14231F] hover:text-[#FF6A5C]'}`}>
                        {lead.contact.includes('@') ? <MessageCircle className="w-4 h-4 mr-2" /> : <Phone className="w-4 h-4 mr-2" />}
                        {lead.contact}
                      </a>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {lead.conversation_id && (
                        <button
                          onClick={() => { setActiveTab('conversations'); setSelectedConversationId(lead.conversation_id); }}
                          className="text-sm font-medium text-[#8A8880] hover:text-[#FF6A5C] transition flex items-center"
                        >
                          <MessageCircle className="w-4 h-4 mr-1.5" /> {t('viewConversationBtn')}
                        </button>
                      )}
                      {lead.status === 'new' ? (
                        <button onClick={() => handleMarkSeen(lead.id)} className="text-sm font-medium text-white bg-[#FF6A5C] px-4 py-2 rounded-full hover:bg-orange-600 transition flex items-center shadow-sm">
                          <CheckCircle2 className="w-4 h-4 mr-1.5" />
                          {t('markSeenBtn')}
                        </button>
                      ) : (
                        <div className="flex items-center text-sm text-[#8A8880]">
                          <CheckCircle2 className="w-4 h-4 mr-1.5" /> {t('statusSeen')}
                        </div>
                      )}
                      <button
                        onClick={() => handleArchiveLead(lead.id, !lead.is_archived)}
                        title={lead.is_archived ? t('unarchiveTooltip') : t('archiveTooltip')}
                        className="p-2 text-[#8A8880] hover:text-[#14231F] hover:bg-[#F4F2ED] rounded-full transition"
                      >
                        {lead.is_archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDeleteLead(lead.id)}
                        title={t('deleteTooltip')}
                        className="p-2 text-[#8A8880] hover:text-red-600 hover:bg-red-50 rounded-full transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          </>
          );
        })() : (
          <ConversationsPanel
            conversations={conversations}
            leads={leads}
            selectedConversationId={selectedConversationId}
            onSelectConversation={(id) => setSelectedConversationId(id)}
          />
        )}
      </main>

      <footer className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <div className="bg-white border border-[rgba(20,35,31,0.10)] rounded-2xl px-5 py-4 flex items-center gap-3 text-sm">
          <Mail className="w-4 h-4 text-[#8A8880] shrink-0" />
          <p className="text-[#4B5A55]">
            {t('footerTextBeforeEmail')}<a href="mailto:info@talkinbio.com" className="text-[#FF6A5C] font-medium hover:underline">info@talkinbio.com</a>{t('footerTextAfterEmail')}
          </p>
        </div>
      </footer>
    </DashboardShell>
  );
}
