'use client';

import { useOptionalPublicPageRuntime } from './PublicPageRuntime';

// Karşılama/blok-listesi görünümünde (henüz soru sorulmamış, hiçbir blok açılmamış) marka
// zaten üstte "talkinbio" wordmark olarak duruyor (bkz. ProfileHeader) — burada tekrar
// göstermiyoruz. Bir blok açıldığında ya da Saule bir soruya cevap verdiğinde üstteki
// wordmark kaybolur, o andan itibaren bu daha görünür "Powered by talkinbio" alt satırı
// devralır.
export default function PoweredByFooter({ textColor }: { textColor?: string }) {
  const pageRuntime = useOptionalPublicPageRuntime();
  const showFooter = !!pageRuntime?.activeBlockId || !!pageRuntime?.sauleQuestion;

  if (!showFooter) return null;

  return (
    <div className="shrink-0 relative z-50 pb-2 pt-1 text-center" style={{ background: 'var(--tb-page-bg-sticky)' }}>
      <a
        href="https://talkinbio.com/?utm_source=widget&utm_medium=profile_footer&utm_campaign=attribution"
        target="_blank"
        rel="noreferrer"
        className="text-xs font-bold tracking-tight opacity-70 hover:opacity-100 transition"
        style={{ color: textColor }}
      >
        Powered by talkinbio
      </a>
    </div>
  );
}
