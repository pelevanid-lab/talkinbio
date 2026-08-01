import { describe, expect, it } from 'vitest';
import { findPageRouteMatch, formatPageAction } from './pageRouter';
import type { PageActionBlockTarget } from '@/utils/pageActionTargets';

const targets: PageActionBlockTarget[] = [
  {
    blockId: 'about-block',
    label: 'Hakkında',
    type: 'about',
    items: [],
  },
  {
    blockId: 'services-block',
    label: 'Neler Yapabilir',
    type: 'services',
    items: [
      { itemId: 'consulting', label: 'Online Danışmanlık' },
      { itemId: 'audit', label: 'Profil Analizi' },
    ],
  },
  {
    blockId: '__contact__',
    label: 'İletişim',
    type: 'contact',
    items: [{ itemId: 'whatsapp', label: 'whatsapp 905551112233' }],
  },
];

describe('pageRouter', () => {
  it('routes a broad service question to the service block', () => {
    const match = findPageRouteMatch(targets, 'talkinbio neler yapabiliyor', 'tr');

    expect(match).toEqual({
      blockId: 'services-block',
      text: 'İlgili yeri açıyorum.',
    });
  });

  it('routes a specific item question to the item inside its block', () => {
    const match = findPageRouteMatch(targets, 'Online danışmanlık nasıl işliyor?', 'tr');

    expect(match).toEqual({
      blockId: 'services-block',
      itemId: 'consulting',
      text: 'İlgili yeri açıyorum.',
    });
  });

  it('formats a public page action marker at the beginning of the answer', () => {
    const text = formatPageAction({
      blockId: 'services-block',
      itemId: 'consulting',
      text: 'İlgili yeri açıyorum.',
    });

    expect(text).toBe('§§ACTION§§{"type":"open_block","blockId":"services-block","itemId":"consulting"}§§/ACTION§§İlgili yeri açıyorum.');
  });

  it('routes contact questions to the contact scene', () => {
    const match = findPageRouteMatch(targets, 'WhatsApp üzerinden nasıl ulaşırım?', 'tr');

    expect(match).toEqual({
      blockId: '__contact__',
      itemId: 'whatsapp',
      text: 'İlgili yeri açıyorum.',
    });
  });

  it('does not invent a contact scene when no contact target exists', () => {
    const match = findPageRouteMatch(
      targets.filter((target) => target.blockId !== '__contact__'),
      'WhatsApp üzerinden nasıl ulaşırım?',
      'tr'
    );

    expect(match).toBeNull();
  });

  it('does not route a missing contact channel to another available contact method', () => {
    const match = findPageRouteMatch(
      [
        {
          blockId: '__contact__',
          label: 'Ä°letiÅŸim',
          type: 'contact',
          items: [{ itemId: 'email', label: 'email info@talkinbio.com' }],
        },
      ],
      'WhatsApp Ã¼zerinden nasÄ±l ulaÅŸÄ±rÄ±m?',
      'tr'
    );

    expect(match).toBeNull();
  });
});
