import { describe, it, expect } from 'vitest';
import { parseContentPillars, isContentPlanStatus, isContentPlanFormat, MAX_PILLARS, MAX_PILLAR_LABEL_LENGTH } from './contentPlan';

describe('parseContentPillars', () => {
  it('returns [] for missing/non-array input (backward compat: old businesses row)', () => {
    expect(parseContentPillars(undefined)).toEqual([]);
    expect(parseContentPillars(null)).toEqual([]);
    expect(parseContentPillars('not an array')).toEqual([]);
  });

  it('round-trips a well-formed pillar and generates an id when missing', () => {
    const result = parseContentPillars([{ label: 'Mit Kırma', description: 'Beslenme mitlerini çürütür' }]);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('Mit Kırma');
    expect(typeof result[0].id).toBe('string');
    expect(result[0].id.length).toBeGreaterThan(0);
  });

  it('drops entries with a missing/empty/too-long label', () => {
    const tooLong = 'x'.repeat(MAX_PILLAR_LABEL_LENGTH + 1);
    const result = parseContentPillars([{ label: '' }, { label: tooLong }, { description: 'no label at all' }]);
    expect(result).toEqual([]);
  });

  it('truncates to MAX_PILLARS', () => {
    const many = Array.from({ length: MAX_PILLARS + 4 }, (_, i) => ({ label: `Sütun ${i}` }));
    expect(parseContentPillars(many)).toHaveLength(MAX_PILLARS);
  });
});

describe('isContentPlanStatus / isContentPlanFormat', () => {
  it('accepts known values, rejects unknown', () => {
    expect(isContentPlanStatus('idea')).toBe(true);
    expect(isContentPlanStatus('posted')).toBe(true);
    expect(isContentPlanStatus('archived')).toBe(false);
    expect(isContentPlanFormat('instagram_post')).toBe(true);
    expect(isContentPlanFormat('tiktok')).toBe(false);
  });
});
