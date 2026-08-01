'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';
import { Loader2, Plus, Edit2, Copy, ExternalLink, Smartphone, X, MessageSquare, Settings2, Send, Square, Paperclip, CheckCircle2, Circle, GripVertical, ChevronLeft, Archive, MessageSquarePlus, Inbox, Coins, Tag, BarChart3 } from 'lucide-react';
import ArchetypeRenderer from './ArchetypeRenderer';
import ProfileHeader from './ProfileHeader';
import AgentMarkdown from './AgentMarkdown';
import ChatWidget from './ChatWidget';
import BlockEditorModal from './BlockEditorModal';
import SetPasswordModal from './SetPasswordModal';
import LanguageSwitcher from './LanguageSwitcher';
import { BeiweIcon } from './AgentIcons';
import { useChat, UIMessage } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useTranslations, useLocale } from 'next-intl';
import { RECOMMENDED_TYPES, hasRealContent, isRequiredSatisfied } from '@/config/blockTypes';
import { extractLocaleText, isSyncableType, type SyncableBlockType, type BlockLocaleText } from '@/agents/beiwe/localeSync';
import type { LocaleKey } from '@/config/localeTitles';
import { DEFAULT_THEME, Theme, resolveAccentFill, resolvePageCanvases, resolveThemeColors } from '@/config/archetypes';
import { avatarFromBlocks } from '@/utils/avatarFromBlocks';
import { collectShortcutCandidates, getShortcuts, resolveShortcuts, shortcutsEqual, type Shortcut } from '@/utils/shortcuts';
import { iconForLinkUrl } from '@/utils/linkIcon';
import { ColoredTextField, renderColoredSegments } from '@/utils/coloredText';
import { googleFontsHref } from '@/utils/googleFonts';
import { compressImageIfNeeded } from '@/utils/imageCompression';

type LegacyMessage = { id: string; role: string; content: string };

function toUIMessage(m: LegacyMessage): UIMessage {
  return { id: m.id, role: m.role as UIMessage['role'], parts: [{ type: 'text', text: m.content }] };
}

function getMessageText(m: UIMessage): string {
  return m.parts.filter((p) => p.type === 'text').map((p) => (p as { text: string }).text).join('');
}

export default function EditorClient({ 
  business, 
  initialBlocks, 
  initialChatMessages, 
  initialSessions,
  updateCreditCost = 6,
  installCreditCost = 10
}: { 
  business: any, 
  initialBlocks: any[], 
  initialChatMessages?: any[], 
  initialSessions?: any[],
  updateCreditCost?: number,
  installCreditCost?: number
}) {
  const [blocks, setBlocks] = useState(initialBlocks);
  const [sessions, setSessions] = useState<any[]>(initialSessions || []);
  const [activeSessionId, setActiveSessionId] = useState(() => {
    const activeSession = (initialSessions || []).find((s) => !s.is_archived);
    return activeSession ? activeSession.id : crypto.randomUUID();
  });
  const [showArchive, setShowArchive] = useState(false);
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
  const [pageTitle, setPageTitle] = useState(business.page_title || '');
  const [isEditingPageTitle, setIsEditingPageTitle] = useState(false);
  const [tagline, setTagline] = useState<Record<string, string>>(business.tagline || {});
  const [isEditingTagline, setIsEditingTagline] = useState(false);
  const ALL_LOCALES = ['tr', 'en', 'ru'] as const;
  const [activeLocales, setActiveLocales] = useState<string[]>(business.active_locales || ['tr', 'en', 'ru']);
  const MAX_ACTIVE_LOCALES = 3;
  const [isPublished, setIsPublished] = useState<boolean>(business.is_published || false);
  const [isTogglingPublish, setIsTogglingPublish] = useState(false);
  const [needsRepublish, setNeedsRepublish] = useState<boolean>(business.needs_republish || false);
  const [previewActiveBlockId, setPreviewActiveBlockId] = useState<string | null>(null);
  // Feature 2: after a single-locale manual block edit, offer to auto-translate the stale locales.
  const [syncPrompt, setSyncPrompt] = useState<null | { blockId: string; type: SyncableBlockType; content: unknown; sourceLocale: LocaleKey; targetLocales: LocaleKey[] }>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [contactValue, setContactValue] = useState<string | null>(business.contact_value || null);
  const [contactMethod, setContactMethod] = useState<string | null>(business.contact_method || null);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const CONTACT_METHODS = ['whatsapp', 'instagram', 'email', 'telegram'] as const;
  const [contactMethods, setContactMethods] = useState<Record<string, { selected: boolean, value: string }>>(() =>
    Object.fromEntries(CONTACT_METHODS.map((m) => [m, { selected: m === 'email', value: '' }]))
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputBarRef = useRef<HTMLDivElement>(null);
  const [chatInputBarHeight, setChatInputBarHeight] = useState(96);

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
  // Setup AI Agent
  const [input, setInput] = useState('');

  const setupTransport = useMemo(() => new DefaultChatTransport({
    api: '/api/setup-agent',
    prepareSendMessagesRequest: ({ id, messages }) => ({
      body: { id, messages, businessId: business.id, locale, sessionId: activeSessionId },
    }),
  }), [business.id, locale, activeSessionId]);

  const { messages, setMessages, sendMessage, status, stop } = useChat({
    transport: setupTransport,
    messages: initialChatMessages && initialChatMessages.length > 0
      ? initialChatMessages.filter((m) => m.session_id === activeSessionId).map((m) => toUIMessage({ id: m.id, role: m.role, content: m.content }))
      : [],  // Boş başlıyor — Sayfa Durumu Kartı sahte mesaj yerine geçiyor
    onError: (error) => {
      console.error('Setup agent chat error:', error);
      // Faz 4.3: kredi bitti / Faz 4.1: mesaj çok uzun gibi sunucudan gelen anlaşılır
      // mesajları doğrudan göster; boşsa jenerik metne düş.
      alert(error.message || t('chatErrorFallback'));
    },
  });
  const isChatLoading = status === 'streaming' || status === 'submitted';

  const sendUserText = (text: string) => sendMessage({ text });

  const handleChatFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isChatLoading) return;
    sendUserText(input);
    setInput('');
  };

  const archiveCurrentAndNewSession = async () => {
    if (activeSessionId) {
      await supabase.from('setup_messages').insert({
        business_id: business.id,
        session_id: activeSessionId,
        role: 'assistant',
        content: t('systemManualEditMessage')
      });
      await supabase.from('setup_sessions').update({ is_archived: true }).eq('id', activeSessionId);
      setSessions((prev) => prev.map((s) => (s.id === activeSessionId ? { ...s, is_archived: true } : s)));
    }
    await handleNewChat();
  };

  const handleNewChat = async () => {
    const newId = crypto.randomUUID();
    // Persisted immediately (not on first message) — otherwise an abandoned new chat
    // never lands in setup_sessions and a reload resurrects the previous conversation.
    await supabase.from('setup_sessions').upsert({
      id: newId,
      business_id: business.id,
      title: t('sessionDefaultTitle'),
      is_archived: false
    }, { onConflict: 'id' });
    setActiveSessionId(newId);
    setMessages([]);  // Tamamen boş — Sayfa Durumu Kartı devraliyor
    setSessions((prev) => [{ id: newId, title: t('sessionDefaultTitle'), created_at: new Date().toISOString(), is_archived: false }, ...prev]);
    setShowArchive(false);
  };

  const switchSession = async (sessionId: string) => {
    setActiveSessionId(sessionId);
    setShowArchive(false);
    // Explicitly picking an archived session means the user wants to continue it —
    // pull it back into active duty so it resurfaces on the next reload.
    const targetSession = sessions.find((s) => s.id === sessionId);
    if (targetSession?.is_archived) {
      await supabase.from('setup_sessions').update({ is_archived: false }).eq('id', sessionId);
      setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, is_archived: false } : s)));
    }
    const { data } = await supabase.from('setup_messages').select('*').eq('session_id', sessionId).order('created_at', { ascending: true });
    if (data && data.length > 0) {
      setMessages(data.map((m: any) => toUIMessage({ id: m.id, role: m.role, content: m.content })));
    } else {
      setMessages([toUIMessage({ id: '1', role: 'assistant', content: t('aiWelcome', { name: business.name }) })]);
    }
  };

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

      // Same Instagram-style downscale/re-encode as MediaUploader (src/utils/imageCompression.ts)
      // — this path (Beiwe chat's attachment button) used to upload the raw file untouched, so a
      // phone photo well past Supabase Storage's own server-side size limit was rejected outright.
      const processedFile = await compressImageIfNeeded(file);
      if (processedFile.size > 150 * 1024 * 1024) {
        throw new Error(t('mediaUploadSizeError'));
      }

      const fileExt = processedFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage.from('media').upload(fileName, processedFile, { cacheControl: '31536000' });
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);

      sendUserText(t('mediaUploadedMessage', { url: publicUrl }));

    } catch (err: any) {
      alert(t('mediaUploadError', { message: err.message }));
    } finally {
      setIsUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // The floating input bar's height grows with the textarea (multi-line messages) — the message
  // list's bottom padding needs to track it, otherwise a tall input overlaps the last message(s).
  useEffect(() => {
    const el = chatInputBarRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height;
      if (height) setChatInputBarHeight(height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [viewMode]);

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
      
      // Also refresh business to get theme/contact/needs_republish updates made by the AI agent
      const { data: bData } = await supabase.from('businesses').select('theme, contact_method, contact_value, needs_republish').eq('id', business.id).single();
      if (bData) {
        if (bData.theme && JSON.stringify(bData.theme) !== JSON.stringify(theme)) {
          setTheme(bData.theme);
        }
        if (bData.contact_value !== contactValue) {
          setContactValue(bData.contact_value);
        }
        if (bData.contact_method !== contactMethod) {
          setContactMethod(bData.contact_method);
        }
        if (bData.needs_republish) {
          setNeedsRepublish(true);
        }
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [business.id, supabase, viewMode, contactValue, contactMethod, theme]);

  const handleTogglePublish = async () => {
    const next = !isPublished;
    setIsTogglingPublish(true);
    try {
      const { error } = await supabase.from('businesses').update({ is_published: next, needs_republish: false }).eq('id', business.id);
      if (error) throw error;
      setIsPublished(next);
      setNeedsRepublish(false);
      business.is_published = next;
    } catch (err) {
      console.error(err);
      alert(t('publishToggleError'));
    } finally {
      setIsTogglingPublish(false);
    }
  };

  const handleAcknowledgeChanges = async () => {
    setIsTogglingPublish(true);
    try {
      const { error } = await supabase.from('businesses').update({ needs_republish: false }).eq('id', business.id);
      if (error) throw error;
      setNeedsRepublish(false);
    } catch (err) {
      console.error(err);
      alert(t('acknowledgeError'));
    } finally {
      setIsTogglingPublish(false);
    }
  };

  // Flags the business as having unpublished edits — called after any manual save (block edit,
  // delete, reorder, layout mode) so the publish button can prompt the owner to re-confirm.
  // AI-chat-driven edits mark this server-side (setup-agent route), picked up by the polling effect below.
  const markNeedsRepublish = async () => {
    if (!isPublished) return;
    setNeedsRepublish(true);
    await supabase.from('businesses').update({ needs_republish: true }).eq('id', business.id);
  };

  // True if a per-locale extracted payload carries any non-empty translatable text.
  const payloadHasText = (p: BlockLocaleText): boolean => {
    if (p.title?.trim() || p.text?.trim()) return true;
    return Array.isArray(p.items) && p.items.some((it) => Object.values(it).some((v) => typeof v === 'string' && v.trim()));
  };

  // After a manual save, decide whether to offer language sync: fire only when the owner changed
  // some locale(s) AND at least one other active locale was left untouched (now stale) — matching
  // the "only ask when there's a stale language" choice.
  const maybeOfferLanguageSync = (blockId: string, type: string, oldContent: unknown, newContent: unknown) => {
    if (!blockId || !isSyncableType(type)) return;
    const actives = activeLocales.filter((l): l is LocaleKey => (['tr', 'en', 'ru'] as string[]).includes(l));
    if (actives.length < 2) return;
    const changed = actives.filter((loc) =>
      JSON.stringify(extractLocaleText(type, oldContent, loc)) !== JSON.stringify(extractLocaleText(type, newContent, loc))
    );
    if (changed.length === 0) return;
    const targets = actives.filter((l) => !changed.includes(l));
    if (targets.length === 0) return; // every active locale changed → nothing stale to sync
    const sourceLocale = changed.includes(locale as LocaleKey) ? (locale as LocaleKey) : changed[0];
    if (!payloadHasText(extractLocaleText(type, newContent, sourceLocale))) return; // nothing to translate from
    setSyncPrompt({ blockId, type, content: newContent, sourceLocale, targetLocales: targets });
  };

  const handleSaveBlock = async (data: { title: string, content: any }) => {
    setIsSaving(true);
    const blockType = editingBlock.type;
    const isNew = editingBlock.isNew;
    const originalContent = isNew ? {} : (editingBlock.content || {});
    try {
      let updatedBlocks;
      let savedBlockId: string;
      if (isNew) {
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
        savedBlockId = newBlock.id;
        updatedBlocks = [...blocks, newBlock];
        setBlocks(updatedBlocks);
      } else {
        savedBlockId = editingBlock.id;
        const { error } = await supabase.from('blocks').update({
          title: data.title,
          content: data.content
        }).eq('id', editingBlock.id);

        if (error) throw error;
        updatedBlocks = blocks.map(b => b.id === editingBlock.id ? { ...b, title: data.title, content: data.content } : b);
        setBlocks(updatedBlocks);
      }
      await markNeedsRepublish();
      await archiveCurrentAndNewSession();
      maybeOfferLanguageSync(savedBlockId, blockType, originalContent, data.content);
    } catch (err) {
      console.error(err);
      alert(t('saveBlockError'));
    } finally {
      setIsSaving(false);
      setEditingBlock(null);
    }
  };

  // Confirmed the auto-translate prompt: translate the source locale into the stale ones and persist.
  const handleConfirmSync = async () => {
    if (!syncPrompt) return;
    setIsSyncing(true);
    try {
      const res = await fetch('/api/content/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business.id,
          type: syncPrompt.type,
          content: syncPrompt.content,
          sourceLocale: syncPrompt.sourceLocale,
          targetLocales: syncPrompt.targetLocales,
        }),
      });
      if (!res.ok) {
        alert(res.status === 402 ? t('sync.creditsExhausted') : t('sync.error'));
        return;
      }
      const { content: merged } = await res.json();
      const { error } = await supabase.from('blocks').update({ content: merged }).eq('id', syncPrompt.blockId);
      if (error) throw error;
      setBlocks((prev) => prev.map((b) => b.id === syncPrompt.blockId ? { ...b, content: merged } : b));
      await markNeedsRepublish();
    } catch (err) {
      console.error(err);
      alert(t('sync.error'));
    } finally {
      setIsSyncing(false);
      setSyncPrompt(null);
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
      const updatedBlocks = blocks.filter(b => b.id !== editingBlock.id);
      setBlocks(updatedBlocks);
      await markNeedsRepublish();
      await archiveCurrentAndNewSession();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
      setEditingBlock(null);
    }
  };

  const createNewBlock = (type: string, defaultTitle: string) => {
    const singletonTypes = ['about', 'services', 'pricing', 'hours', 'faq', 'links', 'gallery', 'testimonials'];
    const existing = blocks.find(b => b.type === type);
    
    if (singletonTypes.includes(type) && existing) {
      setEditingBlock({ ...existing, isNew: false });
    } else {
      setEditingBlock({ isNew: true, type, title: defaultTitle, content: {} });
    }
  };

  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);

  const handleDropReorder = async (overId: string) => {
    const fromId = draggedBlockId;
    setDraggedBlockId(null);
    if (!fromId || fromId === overId) return;

    const visible = blocks.filter(b => b.type !== 'settings' && b.type !== 'contact');
    const others = blocks.filter(b => b.type === 'settings' || b.type === 'contact');
    const fromIdx = visible.findIndex(b => b.id === fromId);
    const toIdx = visible.findIndex(b => b.id === overId);
    if (fromIdx === -1 || toIdx === -1) return;

    const reordered = [...visible];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const withNewOrder = reordered.map((b, idx) => ({ ...b, order: idx }));

    setBlocks([...withNewOrder, ...others]);
    await Promise.all(withNewOrder.map((b) => supabase.from('blocks').update({ order: b.order }).eq('id', b.id)));
    await markNeedsRepublish();
    await archiveCurrentAndNewSession();
  };

  const copyLink = () => {
    if (!isPublished) return;
    const url = `${window.location.origin}/${username}`;
    navigator.clipboard.writeText(url);
    alert(t('linkCopied'));
  };

  const handleUsernameSave = async () => {
    if (username === business.username) {
      setIsEditingUsername(false);
      return;
    }
    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!cleanUsername) {
      setUsernameError(t('usernameInvalid'));
      return;
    }
    
    const { data: existing } = await supabase.from('businesses').select('id').eq('username', cleanUsername).neq('id', business.id).single();
    if (existing) {
      setUsernameError(t('usernameTaken'));
      return;
    }
    
    const { error } = await supabase.from('businesses').update({ username: cleanUsername }).eq('id', business.id);
    if (error) {
      setUsernameError(t('usernameSaveError'));
    } else {
      business.username = cleanUsername;
      setUsername(cleanUsername);
      setIsEditingUsername(false);
      setUsernameError('');
    }
  };

  const handleLayoutModeChange = async (mode: 'website' | 'linktree') => {
    const settingsBlock = blocks.find(b => b.type === 'settings');
    try {
      // 'settings' isn't one of the singleton-key block types (00008_fix_blocks_singleton_constraint.sql),
      // so there's no unique constraint an upsert's onConflict can target — select-then-write instead.
      const { data, error } = settingsBlock
        ? await supabase.from('blocks').update({
            content: { ...settingsBlock.content, layoutMode: mode },
          }).eq('id', settingsBlock.id).select().single()
        : await supabase.from('blocks').insert({
            business_id: business.id,
            type: 'settings',
            title: 'Settings',
            content: { layoutMode: mode },
            order: 99,
            is_visible: false,
          }).select().single();
      if (error) throw error;
      setBlocks(settingsBlock ? blocks.map(b => b.id === settingsBlock.id ? data : b) : [...blocks, data]);
      await markNeedsRepublish();
      await archiveCurrentAndNewSession();
    } catch (err) {
      console.error(err);
      alert(t('layoutSaveError'));
    }
  };

  const handlePageTitleSave = async () => {
    const trimmed = pageTitle.trim();
    const { error } = await supabase.from('businesses').update({ page_title: trimmed || null }).eq('id', business.id);
    if (!error) {
      business.page_title = trimmed || null;
      setPageTitle(trimmed);
      setIsEditingPageTitle(false);
      await markNeedsRepublish();
    }
  };

  // Kısa açıklama (tagline) — ProfileHeader'da isim altında gösterilir. Çok dilli; boş diller
  // temizlenir. Avatar ayrı kaydedilmez, "Hakkında" bloğunun fotosundan otomatik gelir.
  const handleTaglineSave = async () => {
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(tagline)) {
      const trimmed = (v || '').trim();
      if (trimmed) cleaned[k] = trimmed;
    }
    const { error } = await supabase.from('businesses').update({ tagline: cleaned }).eq('id', business.id);
    if (!error) {
      business.tagline = cleaned;
      setTagline(cleaned);
      setIsEditingTagline(false);
      await markNeedsRepublish();
    }
  };

  // Kısayollar settings bloğunun content.shortcuts'ında saklanır (layoutMode ile aynı desen,
  // handleLayoutModeChange). Yeni migration yok. Maks 4.
  const handleShortcutsChange = async (next: Shortcut[]) => {
    const settingsBlock = blocks.find(b => b.type === 'settings');
    try {
      const { data, error } = settingsBlock
        ? await supabase.from('blocks').update({
            content: { ...settingsBlock.content, shortcuts: next },
          }).eq('id', settingsBlock.id).select().single()
        : await supabase.from('blocks').insert({
            business_id: business.id,
            type: 'settings',
            title: 'Settings',
            content: { shortcuts: next },
            order: 99,
            is_visible: false,
          }).select().single();
      if (error) throw error;
      setBlocks(settingsBlock ? blocks.map(b => b.id === settingsBlock.id ? data : b) : [...blocks, data]);
      await markNeedsRepublish();
    } catch (err) {
      console.error(err);
      alert(t('layoutSaveError'));
    }
  };

  // Light/dark modu theme jsonb'sine yazılır (theme.mode). Ziyaretçiye görünen bir toggle yok;
  // yalnız işletme sahibi burada seçer. Poll efekti aynı temayı geri okur (tutarlı).
  const handleSetMode = async (mode: 'light' | 'dark') => {
    if ((theme.mode || 'light') === mode) return;
    const nextTheme: Theme = { ...theme, mode };
    setTheme(nextTheme);
    const { error } = await supabase.from('businesses').update({ theme: nextTheme }).eq('id', business.id);
    if (!error) {
      business.theme = nextTheme;
      await markNeedsRepublish();
    }
  };

  const handleSetPrimaryColor = async (primary: string) => {
    if (!/^#[0-9a-fA-F]{6}$/.test(primary)) return;
    const savedPrimary = business.theme?.colors?.primary || DEFAULT_THEME.colors.primary;
    const savedMode = business.theme?.accent?.mode || 'solid';
    if (savedPrimary === primary && savedMode === 'solid') return;
    const nextTheme: Theme = {
      ...theme,
      colors: { ...theme.colors, primary },
      accent: {
        mode: 'solid',
        gradientFrom: primary,
        gradientMid: theme.accent?.gradientMid || DEFAULT_THEME.accent?.gradientMid || '#7C3AED',
        gradientTo: theme.accent?.gradientTo || DEFAULT_THEME.accent?.gradientTo || primary,
        hueShift: theme.accent?.hueShift || 0,
      },
    };
    setTheme(nextTheme);
    const { error } = await supabase.from('businesses').update({ theme: nextTheme }).eq('id', business.id);
    if (!error) {
      business.theme = nextTheme;
      await markNeedsRepublish();
    }
  };

  const handleSetAccentMode = async (mode: 'solid' | 'gradient') => {
    const current = theme.accent || {
      mode: 'solid',
      gradientFrom: theme.colors.primary,
      gradientMid: DEFAULT_THEME.accent?.gradientMid || '#7C3AED',
      gradientTo: DEFAULT_THEME.accent?.gradientTo || theme.colors.primary,
      hueShift: 0,
    };
    if ((current.mode || 'solid') === mode) return;
    const gradientFrom = current.gradientFrom || theme.colors.primary;
    const gradientMid = current.gradientMid || DEFAULT_THEME.accent?.gradientMid || '#7C3AED';
    const gradientTo = current.gradientTo || DEFAULT_THEME.accent?.gradientTo || theme.colors.primary;
    const hueShift = current.hueShift || 0;
    const nextTheme: Theme = {
      ...theme,
      colors: { ...theme.colors, primary: mode === 'gradient' ? gradientFrom : theme.colors.primary },
      accent: { mode, gradientFrom, gradientMid, gradientTo, hueShift },
    };
    setTheme(nextTheme);
    const { error } = await supabase.from('businesses').update({ theme: nextTheme }).eq('id', business.id);
    if (!error) {
      business.theme = nextTheme;
      await markNeedsRepublish();
    }
  };

  const handleSetGradientAccent = async (patch: Partial<NonNullable<Theme['accent']>>) => {
    const current = theme.accent || {
      mode: 'gradient' as const,
      gradientFrom: theme.colors.primary,
      gradientMid: DEFAULT_THEME.accent?.gradientMid || '#7C3AED',
      gradientTo: DEFAULT_THEME.accent?.gradientTo || theme.colors.primary,
      hueShift: 0,
    };
    const nextAccent = {
      mode: 'gradient' as const,
      gradientFrom: patch.gradientFrom || current.gradientFrom || theme.colors.primary,
      gradientMid: patch.gradientMid || current.gradientMid || DEFAULT_THEME.accent?.gradientMid || '#7C3AED',
      gradientTo: patch.gradientTo || current.gradientTo || DEFAULT_THEME.accent?.gradientTo || theme.colors.primary,
      hueShift: typeof patch.hueShift === 'number' ? patch.hueShift : current.hueShift || 0,
    };
    if (
      !/^#[0-9a-fA-F]{6}$/.test(nextAccent.gradientFrom) ||
      !/^#[0-9a-fA-F]{6}$/.test(nextAccent.gradientMid) ||
      !/^#[0-9a-fA-F]{6}$/.test(nextAccent.gradientTo)
    ) return;
    const savedAccent = business.theme?.accent || {
      mode: 'solid',
      gradientFrom: business.theme?.colors?.primary || DEFAULT_THEME.colors.primary,
      gradientMid: DEFAULT_THEME.accent?.gradientMid || '#7C3AED',
      gradientTo: DEFAULT_THEME.accent?.gradientTo || DEFAULT_THEME.colors.primary,
      hueShift: 0,
    };
    if (
      savedAccent.mode === nextAccent.mode &&
      savedAccent.gradientFrom === nextAccent.gradientFrom &&
      (savedAccent.gradientMid || DEFAULT_THEME.accent?.gradientMid || '#7C3AED') === nextAccent.gradientMid &&
      savedAccent.gradientTo === nextAccent.gradientTo &&
      (savedAccent.hueShift || 0) === nextAccent.hueShift
    ) return;
    const nextTheme: Theme = {
      ...theme,
      colors: { ...theme.colors, primary: nextAccent.gradientFrom },
      accent: nextAccent,
    };
    setTheme(nextTheme);
    const { error } = await supabase.from('businesses').update({ theme: nextTheme }).eq('id', business.id);
    if (!error) {
      business.theme = nextTheme;
      await markNeedsRepublish();
    }
  };

  const handleSetGradientColor = async (key: 'gradientFrom' | 'gradientMid' | 'gradientTo', value: string) => {
    if (!/^#[0-9a-fA-F]{6}$/.test(value)) return;
    await handleSetGradientAccent({ [key]: value });
  };

  const handleSetGradientHue = async (value: number) => {
    const hueShift = Math.max(-180, Math.min(180, Math.round(value)));
    await handleSetGradientAccent({ hueShift });
  };

  // Faz 2.5: her işletme en fazla 3 (şu an sistemdeki tüm) dil arasından en az 1'ini aktif
  // tutmalı — Faz 7'de dil sayısı 6'ya çıktığında bu seçim maliyeti/karmaşıklığı sınırlayacak.
  const toggleActiveLocale = async (locale: string) => {
    const isSelected = activeLocales.includes(locale);
    if (isSelected && activeLocales.length === 1) return; // en az 1 dil kalmalı
    const next = isSelected
      ? activeLocales.filter((l) => l !== locale)
      : activeLocales.length >= MAX_ACTIVE_LOCALES
      ? activeLocales
      : [...activeLocales, locale];
    if (next === activeLocales) return; // max doldu, değişiklik yok
    setActiveLocales(next);
    await supabase.from('businesses').update({ active_locales: next }).eq('id', business.id);
    business.active_locales = next;
  };

  // Reads the current business.contact_method/contact_value into the checkbox+input form shape,
  // then opens the editor — done on open (not on mount) so it always reflects the latest value
  // even if the AI chat updated it via updateContact since the page loaded.
  const openContactEditor = () => {
    let parsedValues: Record<string, string> = {};
    try { parsedValues = contactValue ? JSON.parse(contactValue) : {}; } catch { parsedValues = {}; }
    const selectedKeys = (contactMethod || '').split(',').filter(Boolean);
    setContactMethods(Object.fromEntries(CONTACT_METHODS.map((m) => [
      m,
      { selected: m === 'email' || selectedKeys.includes(m), value: parsedValues[m] || '' }
    ])));
    setIsEditingContact(true);
  };

  const handleContactSave = async () => {
    const mergedValues = Object.fromEntries(Object.entries(contactMethods).map(([k, v]) => [k, v.value]));
    const nextContactMethod = Object.entries(contactMethods)
      .filter(([, v]) => v.selected && v.value.trim())
      .map(([k]) => k)
      .join(',');
    const nextContactValue = JSON.stringify(mergedValues);
    try {
      const { error } = await supabase.from('businesses').update({ contact_method: nextContactMethod, contact_value: nextContactValue }).eq('id', business.id);
      if (error) throw error;
      setContactMethod(nextContactMethod);
      setContactValue(nextContactValue);
      setIsEditingContact(false);
      await markNeedsRepublish();
    } catch (err) {
      console.error(err);
      alert(t('contactSaveError'));
    }
  };

  const handleBulkSubmit = () => {
    if (!bulkText.trim()) return;
    const bulkLabels = `${t('blocks.about')}, ${t('blocks.services')} ${t('etcAbbr')}`;
    sendUserText(t('bulkPromptTemplate', { labels: bulkLabels, text: bulkText }));
    setBulkText('');
    setViewMode('chat');
  };

  const accent = theme.accent || {
    mode: 'solid' as const,
    gradientFrom: theme.colors.primary,
    gradientMid: DEFAULT_THEME.accent?.gradientMid || '#7C3AED',
    gradientTo: DEFAULT_THEME.accent?.gradientTo || theme.colors.primary,
    hueShift: 0,
  };
  const previewCanvas = resolvePageCanvases(theme);

  return (
    <div className="flex h-[100dvh]">
      {/* Left Sidebar */}
      <div className="w-full md:w-[450px] bg-white border-r border-slate-200 flex flex-col h-full z-10 shrink-0">
        <div className="p-4 md:p-6 border-b border-slate-200 bg-white">
          <div className="flex flex-wrap justify-between items-center gap-y-2 mb-3">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold font-bricolage text-[var(--ink)]">{t('panelTitle')}</h1>
              <LanguageSwitcher />
            </div>
            <div className="flex items-center gap-1.5">
              <a
                href="/dashboard/leads"
                className="p-2 bg-slate-100 text-[var(--ink)] hover:bg-slate-200 rounded-lg font-medium text-sm flex items-center gap-1.5 transition-colors"
                title={t('leadsNavTooltip')}
              >
                <Inbox className="w-5 h-5" />
                <span className="hidden md:inline">{t('leadsNavLabel')}</span>
              </a>
              <a
                href="/dashboard/analytics"
                className="p-2 bg-slate-100 text-[var(--ink)] hover:bg-slate-200 rounded-lg font-medium text-sm flex items-center gap-1.5 transition-colors"
                title="Analiz"
              >
                <BarChart3 className="w-5 h-5" />
                <span className="hidden md:inline">Analiz</span>
              </a>
              <button
                className="md:hidden p-2 bg-[var(--coral-tint)] text-[var(--coral)] rounded-lg font-medium text-sm flex items-center"
                onClick={() => setShowMobilePreview(true)}
              >
                <Smartphone className="w-5 h-5" />
              </button>
            </div>
          </div>

          <a
            href="/dashboard/billing"
            className="flex items-center justify-between gap-2 px-3 py-2 mb-4 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-[var(--ink)] transition-colors"
            title={t('creditBalanceHint')}
          >
            <span className="flex items-center gap-1.5">
              <Coins className="w-4 h-4" /> {t('creditBalance')}
            </span>
            <span className="font-semibold">{(business.credit_balance ?? 0).toLocaleString('tr-TR')}</span>
          </a>

          {/* Mode Switcher — along with the panel title/language switcher above, this is the only
              thing always visible across all tabs; profile link, page title, contact, and publish
              status now live inside the "İnce Ayar" tab so Kurulum Ajanı/Toplu aren't buried under
              fixed chrome. */}
            <div className="flex justify-between items-center bg-white p-2 rounded-xl shadow-sm border border-slate-200 gap-1">
              <button
                onClick={() => setViewMode('chat')}
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium leading-tight transition-all ${viewMode === 'chat' ? 'bg-slate-100 text-[var(--ink)] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <span className="block">Creative Agent</span>
                <span className="block text-[10px] font-normal opacity-60">{t('tabAgent')}</span>
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
        </div>

        {/* Main Left Content */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50 relative">
          {showArchive && (
            <div className="absolute inset-0 z-20 bg-white flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h3 className="font-semibold text-slate-800">{t('archive.title')}</h3>
                <button onClick={() => setShowArchive(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {sessions.length === 0 ? (
                  <div className="text-center text-slate-500 py-8 text-sm">{t('archive.empty')}</div>
                ) : (
                  sessions.map(s => (
                    <button
                      key={s.id}
                      onClick={() => switchSession(s.id)}
                      className={`w-full text-left p-4 rounded-xl border transition-colors ${activeSessionId === s.id ? 'bg-[var(--coral-tint)] border-[var(--coral)] text-[var(--coral)]' : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'}`}
                    >
                      <div className="font-medium flex items-center gap-2">
                        {s.title || t('archive.untitledChat')}
                        {s.is_archived && (
                          <span className="text-[10px] font-normal uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">{t('archive.archivedBadge')}</span>
                        )}
                      </div>
                      <div className="text-xs opacity-70 mt-1">{new Date(s.created_at).toLocaleString()}</div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
          {viewMode === 'chat' ? (
            <div className="flex flex-col h-full relative">
              <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ paddingBottom: chatInputBarHeight + 16 }}>
                {/* Sayfa Durumu Kartı — sadece chat boşsa gösterilir */}
                {messages.length === 0 && !isChatLoading && (() => {
                  const trackedBlocks = [
                    { type: 'about', label: t('blocks.about') },
                    { type: 'services', label: t('blocks.services') },
                    { type: 'hours', label: t('pageStatus.hoursLabel') },
                    { type: 'faq', label: t('pageStatus.faqLabel') },
                  ];
                  const hasAnyContent = blocks.some(b => hasRealContent(b));
                  const missingBlocks = trackedBlocks.filter(({ type }) => !blocks.find(b => b.type === type && hasRealContent(b)));
                  const hasMissing = missingBlocks.length > 0 || !hasContactValue;

                  return (
                    <div className="rounded-2xl border border-[var(--coral)] bg-[var(--coral-tint)] p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold tracking-widest text-[var(--coral)] uppercase font-mono">
                          {t('pageStatus.title')}
                        </span>
                        {hasAnyContent && (
                          <span className="text-[10px] text-[var(--ink-soft)]">
                            {t('pageStatus.completedCount', { done: trackedBlocks.length - missingBlocks.length + (hasContactValue ? 1 : 0), total: trackedBlocks.length + 1 })}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {trackedBlocks.map(({ type, label }) => {
                          const done = !!blocks.find(b => b.type === type && hasRealContent(b));
                          return (
                            <span key={type} className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${done ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-[var(--ink-soft)] border-[rgba(20,35,31,0.15)]'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${done ? 'bg-green-500' : 'bg-slate-300'}`} />
                              {label}
                            </span>
                          );
                        })}
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${hasContactValue ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-[var(--ink-soft)] border-[rgba(20,35,31,0.15)]'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${hasContactValue ? 'bg-green-500' : 'bg-slate-300'}`} />
                          {t('pageStatus.contactLabel')}
                        </span>
                      </div>

                      {hasMissing ? (
                        <button
                          onClick={() => sendUserText('__DEVAM__')}
                          disabled={isChatLoading}
                          className="w-full mt-1 py-2 px-4 bg-[var(--coral)] text-white text-xs font-bold rounded-full hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          <span>✦</span> {t('pageStatus.continueBtn')} (Maks. ≈{installCreditCost} kredi)
                        </button>
                      ) : (
                        <p className="text-xs text-green-700 font-medium text-center">
                          {t('pageStatus.allComplete')}
                        </p>
                      )}
                    </div>
                  );
                })()}

                {messages.map((m, idx) => (
                  <div key={idx} className={`flex items-end gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {m.role !== 'user' && (
                      <div className="w-7 h-7 rounded-full overflow-hidden border border-slate-200 shrink-0 mb-0.5 p-[1px] bg-white flex items-center justify-center">
                        <BeiweIcon size={24} />
                      </div>
                    )}
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${m.role === 'user' ? 'bg-[var(--ink)] text-white' : 'bg-white border border-slate-200 text-slate-800 shadow-sm'}`}>
                      {getMessageText(m) === '__DEVAM__' ? (
                        <span className="italic text-white/70 text-xs">{t('pageStatus.analyzingPlaceholder')}</span>
                      ) : m.role === 'user' ? (
                        getMessageText(m)
                      ) : (
                        <AgentMarkdown>{getMessageText(m)}</AgentMarkdown>
                      )}
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex items-end gap-2 justify-start">
                    <div className="w-7 h-7 rounded-full overflow-hidden border border-slate-200 shrink-0 mb-0.5 p-[1px] bg-white flex items-center justify-center">
                      <BeiweIcon size={24} />
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-100"></div>
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-200"></div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div ref={chatInputBarRef} className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent">
                <form onSubmit={handleChatFormSubmit} className="flex items-end gap-2">
                  <button
                    type="button"
                    title={t('archive.title')}
                    onClick={() => setShowArchive(true)}
                    className="w-[46px] h-[46px] flex items-center justify-center bg-white text-slate-500 hover:text-[var(--coral)] rounded-full border border-slate-300 shadow-sm shrink-0 transition-colors"
                  >
                    <Archive className="w-5 h-5" />
                  </button>

                  <div className="relative flex-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingMedia || isChatLoading}
                      className="absolute left-3 bottom-1.5 p-1.5 text-slate-400 hover:text-[var(--coral)] rounded-full disabled:opacity-50 transition-colors z-10"
                    >
                      {isUploadingMedia ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleMediaUpload} accept="image/*,video/*" className="hidden" />

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
                          if (input.trim() && !isChatLoading) {
                            e.currentTarget.form?.requestSubmit();
                          }
                        }
                      }}
                      rows={1}
                      placeholder={`${t('agentInputPlaceholder')} (İşlem başı maks. ≈${installCreditCost} kredi)`}
                      className="w-full bg-white border border-slate-300 rounded-3xl pl-12 pr-12 py-3 text-sm focus:outline-none focus:border-[var(--coral)] focus:ring-1 focus:ring-[var(--coral)] shadow-sm resize-none overflow-hidden min-h-[46px] max-h-[150px]"
                      style={{ maxHeight: '150px' }}
                    />
                    {isChatLoading ? (
                      <button type="button" onClick={() => stop()} className="absolute right-2 bottom-1.5 w-8 h-8 flex items-center justify-center bg-[var(--coral)] text-white rounded-full transition-opacity">
                        <Square className="w-3 h-3 fill-white" />
                      </button>
                    ) : (
                      <button type="submit" disabled={!input.trim()} className="absolute right-2 bottom-1.5 w-8 h-8 flex items-center justify-center bg-[var(--coral)] text-white rounded-full disabled:opacity-50 transition-opacity">
                        <Send className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    title={t('newChatTooltip')}
                    onClick={() => handleNewChat()}
                    className="w-[46px] h-[46px] flex items-center justify-center bg-white text-slate-500 hover:text-[var(--coral)] rounded-full border border-slate-300 shadow-sm shrink-0 transition-colors"
                  >
                    <MessageSquarePlus className="w-5 h-5" />
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
                  {isChatLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : `${t('bulkSubmitBtn')} (Maks. ≈${installCreditCost} kredi)`}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 md:p-6 space-y-4 pb-20">
              {/* Public Link Display */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
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
                          <ExternalLink className="w-3 h-3 mr-1" /> {t('openLink')}
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

              {/* Page Title (optional, defaults to workspace name) */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-slate-500">{t('pageTitle')}</span>
                  {isEditingPageTitle ? (
                    <button onClick={handlePageTitleSave} className="text-xs font-bold text-[var(--teal)] hover:text-teal-700">{t('saveBtn')}</button>
                  ) : (
                    <button onClick={() => setIsEditingPageTitle(true)} className="text-xs font-medium text-slate-500 hover:text-[var(--coral)] flex items-center">
                      <Edit2 className="w-3 h-3 mr-1" /> {t('editBtn')}
                    </button>
                  )}
                </div>
                {isEditingPageTitle ? (
                  <ColoredTextField
                    value={pageTitle}
                    onChange={setPageTitle}
                    placeholder={business.name}
                    compact
                    className="w-full p-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus-within:border-[var(--coral)] bg-white min-h-[38px]"
                  />
                ) : (
                  <div className="text-sm font-medium text-[var(--ink)]">
                    {pageTitle ? renderColoredSegments(pageTitle) : business.name}
                  </div>
                )}
              </div>

              {/* Short description (tagline) — shown under the name in the Linktree-style profile
                  header. Avatar is NOT edited here; it's derived from the About block's photo. */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-slate-500">{t('tagline')}</span>
                  {isEditingTagline ? (
                    <button onClick={handleTaglineSave} className="text-xs font-bold text-[var(--teal)] hover:text-teal-700">{t('saveBtn')}</button>
                  ) : (
                    <button onClick={() => setIsEditingTagline(true)} className="text-xs font-medium text-slate-500 hover:text-[var(--coral)] flex items-center">
                      <Edit2 className="w-3 h-3 mr-1" /> {t('editBtn')}
                    </button>
                  )}
                </div>
                {isEditingTagline ? (
                  <div className="space-y-2">
                    {activeLocales.map((l) => (
                      <div key={l}>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase">{l}</span>
                        <textarea
                          value={tagline[l] || ''}
                          onChange={e => setTagline({ ...tagline, [l]: e.target.value })}
                          rows={2}
                          className="w-full mt-0.5 p-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[var(--coral)] resize-none"
                        />
                      </div>
                    ))}
                    <p className="text-[10px] text-slate-400">{t('taglineHint')}</p>
                  </div>
                ) : (
                  <div className="text-sm font-medium text-[var(--ink)]">
                    {tagline[locale] || Object.values(tagline).find(Boolean) || business.category || t('noContent')}
                  </div>
                )}
              </div>

              {/* Appearance — owner-selected single light/dark mode (no visitor toggle). Stored in
                  theme.mode; the profile header + blocks render dark neutrals via resolveThemeColors. */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <span className="text-xs font-medium text-slate-500">{t('appearance')}</span>
                <div className="flex gap-2 mt-2">
                  {(['light', 'dark'] as const).map((m) => {
                    const active = (theme.mode || 'light') === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleSetMode(m)}
                        className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition ${active ? 'bg-[var(--ink)] text-white border-[var(--ink)]' : 'bg-white text-slate-600 border-slate-300 hover:border-[var(--coral)]'}`}
                      >
                        {m === 'light' ? t('modeLight') : t('modeDark')}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="text-xs font-medium text-slate-500">{t('accentColor')}</span>
                    <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
                      {(['solid', 'gradient'] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => handleSetAccentMode(mode)}
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition ${accent.mode === mode ? 'bg-[var(--ink)] text-white' : 'text-slate-500 hover:text-[var(--ink)]'}`}
                        >
                          {mode === 'solid' ? t('accentSolid') : t('accentGradient')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {accent.mode === 'gradient' ? (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <div
                          className="h-10 flex-1 rounded-lg border border-slate-300 shadow-inner"
                          style={{ background: resolveAccentFill({ ...theme, accent }) }}
                        />
                        <div className="flex items-center gap-1.5">
                          {(['gradientFrom', 'gradientMid', 'gradientTo'] as const).map((key) => (
                            <input
                              key={key}
                              type="color"
                              value={accent[key] || (key === 'gradientMid' ? DEFAULT_THEME.accent?.gradientMid || '#7C3AED' : theme.colors.primary)}
                              onChange={(e) => setTheme({
                                ...theme,
                                colors: { ...theme.colors, primary: key === 'gradientFrom' ? e.target.value : theme.colors.primary },
                                accent: { ...accent, mode: 'gradient', [key]: e.target.value },
                              })}
                              onBlur={(e) => handleSetGradientColor(key, e.target.value)}
                              className="w-8 h-8 rounded-lg border border-slate-300 bg-white p-1 cursor-pointer"
                              aria-label={key === 'gradientFrom' ? t('accentGradientFrom') : key === 'gradientMid' ? t('accentGradientMid') : t('accentGradientTo')}
                            />
                          ))}
                        </div>
                      </div>
                      <label className="block text-xs text-slate-500">
                        <div className="flex items-center justify-between mb-1">
                          <span>{t('accentGradientHue')}</span>
                          <span className="text-slate-400 tabular-nums">{(accent.hueShift || 0) > 0 ? `+${accent.hueShift}` : accent.hueShift || 0}°</span>
                        </div>
                        <input
                          type="range"
                          min={-180}
                          max={180}
                          step={1}
                          value={accent.hueShift || 0}
                          onChange={(e) => setTheme({ ...theme, accent: { ...accent, mode: 'gradient', hueShift: Number(e.target.value) } })}
                          onPointerUp={(e) => handleSetGradientHue(Number((e.target as HTMLInputElement).value))}
                          onBlur={(e) => handleSetGradientHue(Number(e.target.value))}
                          className="w-full accent-purple-600"
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[11px] text-slate-400">{t('accentSolidHint')}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={theme.colors.primary}
                        onChange={(e) => setTheme({ ...theme, colors: { ...theme.colors, primary: e.target.value } })}
                        onBlur={(e) => handleSetPrimaryColor(e.target.value)}
                        className="w-9 h-9 rounded-lg border border-slate-300 bg-white p-1 cursor-pointer"
                        aria-label={t('accentColor')}
                      />
                      <input
                        value={theme.colors.primary}
                        onChange={(e) => setTheme({ ...theme, colors: { ...theme.colors, primary: e.target.value } })}
                        onBlur={(e) => handleSetPrimaryColor(e.target.value)}
                        className="w-24 p-2 text-xs font-mono border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[var(--coral)]"
                      />
                    </div>
                  </div>
                  )}
                  <p className="text-[10px] text-slate-400 mt-1">{t('accentColorHint')}</p>
                </div>
              </div>

              {/* Shortcuts — up to 4 quick buttons shown under the profile header. Each surfaces an
                  existing Link (opens URL) or Service (jumps to that section). Stored on the
                  settings block's content.shortcuts. */}
              {(() => {
                const currentShortcuts = getShortcuts(blocks);
                const candidates = collectShortcutCandidates(blocks, locale)
                  .filter((cand) => !currentShortcuts.some((s) => shortcutsEqual(s, cand)));
                const atMax = currentShortcuts.length >= 4;
                return (
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-slate-500">{t('shortcuts')}</span>
                      <span className="text-[10px] text-slate-400">{currentShortcuts.length}/4</span>
                    </div>
                    {currentShortcuts.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {currentShortcuts.map((s, idx) => {
                          const Icon = s.kind === 'link' ? iconForLinkUrl(s.url) : Tag;
                          return (
                            <span key={idx} className="inline-flex items-center gap-1 pl-2 pr-1 py-1 bg-white border border-slate-200 rounded-full text-xs text-[var(--ink)]">
                              <Icon className="w-3 h-3 shrink-0 text-slate-400" />
                              <span className="truncate max-w-[7rem]">{s.label}</span>
                              <button
                                type="button"
                                onClick={() => handleShortcutsChange(currentShortcuts.filter((_, i) => i !== idx))}
                                className="p-0.5 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                    <select
                      value=""
                      disabled={atMax || candidates.length === 0}
                      onChange={(e) => {
                        const cand = candidates[Number(e.target.value)];
                        if (cand) handleShortcutsChange([...currentShortcuts, cand]);
                      }}
                      className="w-full p-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[var(--coral)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="" disabled>{atMax ? t('shortcutsFull') : t('shortcutAdd')}</option>
                      {candidates.some((c) => c.kind === 'link') && (
                        <optgroup label={t('shortcutGroupLinks')}>
                          {candidates.map((c, i) => c.kind === 'link' ? <option key={i} value={i}>{c.label}</option> : null)}
                        </optgroup>
                      )}
                      {candidates.some((c) => c.kind === 'service') && (
                        <optgroup label={t('shortcutGroupServices')}>
                          {candidates.map((c, i) => c.kind === 'service' ? <option key={i} value={i}>{c.label}</option> : null)}
                        </optgroup>
                      )}
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1">{t('shortcutsHint')}</p>
                  </div>
                );
              })()}

              {/* Contact methods — the single source of truth also used by request-access and the
                  setup agent's updateContact tool; not a reorderable page block. */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-slate-500">{t('blocks.contact')}</span>
                  {isEditingContact ? (
                    <button onClick={handleContactSave} className="text-xs font-bold text-[var(--teal)] hover:text-teal-700">{t('saveBtn')}</button>
                  ) : (
                    <button onClick={openContactEditor} className="text-xs font-medium text-slate-500 hover:text-[var(--coral)] flex items-center">
                      <Edit2 className="w-3 h-3 mr-1" /> {t('editBtn')}
                    </button>
                  )}
                </div>
                {isEditingContact ? (
                  <div className="space-y-2">
                    {CONTACT_METHODS.map((method) => {
                      const isEmail = method === 'email';
                      return (
                        <div key={method} className="p-2 bg-white border border-slate-200 rounded-lg">
                          <div className="flex items-center">
                            {isEmail ? (
                              <span className="text-xs font-medium text-[var(--ink)]">
                                {t(`contactMethods.${method}`)} <span className="text-[var(--coral)]">*</span>
                              </span>
                            ) : (
                              <label className="flex items-center text-xs font-medium text-[var(--ink)] cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={contactMethods[method].selected}
                                  onChange={(e) => setContactMethods({ ...contactMethods, [method]: { ...contactMethods[method], selected: e.target.checked } })}
                                  className="mr-1.5 accent-[var(--coral)]"
                                />
                                {t(`contactMethods.${method}`)}
                              </label>
                            )}
                          </div>
                          {(isEmail || contactMethods[method].selected) && (
                            <input
                              type={isEmail ? 'email' : 'text'}
                              value={contactMethods[method].value}
                              onChange={(e) => setContactMethods({ ...contactMethods, [method]: { ...contactMethods[method], value: e.target.value } })}
                              placeholder={t(`contactMethodPlaceholders.${method}`)}
                              className="w-full mt-1 p-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-[var(--coral)]"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm font-medium text-[var(--ink)]">
                    {(contactMethod || '').split(',').filter(Boolean).map((m: string) => t(`contactMethods.${m}`)).join(', ') || t('noContent')}
                  </div>
                )}
              </div>

              {/* Aktif Diller — Faz 2.5 (Faz 7 dil genişlemesi altyapısı) */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-slate-500">{t('activeLocales.title')}</span>
                  <span className="text-[10px] text-slate-400">{t('activeLocales.maxHint', { max: MAX_ACTIVE_LOCALES })}</span>
                </div>
                <div className="flex gap-2 mt-1">
                  {ALL_LOCALES.map((l) => {
                    const selected = activeLocales.includes(l);
                    const disabled = !selected && activeLocales.length >= MAX_ACTIVE_LOCALES;
                    return (
                      <button
                        key={l}
                        type="button"
                        onClick={() => toggleActiveLocale(l)}
                        disabled={disabled}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${selected ? 'bg-[var(--coral)] text-white border-[var(--coral)]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                      >
                        {l}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  {t('activeLocales.description')}
                </p>
              </div>

              {/* Publish Checklist */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
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
                    onClick={isPublished && needsRepublish ? handleAcknowledgeChanges : handleTogglePublish}
                    disabled={(!canPublish && !isPublished) || isTogglingPublish}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isPublished && !needsRepublish ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-[var(--coral)] text-white hover:bg-orange-600'}`}
                  >
                    {isTogglingPublish ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (isPublished ? (needsRepublish ? t('republishBtn') : t('unpublishBtn')) : t('publishBtn'))}
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
                {isPublished && needsRepublish && (
                  <p className="text-[11px] text-[var(--coral)] mt-2 font-medium">{t('republishHint')}</p>
                )}
              </div>

              <div className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-sm font-bold text-[var(--ink)] mb-3">{t('pageLayout')}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleLayoutModeChange('website')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border ${blocks.find(b => b.type === 'settings')?.content?.layoutMode === 'website' ? 'bg-[var(--coral)] text-white border-[var(--coral)]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                  >
                    {t('layoutWebsite')}
                  </button>
                  <button
                    onClick={() => handleLayoutModeChange('linktree')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border ${blocks.find(b => b.type === 'settings')?.content?.layoutMode !== 'website' ? 'bg-[var(--coral)] text-white border-[var(--coral)]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                  >
                    {t('layoutLinktree')}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  {t('layoutDescription')}
                </p>
              </div>

              <h3 className="font-medium text-[var(--ink)]">{t('manualTitle')}</h3>
              <p className="text-xs text-slate-500 mb-4">{t('manualDesc')}</p>
              
              {blocks.filter(b => b.type !== 'settings' && b.type !== 'contact').length === 0 && <p className="text-sm text-slate-500">{t('noContent')}</p>}
              {blocks.filter(b => b.type !== 'settings' && b.type !== 'contact').map(b => (
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
                  {!blocks.some(b => b.type === 'about') && (
                    <button onClick={() => createNewBlock('about', t('blocks.about'))} className="py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium hover:bg-slate-50 shadow-sm">{t('blocks.about')}</button>
                  )}
                  {!blocks.some(b => b.type === 'services') && (
                    <button onClick={() => createNewBlock('services', t('blocks.services'))} className="py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium hover:bg-slate-50 shadow-sm">{t('blocks.services')}</button>
                  )}
                  {!blocks.some(b => b.type === 'faq') && (
                    <button onClick={() => createNewBlock('faq', t('blocks.faq'))} className="py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium hover:bg-slate-50 shadow-sm">{t('blocks.faq')}</button>
                  )}
                  {!blocks.some(b => b.type === 'hours') && (
                    <button onClick={() => createNewBlock('hours', t('blocks.hours'))} className="py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium hover:bg-slate-50 shadow-sm">{t('blocks.hours')}</button>
                  )}
                  {!blocks.some(b => b.type === 'links') && (
                    <button onClick={() => createNewBlock('links', t('blocks.links'))} className="py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium hover:bg-slate-50 shadow-sm">{t('blocks.links')}</button>
                  )}
                  <button onClick={() => createNewBlock('extra_services', t('blocks.extra_services'))} className="py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium hover:bg-slate-50 shadow-sm">{t('blocks.extra_services')}</button>
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

          {/* Top 70% Content Area — background follows the resolved theme so dark mode covers the
              whole preview (header included), matching the live page. */}
          <div
            className="flex-1 flex flex-col relative overflow-hidden"
            style={{
              background: previewCanvas.pageCanvas,
              '--tb-page-bg': previewCanvas.pageCanvas,
              '--tb-page-bg-sticky': previewCanvas.stickyCanvas,
            } as React.CSSProperties}
          >
            {/* Compact profile header — same ProfileHeader component the live page uses, so the
                editor preview matches it 1:1. Avatar comes from the About block's photo. */}
            <div className="w-full pt-12 pb-2 px-4 z-10 relative shrink-0">
              <ProfileHeader
                avatarUrl={avatarFromBlocks(blocks)}
                name={pageTitle || business.name}
                description={tagline[locale] || Object.values(tagline).find(Boolean) || business.category || undefined}
                theme={theme}
                activeBlockId={previewActiveBlockId}
                onBack={() => setPreviewActiveBlockId(null)}
                topRight={<div className="w-7 h-7 rounded-full border border-slate-300 flex items-center justify-center text-[10px] text-slate-500 font-medium bg-white/50 backdrop-blur-sm shadow-sm uppercase shrink-0">{locale}</div>}
                shortcuts={resolveShortcuts(blocks)}
                onShortcutSelect={setPreviewActiveBlockId}
                minimal={(blocks.find(b => b.type === 'settings')?.content?.layoutMode === 'website') || previewActiveBlockId != null}
              />
            </div>

            {/* Blocks (Archetype Preview) */}
            <div className="w-full flex-1 overflow-y-auto">
              <ArchetypeRenderer
                blocks={blocks}
                theme={theme}
                businessName={business.name}
                activeBlockId={previewActiveBlockId}
                onActiveBlockChange={setPreviewActiveBlockId}
                contactMethod={contactMethod}
                contactValue={contactValue}
                orderNowBehavior={business.saule_settings?.orderNowBehavior}
              />
              {blocks.length === 0 && (
                <div className="text-center p-6 mx-4 mt-24 bg-white rounded-2xl shadow-sm border border-slate-100 text-slate-400 text-sm">
                  {t('previewEmpty')}
                </div>
              )}
            </div>
          </div>

          {/* Bottom 30% — real Saule, live (Faz 1.7): owner can test their own assistant without publishing.
              Preview conversations are flagged is_preview so they never trigger lead emails or mix with real visitors. */}
          <ChatWidget
            variant="inline"
            preview
            businessId={business.id}
            businessName={business.name}
            locale={locale}
            initialMessages={[]}
            sauleSettings={business.saule_settings}
            customGreeting={business.saule_settings?.customGreetingEnabled ? business.saule_settings?.customGreeting : null}
          />
        </div>
      </div>

      {editingBlock && (
        <BlockEditorModal
          block={editingBlock}
          onClose={() => setEditingBlock(null)}
          onSave={handleSaveBlock}
          onDelete={handleDeleteBlock}
          locale={locale}
        />
      )}
      {syncPrompt && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <h3 className="text-lg font-bold text-[var(--ink)] mb-2">{t('sync.title')}</h3>
            <p className="text-sm text-slate-600 mb-5">
              {t('sync.body', {
                source: syncPrompt.sourceLocale.toUpperCase(),
                targets: syncPrompt.targetLocales.map((l) => l.toUpperCase()).join(', '),
              })}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setSyncPrompt(null)}
                disabled={isSyncing}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition disabled:opacity-50"
              >
                {t('sync.cancel')}
              </button>
              <button
                onClick={handleConfirmSync}
                disabled={isSyncing}
                className="px-5 py-2 bg-[var(--coral)] text-white font-medium rounded-lg hover:bg-orange-600 shadow-sm transition disabled:opacity-50 flex items-center gap-2"
              >
                {isSyncing && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSyncing ? t('sync.syncing') : `${t('sync.confirm')} (≈${updateCreditCost} kredi)`}
              </button>
            </div>
          </div>
        </div>
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
