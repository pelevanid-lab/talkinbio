'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft, Loader2, Save, Wand2 } from 'lucide-react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { createClient } from '@/utils/supabase/client';
import {
  getInteractiveEntryOptions,
  resolveInteractiveEntryTargets,
  type ConversionFlowQuestion,
  type ConversionFlowSettings,
} from '@/utils/interactiveEntry';
import { creditsForCost } from '@/config/pricing';

type LocaleCode = 'tr' | 'en' | 'ru';

const LOCALE_LABELS: Record<LocaleCode, string> = { tr: 'TR', en: 'EN', ru: 'RU' };
const CONVERSION_FLOW_GENERATE_COST_USD = 0.05;
const CONVERSION_FLOW_GENERATE_CREDITS = creditsForCost(CONVERSION_FLOW_GENERATE_COST_USD, 2.5);

function emptyQuestion(index: number): ConversionFlowQuestion {
  return {
    id: `question-${index + 1}`,
    label: '',
    answer: '',
    next: [{ id: `question-${index + 1}-next-1`, label: '', answer: '' }],
  };
}

function blockTitle(block: any, locale: string) {
  return block.content?.[locale]?.title || block.content?.tr?.title || block.title || block.type;
}

function questionsFor(flow: ConversionFlowSettings, blockId: string, locale: LocaleCode): ConversionFlowQuestion[] {
  return flow.nodes?.[blockId]?.locales?.[locale]?.questions || [emptyQuestion(0), emptyQuestion(1)];
}

function updateQuestionAt(
  flow: ConversionFlowSettings,
  blockId: string,
  locale: LocaleCode,
  questionIndex: number,
  updater: (question: ConversionFlowQuestion) => ConversionFlowQuestion
): ConversionFlowSettings {
  const currentQuestions = questionsFor(flow, blockId, locale);
  const nextQuestions = currentQuestions.map((question, index) => index === questionIndex ? updater(question) : question);
  return {
    ...flow,
    nodes: {
      ...(flow.nodes || {}),
      [blockId]: {
        ...(flow.nodes?.[blockId] || {}),
        locales: {
          ...(flow.nodes?.[blockId]?.locales || {}),
          [locale]: { questions: nextQuestions },
        },
      },
    },
  };
}

export default function ConversionFlowClient({ business, blocks }: { business: any; blocks: any[] }) {
  const supabase = createClient();
  const t = useTranslations('ConversionFlow');
  const locale = useLocale() as LocaleCode;
  const [flow, setFlow] = useState<ConversionFlowSettings>(business.saule_settings?.conversionFlow || { nodes: {} });
  const [selectedLocale, setSelectedLocale] = useState<LocaleCode>(locale === 'en' || locale === 'ru' ? locale : 'tr');
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [creditBalance, setCreditBalance] = useState<number>(business.credit_balance ?? 0);

  const entryOptions = useMemo(() => getInteractiveEntryOptions(blocks, selectedLocale), [blocks, selectedLocale]);
  const resolvedEntry = useMemo(
    () => resolveInteractiveEntryTargets(blocks, business.saule_settings?.interactiveEntry),
    [blocks, business.saule_settings?.interactiveEntry]
  );
  const targetBlockIds = resolvedEntry.discoverBlockIds.slice(0, 3);
  const selectedId = selectedBlockId || targetBlockIds[0] || null;
  const selectedBlock = blocks.find((block) => block.id === selectedId);
  const selectedQuestions = selectedId ? questionsFor(flow, selectedId, selectedLocale) : [];
  const hasEnoughCredits = creditBalance >= CONVERSION_FLOW_GENERATE_CREDITS;

  const generateFlow = async () => {
    setIsGenerating(true);
    setMessage(null);
    try {
      const response = await fetch('/api/front-desk/conversion-flow/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: business.id }),
      });
      const data = await response.json();
      if (!response.ok || !data.conversionFlow) {
        if (response.status === 402) {
          throw new Error(t('insufficientCredits', {
            required: data.requiredCredits ?? CONVERSION_FLOW_GENERATE_CREDITS,
            balance: data.balance ?? creditBalance,
          }));
        }
        throw new Error(data.error || t('generateError'));
      }
      setFlow(data.conversionFlow);
      setSelectedBlockId(targetBlockIds[0] || null);
      setCreditBalance((balance) => Math.max(0, balance - CONVERSION_FLOW_GENERATE_CREDITS));
      setMessage(t('generatedMessage'));
    } catch (error: any) {
      setMessage(error?.message || t('generateError'));
    } finally {
      setIsGenerating(false);
    }
  };

  const saveFlow = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const nextSettings = {
        ...(business.saule_settings || {}),
        conversionFlow: flow,
      };
      const { error } = await supabase.from('businesses').update({ saule_settings: nextSettings }).eq('id', business.id);
      if (error) throw error;
      business.saule_settings = nextSettings;
      setMessage(t('savedMessage'));
    } catch (error: any) {
      setMessage(error?.message || t('saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const updateQuestion = (questionIndex: number, patch: Partial<ConversionFlowQuestion>) => {
    if (!selectedId) return;
    setFlow((current) => updateQuestionAt(current, selectedId, selectedLocale, questionIndex, (question) => ({ ...question, ...patch })));
  };

  const updateNextQuestion = (questionIndex: number, nextIndex: number, patch: Partial<ConversionFlowQuestion>) => {
    if (!selectedId) return;
    setFlow((current) => updateQuestionAt(current, selectedId, selectedLocale, questionIndex, (question) => {
      const next = [...(question.next || [{ id: `${question.id}-next-1`, label: '', answer: '' }])];
      next[nextIndex] = { ...(next[nextIndex] || { id: `${question.id}-next-${nextIndex + 1}`, label: '', answer: '' }), ...patch };
      return { ...question, next };
    }));
  };

  return (
    <DashboardShell business={business} active="front-desk">
      <main className="mx-auto max-w-6xl px-4 py-8 font-['Inter'] sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <a href={`/${locale}/dashboard/front-desk`} className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[#4B5A55] hover:text-[#14231F]">
              <ArrowLeft className="h-4 w-4" />
              {t('back')}
            </a>
            <h1 className="font-['Bricolage_Grotesque'] text-2xl font-[800] text-[#14231F]">{t('title')}</h1>
            <p className="mt-1 text-sm text-[#4B5A55]">{t('description')}</p>
            <p className="mt-2 text-xs font-semibold text-[#8A8880]">
              {t('creditInfo', { credits: CONVERSION_FLOW_GENERATE_CREDITS, balance: creditBalance })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={generateFlow}
              disabled={isGenerating || targetBlockIds.length === 0 || !hasEnoughCredits}
              className="inline-flex items-center gap-2 rounded-full border border-[#FF6A5C] bg-[#FFEDE9] px-4 py-2 text-sm font-semibold text-[#C43F35] transition hover:bg-[#FFE3DE] disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              {t('autoFillButton', { credits: CONVERSION_FLOW_GENERATE_CREDITS })}
            </button>
            <button
              type="button"
              onClick={saveFlow}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-full bg-[#14231F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#20342F] disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t('saveButton')}
            </button>
          </div>
        </div>

        {message && (
          <div className="mb-5 rounded-lg border border-[rgba(20,35,31,0.10)] bg-white px-4 py-3 text-sm text-[#14231F] shadow-sm">
            {message}
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-[18px] border border-[rgba(20,35,31,0.10)] bg-white p-4 shadow-sm">
            <div className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-[#8A8880]">{t('startOptions')}</div>
            <div className="space-y-2">
              {targetBlockIds.map((blockId, index) => {
                const option = entryOptions.find((item) => item.blockId === blockId);
                const block = blocks.find((item) => item.id === blockId);
                return (
                  <button
                    key={blockId}
                    type="button"
                    onClick={() => setSelectedBlockId(blockId)}
                    className={`w-full rounded-lg border p-3 text-left transition ${
                      selectedId === blockId
                        ? 'border-[#FF6A5C] bg-[#FFF6F3]'
                        : 'border-[rgba(20,35,31,0.10)] hover:bg-[#F8F7F4]'
                    }`}
                  >
                    <div className="text-[10px] font-bold text-[#8A8880]">{index + 1}</div>
                    <div className="truncate text-sm font-semibold text-[#14231F]">{option?.label || (block ? blockTitle(block, selectedLocale) : blockId)}</div>
                  </button>
                );
              })}
            </div>
            <div className="mt-5 flex gap-1 rounded-full bg-[#F4F2ED] p-1">
              {(['tr', 'en', 'ru'] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setSelectedLocale(code)}
                  className={`flex-1 rounded-full px-2 py-1.5 text-xs font-bold ${selectedLocale === code ? 'bg-white text-[#14231F] shadow-sm' : 'text-[#8A8880]'}`}
                >
                  {LOCALE_LABELS[code]}
                </button>
              ))}
            </div>
          </aside>

          <section className="rounded-[18px] border border-[rgba(20,35,31,0.10)] bg-white p-5 shadow-sm">
            {selectedBlock ? (
              <>
                <div className="mb-5 border-b border-[rgba(20,35,31,0.10)] pb-4">
                  <div className="text-xs font-bold uppercase tracking-[0.12em] text-[#8A8880]">{LOCALE_LABELS[selectedLocale]}</div>
                  <h2 className="mt-1 font-['Bricolage_Grotesque'] text-xl font-[800] text-[#14231F]">{blockTitle(selectedBlock, selectedLocale)}</h2>
                </div>

                <div className="space-y-5">
                  {selectedQuestions.slice(0, 2).map((question, questionIndex) => (
                    <div key={`${selectedId}-${selectedLocale}-${questionIndex}`} className="rounded-lg border border-[rgba(20,35,31,0.10)] p-4">
                      <div className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-[#8A8880]">{t('firstQuestion', { index: questionIndex + 1 })}</div>
                      <label className="mb-1 block text-xs font-semibold text-[#4B5A55]">{t('questionLabel')}</label>
                      <input
                        value={question.label}
                        onChange={(event) => updateQuestion(questionIndex, { label: event.target.value })}
                        className="mb-3 w-full rounded-lg border border-[rgba(20,35,31,0.14)] px-3 py-2 text-sm outline-none focus:border-[#FF6A5C]"
                      />
                      <label className="mb-1 block text-xs font-semibold text-[#4B5A55]">{t('answerLabel')}</label>
                      <textarea
                        value={question.answer}
                        onChange={(event) => updateQuestion(questionIndex, { answer: event.target.value })}
                        rows={4}
                        className="mb-4 w-full rounded-lg border border-[rgba(20,35,31,0.14)] px-3 py-2 text-sm leading-6 outline-none focus:border-[#FF6A5C]"
                      />
                      <div className="rounded-lg bg-[#F8F7F4] p-3">
                        <div className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-[#8A8880]">{t('nextQuestion')}</div>
                        <input
                          value={question.next?.[0]?.label || ''}
                          onChange={(event) => updateNextQuestion(questionIndex, 0, { label: event.target.value })}
                          className="mb-3 w-full rounded-lg border border-[rgba(20,35,31,0.14)] bg-white px-3 py-2 text-sm outline-none focus:border-[#FF6A5C]"
                        />
                        <textarea
                          value={question.next?.[0]?.answer || ''}
                          onChange={(event) => updateNextQuestion(questionIndex, 0, { answer: event.target.value })}
                          rows={3}
                          className="w-full rounded-lg border border-[rgba(20,35,31,0.14)] bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-[#FF6A5C]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                {t('emptyTargets')}
              </div>
            )}
          </section>
        </div>
      </main>
    </DashboardShell>
  );
}
