'use client';

import { useMemo, useState } from 'react';
import { FileText, Loader2, Copy, Check, Inbox, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import CreditBadge from '@/components/CreditBadge';

type ContentSourceOption = {
  key: string;
  type: 'service' | 'gallery' | 'testimonial' | 'general';
  label: string;
  title: string;
  description?: string;
};

type ContentFormat = 'instagram_post' | 'instagram_story' | 'whatsapp_status';

type GeneratedResult = Record<'tr' | 'en' | 'ru', { caption: string; hashtags?: string[] }>;

function buildSourceOptions(
  business: { name: string },
  blocks: { type: string; content: any }[],
  t: (key: string, values?: Record<string, string | number>) => string
): ContentSourceOption[] {
  const options: ContentSourceOption[] = [
    { key: 'general', type: 'general', label: t('sourceGeneral'), title: business.name },
  ];

  for (const block of blocks) {
    const items = block.content?.items || [];
    if (block.type === 'services') {
      items.forEach((item: any, i: number) => {
        if (!item.tr?.title) return;
        options.push({ key: `service-${i}`, type: 'service', label: t('sourceServiceLabel', { title: item.tr.title }), title: item.tr.title, description: item.tr.description });
      });
    } else if (block.type === 'gallery') {
      items.forEach((item: any, i: number) => {
        const title = item.caption?.tr || t('sourceGalleryDefaultTitle', { index: i + 1 });
        options.push({ key: `gallery-${i}`, type: 'gallery', label: t('sourceGalleryLabel', { title }), title });
      });
    } else if (block.type === 'testimonials') {
      items.forEach((item: any, i: number) => {
        if (!item.author) return;
        options.push({ key: `testimonial-${i}`, type: 'testimonial', label: t('sourceTestimonialLabel', { author: item.author }), title: item.author, description: item.quote?.tr });
      });
    }
  }

  return options;
}

function CopyButton({ text }: { text: string }) {
  const t = useTranslations('ContentStudio');
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="p-1.5 rounded-md text-[#8A8880] hover:bg-[#F4F2ED] hover:text-[#14231F] transition-colors shrink-0"
      title={t('copyTooltip')}
    >
      {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

export default function ContentClient({
  business,
  blocks,
  embedded = false,
}: {
  business: any;
  blocks: any[];
  /** Stüdyo hub'ının (`/dashboard/studio/planla`) içine gömülü mü — öyleyse kendi
   *  header'ını (Panel/Editör/Analiz mini-nav'ı) HİÇ basma, DashboardShell zaten aynı
   *  navigasyonu sidebar'da sağlıyor; ikisi üst üste bindiğinde çift başlık/kutu
   *  görünüyordu (bkz. bulunan hata). Eski bağımsız `/dashboard/content` sayfası bu
   *  prop'u hiç GEÇMİYOR — davranışı birebir korunuyor, [[canli-sayfalara-dokunma]]. */
  embedded?: boolean;
}) {
  const t = useTranslations('ContentStudio');
  const sourceOptions = useMemo(() => buildSourceOptions(business, blocks, t), [business, blocks, t]);
  const [selectedKey, setSelectedKey] = useState(sourceOptions[0]?.key || '');
  const [format, setFormat] = useState<ContentFormat>('instagram_post');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedSource = sourceOptions.find((s) => s.key === selectedKey);

  const formatOptions: { value: ContentFormat; label: string }[] = [
    { value: 'instagram_post', label: t('formatInstagramPost') },
    { value: 'instagram_story', label: t('formatInstagramStory') },
    { value: 'whatsapp_status', label: t('formatWhatsappStatus') },
  ];

  const localeLabels: Record<'tr' | 'en' | 'ru', string> = {
    tr: t('localeLabelTr'),
    en: t('localeLabelEn'),
    ru: t('localeLabelRu'),
  };

  const handleGenerate = async () => {
    if (!selectedSource) return;
    setIsGenerating(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business.id,
          source: { type: selectedSource.type, title: selectedSource.title, description: selectedSource.description },
          format,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('generateErrorDefault'));
      setResult(data);
    } catch (err: any) {
      setError(err.message || t('generateErrorGeneric'));
    } finally {
      setIsGenerating(false);
    }
  };

  const content = (
    <div className={embedded ? 'flex flex-col gap-6' : 'max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6'}>
        <div className="bg-white rounded-2xl border border-[rgba(20,35,31,0.10)] p-5 flex flex-col gap-4">
          <div>
            <label className="text-sm font-semibold text-[#14231F] block mb-2">{t('sourceQuestion')}</label>
            <select
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              className="w-full border border-[rgba(20,35,31,0.15)] rounded-lg px-3 py-2 text-sm bg-white"
            >
              {sourceOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-[#14231F] block mb-2">{t('formatLabel')}</label>
            <div className="flex flex-wrap gap-2">
              {formatOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFormat(opt.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${format === opt.value ? 'bg-[#14231F] text-white' : 'bg-[#F4F2ED] text-[#4B5A55] hover:bg-[rgba(20,35,31,0.08)]'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !selectedSource}
            className="self-start bg-[#FF6A5C] text-white px-5 py-2.5 rounded-full font-medium text-sm flex items-center gap-2 hover:bg-[#FF5847] transition-colors disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {isGenerating ? t('generatingBtn') : t('generateBtn')}
          </button>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        {result && (
          <div className="flex flex-col gap-4">
            {(['tr', 'en', 'ru'] as const).map((loc) => (
              <div key={loc} className="bg-white rounded-2xl border border-[rgba(20,35,31,0.10)] p-5">
                <div className="flex justify-between items-start gap-3 mb-2">
                  <h3 className="text-sm font-bold text-[#14231F]">{localeLabels[loc]}</h3>
                  <CopyButton text={[result[loc].caption, ...(result[loc].hashtags || []).map((h) => `#${h.replace(/^#/, '')}`)].join('\n\n')} />
                </div>
                <p className="text-sm text-[#14231F] whitespace-pre-wrap leading-relaxed">{result[loc].caption}</p>
                {!!result[loc].hashtags?.length && (
                  <p className="text-sm text-[#FF6A5C] mt-2">
                    {result[loc].hashtags!.map((h) => `#${h.replace(/^#/, '')}`).join(' ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
    </div>
  );

  if (embedded) return content;

  return (
    <div className="min-h-screen bg-[#F4F2ED]">
      <header className="bg-white border-b border-[rgba(20,35,31,0.10)] sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-xl font-[800] tracking-[-0.02em] text-[#14231F] flex items-center gap-2">
              <FileText className="w-5 h-5" /> {t('pageTitle')}
            </h1>
            <p className="text-sm text-[#4B5A55] font-['Inter']">{business.name}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CreditBadge balance={business.credit_balance ?? 0} />
            <a href="/dashboard/leads" className="text-sm text-[#14231F] font-medium bg-[#F4F2ED] px-4 py-2 rounded-full hover:bg-[rgba(20,35,31,0.08)] transition whitespace-nowrap flex items-center gap-1.5">
              <Inbox className="w-4 h-4" /> {t('navPanel')}
            </a>
            <a href="/dashboard/editor" className="text-sm text-[#14231F] font-medium bg-[#F4F2ED] px-4 py-2 rounded-full hover:bg-[rgba(20,35,31,0.08)] transition whitespace-nowrap">
              {t('navEditor')}
            </a>
            <a href="/dashboard/analytics" className="text-sm text-[#14231F] font-medium bg-[#F4F2ED] px-4 py-2 rounded-full hover:bg-[rgba(20,35,31,0.08)] transition whitespace-nowrap">
              {t('navAnalytics')}
            </a>
          </div>
        </div>
      </header>
      <main>{content}</main>
    </div>
  );
}
