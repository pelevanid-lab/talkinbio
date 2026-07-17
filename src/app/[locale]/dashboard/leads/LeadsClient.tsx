'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { CheckCircle2, Clock, Phone, User as UserIcon, Settings, Inbox, Loader2, Send, MessageCircle } from 'lucide-react';
import ConversationsPanel from './ConversationsPanel';
import KnowledgeBasePanel from './KnowledgeBasePanel';

export default function LeadsClient({ business, initialLeads, initialConversations, initialKnowledge }: { business: any, initialLeads: any[], initialConversations: any[], initialKnowledge: any[] }) {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<'leads' | 'conversations' | 'settings'>('leads');
  const [leads, setLeads] = useState(initialLeads);
  const [conversations] = useState(initialConversations);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  
  // Settings state
  const [settings, setSettings] = useState(business.saule_settings || {});
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);

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

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase.from('businesses').update({ saule_settings: settings }).eq('id', business.id);
      if (error) throw error;
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Ayarlar kaydedilirken hata oluştu.');
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
            <h1 className="text-xl font-[800] tracking-[-0.02em] text-[#14231F]">Talepler & Asistan</h1>
            <p className="text-sm text-[#4B5A55] font-['Inter']">{business.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-[#F4F2ED] p-1 rounded-full border border-[rgba(20,35,31,0.10)]">
              <button
                onClick={() => setActiveTab('leads')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTab === 'leads' ? 'bg-white text-[#14231F] shadow-sm' : 'text-[#8A8880] hover:text-[#4B5A55]'}`}
              >
                <Inbox className="w-4 h-4" /> Talepler
              </button>
              <button
                onClick={() => setActiveTab('conversations')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTab === 'conversations' ? 'bg-white text-[#14231F] shadow-sm' : 'text-[#8A8880] hover:text-[#4B5A55]'}`}
              >
                <MessageCircle className="w-4 h-4" /> Konuşmalar
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-white text-[#14231F] shadow-sm' : 'text-[#8A8880] hover:text-[#4B5A55]'}`}
              >
                <Settings className="w-4 h-4" /> Saule Ayarları
              </button>
            </div>
            <a href="/dashboard/editor" className="text-sm text-[#14231F] font-medium bg-[#F4F2ED] px-4 py-2 rounded-full hover:bg-[rgba(20,35,31,0.08)] transition whitespace-nowrap">
              Editör
            </a>
            <a href={`/${business.username}`} className="text-sm text-[#FF6A5C] font-medium bg-[#FFEDE9] px-4 py-2 rounded-full hover:bg-orange-100 transition whitespace-nowrap">
              Profilimi Gör
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-['Inter']">
        {activeTab === 'leads' ? (
          !leads || leads.length === 0 ? (
            <div className="bg-white border border-[rgba(20,35,31,0.10)] rounded-[20px] p-12 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-[#F4F2ED] rounded-full flex items-center justify-center text-[#8A8880] mb-4">
                <UserIcon className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-[800] text-[#14231F] mb-2 font-['Bricolage_Grotesque']">Henüz hiç talep almadınız</h2>
              <p className="text-[#4B5A55] max-w-sm">Ziyaretçileriniz asistanınız Saule ile konuşup bir hizmet talep ettiğinde burada görünecekler.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {leads.map((lead: any) => (
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
                          {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: tr })}
                        </div>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                      lead.status === 'new' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                      lead.status === 'seen' ? 'bg-[#FFEDE9] text-[#FF6A5C] border-[#FFEDE9]' :
                      'bg-green-50 text-green-700 border-green-200'
                    }`}>
                      {lead.status === 'new' ? 'Yeni' : lead.status === 'seen' ? 'İncelendi' : 'Tamamlandı'}
                    </span>
                  </div>
                  
                  <div className="bg-[#F4F2ED] rounded-xl p-4 mb-4">
                    <p className="text-[#4B5A55] text-sm">{lead.summary}</p>
                    {lead.preferred_datetime && (
                      <p className="text-[#14231F] text-xs font-medium mt-2 flex items-center">
                        <Clock className="w-3.5 h-3.5 mr-1.5" /> Tercih edilen zaman: {lead.preferred_datetime}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between border-t border-[rgba(20,35,31,0.10)] pt-4">
                    <div className="flex items-center gap-4">
                      {lead.source_username && (
                        <a href={`https://ig.me/m/${lead.source_username.replace('@', '')}`} target="_blank" rel="noreferrer" className="flex items-center text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 rounded-full hover:opacity-90 transition shadow-sm">
                          <Send className="w-4 h-4 mr-1.5" />
                          Mesaj At
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
                          <MessageCircle className="w-4 h-4 mr-1.5" /> Konuşmayı Gör
                        </button>
                      )}
                      {lead.status === 'new' ? (
                        <button onClick={() => handleMarkSeen(lead.id)} className="text-sm font-medium text-white bg-[#FF6A5C] px-4 py-2 rounded-full hover:bg-orange-600 transition flex items-center shadow-sm">
                          <CheckCircle2 className="w-4 h-4 mr-1.5" />
                          İşaretle
                        </button>
                      ) : (
                        <div className="flex items-center text-sm text-[#8A8880]">
                          <CheckCircle2 className="w-4 h-4 mr-1.5" /> İncelendi
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : activeTab === 'conversations' ? (
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
                <p className="text-sm text-[#4B5A55]">Dijital Ön Masa Asistanınız</p>
              </div>
            </div>

            <div className="space-y-8">
              {/* Tone */}
              <div>
                <h3 className="text-sm font-bold text-[#14231F] mb-3 uppercase tracking-wider font-mono">Kişilik & Ton</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(['friendly', 'formal', 'energetic'] as const).map(tone => (
                    <button
                      key={tone}
                      onClick={() => setSettings({ ...settings, personalityTone: tone })}
                      className={`p-4 rounded-xl border text-left transition-all ${settings.personalityTone === tone || (!settings.personalityTone && tone === 'friendly') ? 'border-[#FF6A5C] bg-[#FFEDE9] ring-1 ring-[#FF6A5C]' : 'border-[rgba(20,35,31,0.10)] hover:bg-[#F4F2ED]'}`}
                    >
                      <div className="font-semibold text-[#14231F] mb-1">
                        {tone === 'friendly' ? 'Sıcak & Samimi' : tone === 'formal' ? 'Resmi & Profesyonel' : 'Enerjik'}
                      </div>
                      <div className="text-xs text-[#4B5A55]">
                        {tone === 'friendly' ? 'Ziyaretçilerle arkadaş canlısı konuşur.' : tone === 'formal' ? 'Daha ciddi ve mesafeli bir dil kullanır.' : 'Heyecanlı ve pozitif bir yaklaşım sergiler.'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Lead Capture */}
              <div className="flex items-center justify-between py-4 border-t border-[rgba(20,35,31,0.10)]">
                <div>
                  <h3 className="text-base font-semibold text-[#14231F]">Lead Yakalama</h3>
                  <p className="text-sm text-[#4B5A55]">Ziyaretçilerden iletişim bilgisi istesin mi?</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={settings.leadCaptureEnabled !== false} onChange={(e) => setSettings({ ...settings, leadCaptureEnabled: e.target.checked })} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF6A5C]"></div>
                </label>
              </div>

              {/* Appointments */}
              <div className="py-4 border-t border-[rgba(20,35,31,0.10)]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-semibold text-[#14231F]">Randevu Akışı</h3>
                    <p className="text-sm text-[#4B5A55]">Randevu/rezervasyon talebi alsın mı?</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={settings.appointmentEnabled === true} onChange={(e) => setSettings({ ...settings, appointmentEnabled: e.target.checked })} />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF6A5C]"></div>
                  </label>
                </div>
                {settings.appointmentEnabled && (
                  <div className="bg-[#F4F2ED] p-4 rounded-xl mt-2 animate-in fade-in slide-in-from-top-2">
                    <label className="block text-sm font-semibold text-[#14231F] mb-2 font-mono uppercase text-xs tracking-wider">Randevu Talimatı</label>
                    <textarea
                      value={settings.appointmentInstructions || ''}
                      onChange={(e) => setSettings({ ...settings, appointmentInstructions: e.target.value })}
                      placeholder="Örn: Hangi gün ve saatte gelmek istediklerini sor."
                      className="w-full p-3 rounded-lg border border-[rgba(20,35,31,0.10)] focus:outline-none focus:border-[#FF6A5C] text-sm text-[#14231F]"
                      rows={3}
                    />
                    <p className="text-xs text-[#8A8880] mt-2">Bu özellik şu an "Talepler" sekmesine lead kaydı oluşturur. Takvim entegrasyonu yakında eklenecektir.</p>
                  </div>
                )}
              </div>

              {/* Custom Greeting */}
              <div className="py-4 border-t border-[rgba(20,35,31,0.10)]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-semibold text-[#14231F]">Özel Karşılama</h3>
                    <p className="text-sm text-[#4B5A55]">İlk mesajı siz belirleyin.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={!!settings.customGreetingEnabled} onChange={(e) => setSettings({ ...settings, customGreetingEnabled: e.target.checked })} />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF6A5C]"></div>
                  </label>
                </div>
                {settings.customGreetingEnabled && (
                  <div className="bg-[#F4F2ED] p-4 rounded-xl animate-in fade-in slide-in-from-top-2">
                    <textarea
                      value={settings.customGreeting || ''}
                      onChange={(e) => setSettings({ ...settings, customGreeting: e.target.value })}
                      placeholder="Örn: Merhaba, ben Saule. Size nasıl yardımcı olabilirim?"
                      className="w-full p-3 rounded-lg border border-[rgba(20,35,31,0.10)] focus:outline-none focus:border-[#FF6A5C] text-sm text-[#14231F]"
                      rows={2}
                    />
                  </div>
                )}
              </div>

              <KnowledgeBasePanel businessId={business.id} initialKnowledge={initialKnowledge} />

              {/* Save Button */}
              <div className="pt-6 border-t border-[rgba(20,35,31,0.10)] flex items-center justify-between">
                {showToast ? (
                  <span className="text-sm font-medium text-green-600 flex items-center"><CheckCircle2 className="w-4 h-4 mr-1" /> Ayarlar kaydedildi</span>
                ) : <span />}
                <button
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="bg-[#FF6A5C] text-white px-8 py-3 rounded-full font-bold text-sm hover:bg-orange-600 transition shadow-md disabled:opacity-50 flex items-center"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Ayarları Kaydet
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
