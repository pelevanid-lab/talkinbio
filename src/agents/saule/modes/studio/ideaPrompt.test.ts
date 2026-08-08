import { describe, it, expect } from 'vitest';
import { buildIdeaPrompt } from './ideaPrompt';

const business = { name: 'Uliana Pehlivan', category: 'Diyetisyen' };
const pillars = [
  { id: '1', label: 'Mit Kırma', description: 'Beslenme mitlerini çürütür' },
  { id: '2', label: 'Danışan Hikayesi', description: 'Gerçek sonuçları paylaşır' },
];

describe('buildIdeaPrompt', () => {
  it('lists the pillars and asks for the requested count', () => {
    const { system, prompt } = buildIdeaPrompt({ business, pillars, count: 5, grounded: false });
    expect(system).toContain('Mit Kırma');
    expect(system).toContain('Danışan Hikayesi');
    expect(prompt).toContain('5 fikir');
  });

  it('instructs to leave trendNote empty when not grounded', () => {
    const { system } = buildIdeaPrompt({ business, pillars, count: 3, grounded: false });
    expect(system).toMatch(/HER ZAMAN boş/);
    expect(system).not.toContain('web_search aracıyla');
  });

  it('instructs to use web_search and fill trendNote when grounded', () => {
    const { system } = buildIdeaPrompt({ business, pillars, count: 3, grounded: true });
    expect(system).toContain('web_search aracıyla');
    expect(system).toContain('trendNote');
  });

  it('handles an empty pillar list without crashing', () => {
    const { system } = buildIdeaPrompt({ business, pillars: [], count: 3, grounded: false });
    expect(system).toContain('henüz tanımlı sütun yok');
  });
});
