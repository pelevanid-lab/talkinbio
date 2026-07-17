import { describe, it, expect } from 'vitest';
import {
  buildTranscriptExcerpt,
  buildAnalysisPrompt,
  parseAnalysisResult,
  buildInsightTriggerMessage,
} from './analyzeConversations';

describe('buildTranscriptExcerpt', () => {
  it('joins messages as a bulleted list', () => {
    expect(buildTranscriptExcerpt(['fiyat ne kadar?', 'randevu alabilir miyim?'])).toBe(
      '- fiyat ne kadar?\n- randevu alabilir miyim?'
    );
  });

  it('truncates to the most recent characters when the transcript is too long', () => {
    const messages = Array.from({ length: 2000 }, (_, i) => `mesaj ${i}`);
    const excerpt = buildTranscriptExcerpt(messages);
    expect(excerpt.length).toBeLessThanOrEqual(12000);
    expect(excerpt).toContain('mesaj 1999');
  });
});

describe('buildAnalysisPrompt', () => {
  it('embeds the transcript excerpt and demands JSON-only output', () => {
    const { system, prompt } = buildAnalysisPrompt('- fiyat ne kadar?');
    expect(system).toMatch(/JSON/);
    expect(prompt).toContain('fiyat ne kadar?');
  });
});

describe('parseAnalysisResult', () => {
  it('parses a valid result and caps topics at 3', () => {
    const text = JSON.stringify({
      topics: [
        { question: 'fiyat', count: 5 },
        { question: 'randevu', count: 4 },
        { question: 'iade', count: 3 },
        { question: 'kargo', count: 2 },
      ],
      summary: 'Genel özet.',
    });
    const result = parseAnalysisResult(text);
    expect(result?.topics).toHaveLength(3);
    expect(result?.summary).toBe('Genel özet.');
  });

  it('returns null for malformed output', () => {
    expect(parseAnalysisResult('not json at all')).toBeNull();
  });

  it('returns empty topics with no crash when topics is missing malformed entries', () => {
    const text = JSON.stringify({ topics: [{ question: 'ok', count: 2 }, { bad: true }], summary: 's' });
    const result = parseAnalysisResult(text);
    expect(result?.topics).toEqual([{ question: 'ok', count: 2 }]);
  });
});

describe('buildInsightTriggerMessage', () => {
  it('includes the topic in the trigger message', () => {
    expect(buildInsightTriggerMessage('fiyat bilgisi')).toContain('fiyat bilgisi');
  });
});
