import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { useSauleSuggestions } from './useSauleSuggestions';
import trMessages from '../../messages/tr.json';
// Not: bu hook şu anda hiçbir bileşenden çağrılmıyor (dead code) — Beiwe→Saule
// geçişinde dosya adı yeniden adlandırılmamıştı, testler bu yüzden kırıktı.
// Yeniden adlandırma dışında davranış değişmedi; kullanılmadığı ayrıca raporlanacak.

function renderSuggestions(...args: Parameters<typeof useSauleSuggestions>) {
  return renderHook(() => useSauleSuggestions(...args), {
    wrapper: ({ children }) => (
      <NextIntlClientProvider locale="tr" messages={trMessages}>
        {children}
      </NextIntlClientProvider>
    ),
  });
}

describe('useSauleSuggestions', () => {
  it('warns when about text is short', () => {
    const blocks = [{ type: 'about', content: { tr: { text: 'Kısa metin' } } }];
    const { result } = renderSuggestions(blocks, null, null, 'tr', true);
    expect(result.current.some((s) => s.id === 'short-about')).toBe(true);
  });

  it('does not warn about about text once long enough', () => {
    const longText = 'a'.repeat(80);
    const blocks = [{ type: 'about', content: { tr: { text: longText } } }];
    const { result } = renderSuggestions(blocks, null, null, 'tr', true);
    expect(result.current.some((s) => s.id === 'short-about')).toBe(false);
  });

  it('does not warn about theme when a custom theme is set', () => {
    const { result } = renderSuggestions([], null, null, 'tr', true);
    expect(result.current.some((s) => s.id === 'missing-theme')).toBe(false);
  });

  it('warns about missing theme when none is set', () => {
    const { result } = renderSuggestions([], null, null, 'tr', false);
    expect(result.current.some((s) => s.id === 'missing-theme')).toBe(true);
  });

  it('suggests a gallery for visual sectors without one', () => {
    const { result } = renderSuggestions([], 'photographer', null, 'tr', true);
    expect(result.current.some((s) => s.id === 'missing-gallery')).toBe(true);
  });

  it('does not suggest a gallery once one exists', () => {
    const blocks = [{ type: 'gallery', content: { items: [{ url: 'x.jpg' }] } }];
    const { result } = renderSuggestions(blocks, 'photographer', null, 'tr', true);
    expect(result.current.some((s) => s.id === 'missing-gallery')).toBe(false);
  });

  it('suggests testimonials for trust sectors without one', () => {
    const { result } = renderSuggestions([], 'consultant', null, 'tr', true);
    expect(result.current.some((s) => s.id === 'missing-testimonials')).toBe(true);
  });
});
