'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import MediaUploader from './MediaUploader';
import { ColoredTextField } from '@/utils/coloredText';
import { defaultTitleFor, LOCALE_KEYS, type LocaleKey } from '@/config/localeTitles';

// Shared "background image behind this section" fields, used by about(standard)/services/testimonials/contact/custom.
function BackgroundImageFields({ content, setContent }: { content: any; setContent: (c: any) => void }) {
  const t = useTranslations('BlockEditor');
  return (
    <div className="space-y-3 pt-4 border-t border-slate-100">
      <label className="block text-sm font-medium mb-1 text-[var(--ink)]">{t('background.label')}</label>
      <MediaUploader
        value={content.backgroundImage || ''}
        onChange={(url) => setContent({ ...content, backgroundImage: url })}
        label={t('background.uploadLabel')}
      />
      {content.backgroundImage && (
        <div>
          <label className="block text-xs font-medium mb-1 text-slate-500">{t('background.overlayLabel')}</label>
          <select
            value={content.backgroundOverlay || 'dark'}
            onChange={(e) => setContent({ ...content, backgroundOverlay: e.target.value })}
            className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[var(--coral)]"
          >
            <option value="dark">{t('background.overlayDark')}</option>
            <option value="light">{t('background.overlayLight')}</option>
            <option value="tint">{t('background.overlayTint')}</option>
            <option value="none">{t('background.overlayNone')}</option>
          </select>
        </div>
      )}
    </div>
  );
}

export default function BlockEditorModal({
  block,
  onSave,
  onClose,
  onDelete,
  locale,
}: {
  block: any;
  onSave: (data: any) => void;
  onClose: () => void;
  onDelete: () => void;
  // Dashboard's current UI language (from EditorClient's useLocale(), a plain string) — the modal
  // should open on this language's content tab, not always default to Turkish regardless of
  // what's selected.
  locale?: string;
}) {
  const t = useTranslations('BlockEditor');
  const [titles, setTitles] = useState<Record<'tr' | 'en' | 'ru', string>>({ tr: '', en: '', ru: '' });
  const [content, setContent] = useState<any>(block?.content || {});
  const [activeLang, setActiveLang] = useState<LocaleKey>(
    LOCALE_KEYS.includes(locale as LocaleKey) ? (locale as LocaleKey) : 'tr'
  );

  useEffect(() => {
    // Prefill each language tab from its OWN locale: existing per-locale title, else that
    // locale's default label for fixed section types, else (AI-authored types like
    // gallery/testimonials/custom only) the top-level title. Never seed one locale's custom
    // title into another tab — saving would then stamp the same word into every language.
    const prefill = (loc: LocaleKey) =>
      block?.content?.[loc]?.title || defaultTitleFor(block?.type, loc) || block?.title || '';
    setTitles({ tr: prefill('tr'), en: prefill('en'), ru: prefill('ru') });

    if (!block?.content || Object.keys(block.content).length === 0) {
      if (block?.type === 'services' || block?.type === 'pricing') setContent({ items: [] });
      else if (block?.type === 'hours') setContent({ schedule: {
        monday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
        tuesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
        wednesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
        thursday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
        friday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
        saturday: { isOpen: false, openTime: '09:00', closeTime: '18:00' },
        sunday: { isOpen: false, openTime: '09:00', closeTime: '18:00' },
      }});
      else if (block?.type === 'faq' || block?.type === 'links' || block?.type === 'gallery' || block?.type === 'testimonials') setContent({ items: [] });
      else setContent({ tr: { text: '' }, en: { text: '' }, ru: { text: '' } });
    } else {
      setContent(block.content);
    }
  }, [block]);

  const handleSave = () => {
    // blockTitleOf() (ArchetypeRenderer) reads content[locale].title first, falling back to the
    // top-level `title` only when that's unset — Beiwe's tools always populate content[locale].title,
    // so without writing per-locale here a manually-typed title would silently have no visible effect
    // on any block Beiwe has touched. Each language tab's title is independent. Clearing a tab
    // removes that locale's stored title so the renderer falls back to the locale's default label —
    // the manual escape hatch from a bad custom title.
    const titledContent = { ...content };
    (['tr', 'en', 'ru'] as const).forEach((loc) => {
      const val = titles[loc]?.trim();
      if (val) {
        titledContent[loc] = { ...titledContent[loc], title: val };
      } else if (titledContent[loc]?.title) {
        const rest = { ...titledContent[loc] };
        delete rest.title;
        titledContent[loc] = rest;
      }
    });
    onSave({ title: titles.tr || titles.en || titles.ru || '', content: titledContent });
  };

  const LangTabs = () => (
    <div className="flex border-b border-slate-200 mb-4">
      {['tr', 'en', 'ru'].map(l => (
        <button 
          key={l}
          onClick={() => setActiveLang(l as any)}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeLang === l ? 'border-[var(--coral)] text-[var(--coral)]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );

  const renderContentEditor = () => {
    if (!block) return null;

    switch (block.type) {
      case 'about':
      case 'custom':
      case 'contact':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('textContentLabel', { lang: activeLang.toUpperCase() })}</label>
              <ColoredTextField
                multiline
                value={content[activeLang]?.text || content.text || ''}
                onChange={(v) => setContent({ ...content, [activeLang]: { ...content[activeLang], text: v } })}
                className="w-full p-3 border border-slate-200 rounded-lg h-40 focus:border-[var(--coral)] focus:outline-none"
                placeholder={t('textContentPlaceholder')}
              />
            </div>
            {block.type === 'about' && (
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <label className="block text-sm font-medium mb-1 text-[var(--ink)]">{t('layoutVariantLabel')}</label>
                <select
                  value={content.layoutVariant || 'standard'}
                  onChange={(e) => setContent({...content, layoutVariant: e.target.value})}
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[var(--coral)]"
                >
                  <option value="standard">{t('about.variantStandard')}</option>
                  <option value="hero-overlay">{t('about.variantHero')}</option>
                  <option value="split-card">{t('about.variantSplit')}</option>
                  <option value="big-statement">{t('about.variantBigStatement')}</option>
                  <option value="image-grid">{t('about.variantImageGrid')}</option>
                </select>
                <label className="block text-sm font-medium mb-1 mt-4">{t('about.mediaLabel')}</label>
                <MediaUploader
                  value={content.mediaUrl || ''}
                  onChange={(url) => setContent({...content, mediaUrl: url})}
                />
                {content.mediaUrl && (
                  <div className="pt-2">
                    <label className="block text-xs font-medium mb-1 text-slate-500">{t('about.mediaPositionLabel')}</label>
                    <select
                      value={content.mediaPosition || 'middle'}
                      onChange={(e) => setContent({...content, mediaPosition: e.target.value})}
                      className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[var(--coral)]"
                    >
                      <option value="top">{t('about.mediaPositionTop')}</option>
                      <option value="middle">{t('about.mediaPositionMiddle')}</option>
                      <option value="bottom">{t('about.mediaPositionBottom')}</option>
                    </select>
                  </div>
                )}
              </div>
            )}
            {(block.type !== 'about' || (content.layoutVariant || 'standard') === 'standard') && (
              <BackgroundImageFields content={content} setContent={setContent} />
            )}
          </div>
        );

      case 'services':
        return (
          <div className="space-y-4">
            <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <label className="block text-sm font-medium mb-1 text-[var(--ink)]">{t('layoutVariantLabel')}</label>
              <select
                value={content.layoutVariant || 'grid-cards'}
                onChange={(e) => setContent({...content, layoutVariant: e.target.value})}
                className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[var(--coral)]"
              >
                <option value="grid-cards">{t('services.variantGridCards')}</option>
                <option value="list">{t('services.variantList')}</option>
                <option value="numbered-list">{t('services.variantNumberedList')}</option>
                <option value="feature-split">{t('services.variantFeatureSplit')}</option>
                <option value="price-table">{t('services.variantPriceTable')}</option>
              </select>
            </div>
            {(content.items || []).map((item: any, idx: number) => {
              const itemLoc = item[activeLang] || item;
              return (
                <div key={idx} className="p-4 border border-slate-200 rounded-lg relative space-y-3 bg-slate-50">
                  <button
                    onClick={() => {
                      const newItems = [...content.items];
                      newItems.splice(idx, 1);
                      setContent({...content, items: newItems});
                    }}
                    className="absolute top-2 right-2 text-red-500 hover:bg-red-50 p-1 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ColoredTextField
                    compact
                    value={itemLoc.title || ''}
                    onChange={(v) => {
                      const newItems = [...content.items];
                      newItems[idx] = { ...item, [activeLang]: { ...itemLoc, title: v } };
                      setContent({...content, items: newItems});
                    }}
                    placeholder={t('services.namePlaceholder')}
                    className="w-full p-2 border border-slate-200 rounded focus:border-[var(--coral)] focus:outline-none"
                  />
                  <ColoredTextField
                    compact
                    multiline
                    value={itemLoc.description || ''}
                    onChange={(v) => {
                      const newItems = [...content.items];
                      newItems[idx] = { ...item, [activeLang]: { ...itemLoc, description: v } };
                      setContent({...content, items: newItems});
                    }}
                    placeholder={t('services.descriptionPlaceholder')}
                    className="w-full p-2 border border-slate-200 rounded focus:border-[var(--coral)] focus:outline-none"
                  />
                  <div className="flex gap-3">
                    <input
                      value={item.price || ''}
                      onChange={e => {
                        const newItems = [...content.items];
                        newItems[idx].price = e.target.value;
                        setContent({...content, items: newItems});
                      }}
                      placeholder={t('services.pricePlaceholder')}
                      className="flex-1 p-2 border border-slate-200 rounded focus:border-[var(--coral)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-slate-500">{t('services.mediaLabel')}</label>
                    <MediaUploader
                      value={item.mediaUrl || ''}
                      onChange={url => {
                        const newItems = [...content.items];
                        newItems[idx].mediaUrl = url;
                        setContent({...content, items: newItems});
                      }}
                    />
                  </div>
                </div>
              );
            })}
            <button
              onClick={() => setContent({...content, items: [...(content.items || []), { price: '', mediaUrl: '' }]})}
              className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-[var(--teal)] font-medium flex items-center justify-center hover:bg-slate-50"
            >
              <Plus className="w-4 h-4 mr-2" /> {t('services.addBtn')}
            </button>
            <BackgroundImageFields content={content} setContent={setContent} />
          </div>
        );

      case 'faq':
        return (
          <div className="space-y-4">
            <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <label className="block text-sm font-medium mb-1 text-[var(--ink)]">{t('layoutVariantLabel')}</label>
              <select
                value={content.layoutVariant || 'chips'}
                onChange={(e) => setContent({...content, layoutVariant: e.target.value})}
                className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[var(--coral)]"
              >
                <option value="chips">{t('faq.variantChips')}</option>
                <option value="accordion">{t('faq.variantAccordion')}</option>
                <option value="numbered">{t('faq.variantNumbered')}</option>
              </select>
            </div>
            {(content.items || []).map((item: any, idx: number) => {
              const questionLoc = item.question?.[activeLang] || (typeof item.question === 'string' ? item.question : '');
              const answerLoc = item.answer?.[activeLang] || (typeof item.answer === 'string' ? item.answer : '');
              return (
              <div key={idx} className="p-4 border border-slate-200 rounded-lg relative space-y-3 bg-slate-50">
                <button
                  onClick={() => {
                    const newItems = [...content.items];
                    newItems.splice(idx, 1);
                    setContent({...content, items: newItems});
                  }}
                  className="absolute top-2 right-2 text-red-500 hover:bg-red-50 p-1 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <ColoredTextField
                  compact
                  value={questionLoc}
                  onChange={(v) => {
                    const newItems = [...content.items];
                    newItems[idx].question = { ...(item.question || {}), [activeLang]: v };
                    setContent({...content, items: newItems});
                  }}
                  placeholder={t('faq.questionPlaceholder', { lang: activeLang })}
                  className="w-full p-2 border border-slate-200 rounded font-medium"
                />
                <ColoredTextField
                  compact
                  multiline
                  value={answerLoc}
                  onChange={(v) => {
                    const newItems = [...content.items];
                    newItems[idx].answer = { ...(item.answer || {}), [activeLang]: v };
                    setContent({...content, items: newItems});
                  }}
                  placeholder={t('faq.answerPlaceholder', { lang: activeLang })}
                  className="w-full p-2 border border-slate-200 rounded text-sm"
                />
              </div>
              );
            })}
            <button
              onClick={() => setContent({...content, items: [...(content.items || []), { question: {}, answer: {} }]})}
              className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-[var(--teal)] font-medium flex items-center justify-center hover:bg-slate-50"
            >
              <Plus className="w-4 h-4 mr-2" /> {t('faq.addBtn')}
            </button>
          </div>
        );

      case 'links':
        return (
          <div className="space-y-4">
            <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <label className="block text-sm font-medium mb-1 text-[var(--ink)]">{t('layoutVariantLabel')}</label>
              <select
                value={content.layoutVariant || 'stacked'}
                onChange={(e) => setContent({...content, layoutVariant: e.target.value})}
                className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[var(--coral)]"
              >
                <option value="stacked">{t('links.variantStacked')}</option>
                <option value="icon-row">{t('links.variantIconRow')}</option>
                <option value="two-col-grid">{t('links.variantTwoColGrid')}</option>
              </select>
            </div>
            {(content.items || []).map((item: any, idx: number) => (
              <div key={idx} className="p-4 border border-slate-200 rounded-lg relative space-y-3 bg-slate-50">
                <button
                  onClick={() => {
                    const newItems = [...content.items];
                    newItems.splice(idx, 1);
                    setContent({...content, items: newItems});
                  }}
                  className="absolute top-2 right-2 text-red-500 hover:bg-red-50 p-1 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <ColoredTextField
                  compact
                  value={item.label || ''}
                  onChange={(v) => {
                    const newItems = [...content.items];
                    newItems[idx].label = v;
                    setContent({...content, items: newItems});
                  }}
                  placeholder={t('links.labelPlaceholder')}
                  className="w-full p-2 border border-slate-200 rounded font-medium"
                />
                <input
                  value={item.url || ''}
                  onChange={e => {
                    const newItems = [...content.items];
                    newItems[idx].url = e.target.value;
                    setContent({...content, items: newItems});
                  }}
                  placeholder={t('links.urlPlaceholder')}
                  className="w-full p-2 border border-slate-200 rounded text-sm"
                />
              </div>
            ))}
            <button
              onClick={() => setContent({...content, items: [...(content.items || []), { label: '', url: '' }]})}
              className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-[var(--teal)] font-medium flex items-center justify-center hover:bg-slate-50"
            >
              <Plus className="w-4 h-4 mr-2" /> {t('links.addBtn')}
            </button>
          </div>
        );

      case 'gallery':
        return (
          <div className="space-y-4">
            <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <label className="block text-sm font-medium mb-1 text-[var(--ink)]">{t('layoutVariantLabel')}</label>
              <select
                value={content.layoutVariant || 'grid'}
                onChange={(e) => setContent({...content, layoutVariant: e.target.value})}
                className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[var(--coral)]"
              >
                <option value="grid">{t('gallery.variantGrid')}</option>
                <option value="masonry">{t('gallery.variantMasonry')}</option>
                <option value="fullbleed-carousel">{t('gallery.variantFullbleedCarousel')}</option>
                <option value="stacked-fullwidth">{t('gallery.variantStackedFullwidth')}</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(content.items || []).map((item: any, idx: number) => {
                const captionLoc = item.caption?.[activeLang] || (typeof item.caption === 'string' ? item.caption : '');
                return (
                  <div key={idx} className="relative bg-slate-50 border border-slate-200 rounded-lg p-2 flex flex-col gap-2">
                    <button 
                      onClick={() => {
                        const newItems = [...content.items];
                        newItems.splice(idx, 1);
                        setContent({...content, items: newItems});
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white hover:bg-red-600 p-1 rounded-full z-10 shadow-sm"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="h-32">
                      <MediaUploader 
                        value={item.url || ''}
                        onChange={url => {
                          const newItems = [...content.items];
                          newItems[idx].url = url;
                          setContent({...content, items: newItems});
                        }}
                        label={t('gallery.uploadLabel')}
                      />
                    </div>
                    <ColoredTextField
                      compact
                      value={captionLoc}
                      onChange={(v) => {
                        const newItems = [...content.items];
                        newItems[idx].caption = { ...(item.caption || {}), [activeLang]: v };
                        setContent({...content, items: newItems});
                      }}
                      placeholder={t('gallery.captionPlaceholder', { lang: activeLang })}
                      className="w-full p-2 border border-slate-200 rounded text-xs mt-auto focus:border-[var(--coral)] focus:outline-none"
                    />
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => setContent({...content, items: [...(content.items || []), { url: '', caption: {} }]})}
              className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-[var(--teal)] font-medium flex items-center justify-center hover:bg-slate-50"
            >
              <Plus className="w-4 h-4 mr-2" /> {t('gallery.addBtn')}
            </button>
          </div>
        );

      case 'testimonials':
        return (
          <div className="space-y-4">
            <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <label className="block text-sm font-medium mb-1 text-[var(--ink)]">{t('layoutVariantLabel')}</label>
              <select
                value={content.layoutVariant || 'scroll-cards'}
                onChange={(e) => setContent({...content, layoutVariant: e.target.value})}
                className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[var(--coral)]"
              >
                <option value="scroll-cards">{t('testimonials.variantScrollCards')}</option>
                <option value="big-quote">{t('testimonials.variantBigQuote')}</option>
                <option value="grid-quotes">{t('testimonials.variantGridQuotes')}</option>
              </select>
            </div>
            {(content.items || []).map((item: any, idx: number) => {
              const quoteLoc = item.quote?.[activeLang] || (typeof item.quote === 'string' ? item.quote : '');
              const roleLoc = item.role?.[activeLang] || (typeof item.role === 'string' ? item.role : '');
              return (
                <div key={idx} className="p-4 border border-slate-200 rounded-lg relative space-y-3 bg-slate-50">
                  <button 
                    onClick={() => {
                      const newItems = [...content.items];
                      newItems.splice(idx, 1);
                      setContent({...content, items: newItems});
                    }}
                    className="absolute top-2 right-2 text-red-500 hover:bg-red-50 p-1 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ColoredTextField
                    compact
                    multiline
                    value={quoteLoc}
                    onChange={(v) => {
                      const newItems = [...content.items];
                      newItems[idx].quote = { ...(item.quote || {}), [activeLang]: v };
                      setContent({...content, items: newItems});
                    }}
                    placeholder={t('testimonials.quotePlaceholder', { lang: activeLang })}
                    className="w-full p-2 border border-slate-200 rounded min-h-[80px] focus:border-[var(--coral)] focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <input
                      value={item.author || ''}
                      onChange={e => {
                        const newItems = [...content.items];
                        newItems[idx].author = e.target.value;
                        setContent({...content, items: newItems});
                      }}
                      placeholder={t('testimonials.authorPlaceholder')}
                      className="flex-1 p-2 border border-slate-200 rounded text-sm focus:border-[var(--coral)] focus:outline-none"
                    />
                    <input
                      value={roleLoc}
                      onChange={e => {
                        const newItems = [...content.items];
                        newItems[idx].role = { ...(item.role || {}), [activeLang]: e.target.value };
                        setContent({...content, items: newItems});
                      }}
                      placeholder={t('testimonials.rolePlaceholder', { lang: activeLang })}
                      className="flex-1 p-2 border border-slate-200 rounded text-sm focus:border-[var(--coral)] focus:outline-none"
                    />
                  </div>
                </div>
              );
            })}
            <button
              onClick={() => setContent({...content, items: [...(content.items || []), { quote: {}, author: '', role: {} }]})}
              className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-[var(--teal)] font-medium flex items-center justify-center hover:bg-slate-50"
            >
              <Plus className="w-4 h-4 mr-2" /> {t('testimonials.addBtn')}
            </button>
            <BackgroundImageFields content={content} setContent={setContent} />
          </div>
        );

      case 'hours':
        return (
          <div className="space-y-3">
            <div className="mb-1 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <label className="block text-sm font-medium mb-1 text-[var(--ink)]">{t('layoutVariantLabel')}</label>
              <select
                value={content.layoutVariant || 'table'}
                onChange={(e) => setContent({...content, layoutVariant: e.target.value})}
                className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[var(--coral)]"
              >
                <option value="table">{t('hours.variantTable')}</option>
                <option value="compact-badge">{t('hours.variantCompactBadge')}</option>
                <option value="pill-row">{t('hours.variantPillRow')}</option>
              </select>
            </div>
            {Object.entries(content.schedule || {}).map(([day, data]: [string, any]) => (
              <div key={day} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-slate-50">
                <div className="flex items-center space-x-3 w-1/3">
                  <input 
                    type="checkbox" 
                    checked={data.isOpen} 
                    onChange={e => {
                      const newSchedule = {...content.schedule};
                      newSchedule[day].isOpen = e.target.checked;
                      setContent({...content, schedule: newSchedule});
                    }}
                    className="w-4 h-4 rounded text-[var(--coral)] focus:ring-[var(--coral)]"
                  />
                  <span className="capitalize font-medium text-sm text-[var(--ink)]">{day}</span>
                </div>
                {data.isOpen ? (
                  <div className="flex items-center space-x-2">
                    <input 
                      type="time" 
                      value={data.openTime} 
                      onChange={e => {
                        const newSchedule = {...content.schedule};
                        newSchedule[day].openTime = e.target.value;
                        setContent({...content, schedule: newSchedule});
                      }}
                      className="p-1 border border-slate-300 rounded text-sm"
                    />
                    <span>-</span>
                    <input 
                      type="time" 
                      value={data.closeTime} 
                      onChange={e => {
                        const newSchedule = {...content.schedule};
                        newSchedule[day].closeTime = e.target.value;
                        setContent({...content, schedule: newSchedule});
                      }}
                      className="p-1 border border-slate-300 rounded text-sm"
                    />
                  </div>
                ) : (
                  <span className="text-sm text-[var(--muted)]">{t('hours.closedLabel')}</span>
                )}
              </div>
            ))}
          </div>
        );

      default:
        return (
          <p className="text-sm text-slate-500">{t('emptyEditor')}</p>
        );
    }
  };

  if (!block) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90dvh]">
        <div className="flex justify-between items-center p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-[var(--ink)]">{t('title')}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-5 overflow-y-auto flex-1">
          <LangTabs />
          <div className="mb-5">
            <label className="block text-sm font-medium mb-1 text-[var(--ink)]">{t('blockTitleLabel', { lang: activeLang.toUpperCase() })}</label>
            <ColoredTextField
              value={titles[activeLang]}
              onChange={(v) => setTitles({ ...titles, [activeLang]: v })}
              className="w-full p-3 border border-slate-200 rounded-lg font-semibold focus:border-[var(--coral)] focus:outline-none"
              placeholder={t('blockTitlePlaceholder')}
            />
          </div>

          {renderContentEditor()}
        </div>

        <div className="p-5 border-t border-slate-100 flex justify-between items-center bg-slate-50 rounded-b-2xl">
          <button onClick={onDelete} className="text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg font-medium transition">
            {t('delete')}
          </button>
          <div className="space-x-3 flex">
            <button onClick={onClose} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition">
              {t('cancel')}
            </button>
            <button onClick={handleSave} className="px-6 py-2 bg-[var(--coral)] text-white font-medium rounded-lg hover:bg-orange-600 shadow-sm transition">
              {t('save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
