'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import type { PageActionBlockTarget } from '@/utils/pageActionTargets';

// Sessizce yakalanan "niyet" tıklamaları — bkz. migration 00070_engagement_events.sql.
export type EngagementEventType = 'contact_click' | 'order_click';

// Saule başarıyla cevap verse bile ziyaretçi hiç iz bırakmadan gidebiliyordu (lead formu
// yalnızca "cevap bulunamadı" durumunda açılıyordu). Bu eşikler geçilince — ziyaretçi hem
// sayfada gerçekten geziniyor/tıklıyor HEM DE Saule'den gerçek cevap alıyor — balon kendini
// nazikçe, kapatılabilir şekilde lead formuna çevirir (bkz. checkLeadPromptThreshold).
const PROACTIVE_LEAD_PROMPT_CLICK_THRESHOLD = 5;
const PROACTIVE_LEAD_PROMPT_ANSWER_THRESHOLD = 2;
const PROACTIVE_LEAD_PROMPT_DELAY_MS = 2500;

type PageActionResult = {
  ok: boolean;
  reason?: 'missing_target' | 'unknown_block' | 'unknown_item';
};

export type MatchedBlockInfo = {
  title: string;
  description?: string;
  blockId: string;
  itemId?: string;
};

type PublicPageRuntimeValue = {
  activeBlockId: string | null;
  activeItemId: string | null;
  openSequence: number;
  openBlock: (blockId: string, itemId?: string | null) => PageActionResult;
  clearActiveBlock: () => void;
  
  // Saule deterministic bubble state
  businessId: string;
  blocks: any[];
  contactMethod: string | null;
  contactValue: string | null;
  leadCaptureEnabled: boolean;
  customGreeting: any;
  
  sauleActive: boolean;
  setSauleActive: (active: boolean) => void;
  sauleText: string;
  setSauleText: (text: string) => void;
  sauleQuestion: string;
  setSauleQuestion: (text: string) => void;
  sauleSuggestions: string[];
  setSauleSuggestions: (suggestions: string[]) => void;
  sauleMatchedBlock: MatchedBlockInfo | null;
  setSauleMatchedBlock: (block: MatchedBlockInfo | null) => void;
  sauleState: 'idle' | 'greeting' | 'loading' | 'response' | 'lead_form';
  setSauleState: (state: 'idle' | 'greeting' | 'loading' | 'response' | 'lead_form') => void;
  queryTrigger: { query: string } | null;
  setQueryTrigger: (trigger: { query: string } | null) => void;
  glitchTrigger: number;
  triggerGlitch: () => void;

  // Lead formu iki farklı sebepten açılabiliyor — analiz sayfasında ayrı raporlanabilsin diye
  // (bkz. migration 00071_leads_trigger_reason.sql) hangi sebepten açıldığı burada tutulur.
  // ChatWidget cevap bulunamayınca/kredi bitince, checkLeadPromptThreshold ise proaktif
  // davette bunu set eder; ProfileHeader gönderirken bunu leads.trigger_reason'a taşır.
  leadFormReason: 'no_match' | 'credits_exhausted' | 'proactive' | null;
  setLeadFormReason: (reason: 'no_match' | 'credits_exhausted' | 'proactive' | null) => void;

  // Sıfır sürtünmeli niyet takibi — bkz. modül üstü yorum. recordEngagementClick her
  // WhatsApp/telefon/e-posta/Instagram/Sipariş Ver tıklamasında çağrılır (sunucuya kaydeder
  // + eşik sayacını artırır); recordSuccessfulAnswer Saule bir soruyu gerçekten
  // cevapladığında (fallback DEĞİL) ChatWidget'tan çağrılır.
  recordEngagementClick: (eventType: EngagementEventType, channel?: string | null) => void;
  recordSuccessfulAnswer: () => void;

  // Soru/cevap balonundan karşılama durumuna dön — hem ProfileHeader'ın (geri oku)
  // hem ProfilePageBody'nin (eşleşen blok kartı tıklaması) aynı sıfırlamayı tek
  // yerden yapması için. fallbackGreeting çağıran taraftan gelir (locale bilgisi
  // orada — useTranslations/useLocale) böylece karşılama her zaman doğru dilde olur.
  resetToGreeting: (fallbackGreeting: string) => void;
};

const PublicPageRuntimeContext = createContext<PublicPageRuntimeValue | null>(null);

export function PublicPageRuntimeProvider({
  children,
  targets,
  businessId = '',
  blocks = [],
  contactMethod = null,
  contactValue = null,
  leadCaptureEnabled = true,
  customGreeting = null,
  isOwner = false,
}: {
  children: ReactNode;
  targets: PageActionBlockTarget[];
  businessId?: string;
  blocks?: any[];
  contactMethod?: string | null;
  contactValue?: string | null;
  leadCaptureEnabled?: boolean;
  customGreeting?: any;
  // Sahip kendi sayfasını önizlerken proaktif lead daveti tetiklenmez (bkz. recordEngagementClick).
  isOwner?: boolean;
}) {
  const t = useTranslations('PublicPage');
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [openSequence, setOpenSequence] = useState(0);

  // Saule bubble state
  const [sauleActive, setSauleActive] = useState(false);
  const [sauleText, setSauleText] = useState('');
  const [sauleQuestion, setSauleQuestion] = useState('');
  const [sauleSuggestions, setSauleSuggestions] = useState<string[]>([]);
  const [sauleMatchedBlock, setSauleMatchedBlock] = useState<MatchedBlockInfo | null>(null);
  const [sauleState, setSauleState] = useState<'idle' | 'greeting' | 'loading' | 'response' | 'lead_form'>('idle');
  const [queryTrigger, setQueryTrigger] = useState<{ query: string } | null>(null);
  const [glitchTrigger, setGlitchTrigger] = useState(0);
  const [leadFormReason, setLeadFormReason] = useState<'no_match' | 'credits_exhausted' | 'proactive' | null>(null);

  const triggerGlitch = useCallback(() => {
    setGlitchTrigger((prev) => prev + 1);
  }, []);

  const openBlock = useCallback(
    (blockId: string, itemId?: string | null): PageActionResult => {
      if (!blockId) return { ok: false, reason: 'missing_target' };
      
      // Find target block by either UUID (blockId) or block type (type)
      const target = targets.find((t) => t.blockId === blockId || t.type === blockId);
      if (!target) return { ok: false, reason: 'unknown_block' };
      
      const itemSet = new Set(target.items.map((item) => item.itemId));
      if (itemId && itemSet.size > 0 && !itemSet.has(itemId)) return { ok: false, reason: 'unknown_item' };
      
      setActiveBlockId(target.blockId);
      setActiveItemId(itemId || null);
      setOpenSequence((sequence) => sequence + 1);
      return { ok: true };
    },
    [targets]
  );

  const clearActiveBlock = useCallback(() => {
    setActiveBlockId(null);
    setActiveItemId(null);
  }, []);

  const resetToGreeting = useCallback((greetingText: string) => {
    setSauleQuestion('');
    setQueryTrigger(null);
    setSauleSuggestions([]);
    setSauleMatchedBlock(null);
    setSauleText(greetingText);
    setSauleState('idle');
    setLeadFormReason(null);
    setGlitchTrigger((prev) => prev + 1);
  }, []);

  // Render'lar arası sayaç — bunların değişmesi kendi başına bir re-render gerektirmiyor,
  // sadece eşik geçildiğinde sauleState değişimi (aşağıda) zaten yeniden render tetikliyor.
  const engagementClickCountRef = useRef(0);
  const successfulAnswerCountRef = useRef(0);
  const leadPromptShownRef = useRef(false);

  const checkLeadPromptThreshold = useCallback(() => {
    if (isOwner || leadPromptShownRef.current || !leadCaptureEnabled) return;
    if (
      engagementClickCountRef.current < PROACTIVE_LEAD_PROMPT_CLICK_THRESHOLD ||
      successfulAnswerCountRef.current < PROACTIVE_LEAD_PROMPT_ANSWER_THRESHOLD
    ) {
      return;
    }
    leadPromptShownRef.current = true;
    // Küçük bir gecikme — tam bu anda okunmakta olan bir cevabın üstüne aniden binmesin.
    setTimeout(() => {
      setSauleQuestion('');
      setQueryTrigger(null);
      setSauleSuggestions([]);
      setSauleMatchedBlock(null);
      setSauleText(t('leadForm.proactivePrompt'));
      setSauleState('lead_form');
      setSauleActive(true);
      setLeadFormReason('proactive');
      setGlitchTrigger((prev) => prev + 1);
    }, PROACTIVE_LEAD_PROMPT_DELAY_MS);
  }, [isOwner, leadCaptureEnabled, t]);

  const recordEngagementClick = useCallback(
    (eventType: EngagementEventType, channel?: string | null) => {
      engagementClickCountRef.current += 1;
      checkLeadPromptThreshold();
      if (isOwner || !businessId) return;
      // Fire-and-forget — analytics kaydı ziyaretçi deneyimini asla bloklamamalı/geciktirmemeli.
      fetch('/api/analytics/track-engagement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, eventType, channel: channel || null }),
        keepalive: true,
      }).catch(() => {});
    },
    [businessId, isOwner, checkLeadPromptThreshold]
  );

  const recordSuccessfulAnswer = useCallback(() => {
    successfulAnswerCountRef.current += 1;
    checkLeadPromptThreshold();
  }, [checkLeadPromptThreshold]);

  const value = useMemo(
    () => ({
      activeBlockId,
      activeItemId,
      openSequence,
      openBlock,
      clearActiveBlock,
      businessId,
      blocks,
      contactMethod,
      contactValue,
      leadCaptureEnabled,
      customGreeting,
      sauleActive,
      setSauleActive,
      sauleText,
      setSauleText,
      sauleQuestion,
      setSauleQuestion,
      sauleSuggestions,
      setSauleSuggestions,
      sauleMatchedBlock,
      setSauleMatchedBlock,
      sauleState,
      setSauleState,
      queryTrigger,
      setQueryTrigger,
      glitchTrigger,
      triggerGlitch,
      leadFormReason,
      setLeadFormReason,
      resetToGreeting,
      recordEngagementClick,
      recordSuccessfulAnswer,
    }),
    [
      activeBlockId,
      activeItemId,
      openSequence,
      openBlock,
      clearActiveBlock,
      businessId,
      blocks,
      contactMethod,
      contactValue,
      leadCaptureEnabled,
      customGreeting,
      sauleActive,
      sauleText,
      sauleQuestion,
      sauleSuggestions,
      sauleMatchedBlock,
      sauleState,
      queryTrigger,
      glitchTrigger,
      triggerGlitch,
      leadFormReason,
      resetToGreeting,
      recordEngagementClick,
      recordSuccessfulAnswer,
    ]
  );

  return <PublicPageRuntimeContext.Provider value={value}>{children}</PublicPageRuntimeContext.Provider>;
}

export function useOptionalPublicPageRuntime() {
  return useContext(PublicPageRuntimeContext);
}
