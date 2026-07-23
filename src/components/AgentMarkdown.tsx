'use client';

import ReactMarkdown from 'react-markdown';

// Saule (ChatWidget) ve Beiwe (EditorClient) sohbet balonlarının ortak markdown
// gösterimi. Ayrı ayrı yazılmıştı ve Beiwe'ninki hiç eklenmemişti: agent markdown
// üretiyor ama editör onu düz string basıyordu, ekranda `**kalın**` yıldızlarıyla
// ve satır sonları kaybolmuş bir metin duvarı olarak görünüyordu.
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
      {children}
    </ReactMarkdown>
  );
}
