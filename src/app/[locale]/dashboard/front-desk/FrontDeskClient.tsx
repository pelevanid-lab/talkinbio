'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useLocale, useTranslations } from 'next-intl';
import {
  CheckCircle2,
  Loader2,
  Volume2,
  ExternalLink,
  Mail,
  Clock,
  Phone,
  AlertTriangle,
} from 'lucide-react';
import KnowledgeBasePanel from '../leads/KnowledgeBasePanel';
import DashboardShell from '@/components/dashboard/DashboardShell';

// Contact methods offered as an "Order Now" target — same keys as business.contact_value.
const ORDER_NOW_METHOD_LABELS: Record<string, Record<string, string>> = {
  whatsapp: { tr: 'WhatsApp', en: 'WhatsApp', ru: 'WhatsApp' },
  instagram: { tr: 'Instagram', en: 'Instagram', ru: 'Instagram' },
  telegram: { tr: 'Telegram', en: 'Telegram', ru: 'Telegram' },
  email: { tr: 'E-posta', en: 'Email', ru: 'Email' },
};

export default function FrontDeskClient({ business, initialKnowledge }: { business: any; initialKnowledge: any[] }) {
  const supabase = createClient();
  const t = useTranslations('Leads');
  const tEditor = useTranslations('Editor');
  const locale = useLocale();

  const [settingsSection, setSettingsSection] = useState<'behavior' | 'capture' | 'voice' | 'knowledge'>('behavior');
  const [settings, setSettings] = useState(business.saule_settings || {});
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [copiedProfileLink, setCopiedProfileLink] = useState(false);
  const [metaSuccess, setMetaSuccess] = useState<string | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);

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
      const { error } = await supabase.from('businesses').update({ saule_settings: settings }).eq('id', business.id);
      if (error) throw error;
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

          <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-2 bg-[#F4F2ED] p-2 rounded-2xl">
            {([
              ['behavior', t('settingsSectionBehavior')],
              ['capture', t('settingsSectionCapture')],
              ['voice', t('settingsSectionVoice')],
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
                {/* Custom Greeting */}
                <div className="pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-semibold text-[#14231F]">{t('greetingTitle')}</h3>
                      <p className="text-sm text-[#4B5A55]">{t('greetingDesc')}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={!!settings.customGreetingEnabled}
                        onChange={(e) => setSettings({ ...settings, customGreetingEnabled: e.target.checked })}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF6A5C]"></div>
                    </label>
                  </div>

                  <div className="bg-[#F4F2ED] p-4 rounded-xl flex flex-col gap-3">
                    <p className="text-xs text-[#8A8880]">{t('greetingHint')}</p>
                    {[
                      { localeKey: 'tr' as const, label: 'Türkçe', defaultText: 'Hoşgeldiniz, size nasıl yardımcı olabilirim?' },
                      { localeKey: 'en' as const, label: 'English', defaultText: 'Welcome, how can I help you?' },
                      { localeKey: 'ru' as const, label: 'Русский', defaultText: 'Добро пожаловать, чем я могу вам помочь?' },
                    ].map(({ localeKey, label, defaultText }) => {
                      const isEnabled = !!settings.customGreetingEnabled;
                      const currentValue = isEnabled
                        ? (settings.customGreeting?.[localeKey] !== undefined ? settings.customGreeting?.[localeKey] : '')
                        : defaultText;

                      return (
                        <div key={localeKey}>
                          <label className="block text-xs font-semibold text-[#8A8880] mb-1 font-mono uppercase tracking-wider">
                            {label} {!isEnabled && <span className="text-[10px] bg-[rgba(20,35,31,0.05)] text-[#4B5A55] px-2 py-0.5 rounded ml-1 font-normal font-sans tracking-normal capitalize">Hazır Metin</span>}
                          </label>
                          <textarea
                            value={currentValue}
                            disabled={!isEnabled}
                            onChange={(e) => {
                              if (isEnabled) {
                                setSettings({
                                  ...settings,
                                  customGreeting: {
                                    ...(settings.customGreeting || {}),
                                    [localeKey]: e.target.value,
                                  },
                                });
                              }
                            }}
                            placeholder={defaultText}
                            className={`w-full p-3 rounded-lg border text-sm focus:outline-none transition-all ${
                              isEnabled
                                ? 'border-[rgba(20,35,31,0.10)] focus:border-[#FF6A5C] text-[#14231F] bg-white'
                                : 'border-[rgba(20,35,31,0.05)] text-[#8A8880] bg-[#F4F2ED] cursor-not-allowed select-none'
                            }`}
                            rows={2}
                          />
                        </div>
                      );
                    })}
                  </div>
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

                {/* Instagram Integration */}
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

            {settingsSection === 'voice' && (() => {
              const creditBalance = business.credit_balance ?? 0;
              const hasEnoughVoiceCredits = creditBalance >= 200;
              return (
                <div className="py-4 border-t border-[rgba(20,35,31,0.10)]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#FFEDE9] text-[#FF6A5C] flex items-center justify-center shrink-0">
                        <Volume2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-[#14231F]">{t('voiceTitle')}</h3>
                          {!hasEnoughVoiceCredits && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800">
                              Yetersiz Kredi
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[#4B5A55] max-w-2xl mt-0.5 whitespace-pre-line">{t('voiceDesc')}</p>
                        
                        {!hasEnoughVoiceCredits && (
                          <p className="text-xs text-rose-600 font-semibold mt-1.5 flex items-center gap-1.5">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>
                            Ses özelliğini aktif edebilmek için hesabınızda en az 200 kredi bulunmalıdır. Mevcut bakiye: {creditBalance} Kredi.
                          </p>
                        )}
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={hasEnoughVoiceCredits && !!settings.voiceEnabled}
                        disabled={!hasEnoughVoiceCredits}
                        onChange={(e) => {
                          if (!hasEnoughVoiceCredits) return;
                          setSettings({ ...settings, voiceEnabled: e.target.checked });
                        }}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF6A5C] peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                    </label>
                  </div>

                  {hasEnoughVoiceCredits && settings.voiceEnabled && (
                    <div className="bg-[#F4F2ED] p-4 rounded-xl mt-4 animate-in fade-in slide-in-from-top-2 flex flex-col gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#8A8880] mb-2 font-mono uppercase tracking-wider">{t('voiceWelcomeLabel')}</label>
                      <div className="space-y-3">
                        {[
                          {
                            localeKey: 'tr' as const,
                            label: 'Türkçe',
                            text: 'Hoşgeldiniz, size nasıl yardımcı olabilirim?',
                          },
                          {
                            localeKey: 'en' as const,
                            label: 'English',
                            text: 'Welcome, how can I help you?',
                          },
                          {
                            localeKey: 'ru' as const,
                            label: 'Русский',
                            text: 'Добро пожаловать, чем я могу вам помочь?',
                          },
                        ].map(({ localeKey, label, text }) => (
                          <div key={localeKey} className="bg-white p-3.5 rounded-xl border border-[rgba(20,35,31,0.10)]">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-bold text-[#FF6A5C] font-mono uppercase tracking-wider">{label}</span>
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#FFEDE9] text-[#FF6A5C]">
                                <Volume2 className="w-3.5 h-3.5" />
                                Hazir cue
                              </span>
                            </div>
                            <p className="text-sm text-[#14231F] font-medium leading-relaxed bg-[#F4F2ED]/60 p-2.5 rounded-lg border border-[rgba(20,35,31,0.05)]">
                              "{text}"
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  )}
                </div>
              );
            })()}

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
