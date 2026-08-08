import { describe, it, expect } from 'vitest';
import { buildPillarPrompt } from './pillarPrompt';

describe('buildPillarPrompt', () => {
  it('embeds the business name and category, asks for a JSON array', () => {
    const { system, prompt } = buildPillarPrompt({ business: { name: 'Uliana Pehlivan', category: 'Diyetisyen' } });
    expect(system).toContain('Uliana Pehlivan');
    expect(system).toContain('Diyetisyen');
    expect(system).toContain('JSON dizisi');
    expect(prompt).toContain('Uliana Pehlivan');
  });

  it('falls back gracefully when category is missing', () => {
    const { system } = buildPillarPrompt({ business: { name: 'Test İşletme', category: null } });
    expect(system).toContain('belirtilmedi');
  });
});
