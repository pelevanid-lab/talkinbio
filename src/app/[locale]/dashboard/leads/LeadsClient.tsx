'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { formatDistanceToNow, type Locale } from 'date-fns';
import { tr, enUS, ru } from 'date-fns/locale';
import { useLocale, useTranslations } from 'next-intl';
import { CheckCircle2, Clock, Phone, User as UserIcon, Settings, Inbox, Loader2, Send, MessageCircle, Archive, ArchiveRestore, Trash2, StickyNote, Mail } from 'lucide-react';
import ConversationsPanel from './ConversationsPanel';
import KnowledgeBasePanel from './KnowledgeBasePanel';
import CreditBadge from '@/components/CreditBadge';

const DATE_FNS_LOCALES: Record<string, Locale> = { tr, en: enUS, ru };

export default function LeadsClient({ business, initialLeads, initialConversations, initialKnowledge }: { business: any, initialLeads: any[], initialConversations: any[], initialKnowledge: any[] }) {
  const supabase = createClient();
  const t = useTranslations('Leads');
  const tEditor = useTranslations('Editor');
  const locale = useLocale();
  const dateLocale = DATE_FNS_LOCALES[locale] || tr;
  const [activeTab, setActiveTab] = useState<'leads' | 'conversations' | 'settings'>('leads');
  const [leads, setLeads] = useState(initialLeads);
  const [conversations] = useState(initialConversations);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showArchivedLeads, setShowArchivedLeads] = useState(false);
  
  // Settings state
  const [settings, setSettings] = useState(business.saule_settings || {});
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // "Tercih Edilen İletişim Kanalı" seçeneği yalnızca işletmenin Editör'de zaten
  // doldurduğu kanalları listeler — boş bir kanalı "tercih" olarak seçtirmenin anlamı yok.
  const contactValues: Record<string, string> = (() => {
    try { return business.contact_value ? JSON.parse(business.contact_value) : {}; } catch { return {}; }
  })();
  const CONTACT_METHOD_ORDER = ['whatsapp', 'instagram', 'telegram', 'email'] as const;
  const availableContactMethods = CONTACT_METHOD_ORDER.filter((m) => contactValues[m]?.trim());

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
    const prev = leads;
    setLeads(leads.filter(l => l.id !== leadId));
    const { error } = await supabase.from('leads').delete().eq('id', leadId);
    if (error) {
      console.error(error);
      setLeads(prev);
      alert(t('deleteError'));
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase.from('businesses').update({ saule_settings: settings }).eq('id', business.id);
      if (error) throw error;
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      console.error(err);
      alert(t('settingsSaveError'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F2ED]">
      {/* Header */}
      <header className="bg-white border-b border-[rgba(20,35,31,0.10)] sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-xl font-[800] tracking-[-0.02em] text-[#14231F]">{t('headerTitle')}</h1>
            <p className="text-sm text-[#4B5A55] font-['Inter']">{business.name}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-[#F4F2ED] p-1 rounded-full border border-[rgba(20,35,31,0.10)]">
              <button
                onClick={() => setActiveTab('leads')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTab === 'leads' ? 'bg-white text-[#14231F] shadow-sm' : 'text-[#8A8880] hover:text-[#4B5A55]'}`}
              >
                <Inbox className="w-4 h-4" /> {t('tabRequests')}
              </button>
              <button
                onClick={() => setActiveTab('conversations')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTab === 'conversations' ? 'bg-white text-[#14231F] shadow-sm' : 'text-[#8A8880] hover:text-[#4B5A55]'}`}
              >
                <MessageCircle className="w-4 h-4" /> {t('tabConversations')}
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-white text-[#14231F] shadow-sm' : 'text-[#8A8880] hover:text-[#4B5A55]'}`}
              >
                <Settings className="w-4 h-4" /> {t('tabSettings')}
              </button>
            </div>
            <CreditBadge balance={business.credit_balance ?? 0} />
            <a href="/dashboard/content" className="text-sm text-[#14231F] font-medium bg-[#F4F2ED] px-4 py-2 rounded-full hover:bg-[rgba(20,35,31,0.08)] transition whitespace-nowrap">
              {t('navContent')}
            </a>
            <a href="/dashboard/editor" className="text-sm text-[#14231F] font-medium bg-[#F4F2ED] px-4 py-2 rounded-full hover:bg-[rgba(20,35,31,0.08)] transition whitespace-nowrap">
              {t('navEditor')}
            </a>
            <a href={`/${business.username}`} className="text-sm text-[#FF6A5C] font-medium bg-[#FFEDE9] px-4 py-2 rounded-full hover:bg-orange-100 transition whitespace-nowrap">
              {t('navViewProfile')}
            </a>
          </div>
        </div>
      </header>

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

                  <div className="mb-4">
                    <label className="text-xs font-semibold text-[#8A8880] mb-1.5 flex items-center gap-1.5 font-mono uppercase tracking-wider">
                      <StickyNote className="w-3.5 h-3.5" /> {t('notesLabel')}
                    </label>
                    <textarea
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
        })() : activeTab === 'conversations' ? (
          <ConversationsPanel
            conversations={conversations}
            leads={leads}
            selectedConversationId={selectedConversationId}
            onSelectConversation={(id) => setSelectedConversationId(id)}
          />
        ) : (
          <div className="bg-white border border-[rgba(20,35,31,0.10)] rounded-[20px] p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-[rgba(20,35,31,0.10)]">
              <div className="w-16 h-16 bg-[#FFEDE9] text-[#FF6A5C] rounded-full flex items-center justify-center font-bold text-2xl shrink-0">
                S
              </div>
              <div>
                <h2 className="text-xl font-[800] text-[#14231F] font-['Bricolage_Grotesque']">Saule</h2>
                <p className="text-sm text-[#4B5A55]">{t('sauleSubtitle')}</p>
              </div>
            </div>

            <div className="space-y-8">
              {/* Tone */}
              <div>
                <h3 className="text-sm font-bold text-[#14231F] mb-3 uppercase tracking-wider font-mono">{t('toneSectionTitle')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(['friendly', 'formal', 'energetic'] as const).map(tone => (
                    <button
                      key={tone}
                      onClick={() => setSettings({ ...settings, personalityTone: tone })}
                      className={`p-4 rounded-xl border text-left transition-all ${settings.personalityTone === tone || (!settings.personalityTone && tone === 'friendly') ? 'border-[#FF6A5C] bg-[#FFEDE9] ring-1 ring-[#FF6A5C]' : 'border-[rgba(20,35,31,0.10)] hover:bg-[#F4F2ED]'}`}
                    >
                      <div className="font-semibold text-[#14231F] mb-1">
                        {tone === 'friendly' ? t('toneFriendlyLabel') : tone === 'formal' ? t('toneFormalLabel') : t('toneEnergeticLabel')}
                      </div>
                      <div className="text-xs text-[#4B5A55]">
                        {tone === 'friendly' ? t('toneFriendlyDesc') : tone === 'formal' ? t('toneFormalDesc') : t('toneEnergeticDesc')}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Lead Capture */}
              <div className="flex items-center justify-between py-4 border-t border-[rgba(20,35,31,0.10)]">
                <div>
                  <h3 className="text-base font-semibold text-[#14231F]">{t('leadCaptureTitle')}</h3>
                  <p className="text-sm text-[#4B5A55]">{t('leadCaptureDesc')}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={settings.leadCaptureEnabled !== false} onChange={(e) => setSettings({ ...settings, leadCaptureEnabled: e.target.checked })} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF6A5C]"></div>
                </label>
              </div>
              {settings.leadCaptureEnabled === false && (
                <div className="bg-[#F4F2ED] p-4 rounded-xl -mt-2 mb-2 animate-in fade-in slide-in-from-top-2">
                  <label className="block text-sm font-semibold text-[#14231F] mb-2 font-mono uppercase text-xs tracking-wider">{t('preferredContactMethodLabel')}</label>
                  {availableContactMethods.length > 0 ? (
                    <>
                      <select
                        value={settings.preferredContactMethod || ''}
                        onChange={(e) => setSettings({ ...settings, preferredContactMethod: e.target.value || undefined })}
                        className="w-full p-3 rounded-lg border border-[rgba(20,35,31,0.10)] focus:outline-none focus:border-[#FF6A5C] text-sm text-[#14231F] bg-white"
                      >
                        <option value="">{t('preferredContactMethodPlaceholder')}</option>
                        {availableContactMethods.map((method) => (
                          <option key={method} value={method}>{tEditor(`contactMethods.${method}`)}</option>
                        ))}
                      </select>
                      <p className="text-xs text-[#8A8880] mt-2">{t('preferredContactMethodHint')}</p>
                    </>
                  ) : (
                    <p className="text-sm text-[#4B5A55]">{t('preferredContactMethodEmptyHint')}</p>
                  )}
                </div>
              )}

              {/* Notification Email */}
              <div className="py-4 border-t border-[rgba(20,35,31,0.10)]">
                <h3 className="text-base font-semibold text-[#14231F]">{t('notificationEmailTitle')}</h3>
                <p className="text-sm text-[#4B5A55] mb-3">{t('notificationEmailDesc')}</p>
                <input
                  type="email"
                  value={settings.notificationEmail || ''}
                  onChange={(e) => setSettings({ ...settings, notificationEmail: e.target.value })}
                  placeholder={t('notificationEmailPlaceholder')}
                  className="w-full p-3 rounded-lg border border-[rgba(20,35,31,0.10)] focus:outline-none focus:border-[#FF6A5C] text-sm text-[#14231F]"
                />
              </div>

              {/* Appointments */}
              <div className="py-4 border-t border-[rgba(20,35,31,0.10)]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-semibold text-[#14231F]">{t('appointmentTitle')}</h3>
                    <p className="text-sm text-[#4B5A55]">{t('appointmentDesc')}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={settings.appointmentEnabled === true} onChange={(e) => setSettings({ ...settings, appointmentEnabled: e.target.checked })} />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF6A5C]"></div>
                  </label>
                </div>
                {settings.appointmentEnabled && (
                  <div className="bg-[#F4F2ED] p-4 rounded-xl mt-2 animate-in fade-in slide-in-from-top-2">
                    <label className="block text-sm font-semibold text-[#14231F] mb-2 font-mono uppercase text-xs tracking-wider">{t('appointmentInstructionsLabel')}</label>
                    <textarea
                      value={settings.appointmentInstructions || ''}
                      onChange={(e) => setSettings({ ...settings, appointmentInstructions: e.target.value })}
                      placeholder={t('appointmentInstructionsPlaceholder')}
                      className="w-full p-3 rounded-lg border border-[rgba(20,35,31,0.10)] focus:outline-none focus:border-[#FF6A5C] text-sm text-[#14231F]"
                      rows={3}
                    />
                    <p className="text-xs text-[#8A8880] mt-2">{t('appointmentHint')}</p>
                  </div>
                )}
              </div>

              {/* Custom Greeting */}
              <div className="py-4 border-t border-[rgba(20,35,31,0.10)]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-semibold text-[#14231F]">{t('greetingTitle')}</h3>
                    <p className="text-sm text-[#4B5A55]">{t('greetingDesc')}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={!!settings.customGreetingEnabled} onChange={(e) => setSettings({ ...settings, customGreetingEnabled: e.target.checked })} />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF6A5C]"></div>
                  </label>
                </div>
                {settings.customGreetingEnabled && (
                  <div className="bg-[#F4F2ED] p-4 rounded-xl animate-in fade-in slide-in-from-top-2 flex flex-col gap-3">
                    {/* Below: per-language greeting examples. These labels/placeholders are intentionally
                        shown in their own language (autonym), not translated to the dashboard's UI language —
                        they demonstrate what to type for that specific visitor-facing language field. */}
                    <p className="text-xs text-[#8A8880]">{t('greetingHint')}</p>
                    {([
                      { locale: 'tr' as const, label: 'Türkçe', placeholder: 'Örn: Merhaba, ben Saule. Size nasıl yardımcı olabilirim?' },
                      { locale: 'en' as const, label: 'English', placeholder: "e.g. Hi, I'm Saule. How can I help you?" },
                      { locale: 'ru' as const, label: 'Русский', placeholder: 'Напр.: Привет, я Saule. Чем могу помочь?' },
                    ]).map(({ locale: greetingLocale, label, placeholder }) => (
                      <div key={greetingLocale}>
                        <label className="block text-xs font-semibold text-[#8A8880] mb-1 font-mono uppercase tracking-wider">{label}</label>
                        <textarea
                          value={settings.customGreeting?.[greetingLocale] || ''}
                          onChange={(e) => setSettings({ ...settings, customGreeting: { ...settings.customGreeting, [greetingLocale]: e.target.value } })}
                          placeholder={placeholder}
                          className="w-full p-3 rounded-lg border border-[rgba(20,35,31,0.10)] focus:outline-none focus:border-[#FF6A5C] text-sm text-[#14231F]"
                          rows={2}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <KnowledgeBasePanel businessId={business.id} initialKnowledge={initialKnowledge} />

              {/* Save Button */}
              <div className="pt-6 border-t border-[rgba(20,35,31,0.10)] flex items-center justify-between">
                {showToast ? (
                  <span className="text-sm font-medium text-green-600 flex items-center"><CheckCircle2 className="w-4 h-4 mr-1" /> {t('settingsSavedToast')}</span>
                ) : <span />}
                <button
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="bg-[#FF6A5C] text-white px-8 py-3 rounded-full font-bold text-sm hover:bg-orange-600 transition shadow-md disabled:opacity-50 flex items-center"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {t('saveSettingsBtn')}
                </button>
              </div>
            </div>
          </div>
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
    </div>
  );
}
