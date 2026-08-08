import { describe, it, expect } from 'vitest';
import { buildCaptionTranslatePrompt, applyCaptionTranslations, isLocaleKey } from './captionTranslate';
import type { StudioCaption } from '@/config/studio';

describe('isLocaleKey', () => {
  it('accepts tr/en/ru and rejects everything else', () => {
    expect(isLocaleKey('tr')).toBe(true);
    expect(isLocaleKey('en')).toBe(true);
    expect(isLocaleKey('ru')).toBe(true);
    expect(isLocaleKey('fr')).toBe(false);
    expect(isLocaleKey(undefined)).toBe(false);
  });
});

describe('buildCaptionTranslatePrompt', () => {
  it('embeds the target locale and the source captions, does not leak timestamps into the schema hint', () => {
    const { system, prompt } = buildCaptionTranslatePrompt({
      captions: [
        { id: 'a', text: 'Merhaba' },
        { id: 'b', text: 'dünya' },
      ],
      targetLocale: 'en',
    });
    expect(system).toContain('İngilizce');
    expect(system).toContain('"a"');
    expect(prompt).toContain('Merhaba');
    expect(prompt).toContain('Hedef dil: en');
  });
});

describe('applyCaptionTranslations', () => {
  const source: StudioCaption[] = [
    { id: 'a', text: 'Merhaba', startTime: 0, endTime: 0.4 },
    { id: 'b', text: 'dünya', startTime: 0.4, endTime: 0.8 },
  ];

  it('copies timestamps from the source, swaps only text, in source order', () => {
    const result = applyCaptionTranslations(source, { a: 'Hello', b: 'world' });
    expect(result).toEqual([
      { id: 'a', text: 'Hello', startTime: 0, endTime: 0.4 },
      { id: 'b', text: 'world', startTime: 0.4, endTime: 0.8 },
    ]);
  });

  it('drops captions the model skipped or left blank', () => {
    const result = applyCaptionTranslations(source, { a: 'Hello', b: '   ' });
    expect(result).toEqual([{ id: 'a', text: 'Hello', startTime: 0, endTime: 0.4 }]);
  });
});
