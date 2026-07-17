'use client';

import AdminLayout from '@/components/AdminLayout';
import ContinuousImprovementTabs from '@/components/ContinuousImprovementTabs';
import ReactMarkdown from 'react-markdown';
import { Milestone } from 'lucide-react';

/* ------------------------------------------------------------------ */
/* GFM tablo desteği: react-markdown'ın çekirdeği pipe-tabloları bilmez */
/* (remark-gfm eklentisi gerekir). Ek bağımlılık yerine tabloları biz   */
/* ayıklayıp kendimiz render ediyoruz; kalan markdown çekirdeğe gider.  */
/* ------------------------------------------------------------------ */

type Block = { type: 'md' | 'table'; content: string };

const TABLE_ROW = /^\s*\|.*\|\s*$/;
const TABLE_SEPARATOR = /^\s*\|[\s:\-|]+\|\s*$/;

function splitBlocks(md: string): Block[] {
  const lines = md.split('\n');
  const blocks: Block[] = [];
  let buffer: string[] = [];
  let i = 0;

  while (i < lines.length) {
    if (TABLE_ROW.test(lines[i]) && i + 1 < lines.length && TABLE_SEPARATOR.test(lines[i + 1])) {
      if (buffer.length) { blocks.push({ type: 'md', content: buffer.join('\n') }); buffer = []; }
      const table = [lines[i], lines[i + 1]];
      i += 2;
      while (i < lines.length && TABLE_ROW.test(lines[i])) { table.push(lines[i]); i++; }
      blocks.push({ type: 'table', content: table.join('\n') });
      continue;
    }
    buffer.push(lines[i]);
    i++;
  }
  if (buffer.length) blocks.push({ type: 'md', content: buffer.join('\n') });
  return blocks;
}

function parseRow(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}

/** Hücre içi hafif markdown: **kalın** ve `kod` yeterli (tablolarımızda başka şey yok). */
function InlineCell({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return <code key={i} className="bg-slate-100 text-slate-800 rounded px-1 py-0.5 text-[11px] font-mono">{part.slice(1, -1)}</code>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function MdTable({ raw }: { raw: string }) {
  const lines = raw.split('\n');
  const header = parseRow(lines[0]);
  const rows = lines.slice(2).map(parseRow);

  return (
    <div className="my-4 overflow-x-auto">
      <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {header.map((h, i) => (
              <th key={i} className="text-left px-4 py-2.5 font-semibold text-slate-700 whitespace-nowrap">
                <InlineCell text={h} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2.5 text-slate-600 align-top">
                  <InlineCell text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Markdown stil haritası                                                */
/* ------------------------------------------------------------------ */

const mdComponents = {
  h1: ({ node, ...props }: any) => <h1 className="text-2xl font-bold text-slate-900 mt-10 mb-4 pb-2 border-b border-slate-200" {...props} />,
  h2: ({ node, ...props }: any) => <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3" {...props} />,
  h3: ({ node, ...props }: any) => <h3 className="text-base font-bold text-slate-800 mt-6 mb-2" {...props} />,
  p: ({ node, ...props }: any) => <p className="text-sm text-slate-700 leading-relaxed mb-3" {...props} />,
  ul: ({ node, ...props }: any) => <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-700 mb-3" {...props} />,
  ol: ({ node, ...props }: any) => <ol className="list-decimal pl-5 space-y-1.5 text-sm text-slate-700 mb-3" {...props} />,
  li: ({ node, ...props }: any) => <li className="leading-relaxed" {...props} />,
  blockquote: ({ node, ...props }: any) => (
    <blockquote className="border-l-4 border-blue-200 bg-blue-50/50 rounded-r-lg pl-4 pr-3 py-2 my-4 text-sm text-slate-700 [&_p]:mb-1.5 [&_p:last-child]:mb-0" {...props} />
  ),
  code: ({ node, inline, ...props }: any) =>
    inline
      ? <code className="bg-slate-100 text-slate-800 rounded px-1 py-0.5 text-xs font-mono" {...props} />
      : <code className="block bg-slate-900 text-slate-100 rounded-xl p-4 text-xs font-mono overflow-x-auto my-3 whitespace-pre" {...props} />,
  pre: ({ node, ...props }: any) => <pre className="my-0" {...props} />,
  a: ({ node, ...props }: any) => <a className="text-blue-600 underline hover:text-blue-800" {...props} />,
  hr: ({ node, ...props }: any) => <hr className="my-8 border-slate-200" {...props} />,
  strong: ({ node, ...props }: any) => <strong className="font-semibold text-slate-900" {...props} />,
};

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

export default function RoadmapClient({ content }: { content: string }) {
  const blocks = splitBlocks(content);

  return (
    <AdminLayout>
      <ContinuousImprovementTabs />

      <div className="mt-6">
        <div className="flex items-center gap-2 mb-1">
          <Milestone className="w-5 h-5 text-blue-600" />
          <h1 className="text-3xl font-bold text-slate-900">Yol Haritası</h1>
        </div>
        <p className="text-slate-500 text-sm mb-1">
          Repo kökündeki ROADMAP.md&apos;nin salt-okunur görünümü — tek kaynak dosyadır, düzenleme kod üzerinden yapılır.
        </p>
        <p className="text-xs text-slate-400 font-mono mb-8">
          Kanvas (&quot;neden&quot;) · Fermi (&quot;ne kadar&quot;) · Çekim Gücü (&quot;ne zaman&quot;) · Yol Haritası (&quot;nasıl&quot;)
        </p>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 md:px-10 py-8 max-w-5xl">
          {blocks.map((block, i) =>
            block.type === 'table'
              ? <MdTable key={i} raw={block.content} />
              : <ReactMarkdown key={i} components={mdComponents}>{block.content}</ReactMarkdown>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
