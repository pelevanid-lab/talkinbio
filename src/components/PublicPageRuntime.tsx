'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { PageActionBlockTarget } from '@/utils/pageActionTargets';

type PageActionResult = {
  ok: boolean;
  reason?: 'missing_target' | 'unknown_block' | 'unknown_item';
};

type PublicPageRuntimeValue = {
  activeBlockId: string | null;
  activeItemId: string | null;
  openSequence: number;
  openBlock: (blockId: string, itemId?: string | null) => PageActionResult;
  clearActiveBlock: () => void;
};

const PublicPageRuntimeContext = createContext<PublicPageRuntimeValue | null>(null);

export function PublicPageRuntimeProvider({
  children,
  targets,
}: {
  children: ReactNode;
  targets: PageActionBlockTarget[];
}) {
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [openSequence, setOpenSequence] = useState(0);
  const targetMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    targets.forEach((target) => map.set(target.blockId, new Set(target.items.map((item) => item.itemId))));
    return map;
  }, [targets]);

  const openBlock = useCallback(
    (blockId: string, itemId?: string | null): PageActionResult => {
      if (!blockId) return { ok: false, reason: 'missing_target' };
      const itemSet = targetMap.get(blockId);
      if (!itemSet) return { ok: false, reason: 'unknown_block' };
      if (itemId && itemSet.size > 0 && !itemSet.has(itemId)) return { ok: false, reason: 'unknown_item' };
      setActiveBlockId(blockId);
      setActiveItemId(itemId || null);
      setOpenSequence((sequence) => sequence + 1);
      return { ok: true };
    },
    [targetMap]
  );

  const clearActiveBlock = useCallback(() => {
    setActiveBlockId(null);
    setActiveItemId(null);
  }, []);

  const value = useMemo(
    () => ({ activeBlockId, activeItemId, openSequence, openBlock, clearActiveBlock }),
    [activeBlockId, activeItemId, openSequence, openBlock, clearActiveBlock]
  );

  return <PublicPageRuntimeContext.Provider value={value}>{children}</PublicPageRuntimeContext.Provider>;
}

export function useOptionalPublicPageRuntime() {
  return useContext(PublicPageRuntimeContext);
}
