export const PUBLISHED_SNAPSHOT_BLOCK_TYPE = 'published_snapshot';

export function isPublishedSnapshotBlock(block: any): boolean {
  return block?.type === PUBLISHED_SNAPSHOT_BLOCK_TYPE;
}

export function isEditorSystemBlock(block: any): boolean {
  return block?.type === 'settings' || block?.type === 'contact' || isPublishedSnapshotBlock(block);
}

export function stripPublishedSnapshotBlock(blocks: any[]): any[] {
  return (blocks || []).filter((block) => !isPublishedSnapshotBlock(block));
}

function cloneJson<T>(value: T): T {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function snapshotBlock(block: any) {
  return {
    id: block.id,
    business_id: block.business_id,
    type: block.type,
    title: block.title,
    content: cloneJson(block.content || {}),
    order: block.order ?? 0,
    is_visible: block.is_visible !== false,
  };
}

export function createPublishedSnapshot(business: any, blocks: any[]) {
  return {
    version: 1,
    publishedAt: new Date().toISOString(),
    business: {
      name: business.name,
      category: business.category,
      contact_method: business.contact_method,
      contact_value: business.contact_value,
      page_title: business.page_title,
      tagline: cloneJson(business.tagline || null),
      theme: cloneJson(business.theme || null),
      saule_settings: cloneJson(business.saule_settings || {}),
      active_locales: cloneJson(business.active_locales || null),
      archetype_id: business.archetype_id,
    },
    blocks: stripPublishedSnapshotBlock(blocks).map(snapshotBlock),
  };
}

export function getPublishedSnapshot(blocks: any[]) {
  const block = (blocks || []).find(isPublishedSnapshotBlock);
  const content = block?.content;
  if (!content || !Array.isArray(content.blocks)) return null;
  return content;
}

export function resolvePublishedRuntimeData(business: any, blocks: any[], isDraftPreview: boolean) {
  const draftBlocks = stripPublishedSnapshotBlock(blocks);
  if (isDraftPreview) {
    return { business, blocks: draftBlocks, snapshot: null };
  }

  const snapshot = getPublishedSnapshot(blocks);
  if (!snapshot) {
    return { business, blocks: draftBlocks, snapshot: null };
  }

  return {
    business: { ...business, ...(snapshot.business || {}) },
    blocks: Array.isArray(snapshot.blocks) ? snapshot.blocks : draftBlocks,
    snapshot,
  };
}
