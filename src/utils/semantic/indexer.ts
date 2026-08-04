import { SupabaseClient } from '@supabase/supabase-js';
import { compilePageSemanticEntries, SemanticEntry } from './searchCompiler';
import { EmbeddingProvider } from './embeddingProvider';

export type IndexResult = {
  success: boolean;
  version?: string;
  entriesCount: number;
  newEmbeddingsCount: number;
  fallbackUsed: boolean;
  error?: string;
};

/**
 * Helper to check if the custom table `saule_semantic_index` exists and is accessible.
 */
async function checkTableExists(supabase: SupabaseClient): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('saule_semantic_index')
      .select('id')
      .limit(1);
      
    if (error && error.code === '42P01') {
      return false; // Table relation does not exist
    }
    return !error;
  } catch {
    return false;
  }
}

/**
 * Incremental, hash-cached index builder that compiles semantic entries and generates BGE-M3 embeddings.
 * Supports transparent fallback to hidden system blocks if table migration has not been run.
 */
export async function buildSemanticIndex(params: {
  supabase: SupabaseClient;
  businessId: string;
  publishVersion: 'draft' | string;
  embeddingProvider: EmbeddingProvider;
}): Promise<IndexResult> {
  const { supabase, businessId, publishVersion, embeddingProvider } = params;

  try {
    // 1. Fetch source data (business details, active blocks, and knowledge base notes)
    const { data: business, error: bErr } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();
    if (bErr) throw bErr;

    const { data: blocks, error: blErr } = await supabase
      .from('blocks')
      .select('*')
      .eq('business_id', businessId)
      .order('order', { ascending: true });
    if (blErr) throw blErr;

    const { data: knowledge, error: kErr } = await supabase
      .from('saule_knowledge')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true);
    if (kErr) throw kErr;

    // 2. Compile elements into localized SearchTexts
    const compiledEntries = compilePageSemanticEntries(business, blocks || [], knowledge || []);
    if (compiledEntries.length === 0) {
      return { success: true, entriesCount: 0, newEmbeddingsCount: 0, fallbackUsed: false };
    }

    // 3. Determine if we use the custom table or fallback blocks
    const tableExists = await checkTableExists(supabase);
    
    // 4. Fetch existing cached embeddings to minimize api calls
    const cacheMap = new Map<string, number[]>();
    
    if (tableExists) {
      const { data: existing } = await supabase
        .from('saule_semantic_index')
        .select('search_text_hash, embedding')
        .eq('business_id', businessId);
      
      if (existing) {
        for (const row of existing) {
          if (row.embedding) {
            // Support database storing as either JSONB string array or direct array
            const vec = Array.isArray(row.embedding) ? row.embedding : JSON.parse(row.embedding);
            cacheMap.set(row.search_text_hash, vec);
          }
        }
      }
    } else {
      // Check fallback block
      const { data: fallbackBlock } = await supabase
        .from('blocks')
        .select('content')
        .eq('business_id', businessId)
        .in('type', ['draft_semantic_index', 'published_semantic_index'])
        .limit(2);
        
      if (fallbackBlock) {
        for (const b of fallbackBlock) {
          if (b.content?.entries) {
            for (const ent of b.content.entries) {
              if (ent.search_text_hash && ent.embedding) {
                cacheMap.set(ent.search_text_hash, ent.embedding);
              }
            }
          }
        }
      }
    }

    // 5. Build list of unique SearchTexts that require embedding generation
    const hashesToGenerate: string[] = [];
    const textsToGenerate: string[] = [];
    const textToHashMap = new Map<string, string>();

    for (const entry of compiledEntries) {
      const hash = entry.search_text_hash!;
      if (!cacheMap.has(hash)) {
        if (!textToHashMap.has(entry.searchText)) {
          textToHashMap.set(entry.searchText, hash);
          hashesToGenerate.push(hash);
          textsToGenerate.push(entry.searchText);
        }
      }
    }

    // 6. Batch generate new embeddings via Workers AI
    let newEmbeddingsCount = 0;
    if (textsToGenerate.length > 0) {
      // Cloudflare text limits: BGE-M3 handles large batches easily. We'll chunk in batches of 16.
      const batchSize = 16;
      for (let i = 0; i < textsToGenerate.length; i += batchSize) {
        const batchTexts = textsToGenerate.slice(i, i + batchSize);
        const batchHashes = hashesToGenerate.slice(i, i + batchSize);
        
        const vectors = await embeddingProvider.embedDocuments(batchTexts);
        for (let j = 0; j < vectors.length; j++) {
          cacheMap.set(batchHashes[j], vectors[j]);
          newEmbeddingsCount++;
        }
      }
    }

    // Assign embeddings to compiled entries
    const finalEntries: SemanticEntry[] = [];
    for (const entry of compiledEntries) {
      const vec = cacheMap.get(entry.search_text_hash!);
      if (vec) {
        entry.embedding = vec;
        finalEntries.push(entry);
      }
    }

    // 7. Persist index entries
    if (tableExists) {
      // Clean up previous records for this version
      const { error: dErr } = await supabase
        .from('saule_semantic_index')
        .delete()
        .eq('business_id', businessId)
        .eq('publish_version', publishVersion);
      if (dErr) throw dErr;

      // Batch insert into custom table
      const rows = finalEntries.map((ent) => ({
        business_id: businessId,
        publish_version: publishVersion,
        locale: ent.locale,
        entry_id: ent.id,
        source_type: ent.sourceType,
        source_id: ent.sourceId,
        source_item_id: ent.sourceItemId || null,
        intent: ent.intent || null,
        search_text_hash: ent.search_text_hash,
        search_text: ent.searchText,
        answer: ent.answer || null,
        action: ent.action,
        behavior: ent.behavior || null,
        embedding: ent.embedding,
      }));

      // Supabase chunk insert for safety (e.g. batches of 100 rows)
      const chunkSize = 100;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const batch = rows.slice(i, i + chunkSize);
        const { error: insErr } = await supabase
          .from('saule_semantic_index')
          .insert(batch);
        if (insErr) throw insErr;
      }
    } else {
      // Fallback blocks storage
      const blockType = publishVersion === 'draft' ? 'draft_semantic_index' : 'published_semantic_index';
      const { data: existingBlock } = await supabase
        .from('blocks')
        .select('id')
        .eq('business_id', businessId)
        .eq('type', blockType)
        .maybeSingle();

      const content = {
        version: 1,
        publishVersion,
        publishedAt: new Date().toISOString(),
        entries: finalEntries.map((ent) => ({
          id: ent.id,
          locale: ent.locale,
          sourceType: ent.sourceType,
          sourceId: ent.sourceId,
          sourceItemId: ent.sourceItemId,
          intent: ent.intent,
          search_text_hash: ent.search_text_hash,
          searchText: ent.searchText,
          answer: ent.answer,
          action: ent.action,
          behavior: ent.behavior,
          embedding: ent.embedding,
        }))
      };

      if (existingBlock?.id) {
        const { error: updErr } = await supabase
          .from('blocks')
          .update({ content })
          .eq('id', existingBlock.id);
        if (updErr) throw updErr;
      } else {
        const { error: insErr } = await supabase
          .from('blocks')
          .insert({
            business_id: businessId,
            type: blockType,
            title: blockType === 'draft_semantic_index' ? 'Draft Semantic Index' : 'Published Semantic Index',
            content,
            order: 10001,
            is_visible: false,
          });
        if (insErr) throw insErr;
      }
    }

    return {
      success: true,
      version: publishVersion,
      entriesCount: finalEntries.length,
      newEmbeddingsCount,
      fallbackUsed: !tableExists,
    };
  } catch (err: any) {
    console.error('Error building semantic index:', err);
    return {
      success: false,
      entriesCount: 0,
      newEmbeddingsCount: 0,
      fallbackUsed: false,
      error: err.message || JSON.stringify(err),
    };
  }
}

/**
 * Loads the active semantic index entries for a business based on publish version.
 */
export async function loadSemanticIndex(params: {
  supabase: SupabaseClient;
  businessId: string;
  publishVersion: 'draft' | string;
}): Promise<SemanticEntry[]> {
  const { supabase, businessId, publishVersion } = params;

  try {
    const tableExists = await checkTableExists(supabase);

    if (tableExists) {
      const { data, error } = await supabase
        .from('saule_semantic_index')
        .select('*')
        .eq('business_id', businessId)
        .eq('publish_version', publishVersion);
        
      if (error) throw error;
      if (!data) return [];

      return data.map((row) => ({
        id: row.entry_id,
        businessId: row.business_id,
        locale: row.locale as 'tr' | 'en' | 'ru',
        sourceType: row.source_type as any,
        sourceId: row.source_id,
        sourceItemId: row.source_item_id || undefined,
        intent: row.intent as any,
        searchText: row.search_text,
        answer: row.answer || undefined,
        action: row.action,
        behavior: row.behavior as any,
        embedding: Array.isArray(row.embedding) ? row.embedding : JSON.parse(row.embedding),
        search_text_hash: row.search_text_hash,
      }));
    } else {
      // Fallback blocks
      const blockType = publishVersion === 'draft' ? 'draft_semantic_index' : 'published_semantic_index';
      const { data: block } = await supabase
        .from('blocks')
        .select('content')
        .eq('business_id', businessId)
        .eq('type', blockType)
        .maybeSingle();

      if (!block || !block.content?.entries) return [];
      
      return block.content.entries.map((ent: any) => ({
        ...ent,
        businessId,
      }));
    }
  } catch (err) {
    console.error('Failed to load semantic index:', err);
    return [];
  }
}
