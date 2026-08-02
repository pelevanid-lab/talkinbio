import { describe, expect, it } from 'vitest';
import {
  buildSauleRuntimeProfile,
  createSauleStaticTurn,
  formatSauleCueMarker,
  parseSauleCueKey,
  SAULE_RUNTIME_VERSION,
  stripSauleCueMarkers,
} from './core';

describe('Saule core runtime contract', () => {
  it('wraps Talkinbio data in a host-portable runtime profile', () => {
    const profile = buildSauleRuntimeProfile({
      business: {
        id: 'biz-1',
        name: 'Test Business',
        category: 'consultant',
        contact_method: 'email',
        contact_value: '{"email":"info@example.com"}',
        saule_settings: { leadCaptureEnabled: false },
      },
      blocks: [{ id: 'block-1', title: 'Services', type: 'services', content: { items: [] } }],
      knowledge: [{ id: 'note-1', title: 'Policy', content: 'No refunds.' }],
      locale: 'en',
    });

    expect(profile.runtimeVersion).toBe(SAULE_RUNTIME_VERSION);
    expect(profile.host).toBe('talkinbio');
    expect(profile.business.name).toBe('Test Business');
    expect(profile.blocks).toHaveLength(1);
    expect(profile.knowledge[0]).toMatchObject({
      id: 'note-1',
      source: 'owner_note',
      visibility: 'runtime',
    });
  });

  it('creates a static turn with a cue key contract', () => {
    expect(createSauleStaticTurn('Done.', 'thank_you')).toEqual({
      text: 'Done.',
      cueKey: 'thank_you',
      action: null,
    });
  });

  it('formats, parses, and strips cue markers for host playback', () => {
    const text = `${formatSauleCueMarker('opening_section')}Opening.`;

    expect(parseSauleCueKey(text)).toBe('opening_section');
    expect(stripSauleCueMarkers(text)).toBe('Opening.');
  });
});
