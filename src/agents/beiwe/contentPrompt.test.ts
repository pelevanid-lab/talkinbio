import { describe, it, expect } from 'vitest';
import { buildContentPrompt } from './contentPrompt';

describe('buildContentPrompt', () => {
  const business = { name: 'Test Kuaför', category: 'beauty_salon' };

  it('includes format-specific guidance and demands JSON-only output', () => {
    const { system } = buildContentPrompt({
      business,
      source: { type: 'service', title: 'Saç Kesimi', description: 'Kadın-erkek saç kesimi' },
      format: 'instagram_post',
    });
    expect(system).toMatch(/JSON/);
    expect(system).toMatch(/hashtag/i);
    expect(system).toContain('Test Kuaför');
  });

  it('omits hashtag guidance emphasis for story/status formats', () => {
    const { system } = buildContentPrompt({
      business,
      source: { type: 'gallery', title: 'Yeni saç modeli' },
      format: 'whatsapp_status',
    });
    expect(system).toMatch(/markdown/i);
  });

  it('embeds the source title and description in the prompt', () => {
    const { prompt } = buildContentPrompt({
      business,
      source: { type: 'testimonial', title: 'Ayşe K.', description: 'Harika bir deneyimdi!' },
      format: 'instagram_story',
    });
    expect(prompt).toContain('Ayşe K.');
    expect(prompt).toContain('Harika bir deneyimdi!');
  });
});
