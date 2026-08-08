import { describe, it, expect } from 'vitest';
import {
  parseStudioTimeline,
  applyCaptionSpeed,
  groupCaptions,
  findSilenceCuts,
  removeCutRanges,
  resolveReframePoint,
  FILLER_WORDS_TR,
  MAX_DUBS,
  MAX_CAPTIONS,
} from './studio';
import type { StudioCaption, StudioReframePoint } from './studio';

const BASE = { aspectRatio: '9:16', trim: { start: 0, end: 0 } };

describe('parseStudioTimeline — dubs/translatedCaptions backward compatibility', () => {
  it('defaults to [] / {} when a project was saved before these fields existed', () => {
    const parsed = parseStudioTimeline(BASE);
    expect(parsed).not.toBeNull();
    expect(parsed!.dubs).toEqual([]);
    expect(parsed!.translatedCaptions).toEqual({});
  });

  it('does not throw on a fully old-shaped timeline (captions present, no translation/dub fields)', () => {
    const parsed = parseStudioTimeline({
      ...BASE,
      captions: [{ id: 'a', text: 'Merhaba', startTime: 0, endTime: 0.5 }],
    });
    expect(parsed!.captions).toHaveLength(1);
    expect(parsed!.dubs).toEqual([]);
    expect(parsed!.translatedCaptions).toEqual({});
  });
});

describe('parseStudioTimeline — dubs', () => {
  const validDub = {
    id: 'd1',
    locale: 'en',
    sourceUrl: 'https://cdn.example.com/source.mp4',
    videoUrl: 'https://cdn.example.com/dubbed-en.mp4',
    createdAt: '2026-08-08T00:00:00.000Z',
  };

  it('round-trips a well-formed dub', () => {
    const parsed = parseStudioTimeline({ ...BASE, dubs: [validDub] });
    expect(parsed!.dubs).toEqual([validDub]);
  });

  it('drops a dub with an unsupported locale', () => {
    const parsed = parseStudioTimeline({ ...BASE, dubs: [{ ...validDub, locale: 'fr' }] });
    expect(parsed!.dubs).toEqual([]);
  });

  it('drops a dub with a non-http url', () => {
    const parsed = parseStudioTimeline({ ...BASE, dubs: [{ ...validDub, videoUrl: 'not-a-url' }] });
    expect(parsed!.dubs).toEqual([]);
  });

  it('generates an id when missing and truncates to MAX_DUBS', () => {
    const many = Array.from({ length: MAX_DUBS + 3 }, (_, i) => ({ ...validDub, id: undefined, locale: 'en' as const, videoUrl: `https://cdn.example.com/${i}.mp4` }));
    const parsed = parseStudioTimeline({ ...BASE, dubs: many });
    expect(parsed!.dubs).toHaveLength(MAX_DUBS);
    expect(parsed!.dubs.every((d) => typeof d.id === 'string' && d.id.length > 0)).toBe(true);
  });
});

describe('parseStudioTimeline — translatedCaptions', () => {
  it('round-trips captions under a valid locale key, ignoring an unknown locale key', () => {
    const parsed = parseStudioTimeline({
      ...BASE,
      translatedCaptions: {
        en: [{ id: 'a', text: 'Hello', startTime: 0, endTime: 0.5 }],
        fr: [{ id: 'a', text: 'Bonjour', startTime: 0, endTime: 0.5 }],
      },
    });
    expect(parsed!.translatedCaptions.en).toEqual([{ id: 'a', text: 'Hello', startTime: 0, endTime: 0.5 }]);
    expect(parsed!.translatedCaptions).not.toHaveProperty('fr');
  });

  it('omits a locale key entirely when its array is empty', () => {
    const parsed = parseStudioTimeline({ ...BASE, translatedCaptions: { en: [] } });
    expect(parsed!.translatedCaptions).toEqual({});
  });

  it('truncates each locale track to MAX_CAPTIONS', () => {
    const many = Array.from({ length: MAX_CAPTIONS + 5 }, (_, i) => ({ id: `c${i}`, text: 'x', startTime: i, endTime: i + 0.1 }));
    const parsed = parseStudioTimeline({ ...BASE, translatedCaptions: { en: many } });
    expect(parsed!.translatedCaptions.en).toHaveLength(MAX_CAPTIONS);
  });
});

describe('parseStudioTimeline — captionStyle speed/groupSize', () => {
  it('defaults to speed=1, groupSize=1 when missing (old projects)', () => {
    const parsed = parseStudioTimeline(BASE);
    expect(parsed!.captionStyle.speed).toBe(1);
    expect(parsed!.captionStyle.groupSize).toBe(1);
  });

  it('clamps out-of-range values instead of rejecting the whole timeline', () => {
    const parsed = parseStudioTimeline({ ...BASE, captionStyle: { speed: 99, groupSize: 99 } });
    expect(parsed!.captionStyle.speed).toBeLessThanOrEqual(2.5);
    expect(parsed!.captionStyle.groupSize).toBeLessThanOrEqual(4);
  });
});

describe('applyCaptionSpeed', () => {
  const captions: StudioCaption[] = [
    { id: 'a', text: 'bir', startTime: 1, endTime: 1.4 },
    { id: 'b', text: 'iki', startTime: 1.4, endTime: 1.8 },
  ];

  it('is a no-op at speed=1', () => {
    expect(applyCaptionSpeed(captions, 1)).toBe(captions);
  });

  it('stretches timing from the first caption as pivot, preserving text/order', () => {
    const result = applyCaptionSpeed(captions, 2);
    expect(result.map((c) => c.text)).toEqual(['bir', 'iki']);
    expect(result[0].startTime).toBeCloseTo(1);
    expect(result[0].endTime).toBeCloseTo(1.8);
    expect(result[1].startTime).toBeCloseTo(1.8);
    expect(result[1].endTime).toBeCloseTo(2.6);
  });
});

describe('groupCaptions', () => {
  const captions: StudioCaption[] = [
    { id: 'a', text: 'Herhangi', startTime: 0, endTime: 0.4 },
    { id: 'b', text: 'bir', startTime: 0.4, endTime: 0.8 },
    { id: 'c', text: 'yüz', startTime: 0.8, endTime: 1.2 },
  ];

  it('at groupSize<=1, returns one group per caption with a single memberId', () => {
    const groups = groupCaptions(captions, 1);
    expect(groups).toEqual(captions.map((c) => ({ ...c, memberIds: [c.id] })));
  });

  it('merges N consecutive captions into one group, joining text and spanning the timing', () => {
    const groups = groupCaptions(captions, 2);
    expect(groups).toEqual([
      { id: 'a', text: 'Herhangi bir', startTime: 0, endTime: 0.8, memberIds: ['a', 'b'] },
      { id: 'c', text: 'yüz', startTime: 0.8, endTime: 1.2, memberIds: ['c'] },
    ]);
  });

  it('drops blank members from the joined text without leaving stray whitespace', () => {
    const withBlank: StudioCaption[] = [
      { id: 'a', text: 'yüz masajının', startTime: 0, endTime: 0.4 },
      { id: 'b', text: '  ', startTime: 0.4, endTime: 0.8 },
    ];
    const groups = groupCaptions(withBlank, 2);
    expect(groups).toEqual([{ id: 'a', text: 'yüz masajının', startTime: 0, endTime: 0.8, memberIds: ['a', 'b'] }]);
  });
});

describe('findSilenceCuts', () => {
  const captions: StudioCaption[] = [
    { id: 'w1', text: 'Merhaba', startTime: 0, endTime: 1 },
    { id: 'w2', text: 'dünya', startTime: 3, endTime: 4 }, // 2s gap
    { id: 'w3', text: 'nasılsın', startTime: 4.1, endTime: 5 }, // 0.1s gap — below default threshold
  ];

  it('finds gaps at or above the threshold, ignores smaller gaps', () => {
    expect(findSilenceCuts(captions, 0.5)).toEqual([{ start: 1, end: 3 }]);
  });

  it('finds nothing when no gap meets the threshold', () => {
    expect(findSilenceCuts(captions, 5)).toEqual([]);
  });

  it('adds filler-word spans and merges them with adjacent silence', () => {
    const withFiller: StudioCaption[] = [
      { id: 'w1', text: 'Merhaba', startTime: 0, endTime: 1 },
      { id: 'w2', text: 'şey', startTime: 1, endTime: 1.4 }, // no gap before/after — filler span alone
      { id: 'w3', text: 'dünya', startTime: 3, endTime: 4 }, // 1.6s gap after filler — merges with it
    ];
    // gap [1.4,3) >= 0.5 threshold, filler span [1,1.4) — adjacent, should merge into [1,3)
    expect(findSilenceCuts(withFiller, 0.5, FILLER_WORDS_TR)).toEqual([{ start: 1, end: 3 }]);
  });

  it('ignores filler words when no fillerWords set is passed', () => {
    const withFiller: StudioCaption[] = [
      { id: 'w1', text: 'Merhaba', startTime: 0, endTime: 1 },
      { id: 'w2', text: 'şey', startTime: 1.3, endTime: 1.7 }, // gap 0.3 — below threshold on its own
    ];
    expect(findSilenceCuts(withFiller, 0.5)).toEqual([]);
  });

  it('returns [] for an empty caption list', () => {
    expect(findSilenceCuts([], 0.5)).toEqual([]);
  });
});

describe('removeCutRanges', () => {
  const raw = {
    aspectRatio: '9:16',
    trim: { start: 0, end: 0 },
    sequence: [
      { id: 'clip1', kind: 'video', assetUrl: 'https://cdn.example.com/a.mp4', sourceStart: 0, sourceEnd: 20 },
    ],
    captions: [
      { id: 'w1', text: 'Merhaba', startTime: 0, endTime: 1 },
      { id: 'w2', text: 'dünya', startTime: 3, endTime: 4 },
    ],
    translatedCaptions: {
      en: [
        { id: 'w1', text: 'Hello', startTime: 0, endTime: 1 },
        { id: 'w2', text: 'world', startTime: 3, endTime: 4 },
      ],
    },
    cutaways: [{ id: 'ct1', assetUrl: 'https://cdn.example.com/c.jpg', startTime: 5, endTime: 8 }],
    zooms: [{ id: 'z1', startTime: 1.2, endTime: 1.8 }], // entirely inside the cut [1,3)
    overlays: [{ id: 'o1', kind: 'text', text: 'Hi', startTime: 0.5, endTime: 2, x: 50, y: 50, opacity: 1 }],
  };

  it('is a no-op when there are no cuts', () => {
    const timeline = parseStudioTimeline(raw)!;
    expect(removeCutRanges(timeline, [])).toBe(timeline);
  });

  it('splits the covering sequence clip and shifts/trims/drops every master-time array for a single cut', () => {
    const timeline = parseStudioTimeline(raw)!;
    const result = removeCutRanges(timeline, [{ start: 1, end: 3 }]);

    // sequence: clip1 split into head (keeps id) + a new tail piece, no explicit shift needed
    // (cursor-based positioning) — cursor rendering just sees a 2s-shorter total.
    expect(result.sequence).toHaveLength(2);
    expect(result.sequence[0]).toMatchObject({ id: 'clip1', sourceStart: 0, sourceEnd: 1 });
    expect(result.sequence[1]).toMatchObject({ sourceStart: 3, sourceEnd: 20 });
    expect(result.sequence[1].id).not.toBe('clip1');

    // captions: w1 untouched (ends exactly at cut start), w2 shifted back by the 2s cut
    expect(result.captions).toEqual([
      { id: 'w1', text: 'Merhaba', startTime: 0, endTime: 1 },
      { id: 'w2', text: 'dünya', startTime: 1, endTime: 2 },
    ]);
    expect(result.translatedCaptions.en).toEqual([
      { id: 'w1', text: 'Hello', startTime: 0, endTime: 1 },
      { id: 'w2', text: 'world', startTime: 1, endTime: 2 },
    ]);

    // cutaway entirely after the cut shifts back by 2s
    expect(result.cutaways).toEqual([
      { id: 'ct1', assetUrl: 'https://cdn.example.com/c.jpg', startTime: 3, endTime: 6, fit: 'cover' },
    ]);

    // zoom entirely inside the cut is dropped
    expect(result.zooms).toEqual([]);

    // overlay partially overlapping the cut start is trimmed to the cut boundary
    expect(result.overlays).toHaveLength(1);
    expect(result.overlays[0]).toMatchObject({ id: 'o1', startTime: 0.5, endTime: 1 });
  });

  it('produces multiple surviving pieces when a clip contains more than one cut', () => {
    const timeline = parseStudioTimeline({
      ...raw,
      sequence: [{ id: 'clip1', kind: 'video', assetUrl: 'https://cdn.example.com/a.mp4', sourceStart: 0, sourceEnd: 20 }],
      captions: [],
      translatedCaptions: {},
      cutaways: [],
      zooms: [],
      overlays: [],
    })!;
    const result = removeCutRanges(timeline, [
      { start: 5, end: 6 },
      { start: 10, end: 11 },
    ]);
    expect(result.sequence).toHaveLength(3);
    expect(result.sequence.map((c) => [c.sourceStart, c.sourceEnd])).toEqual([
      [0, 5],
      [6, 10],
      [11, 20],
    ]);
  });

  it('drops a clip entirely contained within a cut', () => {
    const timeline = parseStudioTimeline({
      ...raw,
      sequence: [{ id: 'clip1', kind: 'video', assetUrl: 'https://cdn.example.com/a.mp4', sourceStart: 0, sourceEnd: 5 }],
      captions: [],
      translatedCaptions: {},
      cutaways: [],
      zooms: [],
      overlays: [],
    })!;
    const result = removeCutRanges(timeline, [{ start: 0, end: 5 }]);
    expect(result.sequence).toEqual([]);
  });
});

describe('resolveReframePoint', () => {
  it('defaults to center (50/50) when there are no points — matches the old fixed-crop behavior', () => {
    expect(resolveReframePoint([], 5)).toEqual({ x: 50, y: 50 });
  });

  it('holds a single point steady regardless of time', () => {
    const points: StudioReframePoint[] = [{ id: 'a', time: 3, x: 20, y: 80 }];
    expect(resolveReframePoint(points, 0)).toEqual({ x: 20, y: 80 });
    expect(resolveReframePoint(points, 100)).toEqual({ x: 20, y: 80 });
  });

  it('holds at the first/last point before/after the defined range', () => {
    const points: StudioReframePoint[] = [
      { id: 'a', time: 2, x: 0, y: 0 },
      { id: 'b', time: 4, x: 100, y: 100 },
    ];
    expect(resolveReframePoint(points, 0)).toEqual({ x: 0, y: 0 });
    expect(resolveReframePoint(points, 10)).toEqual({ x: 100, y: 100 });
  });

  it('linearly interpolates between two points', () => {
    const points: StudioReframePoint[] = [
      { id: 'a', time: 0, x: 0, y: 0 },
      { id: 'b', time: 4, x: 100, y: 40 },
    ];
    expect(resolveReframePoint(points, 1)).toEqual({ x: 25, y: 10 });
    expect(resolveReframePoint(points, 2)).toEqual({ x: 50, y: 20 });
  });

  it('picks the correct segment across three or more points', () => {
    const points: StudioReframePoint[] = [
      { id: 'a', time: 0, x: 0, y: 0 },
      { id: 'b', time: 2, x: 100, y: 0 },
      { id: 'c', time: 6, x: 0, y: 100 },
    ];
    expect(resolveReframePoint(points, 1)).toEqual({ x: 50, y: 0 });
    expect(resolveReframePoint(points, 4)).toEqual({ x: 50, y: 50 });
  });
});
