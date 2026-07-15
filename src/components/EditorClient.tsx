'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, Plus, Edit2, Copy, ExternalLink, Smartphone, X, MessageSquare, Settings2, Send, Paperclip, CheckCircle2, Circle, GripVertical } from 'lucide-react';
import ArchetypeRenderer from './ArchetypeRenderer';
import BlockEditorModal from './BlockEditorModal';
import SetPasswordModal from './SetPasswordModal';
import LanguageSwitcher from './LanguageSwitcher';
import { useChat } from '@ai-sdk/react';
import { useTranslations, useLocale } from 'next-intl';
import { RECOMMENDED_TYPES, hasRealContent, isRequiredSatisfied } from '@/config/blockTypes';
import { DEFAULT_THEME, Theme } from '@/config/archetypes';
import { googleFontsHref } from '@/utils/googleFonts';

export default function EditorClient({ business, initialBlocks, initialChatMessages }: { business: any, initialBlocks: any[], initialChatMessages?: any[] }) {
  const [blocks, setBlocks] = useState(initialBlocks);
  const [theme, setTheme] = useState<Theme>(business.theme || DEFAULT_THEME);
  const [editingBlock, setEditingBlock] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [viewMode, setViewMode] = useState<'chat' | 'manual' | 'bulk'>('chat');
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [username, setUsername] = useState(business.username);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [isPublished, setIsPublished] = useState<boolean>(business.is_published || false);
  const [isTogglingPublish, setIsTogglingPublish] = useState(false);
  const [contactValue, setContactValue] = useState<string | null>(business.contact_value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const t = useTranslations('Editor');
  const locale = useLocale();

  const hasContactValue = useMemo(() => {
    try {
      const parsed = contactValue ? JSON.parse(contactValue) : {};
      return Object.values(parsed).some((v) => typeof v === 'string' && v.trim().length > 0);
    } catch {
      return false;
    }
  }, [contactValue]);

  const findBlock = (type: string) => blocks.find(b => b.type === type);

  const checklist = useMemo(() => ({
    contentReady: hasRealContent(findBlock('about')) || hasRealContent(findBlock('services')),
    contact: hasContactValue,
    recommended: RECOMMENDED_TYPES.map((type) => ({ type, done: hasRealContent(findBlock(type)) })),
  }), [blocks, hasContactValue]);

  const canPublish = useMemo(() => isRequiredSatisfied(blocks, hasContactValue), [blocks, hasContactValue]);

  // Setup AI Agent — resumes from the persisted setup_messages history when there is one,
  // so returning to this tab (or reloading the page) doesn't lose the conversation's context.
  const { messages, input, handleInputChange, handleSubmit, isLoading: isChatLoading, append } = useChat({
    api: '/api/setup-agent',
    body: { businessId: business.id, locale },
    initialMessages: initialChatMessages && initialChatMessages.length > 0
      ? initialChatMessages.map((m) => ({ id: m.id, role: m.role, content: m.content }))
      : [{ id: '1', role: 'assistant', content: t('aiWelcome', { name: business.name }) }]
  });

  // Inject the AI-chosen Google Font pair (dynamic per business, so it can't be a static <link> in <head>).
  useEffect(() => {
    const linkId = 'tb-editor-google-fonts';
    let link = document.getElementById(linkId) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    link.href = googleFontsHref(theme.headingFont, theme.bodyFont);
  }, [theme.headingFont, theme.bodyFont]);

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingMedia(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      
      const { error } = await supabase.storage.from('media').upload(fileName, file, { cacheControl: '3600' });
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);
      
      append({
        role: 'user',
        content: `[Kullanıcı sisteme bir medya yükledi: ${publicUrl}]`
      });

    } catch (err: any) {
      alert("Dosya yüklenirken hata oluştu: " + err.message);
    } finally {
      setIsUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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
      
      // Also refresh business to get theme/contact updates made by the AI agent
      const { data: bData } = await supabase.from('businesses').select('theme, contact_value').eq('id', business.id).single();
      if (bData) {
        if (bData.theme && JSON.stringify(bData.theme) !== JSON.stringify(theme)) {
          setTheme(bData.theme);
        }
        if (bData.contact_value !== contactValue) {
          setContactValue(bData.contact_value);
        }
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [business.id, supabase, viewMode, contactValue, theme]);

  const handleTogglePublish = async () => {
    const next = !isPublished;
    setIsTogglingPublish(true);
    try {
      const { error } = await supabase.from('businesses').update({ is_published: next }).eq('id', business.id);
      if (error) throw error;
      setIsPublished(next);
      business.is_published = next;
    } catch (err) {
      console.error(err);
      alert('Yayın durumu güncellenirken hata oluştu.');
    } finally {
      setIsTogglingPublish(false);
    }
  };

  const handleSaveBlock = async (data: { title: string, content: any }) => {
    setIsSaving(true);
    try {
      if (editingBlock.isNew) {
        const nextOrder = blocks.reduce((max, b) => Math.max(max, b.order ?? 0), 0) + 1;
        const { data: newBlock, error } = await supabase.from('blocks').insert({
          business_id: business.id,
          type: editingBlock.type,
          title: data.title,
          content: data.content,
          order: nextOrder,
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

  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);

  const handleDropReorder = async (overId: string) => {
    const fromId = draggedBlockId;
    setDraggedBlockId(null);
    if (!fromId || fromId === overId) return;

    const visible = blocks.filter(b => b.type !== 'settings');
    const others = blocks.filter(b => b.type === 'settings');
    const fromIdx = visible.findIndex(b => b.id === fromId);
    const toIdx = visible.findIndex(b => b.id === overId);
    if (fromIdx === -1 || toIdx === -1) return;

    const reordered = [...visible];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const withNewOrder = reordered.map((b, idx) => ({ ...b, order: idx }));

    setBlocks([...withNewOrder, ...others]);
    await Promise.all(withNewOrder.map((b) => supabase.from('blocks').update({ order: b.order }).eq('id', b.id)));
  };

  const copyLink = () => {
    if (!isPublished) return;
    const url = `${window.location.origin}/${username}`;
    navigator.clipboard.writeText(url);
    alert('Link kopyalandı!');
  };

  const handleUsernameSave = async () => {
    if (username === business.username) {
      setIsEditingUsername(false);
      return;
    }
    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!cleanUsername) {
      setUsernameError('Geçersiz kullanıcı adı');
      return;
    }
    
    const { data: existing } = await supabase.from('businesses').select('id').eq('username', cleanUsername).neq('id', business.id).single();
    if (existing) {
      setUsernameError('Bu bağlantı zaten alınmış');
      return;
    }
    
    const { error } = await supabase.from('businesses').update({ username: cleanUsername }).eq('id', business.id);
    if (error) {
      setUsernameError('Kaydedilirken hata oluştu');
    } else {
      business.username = cleanUsername;
      setUsername(cleanUsername);
      setIsEditingUsername(false);
      setUsernameError('');
    }
  };

  const handleBulkSubmit = () => {
    if (!bulkText.trim()) return;
    append({
      role: 'user',
      content: `[BULK]\nİşte işletmemle ilgili tüm detaylar. Lütfen soru sormak yerine, elindeki bütün bilgiyi analiz et ve eksik olan tüm blokları (Hakkımda, Hizmetler vb.) arka arkaya araçları çağırarak tek seferde oluştur:\n\n${bulkText}`
    });
    setBulkText('');
    setViewMode('chat');
  };

  return (
    <div className="flex h-[100dvh]">
      {/* Left Sidebar */}
      <div className="w-full md:w-[450px] bg-white border-r border-slate-200 flex flex-col h-full z-10 shrink-0">
        <div className="p-4 md:p-6 border-b border-slate-200 bg-white">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold font-bricolage text-[var(--ink)]">{t('panelTitle')}</h1>
              <LanguageSwitcher />
            </div>
            <button 
              className="md:hidden p-2 bg-[var(--coral-tint)] text-[var(--coral)] rounded-lg font-medium text-sm flex items-center"
              onClick={() => setShowMobilePreview(true)}
            >
              <Smartphone className="w-4 h-4 mr-1" /> {t('previewBtn')}
            </button>
          </div>

          {/* Mode Switcher */}
            <div className="flex justify-between items-center bg-white p-2 rounded-xl shadow-sm border border-slate-200 gap-1">
              <button 
                onClick={() => setViewMode('chat')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'chat' ? 'bg-slate-100 text-[var(--ink)] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {t('tabAgent')}
              </button>
              <button 
                onClick={() => setViewMode('bulk')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'bulk' ? 'bg-slate-100 text-[var(--ink)] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {t('tabBulk')}
              </button>
              <button 
                onClick={() => setViewMode('manual')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'manual' ? 'bg-slate-100 text-[var(--ink)] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {t('tabManual')}
              </button>
            </div>

            {/* Public Link Display */}
            <div className="mt-4 bg-slate-50 rounded-xl p-3 border border-slate-200">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-slate-500">{t('profileLink')}</span>
                {isEditingUsername ? (
                  <button onClick={handleUsernameSave} className="text-xs font-bold text-[var(--teal)] hover:text-teal-700">{t('saveBtn')}</button>
                ) : (
                  <div className="flex items-center space-x-3">
                    <button onClick={() => setIsEditingUsername(true)} className="text-xs font-medium text-slate-500 hover:text-[var(--coral)] flex items-center">
                      <Edit2 className="w-3 h-3 mr-1" /> {t('editBtn')}
                    </button>
                    {isPublished && (
                      <a 
                        href={`https://talkinbio.com/${username}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-[var(--coral)] hover:text-orange-600 flex items-center"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" /> Aç
                      </a>
                    )}
                  </div>
                )}
              </div>
              
              {isEditingUsername ? (
                <div>
                  <div className="flex items-center bg-white border border-slate-300 rounded-lg overflow-hidden focus-within:border-[var(--coral)]">
                    <span className="px-2 py-2 text-sm text-slate-400 bg-slate-50 border-r border-slate-200">talkinbio.com/</span>
                    <input 
                      type="text" 
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      className="w-full p-2 text-sm focus:outline-none"
                    />
                  </div>
                  {usernameError && <p className="text-xs text-red-500 mt-1">{usernameError}</p>}
                </div>
              ) : (
                <div className="flex items-center text-sm font-medium text-[var(--ink)]">
                  talkinbio.com/<span className="text-[var(--coral)]">{username}</span>
                </div>
              )}
            </div>
        </div>

        {/* Publish Checklist (Always visible) */}
        <div className="px-4 md:px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-semibold text-sm text-[var(--ink)]">{t('publishStatus')}</h2>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isPublished ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
              {isPublished ? t('published') : t('draft')}
            </span>
          </div>

          <ul className="space-y-1 mb-3">
            <li className={`text-xs flex items-center ${checklist.contentReady ? 'text-green-600' : 'text-[var(--ink-soft)]'}`}>
              {checklist.contentReady ? <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 shrink-0" /> : <Circle className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
              {t('blocks.about')} / {t('blocks.services')}
            </li>
            <li className={`text-xs flex items-center ${checklist.contact ? 'text-green-600' : 'text-[var(--ink-soft)]'}`}>
              {checklist.contact ? <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 shrink-0" /> : <Circle className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
              {t('blocks.contact')}
            </li>
            {checklist.recommended.map(({ type, done }) => (
              <li key={type} className={`text-xs flex items-center ${done ? 'text-green-600' : 'text-[var(--ink-soft)] opacity-70'}`}>
                {done ? <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 shrink-0" /> : <Circle className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
                {t(`blocks.${type}`)} <span className="ml-1 text-[10px] opacity-70">({t('optionalHint')})</span>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTogglePublish}
              disabled={(!canPublish && !isPublished) || isTogglingPublish}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isPublished ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-[var(--coral)] text-white hover:bg-orange-600'}`}
            >
              {isTogglingPublish ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (isPublished ? t('unpublishBtn') : t('publishBtn'))}
            </button>
            {isPublished && (
              <button onClick={copyLink} className="text-[var(--teal)] font-medium flex items-center text-xs px-3 py-2">
                <Copy className="w-3 h-3 mr-1" /> {t('linkBtn')}
              </button>
            )}
          </div>
          {!canPublish && !isPublished && (
            <p className="text-[11px] text-[var(--ink-soft)] mt-2">{t('publishHint')}</p>
          )}
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

              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent">
                <form onSubmit={handleSubmit} className="relative flex items-end">
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingMedia || isChatLoading} 
                    className="absolute left-3 bottom-2 p-1.5 text-slate-400 hover:text-[var(--coral)] rounded-full disabled:opacity-50 transition-colors z-10"
                  >
                    {isUploadingMedia ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleMediaUpload} accept="image/*,video/*" className="hidden" />
                  
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
                        if (input.trim() && !isChatLoading) {
                          e.currentTarget.form?.requestSubmit();
                        }
                      }
                    }}
                    rows={1}
                    placeholder={t('agentInputPlaceholder')}
                    className="w-full bg-white border border-slate-300 rounded-3xl pl-12 pr-12 py-3 text-sm focus:outline-none focus:border-[var(--coral)] focus:ring-1 focus:ring-[var(--coral)] shadow-sm resize-none overflow-hidden min-h-[46px] max-h-[150px]"
                    style={{ maxHeight: '150px' }}
                  />
                  <button type="submit" disabled={!input.trim() || isChatLoading} className="absolute right-2 bottom-1.5 p-2 bg-[var(--coral)] text-white rounded-full disabled:opacity-50 transition-opacity">
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          ) : viewMode === 'bulk' ? (
            <div className="p-4 md:p-6 space-y-4 pb-20 flex flex-col h-full overflow-y-auto">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col">
                <h3 className="text-sm font-bold text-[var(--ink)] mb-2">{t('bulkTitle')}</h3>
                <p className="text-xs text-slate-500 mb-4">
                  {t('bulkDesc')}
                </p>
                <textarea 
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={t('bulkPlaceholder')}
                  className="w-full flex-1 min-h-[200px] p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[var(--coral)] resize-none"
                ></textarea>
                <button 
                  onClick={handleBulkSubmit}
                  disabled={!bulkText.trim() || isChatLoading}
                  className="mt-4 w-full py-3 bg-[var(--coral)] text-white rounded-lg font-bold hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {isChatLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('bulkSubmitBtn')}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 md:p-6 space-y-4 pb-20">
              <div className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-sm font-bold text-[var(--ink)] mb-3">{t('pageLayout')}</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={async () => {
                      const settingsBlock = blocks.find(b => b.type === 'settings');
                      if (settingsBlock) {
                        setBlocks(blocks.map(b => b.id === settingsBlock.id ? { ...b, content: { ...b.content, layoutMode: 'website' } } : b));
                        await supabase.from('blocks').update({ content: { ...settingsBlock.content, layoutMode: 'website' } }).eq('id', settingsBlock.id);
                      } else {
                        const newBlock = { business_id: business.id, type: 'settings', title: 'Settings', content: { layoutMode: 'website' }, order: 99, is_visible: false };
                        setBlocks([...blocks, { id: 'temp-settings', ...newBlock }]);
                        await supabase.from('blocks').insert(newBlock);
                      }
                    }}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border ${blocks.find(b => b.type === 'settings')?.content?.layoutMode !== 'linktree' ? 'bg-[var(--coral)] text-white border-[var(--coral)]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                  >
                    Web Sitesi
                  </button>
                  <button 
                    onClick={async () => {
                      const settingsBlock = blocks.find(b => b.type === 'settings');
                      if (settingsBlock) {
                        setBlocks(blocks.map(b => b.id === settingsBlock.id ? { ...b, content: { ...b.content, layoutMode: 'linktree' } } : b));
                        await supabase.from('blocks').update({ content: { ...settingsBlock.content, layoutMode: 'linktree' } }).eq('id', settingsBlock.id);
                      } else {
                        const newBlock = { business_id: business.id, type: 'settings', title: 'Settings', content: { layoutMode: 'linktree' }, order: 99, is_visible: false };
                        setBlocks([...blocks, { id: 'temp-settings', ...newBlock }]);
                        await supabase.from('blocks').insert(newBlock);
                      }
                    }}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border ${blocks.find(b => b.type === 'settings')?.content?.layoutMode === 'linktree' ? 'bg-[var(--coral)] text-white border-[var(--coral)]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                  >
                    Blok (Linktree)
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  Web Sitesi tüm içerikleri alt alta gösterir. Blok modu ise menü açarak sadece tıklanan bölümü gösterir.
                </p>
              </div>

              <h3 className="font-medium text-[var(--ink)]">{t('manualTitle')}</h3>
              <p className="text-xs text-slate-500 mb-4">{t('manualDesc')}</p>
              
              {blocks.filter(b => b.type !== 'settings').length === 0 && <p className="text-sm text-slate-500">{t('noContent')}</p>}
              {blocks.filter(b => b.type !== 'settings').map(b => (
                <div
                  key={b.id}
                  draggable
                  onDragStart={() => setDraggedBlockId(b.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDropReorder(b.id)}
                  onClick={() => setEditingBlock(b)}
                  className={`flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 hover:border-[var(--coral)] transition cursor-pointer shadow-sm group ${draggedBlockId === b.id ? 'opacity-40' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-slate-300 cursor-grab shrink-0" />
                    <div>
                      <span className="font-medium text-sm text-[var(--ink)] block group-hover:text-[var(--coral)] transition-colors">
                        {t(`blocks.${b.type}`)}
                      </span>
                      <span className="text-xs text-[var(--ink-soft)] capitalize">{b.type}</span>
                    </div>
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
                  <button onClick={() => createNewBlock('links', t('blocks.links'))} className="py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium hover:bg-slate-50 shadow-sm">{t('blocks.links')}</button>
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
              <div className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center text-[10px] text-slate-500 font-medium bg-white/50 backdrop-blur-sm shadow-sm uppercase">{locale}</div>
            </div>

            {/* Blocks (Archetype Preview) */}
            <div className="w-full -mt-20">
              <ArchetypeRenderer
                blocks={blocks}
                theme={theme}
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
