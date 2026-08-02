import { describe, expect, it } from 'vitest';
import { findPageRouteMatch, formatPageAction } from './pageRouter';
import type { PageActionBlockTarget } from '@/utils/pageActionTargets';

const targets: PageActionBlockTarget[] = [
  {
    blockId: 'about-block',
    label: 'Hakkinda',
    type: 'about',
    items: [],
  },
  {
    blockId: 'services-block',
    label: 'Neler Yapabilir',
    type: 'services',
    items: [
      { itemId: 'consulting', label: 'Online Danismanlik' },
      { itemId: 'audit', label: 'Profil Analizi' },
    ],
  },
  {
    blockId: '__contact__',
    label: 'Iletisim',
    type: 'contact',
    items: [{ itemId: 'whatsapp', label: 'whatsapp 905551112233' }],
  },
];

describe('pageRouter', () => {
  it('routes a broad service question to the service block', () => {
    const match = findPageRouteMatch(targets, 'talkinbio neler yapabiliyor', 'tr');

    expect(match).toMatchObject({
      blockId: 'services-block',
      cueKey: 'opening_section',
    });
  });

  it('routes a specific item question to the item inside its block', () => {
    const match = findPageRouteMatch(targets, 'Online danismanlik nasil isliyor?', 'tr');

    expect(match).toMatchObject({
      blockId: 'services-block',
      itemId: 'consulting',
      cueKey: 'showing_item',
    });
  });

  it('formats cue and public page action markers at the beginning of the answer', () => {
    const text = formatPageAction({
      blockId: 'services-block',
      itemId: 'consulting',
      text: 'Ilgili yeri aciyorum.',
    });

    expect(text).toBe(
      '[[SAULE_CUE:showing_item]]§§ACTION§§{"type":"open_block","blockId":"services-block","itemId":"consulting"}§§/ACTION§§Ilgili yeri aciyorum.'
    );
  });

  it('routes contact questions to the contact scene', () => {
    const match = findPageRouteMatch(targets, 'WhatsApp uzerinden nasil ulasirim?', 'tr');

    expect(match).toMatchObject({
      blockId: '__contact__',
      itemId: 'whatsapp',
      cueKey: 'showing_contact',
    });
  });

  it('does not invent a contact scene when no contact target exists', () => {
    const match = findPageRouteMatch(
      targets.filter((target) => target.blockId !== '__contact__'),
      'WhatsApp uzerinden nasil ulasirim?',
      'tr'
    );

    expect(match).toBeNull();
  });

  it('routes a missing requested contact channel to the available contact method with an explanatory cue', () => {
    const match = findPageRouteMatch(
      [
        {
          blockId: '__contact__',
          label: 'Iletisim',
          type: 'contact',
          items: [{ itemId: 'email', label: 'email info@talkinbio.com' }],
        },
      ],
      'WhatsApp uzerinden nasil ulasirim?',
      'tr'
    );

    expect(match).toMatchObject({
      blockId: '__contact__',
      itemId: 'email',
      cueKey: 'showing_contact',
    });
    expect(match?.text).toContain('whatsapp');
    expect(match?.text).toContain('email info@talkinbio.com');
  });
});
