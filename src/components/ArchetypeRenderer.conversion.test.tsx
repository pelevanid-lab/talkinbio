import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ArchetypeRenderer from './ArchetypeRenderer';
import { DEFAULT_THEME } from '@/config/archetypes';

vi.mock('next-intl', () => ({ useLocale: () => 'tr' }));
vi.mock('./PublicPageRuntime', () => ({ useOptionalPublicPageRuntime: () => null }));
vi.mock('./LanguageSwitcher', () => ({ default: () => <span>Dil</span> }));

const trainingTitle = 'E\u011fitim Format\u0131';

const blocks = [
  {
    id: 'about',
    type: 'about',
    order: 0,
    is_visible: true,
    content: { tr: { title: 'Hakk\u0131mda', text: 'Uzman hakk\u0131nda tan\u0131t\u0131m metni.' } },
  },
  ...[trainingTitle, '\u00dcr\u00fcn Koleksiyonu', 'Etkinlik Takvimi'].map((title, index) => ({
    id: `choice-${index + 1}`,
    type: index === 0 ? 'services' : index === 1 ? 'gallery' : 'custom',
    order: index + 1,
    is_visible: true,
    content: index === 2
      ? { tr: { title, text: 'Yakla\u015fan etkinlikler ve kat\u0131l\u0131m bilgileri.' } }
      : { tr: { title }, items: [{ tr: { title: `${title} i\u00e7eri\u011fi`, description: 'K\u0131sa ve ekrana s\u0131\u011fan a\u00e7\u0131klama.' } }] },
  })),
];

describe('Conversion UI', () => {
  it('shares the hybrid entry controls and continues as one scrollable flow', () => {
    const { container } = render(
      <ArchetypeRenderer
        blocks={blocks}
        theme={DEFAULT_THEME}
        businessName="\u00d6rnek Profil"
        pageType="conversion"
      />
    );

    expect(container.querySelectorAll('[data-tb-entry-trigger="action"]')).toHaveLength(3);
    expect(screen.getByRole('button', { name: /Profili A\u00e7/i })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /E\u011fitim Format\u0131/i }));

    expect(container.querySelector('[data-tb-conversion-flow]')).toBeTruthy();
    expect(container.querySelector('.tb-entry-content-scroll')).toBeTruthy();
    expect(screen.getByText('E\u011fitim Format\u0131 i\u00e7eri\u011fi')).toBeTruthy();
    expect(container.querySelector('[data-tb-conversion-suggestions]')).toBeTruthy();
    expect(container.querySelectorAll('[data-tb-conversion-question]')).toHaveLength(2);
    expect(container.querySelector('[data-tb-entry-chat]')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Bu e\u011fitim bana uygun mu/i }));

    expect(screen.getByText(/deneyimli profesyonellere uyarlanabilir/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Hi\u00e7 deneyimim yok/i })).toBeTruthy();
    expect(container.querySelectorAll('[data-tb-conversion-question]')).toHaveLength(1);
    expect(container.querySelector('[data-tb-entry-chat]')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Hi\u00e7 deneyimim yok/i }));

    expect(screen.getByText(/temel anatomi/i)).toBeTruthy();
    expect(container.querySelector('[data-tb-entry-chat]')).toBeTruthy();
  });
});
