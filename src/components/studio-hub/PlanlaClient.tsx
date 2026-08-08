'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Copy, Globe, Loader2, Plus, Sparkles, Trash2, X } from 'lucide-react';
import {
  CONTENT_PLAN_STATUSES,
  PLANLA_PILLAR_SUGGEST_COST_USD,
  PLANLA_IDEA_GENERATE_COST_USD,
  PLANLA_IDEA_GENERATE_GROUNDED_COST_USD,
  type ContentPillar,
  type ContentPlanItem,
  type ContentPlanStatus,
  type ContentCaptionResult,
} from '@/config/contentPlan';
import { creditsForCost } from '@/config/pricing';

// Planla v2 — sütun şeridi + fikir üretim paneli + durum panosu. Eski `ContentClient`'ın
// (tek kaynak seç → tek caption üret, kalıcılık yok) YERİNİ alıyor — bu bileşen kalıcı
// (`content_plan_items`), sütun-temelli ve isteğe bağlı trend-aramalı. `ContentClient`
// dosyasının kendisi DEĞİŞMEDİ, öksüz `/dashboard/content` route'u için olduğu gibi duruyor.

function CopyButton({ text, title }: { text: string; title: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors shrink-0"
      title={title}
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

type Props = {
  business: { id: string; name: string; category: string | null; credit_balance: number };
  initialPillars: ContentPillar[];
  initialItems: ContentPlanItem[];
};

export default function PlanlaClient({ business, initialPillars, initialItems }: Props) {
  const t = useTranslations('StudioHub');
  const STATUS_LABEL: Record<ContentPlanStatus, string> = {
    idea: t('planlaStatusIdea'),
    ready: t('planlaStatusReady'),
    posted: t('planlaStatusPosted'),
    skipped: t('planlaStatusSkipped'),
  };
  const LOCALE_LABEL: Record<'tr' | 'en' | 'ru', string> = {
    tr: t('planlaLocaleLabelTr'),
    en: t('planlaLocaleLabelEn'),
    ru: t('planlaLocaleLabelRu'),
  };

  const [pillars, setPillars] = useState<ContentPillar[]>(initialPillars);
  const [pillarsDirty, setPillarsDirty] = useState(false);
  const [suggestingPillars, setSuggestingPillars] = useState(false);
  const [savingPillars, setSavingPillars] = useState(false);

  const [items, setItems] = useState<ContentPlanItem[]>(initialItems);
  const [count, setCount] = useState<3 | 5>(3);
  const [grounded, setGrounded] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [manualTitle, setManualTitle] = useState('');
  const [expandingId, setExpandingId] = useState<string | null>(null);
  const [captionsByItem, setCaptionsByItem] = useState<Record<string, ContentCaptionResult>>({});
  const [error, setError] = useState<string | null>(null);

  const pillarLabel = (id: string | null) => pillars.find((p) => p.id === id)?.label;

  const suggestPillars = async () => {
    setSuggestingPillars(true);
    setError(null);
    try {
      const res = await fetch('/api/studio/planla/pillars/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: business.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('planlaErrorPillarSuggest'));
      setPillars(data.pillars);
      setPillarsDirty(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('planlaErrorPillarSuggest'));
    } finally {
      setSuggestingPillars(false);
    }
  };

  const savePillars = async () => {
    setSavingPillars(true);
    setError(null);
    try {
      const res = await fetch('/api/studio/planla/pillars', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: business.id, pillars }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('planlaErrorPillarSave'));
      setPillars(data.pillars);
      setPillarsDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('planlaErrorPillarSave'));
    } finally {
      setSavingPillars(false);
    }
  };

  const removePillar = (id: string) => {
    setPillars((prev) => prev.filter((p) => p.id !== id));
    setPillarsDirty(true);
  };

  const generateIdeas = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/studio/planla/ideas/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: business.id, count, grounded }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error === undefined ? t('planlaErrorIdeaGenerate') : data.requiredCredits ? t('planlaErrorInsufficientCredits') : data.error);
      }
      setItems((prev) => [...(data.items as ContentPlanItem[]), ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('planlaErrorIdeaGenerate'));
    } finally {
      setGenerating(false);
    }
  };

  const addManualIdea = () => {
    if (!manualTitle.trim()) return;
    const item: ContentPlanItem = {
      id: crypto.randomUUID(),
      business_id: business.id,
      pillar_id: null,
      status: 'idea',
      title: manualTitle.trim(),
      brief: null,
      format: 'instagram_post',
      source: 'manual',
      trend_note: null,
      generated_caption: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setItems((prev) => [item, ...prev]);
    setManualTitle('');
    // Sunucuya da yaz — sayfa yenilenince kaybolmasın. Manuel eklenen kartlar bir
    // "generate" çağrısından gelmediği için ayrı, küçük bir insert route'u yerine
    // mevcut PATCH route'una "id yoksa oluştur" YÜKLEMİYORUZ (o zaten var olan bir
    // kaydı günceller) — bu yüzden burada özel bir insert yapılıyor.
    fetch('/api/studio/planla/ideas/manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId: business.id, title: item.title }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.item) setItems((prev) => prev.map((it) => (it.id === item.id ? data.item : it)));
      })
      .catch(() => {});
  };

  const setStatus = async (id: string, status: ContentPlanStatus) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status } : it)));
    await fetch(`/api/studio/planla/ideas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).catch(() => {});
  };

  const deleteItem = async (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    await fetch(`/api/studio/planla/ideas/${id}`, { method: 'DELETE' }).catch(() => {});
  };

  const expandItem = async (id: string) => {
    setExpandingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/studio/planla/ideas/${id}/expand`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('planlaErrorExpand'));
      setCaptionsByItem((prev) => ({ ...prev, [id]: data.captions }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('planlaErrorExpand'));
    } finally {
      setExpandingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Sütunlar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-900">{t('planlaPillarsTitle')}</h2>
          <button
            onClick={suggestPillars}
            disabled={suggestingPillars}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50"
          >
            {suggestingPillars ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {pillars.length > 0 ? t('planlaPillarsResuggestBtn') : t('planlaPillarsSuggestBtn')} ·{' '}
            {t('planlaCreditsSuffix', { count: creditsForCost(PLANLA_PILLAR_SUGGEST_COST_USD) })}
          </button>
        </div>
        {pillars.length === 0 ? (
          <p className="text-xs text-slate-400">{t('planlaPillarsEmpty')}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {pillars.map((p) => (
              <span
                key={p.id}
                title={p.description}
                className="flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full bg-slate-100 text-xs font-medium text-slate-700"
              >
                {p.label}
                <button onClick={() => removePillar(p.id)} className="p-0.5 text-slate-400 hover:text-red-600" title={t('planlaPillarRemoveTooltip')}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        {pillarsDirty && (
          <button
            onClick={savePillars}
            disabled={savingPillars}
            className="mt-3 flex items-center gap-1.5 bg-slate-900 text-white rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-slate-800 disabled:opacity-50"
          >
            {savingPillars ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            {t('planlaPillarsSaveBtn')}
          </button>
        )}
      </div>

      {/* Fikir üretimi */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">{t('planlaIdeasTitle')}</h2>
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="flex gap-1.5">
            {([3, 5] as const).map((n) => (
              <button
                key={n}
                onClick={() => setCount(n)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  count === n ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t('planlaCountOption', { n })}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-1.5 text-xs text-slate-600">
            <input type="checkbox" checked={grounded} onChange={(e) => setGrounded(e.target.checked)} className="rounded border-slate-300" />
            <Globe className="w-3.5 h-3.5" /> {t('planlaGroundedLabel')}
          </label>
        </div>
        <button
          onClick={generateIdeas}
          disabled={generating}
          className="flex items-center justify-center gap-2 bg-[#FF6A5C] text-white px-5 py-2.5 rounded-full font-medium text-sm hover:bg-[#FF5847] transition-colors disabled:opacity-50"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {generating
            ? t('planlaGenerating')
            : `${t('planlaGenerateBtn')} · ${t('planlaCreditsSuffix', { count: creditsForCost(grounded ? PLANLA_IDEA_GENERATE_GROUNDED_COST_USD : PLANLA_IDEA_GENERATE_COST_USD) })}`}
        </button>
      </div>

      {/* Fikir panosu */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <input
            value={manualTitle}
            onChange={(e) => setManualTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addManualIdea()}
            placeholder={t('planlaManualPlaceholder')}
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
          <button onClick={addManualIdea} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm hover:bg-slate-200">
            <Plus className="w-4 h-4" /> {t('planlaManualAddBtn')}
          </button>
        </div>

        {CONTENT_PLAN_STATUSES.map((status) => {
          const group = items.filter((it) => it.status === status);
          if (group.length === 0) return null;
          return (
            <div key={status}>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                {STATUS_LABEL[status]} · {group.length}
              </h3>
              <div className="flex flex-col gap-2">
                {group.map((item) => {
                  const caption = captionsByItem[item.id] ?? item.generated_caption;
                  return (
                    <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            {pillarLabel(item.pillar_id) && (
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-[#FF6A5C]">{pillarLabel(item.pillar_id)}</span>
                            )}
                            {item.source === 'manual' && <span className="text-[10px] text-slate-400">{t('planlaManualBadge')}</span>}
                          </div>
                          <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                          {item.brief && <p className="text-xs text-slate-500 mt-0.5">{item.brief}</p>}
                          {item.trend_note && <p className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1"><Globe className="w-3 h-3" /> {item.trend_note}</p>}
                        </div>
                        <button onClick={() => deleteItem(item.id)} className="p-1 text-slate-300 hover:text-red-600 shrink-0" title={t('planlaItemDeleteTooltip')}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <button
                          onClick={() => expandItem(item.id)}
                          disabled={expandingId === item.id}
                          className="flex items-center gap-1.5 text-xs font-medium border border-slate-300 rounded-full px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50"
                        >
                          {expandingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                          {caption ? t('planlaExpandAgainBtn') : t('planlaExpandBtn')} · {t('planlaFreeLabel')}
                        </button>
                        {CONTENT_PLAN_STATUSES.filter((s) => s !== status).map((s) => (
                          <button
                            key={s}
                            onClick={() => setStatus(item.id, s)}
                            className="text-xs text-slate-500 hover:text-slate-900 underline-offset-2 hover:underline"
                          >
                            {t('planlaMarkStatus', { status: STATUS_LABEL[s] })}
                          </button>
                        ))}
                      </div>

                      {caption && (
                        <div className="mt-3 grid gap-2">
                          {(['tr', 'en', 'ru'] as const).map((loc) => (
                            <div key={loc} className="bg-slate-50 rounded-lg p-3">
                              <div className="flex justify-between items-start gap-2 mb-1">
                                <h4 className="text-xs font-bold text-slate-700">{LOCALE_LABEL[loc]}</h4>
                                <CopyButton
                                  text={[caption[loc].caption, ...(caption[loc].hashtags || []).map((h) => `#${h.replace(/^#/, '')}`)].join('\n\n')}
                                  title={t('planlaCopyTooltip')}
                                />
                              </div>
                              <p className="text-xs text-slate-700 whitespace-pre-wrap">{caption[loc].caption}</p>
                              {!!caption[loc].hashtags?.length && (
                                <p className="text-xs text-[#FF6A5C] mt-1">{caption[loc].hashtags!.map((h) => `#${h.replace(/^#/, '')}`).join(' ')}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {items.length === 0 && <p className="text-sm text-slate-400">{t('planlaEmptyItems')}</p>}
      </div>
    </div>
  );
}
