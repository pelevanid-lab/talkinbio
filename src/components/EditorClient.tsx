'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, Plus, Edit2, Copy, ExternalLink, Smartphone, X, MessageSquare, Settings2, Send } from 'lucide-react';
import ArchetypeRenderer from './ArchetypeRenderer';
import BlockEditorModal from './BlockEditorModal';
import SetPasswordModal from './SetPasswordModal';
import { useChat } from '@ai-sdk/react';
import { useTranslations, useLocale } from 'next-intl';

export default function EditorClient({ business, initialBlocks }: { business: any, initialBlocks: any[] }) {
  const [blocks, setBlocks] = useState(initialBlocks);
  const [editingBlock, setEditingBlock] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [viewMode, setViewMode] = useState<'chat' | 'manual'>('chat');
  const supabase = createClient();
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const t = useTranslations('Editor');
  const locale = useLocale();

  // Setup AI Agent
  const { messages, input, handleInputChange, handleSubmit, isLoading: isChatLoading } = useChat({
    api: '/api/setup-agent',
    body: { businessId: business.id, locale },
    initialMessages: [
      { id: '1', role: 'assistant', content: t('aiWelcome', { name: business.name }) }
    ]
  });

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Polling to refresh blocks if they change via AI tool calls
  useEffect(() => {
    if (viewMode !== 'chat') return; // only poll if in chat
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('blocks')
        .select('*')
        .eq('business_id', business.id)
        .order('order', { ascending: true });
      if (data) {
        setBlocks(data);
      }
      
      // Also refresh business to get archetype updates
      const { data: bData } = await supabase.from('businesses').select('archetype_id').eq('id', business.id).single();
      if (bData && bData.archetype_id !== business.archetype_id) {
        business.archetype_id = bData.archetype_id;
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [business.id, supabase, viewMode]);

  // 70% threshold calculation
  const completeness = useMemo(() => {
    let score = 0;
    const hasAbout = blocks.some(b => b.type === 'about' && b.content?.text?.length > 10);
    const hasServices = blocks.some(b => b.type === 'services' && b.content?.items?.length > 0);
    const hasFAQ = blocks.some(b => b.type === 'faq' && b.content?.items?.length > 0);
    const hasHours = blocks.some(b => b.type === 'hours');
    const hasContact = blocks.some(b => b.type === 'contact' && b.content?.text?.length > 5);

    if (hasAbout) score += 30;
    if (hasServices) score += 30;
    if (hasFAQ) score += 20;
    if (hasHours) score += 10;
    if (hasContact) score += 10;
    
    return score;
  }, [blocks]);

  const isPublished = completeness >= 70;

  const syncPublishStatus = async (published: boolean) => {
    if (business.is_published !== published) {
      await supabase.from('businesses').update({ is_published: published }).eq('id', business.id);
      business.is_published = published;
    }
  };
  
  if (isPublished !== business.is_published) {
    syncPublishStatus(isPublished);
  }

  const handleSaveBlock = async (data: { title: string, content: any }) => {
    setIsSaving(true);
    try {
      if (editingBlock.isNew) {
        const { data: newBlock, error } = await supabase.from('blocks').insert({
          business_id: business.id,
          type: editingBlock.type,
          title: data.title,
          content: data.content,
          order: blocks.length,
          is_visible: true
        }).select().single();
        
        if (error) throw error;
        setBlocks([...blocks, newBlock]);
      } else {
        const { error } = await supabase.from('blocks').update({
          title: data.title,
          content: data.content
        }).eq('id', editingBlock.id);
        
        if (error) throw error;
        setBlocks(blocks.map(b => b.id === editingBlock.id ? { ...b, title: data.title, content: data.content } : b));
      }
    } catch (err) {
      console.error(err);
      alert('Kaydedilirken hata oluştu.');
    } finally {
      setIsSaving(false);
      setEditingBlock(null);
    }
  };

  const handleDeleteBlock = async () => {
    if (editingBlock.isNew) {
      setEditingBlock(null);
      return;
    }
    setIsSaving(true);
    try {
      await supabase.from('blocks').delete().eq('id', editingBlock.id);
      setBlocks(blocks.filter(b => b.id !== editingBlock.id));
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
      setEditingBlock(null);
    }
  };

  const createNewBlock = (type: string, defaultTitle: string) => {
    setEditingBlock({ isNew: true, type, title: defaultTitle, content: {} });
  };

  const copyLink = () => {
    if (!isPublished) return;
    const url = `${window.location.origin}/${business.username}`;
    navigator.clipboard.writeText(url);
    alert('Link kopyalandı!');
  };

  return (
    <div className="flex h-[100dvh]">
      {/* Left Sidebar */}
      <div className="w-full md:w-[450px] bg-white border-r border-slate-200 flex flex-col h-full z-10 shrink-0">
        <div className="p-4 md:p-6 border-b border-slate-200 bg-white">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-bold font-bricolage text-[var(--ink)]">{t('panelTitle')}</h1>
            <button 
              className="md:hidden p-2 bg-[var(--coral-tint)] text-[var(--coral)] rounded-lg font-medium text-sm flex items-center"
              onClick={() => setShowMobilePreview(true)}
            >
              <Smartphone className="w-4 h-4 mr-1" /> {t('previewBtn')}
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button 
              onClick={() => setViewMode('chat')}
              className={`flex-1 flex items-center justify-center py-2 text-sm font-medium rounded-md transition ${viewMode === 'chat' ? 'bg-white shadow text-[var(--ink)]' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              {t('tabAgent')}
            </button>
            <button 
              onClick={() => setViewMode('manual')}
              className={`flex-1 flex items-center justify-center py-2 text-sm font-medium rounded-md transition ${viewMode === 'manual' ? 'bg-white shadow text-[var(--ink)]' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Settings2 className="w-4 h-4 mr-2" />
              {t('tabManual')}
            </button>
          </div>
        </div>

        {/* Progress Bar (Always visible) */}
        <div className="px-4 md:px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-semibold text-sm text-[var(--ink)]">{t('publishStatus')}</h2>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isPublished ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
              {isPublished ? t('published') : t('draft')}
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5 mb-1">
            <div className={`h-1.5 rounded-full ${isPublished ? 'bg-green-500' : 'bg-[var(--coral)]'}`} style={{ width: `${Math.min(completeness, 100)}%` }}></div>
          </div>
          <p className="text-[11px] text-[var(--ink-soft)] flex justify-between">
            <span>{t('completeness', { score: completeness })}</span>
            {isPublished && (
              <button onClick={copyLink} className="text-[var(--teal)] font-medium flex items-center">
                <Copy className="w-3 h-3 mr-1" /> {t('linkBtn')}
              </button>
            )}
          </p>
        </div>
        
        {/* Main Left Content */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50">
          {viewMode === 'chat' ? (
            <div className="flex flex-col h-full relative">
              <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
                {messages.map((m, idx) => (
                  <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${m.role === 'user' ? 'bg-[var(--ink)] text-white' : 'bg-white border border-slate-200 text-slate-800 shadow-sm'}`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-100"></div>
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-200"></div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent">
                <form onSubmit={handleSubmit} className="relative">
                  <input
                    value={input}
                    onChange={handleInputChange}
                    placeholder={t('agentInputPlaceholder')}
                    className="w-full bg-white border border-slate-300 rounded-full pl-5 pr-12 py-3 text-sm focus:outline-none focus:border-[var(--coral)] focus:ring-1 focus:ring-[var(--coral)] shadow-sm"
                  />
                  <button type="submit" disabled={!input.trim() || isChatLoading} className="absolute right-2 top-1.5 p-1.5 bg-[var(--coral)] text-white rounded-full disabled:opacity-50 transition-opacity">
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="p-4 md:p-6 space-y-4 pb-20">
              <h3 className="font-medium text-[var(--ink)]">{t('manualTitle')}</h3>
              <p className="text-xs text-slate-500 mb-4">{t('manualDesc')}</p>
              
              {blocks.length === 0 && <p className="text-sm text-slate-500">{t('noContent')}</p>}
              {blocks.map(b => (
                <div 
                  key={b.id} 
                  onClick={() => setEditingBlock(b)}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 hover:border-[var(--coral)] transition cursor-pointer shadow-sm group"
                >
                  <div>
                    <span className="font-medium text-sm text-[var(--ink)] block group-hover:text-[var(--coral)] transition-colors">
                      {t(`blocks.${b.type}`)}
                    </span>
                    <span className="text-xs text-[var(--ink-soft)] capitalize">{b.type}</span>
                  </div>
                  <button className="text-[var(--teal)] group-hover:bg-[var(--coral-tint)] group-hover:text-[var(--coral)] p-2 rounded transition">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <div className="pt-4 border-t border-slate-200 mt-6">
                <h4 className="text-sm font-medium text-[var(--ink-soft)] mb-3">{t('newSection')}</h4>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => createNewBlock('about', t('blocks.about'))} className="py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium hover:bg-slate-50 shadow-sm">{t('blocks.about')}</button>
                  <button onClick={() => createNewBlock('services', t('blocks.services'))} className="py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium hover:bg-slate-50 shadow-sm">{t('blocks.services')}</button>
                  <button onClick={() => createNewBlock('faq', t('blocks.faq'))} className="py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium hover:bg-slate-50 shadow-sm">{t('blocks.faq')}</button>
                  <button onClick={() => createNewBlock('hours', t('blocks.hours'))} className="py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium hover:bg-slate-50 shadow-sm">{t('blocks.hours')}</button>
                  <button onClick={() => createNewBlock('contact', t('blocks.contact'))} className="py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium hover:bg-slate-50 shadow-sm">{t('blocks.contact')}</button>
                  <button onClick={() => createNewBlock('custom', t('blocks.custom'))} className="py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium hover:bg-slate-50 shadow-sm">{t('blocks.custom')}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Area: Live Preview */}
      <div className={`
        ${showMobilePreview ? 'fixed inset-0 z-[150] bg-slate-100 flex items-center pt-8' : 'hidden'} 
        md:relative md:flex flex-1 bg-slate-100 justify-center overflow-y-auto
      `}>
        {showMobilePreview && (
          <button 
            className="absolute top-4 right-4 z-[200] p-2 bg-white rounded-full shadow-lg text-slate-600 md:hidden"
            onClick={() => setShowMobilePreview(false)}
          >
            <X className="w-6 h-6" />
          </button>
        )}
        <div className="my-10 w-full max-w-[390px] rounded-[3rem] border-[12px] border-slate-800 bg-white shadow-2xl overflow-hidden flex flex-col relative h-[800px] shrink-0 mx-auto">
          
          {/* Mockup Notch */}
          <div className="absolute top-0 inset-x-0 h-6 flex justify-center z-50">
            <div className="w-32 h-6 bg-slate-800 rounded-b-xl"></div>
          </div>

          {/* Top 70% Content Area */}
          <div className="flex-1 overflow-y-auto pb-[30%] relative">
            {/* Compact Header */}
            <div className="w-full pt-12 pb-4 px-4 flex justify-between items-center z-10 relative">
              <div></div>
              <div className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center text-[10px] text-slate-500 font-medium bg-white/50 backdrop-blur-sm shadow-sm">TR</div>
            </div>

            {/* Blocks (Archetype Preview) */}
            <div className="w-full -mt-20">
              <ArchetypeRenderer 
                blocks={blocks} 
                archetypeId={business.archetype_id || 'minimal-light'} 
                businessName={business.name}
              />
              {blocks.length === 0 && (
                <div className="text-center p-6 mx-4 mt-24 bg-white rounded-2xl shadow-sm border border-slate-100 text-slate-400 text-sm">
                  {t('previewEmpty')}
                </div>
              )}
            </div>
          </div>

          {/* Bottom 30% Chat Mockup */}
          <div className="absolute bottom-0 left-0 right-0 h-[30%] bg-transparent flex flex-col justify-end p-4 z-50 pointer-events-none">
            <div className="w-full bg-white border border-[var(--border-light)] rounded-2xl shadow-lg p-4 flex items-center justify-between mb-4 transform transition pointer-events-auto">
              <div className="flex items-center space-x-3 overflow-hidden">
                <div className="w-10 h-10 bg-[var(--coral-tint)] rounded-full flex items-center justify-center text-[var(--coral)] flex-shrink-0">
                  <div className="w-5 h-5 bg-[var(--coral)] rounded-full" />
                </div>
                <div className="truncate">
                  <p className="text-xs text-[var(--teal)] font-medium mb-0.5">{business.name} {t('assistantSuffix')}</p>
                  <p className="text-sm text-[var(--ink)] truncate">{t('assistantGreeting')}</p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-[var(--paper)] flex items-center justify-center flex-shrink-0 text-[var(--ink-soft)]">
                <div className="w-4 h-4 bg-[var(--ink-soft)] rounded-full" />
              </div>
            </div>
            
            <div className="w-full pl-4 pr-12 py-3.5 bg-[var(--paper)] border border-[var(--border-light)] rounded-full text-sm text-[var(--muted)] relative pointer-events-auto">
              {t('chatPlaceholder')}
              <div className="absolute right-1.5 top-1 w-10 h-10 bg-[var(--coral)] rounded-full flex items-center justify-center">
                <div className="w-3 h-3 border-t-2 border-r-2 border-white transform rotate-45 mr-1" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {editingBlock && (
        <BlockEditorModal 
          block={editingBlock} 
          onClose={() => setEditingBlock(null)} 
          onSave={handleSaveBlock}
          onDelete={handleDeleteBlock}
        />
      )}
      {isSaving && (
        <div className="fixed inset-0 bg-white/50 backdrop-blur-sm z-[200] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[var(--coral)] animate-spin" />
        </div>
      )}
      <SetPasswordModal hasPassword={business.has_password || false} businessId={business.id} />
    </div>
  );
}
