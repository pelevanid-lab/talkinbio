import { SemanticEntry } from './searchCompiler';
import { QueryIntent, normalizeString, classifyIntent } from './intentClassifier';

export const SEMANTIC_CONFIG = {
  MATCH_THRESHOLD: 0.65,          // Minimum final score to accept a match
  MINIMUM_MARGIN: 0.08,           // Margin below which clarification is triggered
  SEMANTIC_WEIGHT: 0.80,          // Weight of the semantic similarity score
  LEXICAL_WEIGHT: 0.20,           // Weight of the lexical score
  
  // Lexical bonuses
  EXACT_PHRASE_BONUS: 0.15,
  TITLE_MATCH_BONUS: 0.08,
  FAQ_MATCH_BONUS: 0.10,
  TRIGGER_MATCH_BONUS: 0.15,
};

export type MatchResult = {
  type: 'match' | 'clarification' | 'fallback';
  text: string;
  action?: {
    type: string;
    blockId?: string;
    itemId?: string;
  };
  cueKey?: string;
  debug?: {
    normalizedQuery: string;
    detectedIntent: string;
    candidatesCount: number;
    eliminatedCount: number;
    scores: Array<{
      id: string;
      sourceType: string;
      searchText: string;
      semanticScore: number;
      lexicalScore: number;
      finalScore: number;
      intent: string;
      isEliminated: boolean;
      eliminationReason?: string;
    }>;
    topResult?: any;
    secondResult?: any;
    margin: number;
    decisionReason: string;
  };
};

/**
 * Computes Cosine Similarity between two numerical vectors.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Calculates a lexical matching score between normalized query and normalized search text components.
 */
export function calculateLexicalScore(normQuery: string, entry: SemanticEntry): number {
  if (!normQuery) return 0;
  let score = 0;
  const normSearchText = normalizeString(entry.searchText);

  // 1. Exact phrase substring check
  if (normSearchText.includes(normQuery)) {
    score += SEMANTIC_CONFIG.EXACT_PHRASE_BONUS;
  }

  // 2. Exact word overlaps / keyword match
  const queryWords = normQuery.split(' ').filter((w) => w.length > 2);
  let matchedWords = 0;
  for (const word of queryWords) {
    if (normSearchText.includes(word)) {
      matchedWords++;
    }
  }
  if (queryWords.length > 0) {
    score += (matchedWords / queryWords.length) * 0.10;
  }

  // 3. Title match boost
  if (entry.answer && normalizeString(entry.searchText).includes(normQuery)) {
    score += SEMANTIC_CONFIG.TITLE_MATCH_BONUS;
  }

  // 4. Location/Address query match boost (highly recommended for map/konum queries)
  const locationKeywords = ['adres', 'konum', 'nerede', 'yol tarifi', 'harita', 'neresi', 'yer', 'yeri'];
  const targetLocationKeywords = ['adres', 'konum', 'metro', 'istasyon', 'cadde', 'sokak', 'mahalle', 'bulvar', 'yol tarifi', 'harita', 'ilce', 'sehir', 'istanbul', 'yakasinda', 'etiler', 'maltepe', 'nerede'];
  const hasLocationQuery = locationKeywords.some(kw => normQuery.includes(kw));
  const hasLocationTarget = targetLocationKeywords.some(kw => normSearchText.includes(kw));
  if (hasLocationQuery && hasLocationTarget) {
    score += 0.35;
  }

  return Math.min(score, 1.0);
}

/**
 * Runs intent-compatible gate checks (strict filtering).
 * Book queries cannot route to learn targets, and vice versa.
 */
export function isIntentCompatible(queryIntent: QueryIntent, targetIntent?: string): { compatible: boolean; reason?: string } {
  if (queryIntent === 'unknown' || !targetIntent) return { compatible: true };

  if (queryIntent === 'book' && targetIntent === 'learn') {
    return { compatible: false, reason: 'Book query mapped to learn-only target' };
  }
  if (queryIntent === 'learn' && targetIntent === 'book') {
    return { compatible: false, reason: 'Learn query mapped to book-only target' };
  }

  return { compatible: true };
}

/**
 * Core Hybrid Semantic Ranker & Router.
 */
export function findSemanticMatch(params: {
  query: string;
  locale: 'tr' | 'en' | 'ru';
  entries: SemanticEntry[];
  queryEmbedding: number[];
  isDebugMode?: boolean;
}): MatchResult {
  const { query, locale, entries, queryEmbedding, isDebugMode = false } = params;
  const normQuery = normalizeString(query);
  const detectedIntent = classifyIntent(query, locale);

  const debugScores: NonNullable<MatchResult['debug']>['scores'] = [];
  const validCandidates: Array<{ entry: SemanticEntry; finalScore: number; semanticScore: number; lexicalScore: number }> = [];

  let eliminatedCount = 0;

  for (const entry of entries) {
    // Correct locale filter
    if (entry.locale !== locale) continue;

    // 1. Intent-compatibility hard reject
    const compatibility = isIntentCompatible(detectedIntent, entry.intent);
    if (!compatibility.compatible) {
      eliminatedCount++;
      if (isDebugMode) {
        debugScores.push({
          id: entry.id,
          sourceType: entry.sourceType,
          searchText: entry.searchText,
          semanticScore: 0,
          lexicalScore: 0,
          finalScore: 0,
          intent: entry.intent || '',
          isEliminated: true,
          eliminationReason: compatibility.reason
        });
      }
      continue;
    }

    // 2. Cosine similarity
    let semanticScore = 0;
    if (entry.embedding && queryEmbedding) {
      semanticScore = cosineSimilarity(queryEmbedding, entry.embedding);
    }

    // 3. Lexical matching and bonuses
    const lexicalScore = calculateLexicalScore(normQuery, entry);

    // 4. Final hybrid score
    const finalScore = (semanticScore * SEMANTIC_CONFIG.SEMANTIC_WEIGHT) + (lexicalScore * SEMANTIC_CONFIG.LEXICAL_WEIGHT);

    validCandidates.push({ entry, finalScore, semanticScore, lexicalScore });

    if (isDebugMode) {
      debugScores.push({
        id: entry.id,
        sourceType: entry.sourceType,
        searchText: entry.searchText,
        semanticScore,
        lexicalScore,
        finalScore,
        intent: entry.intent || '',
        isEliminated: false
      });
    }
  }

  // Sort candidates by final score descending
  validCandidates.sort((a, b) => b.finalScore - a.finalScore);

  const top = validCandidates[0];
  const second = validCandidates[1];

  let decisionReason = 'No match found above threshold';
  let matchResult: MatchResult;

  if (!top || top.finalScore < SEMANTIC_CONFIG.MATCH_THRESHOLD) {
    decisionReason = top 
      ? `Top result score ${top.finalScore.toFixed(3)} is below threshold ${SEMANTIC_CONFIG.MATCH_THRESHOLD}`
      : 'No candidates passed compatibility filters';
      
    matchResult = {
      type: 'fallback',
      text: locale === 'tr' ? 'Bunu tam olarak anlayamadım. Nasıl yardımcı olabilirim?' : (locale === 'ru' ? 'Я не совсем понял это. Чем я могу помочь?' : "I couldn't quite understand that. How can I help you?"),
    };
  } else if (second && (top.finalScore - second.finalScore) < SEMANTIC_CONFIG.MINIMUM_MARGIN) {
    decisionReason = `Margin between top (${top.finalScore.toFixed(3)}) and second (${second.finalScore.toFixed(3)}) is ${(top.finalScore - second.finalScore).toFixed(3)} which is below ${SEMANTIC_CONFIG.MINIMUM_MARGIN}`;
    
    // Build clarification options in appropriate language
    const getTitle = (ent: SemanticEntry) => {
      // Find the cleanest title
      return ent.searchText.split('.')[0] || ent.sourceType;
    };
    const tOpt = getTitle(top.entry);
    const sOpt = getTitle(second.entry);

    let text = `Şununla mı, yoksa bununla mı ilgileniyorsunuz: "${tOpt}" yoksa "${sOpt}"?`;
    if (locale === 'en') {
      text = `Are you interested in: "${tOpt}" or "${sOpt}"?`;
    } else if (locale === 'ru') {
      text = `Вас интересует: "${tOpt}" или "${sOpt}"?`;
    }

    matchResult = {
      type: 'clarification',
      text,
      // Clarification lists the two alternatives as actions so the user can easily select one
      action: {
        type: 'clarification_prompt',
        blockId: top.entry.action.blockId || second.entry.action.blockId,
        itemId: `${top.entry.id}|${second.entry.id}`
      }
    };
  } else {
    decisionReason = `Match found with high confidence! Top score is ${top.finalScore.toFixed(3)}.`;
    
    matchResult = {
      type: 'match',
      text: top.entry.answer || (locale === 'tr' ? `${top.entry.searchText} bölümünü açıyorum.` : (locale === 'ru' ? `Открываю раздел ${top.entry.searchText}.` : `Opening ${top.entry.searchText} section.`)),
      action: top.entry.action,
    };
  }

  if (isDebugMode) {
    matchResult.debug = {
      normalizedQuery: normQuery,
      detectedIntent,
      candidatesCount: entries.filter((e) => e.locale === locale).length,
      eliminatedCount,
      scores: debugScores.sort((a, b) => b.finalScore - a.finalScore),
      topResult: top ? { id: top.entry.id, finalScore: top.finalScore, searchText: top.entry.searchText } : null,
      secondResult: second ? { id: second.entry.id, finalScore: second.finalScore, searchText: second.entry.searchText } : null,
      margin: second && top ? top.finalScore - second.finalScore : 1.0,
      decisionReason
    };
  }

  return matchResult;
}
