'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { PageActionBlockTarget } from '@/utils/pageActionTargets';

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
  knowledge: any[];
  businessName: string;
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
};

const PublicPageRuntimeContext = createContext<PublicPageRuntimeValue | null>(null);

export function PublicPageRuntimeProvider({
  children,
  targets,
  businessId = '',
  blocks = [],
  knowledge = [],
  businessName = '',
  contactMethod = null,
  contactValue = null,
  leadCaptureEnabled = true,
  customGreeting = null,
}: {
  children: ReactNode;
  targets: PageActionBlockTarget[];
  businessId?: string;
  blocks?: any[];
  knowledge?: any[];
  businessName?: string;
  contactMethod?: string | null;
  contactValue?: string | null;
  leadCaptureEnabled?: boolean;
  customGreeting?: any;
}) {
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

  const triggerGlitch = useCallback(() => {
    setGlitchTrigger((prev) => prev + 1);
  }, []);

  const targetMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    targets.forEach((target) => map.set(target.blockId, new Set(target.items.map((item) => item.itemId))));
    return map;
  }, [targets]);

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

  const value = useMemo(
    () => ({
      activeBlockId,
      activeItemId,
      openSequence,
      openBlock,
      clearActiveBlock,
      businessId,
      blocks,
      knowledge,
      businessName,
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
    }),
    [
      activeBlockId,
      activeItemId,
      openSequence,
      openBlock,
      clearActiveBlock,
      businessId,
      blocks,
      knowledge,
      businessName,
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
    ]
  );

  return <PublicPageRuntimeContext.Provider value={value}>{children}</PublicPageRuntimeContext.Provider>;
}

export function useOptionalPublicPageRuntime() {
  return useContext(PublicPageRuntimeContext);
}
