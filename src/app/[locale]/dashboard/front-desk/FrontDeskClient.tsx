'use client';

import { useMemo, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useLocale, useTranslations } from 'next-intl';
import {
  CheckCircle2,
  Loader2,
  ExternalLink,
  Mail,
  Clock,
  Phone,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  ListOrdered,
} from 'lucide-react';
import KnowledgeBasePanel from '../leads/KnowledgeBasePanel';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { FEATURES } from '@/config/features';
import { getInteractiveEntryOptions, resolveInteractiveEntryTargets } from '@/utils/interactiveEntry';

// Contact methods offered as an "Order Now" target — same keys as business.contact_value.
const ORDER_NOW_METHOD_LABELS: Record<string, Record<string, string>> = {
  whatsapp: { tr: 'WhatsApp', en: 'WhatsApp', ru: 'WhatsApp' },
  instagram: { tr: 'Instagram', en: 'Instagram', ru: 'Instagram' },
  telegram: { tr: 'Telegram', en: 'Telegram', ru: 'Telegram' },
  email: { tr: 'E-posta', en: 'Email', ru: 'Email' },
};

export default function FrontDeskClient({ business, blocks, initialKnowledge }: { business: any; blocks: any[]; initialKnowledge: any[] }) {
  const supabase = createClient();
  const t = useTranslations('Leads');
  const tEditor = useTranslations('Editor');
  const locale = useLocale();

  const [settingsSection, setSettingsSection] = useState<'behavior' | 'capture' | 'knowledge'>('behavior');
  const [settings, setSettings] = useState(business.saule_settings || {});
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [copiedProfileLink, setCopiedProfileLink] = useState(false);
  const [metaSuccess, setMetaSuccess] = useState<string | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);

  const entryOptions = useMemo(() => getInteractiveEntryOptions(blocks, locale), [blocks, locale]);
  const resolvedEntry = useMemo(
    () => resolveInteractiveEntryTargets(blocks, settings.interactiveEntry),
    [blocks, settings.interactiveEntry]
  );
  const entryLabels = useMemo(
    () => new Map(entryOptions.map((option) => [option.blockId, option.label])),
    [entryOptions]
  );

  const setHeroTarget = (blockId: string) => {
    setSettings((current: any) => ({
      ...current,
      interactiveEntry: {
        ...(current.interactiveEntry || {}),
        heroTarget: blockId ? { blockId } : null,
      },
    }));
  };

  const setDiscoverTarget = (index: number, blockId: string) => {
    const nextIds = [...resolvedEntry.discoverBlockIds];
    nextIds[index] = blockId;
    setSettings((current: any) => ({
      ...current,
      interactiveEntry: {
        ...(current.interactiveEntry || {}),
        discoverTargets: nextIds.filter(Boolean).map((id) => ({ blockId: id })),
      },
    }));
  };

  const moveDiscoverTarget = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= resolvedEntry.discoverBlockIds.length) return;
    const nextIds = [...resolvedEntry.discoverBlockIds];
    [nextIds[index], nextIds[targetIndex]] = [nextIds[targetIndex], nextIds[index]];
    setSettings((current: any) => ({
      ...current,
      interactiveEntry: {
        ...(current.interactiveEntry || {}),
        discoverTargets: nextIds.map((blockId) => ({ blockId })),
      },
    }));
  };

  if (typeof window !== 'undefined' && !metaSuccess && !metaError) {
    const searchParams = new URLSearchParams(window.location.search);
    const success = searchParams.get('meta_success');
    const error = searchParams.get('meta_error');
    if (success === 'connected') {
      setMetaSuccess(success);
    }
    if (error) {
      setMetaError(error);
    }
  }

  const profileUrl = `talkinbio.com/${business.username}`;
  const handleCopyProfileLink = async () => {
    try {
      await navigator.clipboard.writeText(`https://${profileUrl}`);
      setCopiedProfileLink(true);
      setTimeout(() => setCopiedProfileLink(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  let orderNowContactValues: Record<string, string> = {};
  try {
    orderNowContactValues = business.contact_value ? JSON.parse(business.contact_value) : {};
  } catch {
    orderNowContactValues = {};
  }

  const orderNowOptions = [
    { key: 'saule', label: t('orderNowSaule'), disabled: false },
    ...(['whatsapp', 'instagram', 'telegram', 'email'] as const).map((key) => ({
      key,
      label: ORDER_NOW_METHOD_LABELS[key][locale] || key,
      disabled: !orderNowContactValues[key]?.trim(),
    })),
  ];

  const contactValues: Record<string, string> = (() => {
    try {
      return business.contact_value ? JSON.parse(business.contact_value) : {};
    } catch {
      return {};
    }
  })();
  const CONTACT_METHOD_ORDER = ['whatsapp', 'instagram', 'telegram', 'email'] as const;
  const availableContactMethods = CONTACT_METHOD_ORDER.filter((m) => contactValues[m]?.trim());

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const nextSettings = { ...settings };
      delete nextSettings.customGreeting;
      delete nextSettings.customGreetingEnabled;
      const { error } = await supabase.from('businesses').update({ saule_settings: nextSettings }).eq('id', business.id);
      if (error) throw error;
      setSettings(nextSettings);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      console.error(err);
      alert(t('settingsSaveError'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardShell business={business} active="front-desk">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-['Inter']">
        <div className="bg-white border border-[rgba(20,35,31,0.10)] rounded-[20px] p-6 shadow-sm">
          <div className="flex flex-col gap-1 mb-8 pb-6 border-b border-[rgba(20,35,31,0.10)]">
            <h2 className="text-xl font-[800] text-[#14231F] font-['Bricolage_Grotesque']">
              {t('sauleSubtitle')}
            </h2>
            
            {(() => {
              const creditBalance = business.credit_balance ?? 0;
              const hasEnoughCredits = creditBalance >= 20;
              return (
                <div className={`mt-6 p-4 rounded-2xl border transition-all ${
                  !hasEnoughCredits 
                    ? 'bg-amber-50/50 border-amber-200/60 text-amber-900' 
                    : settings.frontDeskEnabled !== false 
                      ? 'bg-emerald-50/10 border-emerald-500/20 text-[#14231F]' 
                      : 'bg-[#F4F2ED]/50 border-[rgba(20,35,31,0.10)] text-[#14231F]'
                }`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{t('frontDeskToggleTitle')}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          !hasEnoughCredits 
                            ? 'bg-amber-100 text-amber-800' 
                            : settings.frontDeskEnabled !== false 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-slate-100 text-slate-600'
                        }`}>
                          {!hasEnoughCredits 
                            ? t('frontDeskStatusLowCredits') 
                            : settings.frontDeskEnabled !== false 
                              ? t('frontDeskStatusActive') 
                              : t('frontDeskStatusOff')}
                        </span>
                      </div>
                      <p className="text-xs text-[#4B5A55] mt-1 leading-relaxed">
                        {t('frontDeskToggleHint')}
                      </p>
                      
                      <div className="mt-2.5 flex items-center gap-2 text-xs">
                        <span className="text-[#8A8880]">{t('frontDeskCurrentCredits')}</span>
                        <span className={`font-bold font-mono px-1.5 py-0.5 rounded ${
                          creditBalance < 20 ? 'text-rose-600 bg-rose-50' : 'text-emerald-700 bg-emerald-50'
                        }`}>
                          {creditBalance} {t('frontDeskCreditUnit')}
                        </span>
                        {creditBalance < 20 && (
                          <a href="/dashboard/billing" className="text-[#FF6A5C] hover:underline font-semibold flex items-center gap-1 ml-2">
                            {t('frontDeskTopUpBtn')} <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center shrink-0">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={hasEnoughCredits && settings.frontDeskEnabled !== false}
                          disabled={!hasEnoughCredits}
                          onChange={(e) => {
                            if (!hasEnoughCredits) return;
                            setSettings({ ...settings, frontDeskEnabled: e.target.checked });
                          }}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF6A5C] peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                      </label>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="mb-6 grid grid-cols-3 gap-2 bg-[#F4F2ED] p-2 rounded-2xl">
            {([
              ['behavior', t('settingsSectionBehavior')],
              ['capture', t('settingsSectionCapture')],
              ['knowledge', t('settingsSectionKnowledge')],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSettingsSection(key)}
                className={`px-3 py-2 rounded-xl text-sm font-semibold transition ${
                  settingsSection === key
                    ? 'bg-white text-[#14231F] shadow-sm'
                    : 'text-[#4B5A55] hover:text-[#14231F]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-8">
            {settingsSection === 'behavior' && (
              <>
                {/* Interactive entry layout */}
                <div className="pb-5">
                  <div className="mb-5">
                    <h3 className="text-base font-semibold text-[#14231F]">{t('entryLayoutTitle')}</h3>
                    <p className="text-sm text-[#4B5A55]">{t('entryLayoutDesc')}</p>
                  </div>

                  {entryOptions.length === 0 ? (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{t('entryNoBlocks')}</span>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div>
                        <label htmlFor="entry-hero-target" className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#14231F]">
                          <ImageIcon className="h-4 w-4 text-[#FF6A5C]" />
                          {t('entryHeroLabel')}
                        </label>
                        <p className="mb-3 text-xs text-[#8A8880]">{t('entryHeroHint')}</p>
                        <select
                          id="entry-hero-target"
                          value={resolvedEntry.heroBlockId || ''}
                          onChange={(event) => setHeroTarget(event.target.value)}
                          className="block w-full rounded-lg border border-[rgba(20,35,31,0.14)] bg-white p-3 text-sm text-[#14231F] outline-none transition focus:border-[#FF6A5C]"
                        >
                          {entryOptions.map((option) => (
                            <option key={option.blockId} value={option.blockId}>{option.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="border-t border-[rgba(20,35,31,0.10)] pt-5">
                        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#14231F]">
                          <ListOrdered className="h-4 w-4 text-[#FF6A5C]" />
                          {t('entryDiscoverLabel')}
                        </div>
                        <p className="mb-4 text-xs text-[#8A8880]">{t('entryDiscoverHint')}</p>
                        <div className="space-y-2">
                          {Array.from({ length: 3 }, (_, index) => {
                            const blockId = resolvedEntry.discoverBlockIds[index] || '';
                            return (
                              <div key={index} className="grid grid-cols-[32px_minmax(0,1fr)_72px] items-center gap-2">
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#14231F] text-xs font-bold text-white">{index + 1}</span>
                                <select
                                  aria-label={t('entryDiscoverPosition', { position: index + 1 })}
                                  value={blockId}
                                  onChange={(event) => setDiscoverTarget(index, event.target.value)}
                                  className="min-w-0 rounded-lg border border-[rgba(20,35,31,0.14)] bg-white p-3 text-sm text-[#14231F] outline-none transition focus:border-[#FF6A5C]"
                                >
                                  <option value="">{t('entrySelectBlock')}</option>
                                  {entryOptions.map((option) => (
                                    <option
                                      key={option.blockId}
                                      value={option.blockId}
                                      disabled={resolvedEntry.discoverBlockIds.some((id, selectedIndex) => selectedIndex !== index && id === option.blockId)}
                                    >
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                                <div className="flex justify-end gap-1">
                                  <button
                                    type="button"
                                    title={t('entryMoveUp')}
                                    aria-label={t('entryMoveUp')}
                                    disabled={index === 0 || !blockId}
                                    onClick={() => moveDiscoverTarget(index, -1)}
                                    className="flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(20,35,31,0.12)] text-[#4B5A55] transition hover:bg-[#F4F2ED] disabled:opacity-30"
                                  >
                                    <ChevronUp className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    title={t('entryMoveDown')}
                                    aria-label={t('entryMoveDown')}
                                    disabled={index >= resolvedEntry.discoverBlockIds.length - 1 || !blockId}
                                    onClick={() => moveDiscoverTarget(index, 1)}
                                    className="flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(20,35,31,0.12)] text-[#4B5A55] transition hover:bg-[#F4F2ED] disabled:opacity-30"
                                  >
                                    <ChevronDown className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="mt-4 border-l-2 border-[#FF6A5C] bg-[#F8F7F4] px-4 py-3">
                          <div className="mb-2 text-[10px] font-semibold uppercase text-[#8A8880]">{t('entryPreview')}</div>
                          <div className="space-y-1.5">
                            {resolvedEntry.discoverBlockIds.map((blockId, index) => (
                              <div key={blockId} className="flex items-center gap-2 text-sm text-[#14231F]">
                                <span className="w-4 text-xs font-semibold text-[#8A8880]">{index + 1}</span>
                                <span className="truncate font-medium">{entryLabels.get(blockId) || t('entryUnavailableBlock')}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Order Now Behavior */}
                <div className="py-4 border-t border-[rgba(20,35,31,0.10)]">
                  <h3 className="text-base font-semibold text-[#14231F] mb-1">{t('orderNowTitle')}</h3>
                  <p className="text-sm text-[#4B5A55] mb-3">{t('orderNowDesc')}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {orderNowOptions.map(({ key, label, disabled }) => (
                      <button
                        key={key}
                        type="button"
                        disabled={disabled}
                        onClick={() => setSettings({ ...settings, orderNowBehavior: key })}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          (settings.orderNowBehavior || 'saule') === key
                            ? 'border-[#FF6A5C] bg-[#FFEDE9] ring-1 ring-[#FF6A5C]'
                            : disabled
                            ? 'opacity-50 cursor-not-allowed border-[rgba(20,35,31,0.10)]'
                            : 'border-[rgba(20,35,31,0.10)] hover:bg-[#F4F2ED]'
                        }`}
                      >
                        <div className="font-semibold text-sm text-[#14231F]">{label}</div>
                        {disabled && <div className="text-xs text-[#8A8880] mt-0.5">{t('orderNowFillContactHint')}</div>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Instagram Integration — bkz. src/config/features.ts, prod'da pasif */}
                {FEATURES.instagramIntegration && (
                <div className="py-4 border-t border-[rgba(20,35,31,0.10)]">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-base font-semibold text-[#14231F]">{t('instagramIntegration.title')}</h3>
                        {metaSuccess !== 'connected' && (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wide bg-[#FFF1EE] text-[#FF6A5C] border border-[#FFB9A9] px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#FF6A5C]" />
                            {t('instagramIntegration.comingSoonBadge')}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#4B5A55]">{t('instagramIntegration.description')}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    {metaSuccess === 'connected' ? (
                      <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-50 border border-green-200 text-green-700 font-medium text-sm rounded-lg shadow-sm">
                        <CheckCircle2 className="w-5 h-5" />
                        {t('instagramIntegration.connectedMsg')}
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled
                        title={t('instagramIntegration.comingSoonBadge')}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#F4F2ED] text-[#8A8880] font-medium text-sm rounded-lg cursor-not-allowed"
                      >
                        {t('instagramIntegration.connectBtn')}
                      </button>
                    )}
                  </div>

                  {metaError && (
                    <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2 max-w-xl">
                      <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">{t('instagramIntegration.errorHeading')}</p>
                        <p className="text-xs mt-1 text-red-600">{metaError}</p>
                      </div>
                    </div>
                  )}

                  {metaSuccess !== 'connected' && (
                    <>
                      <div className="mt-6 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={handleCopyProfileLink}
                          className="flex items-center gap-2 text-sm font-medium text-[#14231F] bg-white border border-[rgba(20,35,31,0.10)] px-3 py-1.5 rounded-lg hover:border-[#FF6A5C] hover:text-[#FF6A5C] transition shrink-0"
                        >
                          <span className="font-mono text-xs text-[#4B5A55]">{profileUrl}</span>
                          {copiedProfileLink ? t('instagramIntegration.copiedBtn') : t('instagramIntegration.copyLinkBtn')}
                        </button>
                      </div>

                      <div className="mt-4">
                        <p className="text-sm font-semibold text-[#14231F] mb-1.5">{t('instagramIntegration.guideHeading')}</p>
                        <p className="text-xs text-[#4B5A55] mb-2">{t('instagramIntegration.guideIntro')}</p>
                        <ol className="space-y-1.5">
                          {[
                            t('instagramIntegration.guideStep1'),
                            t('instagramIntegration.guideStep2'),
                            t('instagramIntegration.guideStep3', { link: profileUrl }),
                            t('instagramIntegration.guideStep4'),
                          ].map((step, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-[#4B5A55]">
                              <span className="shrink-0 w-4 h-4 rounded-full bg-[#FFF1EE] text-[#FF6A5C] text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                              {step}
                            </li>
                          ))}
                        </ol>
                        <p className="text-xs text-[#8A8880] mt-2">{t('instagramIntegration.guideNote')}</p>
                      </div>
                    </>
                  )}
                </div>
                )}
              </>
            )}

            {settingsSection === 'capture' && (
              <>
                {/* Lead Capture */}
                <div className="flex items-center justify-between py-4 border-t border-[rgba(20,35,31,0.10)]">
                  <div>
                    <h3 className="text-base font-semibold text-[#14231F] mb-0.5">{t('leadCaptureTitle')}</h3>
                    <p className="text-sm text-[#4B5A55]">{t('leadCaptureDesc')}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.leadCaptureEnabled !== false}
                      onChange={(e) => setSettings({ ...settings, leadCaptureEnabled: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF6A5C]"></div>
                  </label>
                </div>

                {/* Preferred Channel */}
                {settings.leadCaptureEnabled === false && (
                  <div className="bg-[#F4F2ED] p-4 rounded-xl animate-in fade-in slide-in-from-top-2">
                    <label className="block text-sm font-semibold text-[#14231F] mb-1">{t('preferredContactMethodLabel')}</label>
                    <p className="text-xs text-[#8A8880] mb-3">{t('preferredContactMethodHint')}</p>
                    <select
                      value={settings.preferredContactMethod || ''}
                      onChange={(e) => setSettings({ ...settings, preferredContactMethod: e.target.value || undefined })}
                      className="block w-full max-w-md p-2.5 bg-white border border-[rgba(20,35,31,0.10)] rounded-xl text-sm text-[#14231F] focus:outline-none focus:border-[#FF6A5C]"
                    >
                      <option value="">{t('preferredContactMethodPlaceholder')}</option>
                      {availableContactMethods.map((m) => (
                        <option key={m} value={m}>
                          {ORDER_NOW_METHOD_LABELS[m][locale] || m}
                        </option>
                      ))}
                    </select>

                    {settings.preferredContactMethod && !availableContactMethods.includes(settings.preferredContactMethod as any) && (
                      <div className="mt-3 text-xs text-[#FF6A5C] bg-[#FFEDE9] p-3 rounded-lg border border-[#FF6A5C]/10 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>
                          Seçilen iletişim kanalı ({tEditor(`contactMethods.${settings.preferredContactMethod}`)}) için profilinizde bir değer girilmemiştir. Lütfen editörden bu kanala ait bilgiyi doldurun veya başka bir tercih edilen kanal seçin.
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Email Notifications */}
                <div className="py-4 border-t border-[rgba(20,35,31,0.10)]">
                  <h3 className="text-base font-semibold text-[#14231F] mb-0.5">{t('notificationEmailTitle')}</h3>
                  <p className="text-sm text-[#4B5A55] mb-3">{t('notificationEmailDesc')}</p>
                  <input
                    type="email"
                    value={settings.notificationEmail || ''}
                    onChange={(e) => setSettings({ ...settings, notificationEmail: e.target.value })}
                    placeholder="ornek@e-posta.com"
                    className="w-full max-w-md p-3 rounded-lg border border-[rgba(20,35,31,0.10)] focus:outline-none focus:border-[#FF6A5C] text-sm text-[#14231F]"
                  />
                </div>

                {/* Booking Instructions */}
                <div className="py-4 border-t border-[rgba(20,35,31,0.10)]">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-semibold text-[#14231F] mb-0.5">{t('appointmentTitle')}</h3>
                      <p className="text-sm text-[#4B5A55]">{t('appointmentDesc')}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={settings.appointmentEnabled === true}
                        onChange={(e) => setSettings({ ...settings, appointmentEnabled: e.target.checked })}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF6A5C]"></div>
                    </label>
                  </div>

                  {settings.appointmentEnabled && (
                    <div className="bg-[#F4F2ED] p-4 rounded-xl animate-in fade-in slide-in-from-top-2">
                      <label className="block text-xs font-semibold text-[#8A8880] mb-2 font-mono uppercase tracking-wider">{t('appointmentInstructionsLabel')}</label>
                      <textarea
                        value={settings.appointmentInstructions || ''}
                        onChange={(e) => setSettings({ ...settings, appointmentInstructions: e.target.value })}
                        placeholder={t('appointmentInstructionsPlaceholder')}
                        className="w-full p-3 rounded-lg border border-[rgba(20,35,31,0.10)] focus:outline-none focus:border-[#FF6A5C] text-sm text-[#14231F] bg-white"
                        rows={3}
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            {settingsSection === 'knowledge' && (
              <KnowledgeBasePanel businessId={business.id} initialKnowledge={initialKnowledge} />
            )}

            {/* Save Button */}
            <div className="pt-6 border-t border-[rgba(20,35,31,0.10)] flex items-center justify-between">
              {showToast ? (
                <span className="text-sm font-medium text-green-600 flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-1" /> {t('settingsSavedToast')}
                </span>
              ) : (
                <span />
              )}
              <button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="bg-[#FF6A5C] text-white px-8 py-3 rounded-full font-bold text-sm hover:bg-orange-600 transition shadow-md disabled:opacity-50 flex items-center"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {t('saveSettingsBtn')}
              </button>
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <div className="bg-white border border-[rgba(20,35,31,0.10)] rounded-2xl px-5 py-4 flex items-center gap-3 text-sm">
          <Mail className="w-4 h-4 text-[#8A8880] shrink-0" />
          <p className="text-[#4B5A55]">
            {t('footerTextBeforeEmail')}
            <a href="mailto:info@talkinbio.com" className="text-[#FF6A5C] font-medium hover:underline">
              info@talkinbio.com
            </a>
            {t('footerTextAfterEmail')}
          </p>
        </div>
      </footer>
    </DashboardShell>
  );
}
