import { describe, it, expect } from 'vitest';
import { parseJsonResult } from './parseJsonResult';

describe('parseJsonResult', () => {
  it('parses a plain JSON object', () => {
    expect(parseJsonResult('{"a": 1}')).toEqual({ a: 1 });
  });

  it('extracts JSON wrapped in prose or a markdown fence', () => {
    const wrapped = 'Here you go:\n```json\n{"a": 1, "b": [1,2]}\n```\nHope that helps.';
    expect(parseJsonResult(wrapped)).toEqual({ a: 1, b: [1, 2] });
  });

  it('returns null for malformed JSON', () => {
    expect(parseJsonResult('{"a": }')).toBeNull();
  });

  it('returns null when no JSON-like block is present', () => {
    expect(parseJsonResult('just some text')).toBeNull();
  });
});
