'use client';

import ReactMarkdown from 'react-markdown';

// Saule (ChatWidget) ve Beiwe (EditorClient) sohbet balonlarının ortak markdown
// gösterimi. Ayrı ayrı yazılmıştı ve Beiwe'ninki hiç eklenmemişti: agent markdown
// üretiyor ama editör onu düz string basıyordu, ekranda `**kalın**` yıldızlarıyla
// ve satır sonları kaybolmuş bir metin duvarı olarak görünüyordu.
//
// Agent'lar WhatsApp/Instagram/Telegram linklerini çıplak metin olarak yazıyor
// (ör. "https://wa.me/123"), markdown link sözdizimiyle değil. react-markdown'ın
// çekirdeği bunu otomatik linklemez (sadece `<url>` veya `[metin](url)` tanır),
// bu yüzden ekranda tıklanamaz düz metin olarak kalıyordu. Çıplak URL'leri
// `<url>` köşeli-parantez autolink biçimine çevirip gerçek <a> etiketine dönüşmesini sağlıyoruz.
function autoLinkUrls(text: string): string {
  return text.replace(/(^|[\s(])(https?:\/\/[^\s<>()]+)/g, (match, prefix, url) => {
    if (prefix === '(') return match;
    return `${prefix}<${url}>`;
  });
}

export default function AgentMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
        ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2 last:mb-0" {...props} />,
        ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2 last:mb-0" {...props} />,
        li: ({ node, ...props }) => <li className="mb-1 last:mb-0" {...props} />,
        a: ({ node, ...props }) => (
          <a className="text-[var(--coral)] underline hover:text-orange-600 transition" target="_blank" rel="noreferrer" {...props} />
        ),
        strong: ({ node, ...props }) => <strong className="font-semibold text-[var(--ink)]" {...props} />,
      }}
    >
      {autoLinkUrls(children)}
    </ReactMarkdown>
  );
}
