import { describe, test, expect, vi } from 'vitest';
import { compileSemanticEntry } from './searchCompiler';
import { normalizeString, checkExplicitContact, classifyIntent } from './intentClassifier';
import { cosineSimilarity, calculateLexicalScore, findSemanticMatch } from './matcher';
import { FakeEmbeddingProvider } from './embeddingProvider';

describe('1. Normalization & Text Preprocessing', () => {
  test('should accurately normalize Turkish characters and strip punctuation', () => {
    const raw = 'Şaşılacak bir şey oldu, mi?';
    const normalized = normalizeString(raw);
    expect(normalized).toBe('sasilacak bir sey oldu mi');
  });

  test('should normalize Russian ё characters', () => {
    const raw = 'Ещё один день!';
    const normalized = normalizeString(raw);
    expect(normalized).toBe('еще один день');
  });
});

describe('2. Intent Classification Dictionary Rules', () => {
  test('should classify "randevu almak istiyorum" as book', () => {
    expect(classifyIntent('randevu almak istiyorum', 'tr')).toBe('book');
  });

  test('should classify "how much does it cost" as ask_price', () => {
    expect(classifyIntent('how much does it cost', 'en')).toBe('ask_price');
  });

  test('should classify "обучение массажу" as learn', () => {
    expect(classifyIntent('обучение массажу', 'ru')).toBe('learn');
  });
});

describe('3. Prioritized Contact Intent Interceptors', () => {
  test('should intercept explicit whatsapp request', () => {
    const res = checkExplicitContact('WhatsApp iletişim hattı var mı?', 'tr');
    expect(res.isContactQuery).toBe(true);
    expect(res.isExplicitChannel).toBe(true);
    expect(res.channel).toBe('whatsapp');
  });

  test('should intercept generic reach out requests', () => {
    const res = checkExplicitContact('bize nasıl ulaşabilirim', 'tr');
    expect(res.isContactQuery).toBe(true);
    expect(res.isExplicitChannel).toBe(false);
    expect(res.isGenericRequest).toBe(true);
  });
});

describe('4. Search Compiler Restrictions', () => {
  test('should NOT compile entries with internal_only behavior', () => {
    const entry = compileSemanticEntry({
      businessId: 'biz_123',
      locale: 'tr',
      sourceType: 'knowledge',
      sourceId: 'know_123',
      title: 'Gizli Şifre',
      description: 'Gizli bilgi tabanı notu',
      action: { type: 'render_answer' },
      behavior: 'internal_only'
    });
    expect(entry).toBeNull();
  });

  test('should clip excessively long answers inside search text to avoid fuzzy noise', () => {
    const longAnswer = 'A '.repeat(200); // 400 chars
    const entry = compileSemanticEntry({
      businessId: 'biz_123',
      locale: 'tr',
      sourceType: 'faq',
      sourceId: 'faq_123',
      title: 'SSS Başlığı',
      answer: longAnswer,
      action: { type: 'open_block' }
    });
    expect(entry).not.toBeNull();
    expect(entry!.searchText.length).toBeLessThan(150); // should be clipped to around 80 chars
  });
});

describe('5. Cosine Similarity & Lexical Matching Tests', () => {
  test('should compute correct cosine similarity between vectors', () => {
    const vecA = [1, 0, 0];
    const vecB = [1, 0, 0];
    const vecC = [0, 1, 0];
    expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(1.0);
    expect(cosineSimilarity(vecA, vecC)).toBeCloseTo(0.0);
  });

  test('should apply exact phrase match and title match lexical bonuses', () => {
    const mockEntry = compileSemanticEntry({
      businessId: 'biz_123',
      locale: 'tr',
      sourceType: 'block',
      sourceId: 'services_block',
      title: 'Profesyonel Masaj Seansı',
      action: { type: 'open_block' }
    })!;

    const score = calculateLexicalScore('profesyonel masaj', mockEntry);
    expect(score).toBeGreaterThan(0.1); // should get exact phrase bonus
  });
});

describe('6. Full Routing Match, Clarification, & Fallback Cycles', () => {
  const mockEntries = [
    {
      id: 'block:appointments:tr',
      businessId: 'biz_123',
      locale: 'tr' as const,
      sourceType: 'block' as const,
      sourceId: 'appointments',
      intent: 'book' as const,
      searchText: 'Randevu almak. Rezervasyon yapmak. Takvim planla.',
      answer: 'Randevu sayfasına yönlendiriyorum.',
      action: { type: 'open_block', blockId: 'appointments' },
      embedding: [0.9, 0.1, 0.1, 0.0]
    },
    {
      id: 'block:services:tr',
      businessId: 'biz_123',
      locale: 'tr' as const,
      sourceType: 'block' as const,
      sourceId: 'services',
      intent: 'learn' as const,
      searchText: 'Masaj eğitimi almak. Kurs ders.',
      answer: 'Eğitim detaylarını açıyorum.',
      action: { type: 'open_block', blockId: 'services' },
      embedding: [0.85, 0.15, 0.1, 0.0]
    },
    {
      id: 'block:gallery:tr',
      businessId: 'biz_123',
      locale: 'tr' as const,
      sourceType: 'block' as const,
      sourceId: 'gallery',
      intent: 'view_work' as const,
      searchText: 'Portfolyo fotoğrafları. Galeri resimleri.',
      answer: 'Fotoğrafları gösteriyorum.',
      action: { type: 'open_block', blockId: 'gallery' },
      embedding: [0.1, 0.1, 0.9, 0.0]
    }
  ];

  test('should match high confidence booking query and reject learn target', () => {
    const result = findSemanticMatch({
      query: 'seans randevusu oluşturmak istiyorum',
      locale: 'tr',
      entries: mockEntries,
      queryEmbedding: [0.85, 0.15, 0.0, 0.0],
      isDebugMode: true
    });

    expect(result.type).toBe('match');
    expect(result.action?.blockId).toBe('appointments');
  });

  test('should trigger clarification when similarity margin is tight', () => {
    // A neutral intent query with embeddings close to two entries
    const result = findSemanticMatch({
      query: 'bölüm yapısı',
      locale: 'tr',
      entries: mockEntries,
      queryEmbedding: [0.98, 0.15, 0.0, 0.0],
      isDebugMode: true
    });

    expect(result.type).toBe('clarification');
    expect(result.text).toContain('ilgileniyorsunuz');
  });

  test('should trigger fallback when similarity score is completely below threshold', () => {
    const result = findSemanticMatch({
      query: 'uzay gemisi fırlatma saatleri',
      locale: 'tr',
      entries: mockEntries,
      queryEmbedding: [0.0, 0.0, 0.0, 1.0],
      isDebugMode: true
    });

    expect(result.type).toBe('fallback');
  });
});
