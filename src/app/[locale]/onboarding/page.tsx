'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Circle, Loader2, Plus, Trash2, ChevronRight, Globe, ExternalLink, Mail, Lock } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { ColoredTextField } from '@/utils/coloredText';
import MediaUploader from '@/components/MediaUploader';
import { WIZARD_CATEGORIES, getCategoryById, type WizardCategory, type WizardStep } from '@/config/wizardCategories';

// ─── Yerel tipler ────────────────────────────────────────────────────────────

type StepStatus = 'pending' | 'active' | 'saved' | 'skipped';
type LangPhase = 'offer' | 'picking' | 'translating' | 'done';

interface StepState {
  status: StepStatus;
  data: any;
}

// ─── Yardımcı fonksiyonlar ────────────────────────────────────────────────────

function generateUsername(name: string, desired?: string): string {
  // Hero'daki input'tan gelen istenen kullanıcı adı (desired) varsa öncelik
  // onda — landing'de kullanıcının yazdığı adres öyle görünsün diye.
  const source = (desired?.trim() ? desired : name);
  const base = source
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
  return (base || 'user') + Math.floor(Math.random() * 9000 + 1000);
}

function buildBlockContent(blockType: string, data: any, locale: string): any {
  switch (blockType) {
    case 'services':
      return {
        layoutVariant: 'grid-cards',
        items: (data.items || []).map((item: any) => ({
          [locale]: { title: item.title || '', description: item.description || '' },
          price: item.price || '',
          mediaUrl: item.mediaUrl || '',
        })),
      };
    case 'about':
      return { [locale]: { text: data.text || '' } };
    case 'custom':
      return { [locale]: { text: data.text || '' } };
    case 'links':
      return {
        layoutVariant: 'stacked',
        items: (data.items || []).map((item: any) => ({
          label: item.label || '',
          url: item.url || '',
        })),
      };
    case 'gallery':
      return {
        layoutVariant: 'grid',
        items: (data.items || []).map((item: any) => ({
          url: item.url || '',
          caption: { [locale]: item.caption || '' },
        })),
      };
    case 'testimonials':
      return {
        layoutVariant: 'scroll-cards',
        items: (data.items || []).map((item: any) => ({
          quote: { [locale]: item.quote || '' },
          author: item.author || '',
          role: { [locale]: item.role || '' },
        })),
      };
    case 'faq':
      return {
        layoutVariant: 'accordion',
        items: (data.items || []).map((item: any) => ({
          question: { [locale]: item.question || '' },
          answer: { [locale]: item.answer || '' },
        })),
      };
    default:
      return data;
  }
}

function hasContent(blockType: string, data: any): boolean {
  if (!data) return false;
  switch (blockType) {
    case 'header': return !!(data.name?.trim());
    case 'about':
    case 'custom':  return !!(data.text?.trim());
    case 'services':
    case 'links':
    case 'gallery':
    case 'testimonials':
    case 'faq':     return Array.isArray(data.items) && data.items.length > 0;
    case 'contact': {
      const methods = data.methods || {};
      const values = data.values || {};
      return Object.keys(methods).some((k) => methods[k] && values[k]?.trim());
    }
    default: return false;
  }
}

// ─── Adım form bileşenleri ────────────────────────────────────────────────────

function HeaderForm({ data, onChange, t }: { data: any; onChange: (d: any) => void; t: any }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)] mb-1.5">
          {t('fields.name')}
        </label>
        <input
          value={data.name || ''}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          placeholder={t('fields.namePlaceholder')}
          className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[var(--coral)]"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)] mb-1.5">
          {t('fields.tagline')} <span className="normal-case font-normal text-slate-400">({t('fields.optional')})</span>
        </label>
        <input
          value={data.tagline || ''}
          onChange={(e) => onChange({ ...data, tagline: e.target.value })}
          placeholder={t('fields.taglinePlaceholder')}
          className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[var(--coral)]"
        />
      </div>
    </div>
  );
}

function ServiceForm({ data, onChange, t, itemLabel }: { data: any; onChange: (d: any) => void; t: any; itemLabel: string }) {
  const items: any[] = data.items || [];
  const update = (idx: number, field: string, val: string) => {
    const next = items.map((it, i) => i === idx ? { ...it, [field]: val } : it);
    onChange({ ...data, items: next });
  };
  const remove = (idx: number) => onChange({ ...data, items: items.filter((_, i) => i !== idx) });
  const add = () => onChange({ ...data, items: [...items, { title: '', description: '', price: '', mediaUrl: '' }] });

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={idx} className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2.5 relative">
          <button onClick={() => remove(idx)} className="absolute top-2 right-2 text-red-400 hover:text-red-600 p-1 rounded">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{itemLabel}</label>
            <ColoredTextField
              compact
              value={item.title}
              onChange={(v) => update(idx, 'title', v)}
              placeholder={t('fields.itemName')}
              className="w-full px-2.5 py-2 border border-slate-200 rounded focus:outline-none focus:border-[var(--coral)] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              {t('fields.description')} <span className="font-normal text-slate-400">({t('fields.optional')})</span>
            </label>
            <ColoredTextField
              compact
              multiline
              value={item.description}
              onChange={(v) => update(idx, 'description', v)}
              placeholder={t('fields.descriptionPlaceholder')}
              className="w-full px-2.5 py-2 border border-slate-200 rounded focus:outline-none focus:border-[var(--coral)] text-sm min-h-[60px]"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                {t('fields.price')} <span className="font-normal text-slate-400">({t('fields.optional')})</span>
              </label>
              <input
                value={item.price}
                onChange={(e) => update(idx, 'price', e.target.value)}
                placeholder={t('fields.pricePlaceholder')}
                className="w-full px-2.5 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-[var(--coral)]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              {t('fields.media')} <span className="font-normal text-slate-400">({t('fields.optional')})</span>
            </label>
            <MediaUploader
              value={item.mediaUrl}
              onChange={(url) => update(idx, 'mediaUrl', url)}
              label={t('fields.uploadLabel')}
            />
          </div>
        </div>
      ))}
      <button
        onClick={add}
        className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-[var(--teal)] text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-slate-50"
      >
        <Plus className="w-3.5 h-3.5" /> {t('fields.addItem')}
      </button>
    </div>
  );
}

function TextForm({ data, onChange, t }: { data: any; onChange: (d: any) => void; t: any }) {
  return (
    <ColoredTextField
      multiline
      value={data.text || ''}
      onChange={(v) => onChange({ ...data, text: v })}
      placeholder={t('fields.textPlaceholder')}
      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[var(--coral)] min-h-[100px]"
    />
  );
}

function LinksForm({ data, onChange, t, itemLabel }: { data: any; onChange: (d: any) => void; t: any; itemLabel: string }) {
  const items: any[] = data.items || [];
  const update = (idx: number, field: string, val: string) => {
    const next = items.map((it, i) => i === idx ? { ...it, [field]: val } : it);
    onChange({ ...data, items: next });
  };
  const remove = (idx: number) => onChange({ ...data, items: items.filter((_, i) => i !== idx) });
  const add = () => onChange({ ...data, items: [...items, { label: '', url: '' }] });

  return (
    <div className="space-y-2.5">
      {items.map((item, idx) => (
        <div key={idx} className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2 relative">
          <button onClick={() => remove(idx)} className="absolute top-2 right-2 text-red-400 hover:text-red-600 p-1 rounded">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{itemLabel}</label>
            <ColoredTextField
              compact
              value={item.label}
              onChange={(v) => update(idx, 'label', v)}
              placeholder={t('fields.linkLabel')}
              className="w-full px-2.5 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-[var(--coral)]"
            />
          </div>
          <input
            value={item.url}
            onChange={(e) => update(idx, 'url', e.target.value)}
            placeholder="https://"
            className="w-full px-2.5 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-[var(--coral)]"
          />
        </div>
      ))}
      <button
        onClick={add}
        className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-[var(--teal)] text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-slate-50"
      >
        <Plus className="w-3.5 h-3.5" /> {t('fields.addItem')}
      </button>
    </div>
  );
}

function GalleryForm({ data, onChange, t }: { data: any; onChange: (d: any) => void; t: any }) {
  const items: any[] = data.items || [];
  const updateUrl = (idx: number, url: string) => {
    const next = items.map((it, i) => i === idx ? { ...it, url } : it);
    onChange({ ...data, items: next });
  };
  const updateCaption = (idx: number, caption: string) => {
    const next = items.map((it, i) => i === idx ? { ...it, caption } : it);
    onChange({ ...data, items: next });
  };
  const remove = (idx: number) => onChange({ ...data, items: items.filter((_, i) => i !== idx) });
  const add = () => onChange({ ...data, items: [...items, { url: '', caption: '' }] });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {items.map((item, idx) => (
          <div key={idx} className="relative border border-slate-200 rounded-lg p-2 bg-slate-50 flex flex-col gap-2">
            <button
              onClick={() => remove(idx)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 z-10 shadow-sm"
            >
              <Trash2 className="w-3 h-3" />
            </button>
            <div className="h-28">
              <MediaUploader value={item.url} onChange={(url) => updateUrl(idx, url)} label={t('fields.uploadLabel')} />
            </div>
            <input
              value={item.caption}
              onChange={(e) => updateCaption(idx, e.target.value)}
              placeholder={t('fields.caption')}
              className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:border-[var(--coral)]"
            />
          </div>
        ))}
      </div>
      <button
        onClick={add}
        className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-[var(--teal)] text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-slate-50"
      >
        <Plus className="w-3.5 h-3.5" /> {t('fields.addItem')}
      </button>
    </div>
  );
}

function TestimonialsForm({ data, onChange, t }: { data: any; onChange: (d: any) => void; t: any }) {
  const items: any[] = data.items || [];
  const update = (idx: number, field: string, val: string) => {
    const next = items.map((it, i) => i === idx ? { ...it, [field]: val } : it);
    onChange({ ...data, items: next });
  };
  const remove = (idx: number) => onChange({ ...data, items: items.filter((_, i) => i !== idx) });
  const add = () => onChange({ ...data, items: [...items, { quote: '', author: '', role: '' }] });

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={idx} className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2.5 relative">
          <button onClick={() => remove(idx)} className="absolute top-2 right-2 text-red-400 hover:text-red-600 p-1 rounded">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <ColoredTextField
            compact
            multiline
            value={item.quote}
            onChange={(v) => update(idx, 'quote', v)}
            placeholder={t('fields.quote')}
            className="w-full px-2.5 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-[var(--coral)] min-h-[60px]"
          />
          <div className="flex gap-2">
            <input
              value={item.author}
              onChange={(e) => update(idx, 'author', e.target.value)}
              placeholder={t('fields.author')}
              className="flex-1 px-2.5 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-[var(--coral)]"
            />
            <input
              value={item.role}
              onChange={(e) => update(idx, 'role', e.target.value)}
              placeholder={t('fields.role')}
              className="flex-1 px-2.5 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-[var(--coral)]"
            />
          </div>
        </div>
      ))}
      <button
        onClick={add}
        className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-[var(--teal)] text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-slate-50"
      >
        <Plus className="w-3.5 h-3.5" /> {t('fields.addItem')}
      </button>
    </div>
  );
}

function FaqForm({ data, onChange, t }: { data: any; onChange: (d: any) => void; t: any }) {
  const items: any[] = data.items || [];
  const update = (idx: number, field: string, val: string) => {
    const next = items.map((it, i) => i === idx ? { ...it, [field]: val } : it);
    onChange({ ...data, items: next });
  };
  const remove = (idx: number) => onChange({ ...data, items: items.filter((_, i) => i !== idx) });
  const add = () => onChange({ ...data, items: [...items, { question: '', answer: '' }] });

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={idx} className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2.5 relative">
          <button onClick={() => remove(idx)} className="absolute top-2 right-2 text-red-400 hover:text-red-600 p-1 rounded">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <ColoredTextField
            compact
            value={item.question}
            onChange={(v) => update(idx, 'question', v)}
            placeholder={t('fields.question')}
            className="w-full px-2.5 py-2 border border-slate-200 rounded font-medium text-sm focus:outline-none focus:border-[var(--coral)]"
          />
          <ColoredTextField
            compact
            multiline
            value={item.answer}
            onChange={(v) => update(idx, 'answer', v)}
            placeholder={t('fields.answer')}
            className="w-full px-2.5 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-[var(--coral)] min-h-[60px]"
          />
        </div>
      ))}
      <button
        onClick={add}
        className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-[var(--teal)] text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-slate-50"
      >
        <Plus className="w-3.5 h-3.5" /> {t('fields.addItem')}
      </button>
    </div>
  );
}

const CONTACT_METHODS = ['whatsapp', 'email', 'instagram', 'telegram'] as const;
type ContactMethod = typeof CONTACT_METHODS[number];

function ContactForm({ data, onChange, t }: { data: any; onChange: (d: any) => void; t: any }) {
  const methods: Record<ContactMethod, boolean> = data.methods || { whatsapp: false, email: true, instagram: false, telegram: false };
  const values: Record<ContactMethod, string> = data.values || { whatsapp: '', email: '', instagram: '', telegram: '' };

  const toggleMethod = (m: ContactMethod) => onChange({ ...data, methods: { ...methods, [m]: !methods[m] } });
  const setValue = (m: ContactMethod, v: string) => onChange({ ...data, values: { ...values, [m]: v } });

  return (
    <div className="space-y-2.5">
      {CONTACT_METHODS.map((m) => (
        <div key={m} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
          <div className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              id={`contact-${m}`}
              checked={!!methods[m]}
              onChange={() => toggleMethod(m)}
              className="w-4 h-4 rounded text-[var(--coral)] accent-[var(--coral)]"
            />
            <label htmlFor={`contact-${m}`} className="text-sm font-semibold cursor-pointer">
              {t(`fields.contact.${m}`)}
            </label>
          </div>
          {methods[m] && (
            <input
              type={m === 'email' ? 'email' : 'text'}
              value={values[m]}
              onChange={(e) => setValue(m, e.target.value)}
              placeholder={t(`fields.contactPlaceholder.${m}`)}
              className="w-full px-2.5 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-[var(--coral)]"
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Ana sayfa ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const t = useTranslations('Wizard');
  const tReg = useTranslations('Register');
  const locale = useLocale();
  const router = useRouter();
  const supabase = createClient();

  const [phase, setPhase] = useState<'loading' | 'category-select' | 'wizard' | 'signup' | 'done'>('loading');
  // Landing'deki hero input'undan gelen istenen adres (bkz. page.tsx hero formu).
  // useSearchParams yerine window.location — Suspense boundary gerektirmez
  // (bkz. register/page.tsx aynı yaklaşım).
  const [desiredUsername, setDesiredUsername] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<WizardCategory | null>(null);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [previewUsername, setPreviewUsername] = useState<string | null>(null);
  const [stepStates, setStepStates] = useState<Record<string, StepState>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Sihirbaz sonu: hesap oluşturma kapısı (anonim → kalıcı hesap) ─────────
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState('');
  const [signupEmailSent, setSignupEmailSent] = useState(false);

  // ── Dil ekleme (done ekranı) ──────────────────────────────────────────────
  const [langPhase, setLangPhase] = useState<LangPhase>('offer');
  const [targetLang, setTargetLang] = useState<'en' | 'ru'>('en');
  const [translatedCount, setTranslatedCount] = useState(0);

  // ── Sihirbaz bitti: anonimse hesap kapısına, kalıcıysa bitiş ekranına ─────
  const finishWizardOrGate = useCallback(async (bizId: string, user: { id: string; is_anonymous?: boolean }) => {
    if (user.is_anonymous) {
      setPhase('signup');
      return;
    }
    // Kalıcı kullanıcı — kurulumu tamamlanmış say ve anonim aşamada verilen
    // düşük başlangıç kredisini (bkz. handleSave/header) tam bakiyeye tamamla.
    const { data: bizRow } = await supabase.from('businesses').select('credit_balance').eq('id', bizId).single();
    const updates: Record<string, any> = { setup_completed: true };
    if ((bizRow?.credit_balance ?? 0) < 100) updates.credit_balance = 100;
    await supabase.from('businesses').update(updates).eq('id', bizId);
    setPhase('done');
  }, [supabase]);

  useEffect(() => {
    const username = new URLSearchParams(window.location.search).get('username');
    if (username) setDesiredUsername(username);
  }, []);

  // ── Yükleme: oturum + mevcut işletme kontrolü ─────────────────────────────
  useEffect(() => {
    const init = async () => {
      let { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Hesapsız ziyaretçi — sihirbazı denemesi için gerçek bir uid'ye sahip
        // anonim bir Supabase oturumu açılır. Sihirbaz sonunda bu oturum, aynı
        // owner_id korunarak kalıcı hesaba dönüştürülür (bkz. handleClaim*).
        const { data: anon, error: anonErr } = await supabase.auth.signInAnonymously();
        if (anonErr || !anon.user) {
          setError(t('errors.generic'));
          setPhase('category-select');
          return;
        }
        user = anon.user;
      }

      const { data: biz } = await supabase
        .from('businesses')
        .select('id, username, setup_completed, category_id, credit_balance')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (biz?.setup_completed) {
        router.replace(`/${locale}/dashboard/editor`);
        return;
      }

      if (biz && !biz.setup_completed) {
        // Yarım kalmış wizard — mevcut blokları kontrol ederek durumu yükle
        setBusinessId(biz.id);
        setPreviewUsername(biz.username);
        const cat = biz.category_id ? getCategoryById(biz.category_id) : null;
        if (cat) {
          setSelectedCategory(cat);
          const { data: blocks } = await supabase
            .from('blocks')
            .select('type, id')
            .eq('business_id', biz.id);
          const existingTypes = new Set((blocks || []).map((b: any) => b.type));
          const initial: Record<string, StepState> = {};
          cat.steps.forEach((step) => {
            if (step.blockType === 'header' || step.blockType === 'contact') {
              initial[step.id] = { status: 'saved', data: {} };
            } else {
              initial[step.id] = {
                status: existingTypes.has(step.blockType) ? 'saved' : 'pending',
                data: {},
              };
            }
          });
          setStepStates(initial);
          const firstPending = cat.steps.findIndex((s) => initial[s.id].status === 'pending');

          if (firstPending === -1) {
            // Tüm adımlar zaten kayıtlı — bu, e-posta onayı/Google linkIdentity
            // dönüşünden sonra tekrar yüklenen bir sayfa olabilir. Kullanıcı hâlâ
            // anonimse hesap kapısına, kalıcıysa bitiş ekranına geçilir.
            await finishWizardOrGate(biz.id, user);
            return;
          }

          setCurrentStepIdx(firstPending);
          setPhase('wizard');
          return;
        }
      }

      setPhase('category-select');
    };
    init();
  }, []);

  // ── Kategori seçimi ───────────────────────────────────────────────────────
  const handleSelectCategory = (cat: WizardCategory) => {
    setSelectedCategory(cat);
    const initial: Record<string, StepState> = {};
    cat.steps.forEach((step) => {
      initial[step.id] = { status: 'pending', data: {} };
    });
    setStepStates(initial);
    setCurrentStepIdx(0);
    setPhase('wizard');
  };

  // ── Adım verisi güncelleme ────────────────────────────────────────────────
  const updateStepData = useCallback((stepId: string, data: any) => {
    setStepStates((prev) => ({
      ...prev,
      [stepId]: { ...prev[stepId], data },
    }));
  }, []);

  // ── Dil çevirisi ─────────────────────────────────────────────────────────
  const handleTranslate = async () => {
    if (!businessId) return;
    setLangPhase('translating');

    try {
      const { data: blocks } = await supabase
        .from('blocks')
        .select('id, type, content')
        .eq('business_id', businessId);

      if (!blocks || blocks.length === 0) {
        setLangPhase('done');
        return;
      }

      const SYNCABLE = ['about', 'custom', 'services', 'gallery', 'testimonials', 'faq'];
      const translatable = blocks.filter((b: any) => SYNCABLE.includes(b.type));

      let count = 0;
      for (const block of translatable) {
        const res = await fetch('/api/content/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId,
            type: block.type,
            content: block.content,
            sourceLocale: locale,
            targetLocales: [targetLang],
          }),
        });
        if (res.ok) {
          const { content: merged } = await res.json();
          if (merged) {
            await supabase.from('blocks').update({ content: merged }).eq('id', block.id);
            count++;
          }
        }
      }

      setTranslatedCount(count);
      setLangPhase('done');
    } catch {
      setLangPhase('done'); // sessizce geç, hata kritik değil
    }
  };

  // ── Kaydet ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedCategory) return;
    const step = selectedCategory.steps[currentStepIdx];
    const data = stepStates[step.id]?.data || {};
    setIsSaving(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum bulunamadı');

      if (step.blockType === 'header') {
        // İşletme oluştur
        const name = (data.name || '').trim();
        if (!name) { setError(t('errors.nameRequired')); setIsSaving(false); return; }
        const username = generateUsername(name, desiredUsername);
        const tagline = (data.tagline || '').trim();

        const { data: biz, error: bizErr } = await supabase
          .from('businesses')
          .insert({
            owner_id: user.id,
            username,
            name,
            category: t(selectedCategory.labelKey as any) || selectedCategory.id,
            category_id: selectedCategory.id,
            ...(tagline ? { tagline: { [locale]: tagline } } : {}),
            // Hesapsız (anonim) aşamada düşük bir başlangıç kredisi — e-posta bile
            // istemeyen bir akışta AI maliyeti sınırlı kalsın. Hesap kalıcı hale
            // gelince (bkz. finishWizardOrGate) 100'e tamamlanır.
            credit_balance: 20,
            setup_completed: false,
          })
          .select()
          .single();

        if (bizErr || !biz) throw new Error(t('errors.createFailed'));
        setBusinessId(biz.id);
        setPreviewUsername(biz.username);

      } else if (step.blockType === 'contact') {
        // İletişim bilgisini işletmeye yaz
        if (!businessId) throw new Error('İşletme kimliği bulunamadı');
        const methods: Record<string, boolean> = data.methods || {};
        const values: Record<string, string> = data.values || {};
        const selected = CONTACT_METHODS.filter((m) => methods[m] && values[m]?.trim());
        if (step.required && selected.length === 0) {
          setError(t('errors.contactRequired'));
          setIsSaving(false);
          return;
        }
        const contactMethod = selected[0] || '';
        const contactValue = JSON.stringify(
          selected.reduce((acc, m) => ({ ...acc, [m]: values[m] }), {} as Record<string, string>)
        );
        await supabase
          .from('businesses')
          .update({ contact_method: contactMethod, contact_value: contactValue })
          .eq('id', businessId);

      } else {
        // Blok oluştur
        if (!businessId) throw new Error('İşletme kimliği bulunamadı');
        const content = buildBlockContent(step.blockType, data, locale);
        const label = t(step.labelKey as any);
        await supabase.from('blocks').insert({
          business_id: businessId,
          type: step.blockType,
          title: label,
          content,
          order: currentStepIdx,
          is_visible: true,
        });
      }

      // Adımı kayıtlı işaretle ve ilerle
      setStepStates((prev) => ({
        ...prev,
        [step.id]: { ...prev[step.id], status: 'saved' },
      }));
      await advance();
    } catch (e: any) {
      setError(e.message || t('errors.generic'));
    } finally {
      setIsSaving(false);
    }
  };

  // ── Geç ───────────────────────────────────────────────────────────────────
  const handleSkip = async () => {
    if (!selectedCategory) return;
    const step = selectedCategory.steps[currentStepIdx];
    setStepStates((prev) => ({
      ...prev,
      [step.id]: { ...prev[step.id], status: 'skipped' },
    }));
    await advance();
  };

  // ── İlerleme / bitiş ─────────────────────────────────────────────────────
  const advance = async () => {
    if (!selectedCategory) return;
    const nextIdx = currentStepIdx + 1;
    if (nextIdx >= selectedCategory.steps.length) {
      // Sihirbaz bitti — anonim ziyaretçiyse hesap kapısına, kalıcı kullanıcıysa
      // doğrudan bitiş ekranına geç.
      if (businessId) {
        const { data: { user } } = await supabase.auth.getUser();
        await finishWizardOrGate(businessId, user ?? { id: '', is_anonymous: false });
      } else {
        setPhase('done');
      }
    } else {
      setCurrentStepIdx(nextIdx);
    }
  };

  // ── Belirli bir adıma atla (adım listesinden) ─────────────────────────────
  const jumpToStep = (idx: number) => {
    const step = selectedCategory?.steps[idx];
    if (!step) return;
    // Sadece header kayıtlıysa diğer adımlara atlanabilir
    const headerSaved = stepStates[selectedCategory!.steps[0].id]?.status === 'saved';
    if (idx > 0 && !headerSaved) return;
    setCurrentStepIdx(idx);
    setError(null);
  };

  // ── Hesap kapısı: anonim oturumu e-posta/şifre ile kalıcı hesaba dönüştür ─
  // NOT: signUp DEĞİL, updateUser — aynı owner_id (dolayısıyla business/blocks
  // sahipliği) korunur. Google için de aynı nedenle signInWithOAuth değil,
  // linkIdentity kullanılır (bkz. handleClaimGoogle).
  const handleClaimEmailPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupLoading(true);
    setSignupError('');
    try {
      const { data, error: updErr } = await supabase.auth.updateUser(
        { email: signupEmail, password: signupPassword },
        { emailRedirectTo: `${window.location.origin}/api/auth/callback?next=/${locale}/onboarding` }
      );
      if (updErr) throw updErr;

      if (data.user && !data.user.is_anonymous) {
        // E-posta onayı kapalıysa dönüşüm anında tamamlanır — beklemeden devam et.
        if (businessId) await finishWizardOrGate(businessId, data.user);
      } else {
        // Onay e-postası gönderildi — kullanıcı linke tıklayınca /onboarding'e
        // geri dönecek ve init() akışı kaldığı yerden devam edecek.
        setSignupEmailSent(true);
      }
    } catch (err: any) {
      setSignupError(err.message || t('errors.generic'));
    } finally {
      setSignupLoading(false);
    }
  };

  const handleClaimGoogle = async () => {
    setSignupLoading(true);
    setSignupError('');
    try {
      const { error: linkErr } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/api/auth/callback?next=/${locale}/onboarding` },
      });
      if (linkErr) throw linkErr;
      // Başarılıysa tarayıcı Google'a yönlendirilir; dönüşte init() devam eder.
    } catch (err: any) {
      setSignupError(err.message || t('errors.generic'));
      setSignupLoading(false);
    }
  };

  // ─── Render: loading ──────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--page-bg,#f7f7f5)]">
        <Loader2 className="w-8 h-8 text-[var(--coral)] animate-spin" />
      </div>
    );
  }

  // ─── Render: signup (hesap kapısı) ────────────────────────────────────────
  if (phase === 'signup') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--page-bg,#f7f7f5)] p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 text-[var(--teal)] rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--ink)] mb-2">{t('signupGate.title')}</h1>
            <p className="text-slate-500 text-sm">{t('signupGate.sub')}</p>
          </div>

          {previewUsername && (
            <a
              href={`/${locale}/${previewUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 text-sm font-medium text-[var(--coral)] hover:brightness-95 mb-6"
            >
              {t('previewLink')} <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          {signupEmailSent ? (
            <div className="bg-green-50 text-green-700 p-4 rounded-lg text-sm border border-green-200 text-center">
              {tReg('successMessage')}
            </div>
          ) : (
            <>
              {signupError && (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4 text-sm border border-red-200">
                  {signupError}
                </div>
              )}

              <button
                type="button"
                onClick={handleClaimGoogle}
                disabled={signupLoading}
                className="w-full bg-white border border-slate-300 text-slate-700 rounded-lg px-4 py-2.5 font-medium hover:bg-slate-50 transition flex items-center justify-center gap-2 mb-4 disabled:opacity-50"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  <path d="M1 1h22v22H1z" fill="none"/>
                </svg>
                {tReg('googleRegister')}
              </button>

              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-slate-500">Veya</span>
                </div>
              </div>

              <form onSubmit={handleClaimEmailPassword} className="space-y-4">
                <div>
                  <label htmlFor="signup-email" className="block text-sm font-medium text-slate-700 mb-1">{tReg('emailLabel')}</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="h-5 w-5" />
                    </div>
                    <input
                      id="signup-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[var(--coral)] focus:border-transparent focus:outline-none"
                      placeholder={tReg('emailPlaceholder')}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="signup-password" className="block text-sm font-medium text-slate-700 mb-1">{tReg('passwordLabel')}</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-5 w-5" />
                    </div>
                    <input
                      id="signup-password"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[var(--coral)] focus:border-transparent focus:outline-none"
                      placeholder={tReg('passwordPlaceholder')}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={signupLoading || !signupEmail || !signupPassword}
                  className="w-full bg-[var(--coral)] text-white rounded-lg px-4 py-2 mt-1 font-medium hover:bg-[#E55A4D] disabled:opacity-50 flex items-center justify-center transition"
                >
                  {signupLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {signupLoading ? tReg('loading') : t('signupGate.submitBtn')}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    );
  }

  // ─── Render: done ─────────────────────────────────────────────────────────
  if (phase === 'done') {
    const toDashboard = () => router.push(`/${locale}/dashboard/editor`);

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--page-bg,#f7f7f5)] p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 text-[var(--teal)] rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--ink)] mb-2">{t('doneTitle')}</h1>
          <p className="text-slate-500 mb-6">{t('doneSub')}</p>

          {/* ── Dil ekleme bölümü ── */}
          {langPhase === 'offer' && (
            <>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-left">
                <div className="flex gap-2.5 items-start">
                  <Globe className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-blue-800 mb-0.5">{t('langOffer.title')}</p>
                    <p className="text-xs text-blue-600">{t('langOffer.sub')}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2.5 mb-3">
                <button
                  onClick={() => setLangPhase('picking')}
                  className="flex-1 py-2.5 rounded-xl border-2 border-blue-400 text-blue-600 font-semibold text-sm hover:bg-blue-50 transition"
                >
                  {t('langOffer.addBtn')}
                </button>
                <button
                  onClick={toDashboard}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--coral)] text-white font-semibold text-sm hover:brightness-95 transition flex items-center justify-center gap-1.5"
                >
                  {t('doneBtn')} <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}

          {langPhase === 'picking' && (
            <>
              <p className="text-sm font-semibold text-slate-700 mb-3">{t('langOffer.pickLabel')}</p>
              <div className="flex gap-3 mb-5">
                {(['en', 'ru'] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setTargetLang(l)}
                    className={`flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition ${
                      targetLang === l
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {l === 'en' ? '🇬🇧 English' : '🇷🇺 Русский'}
                  </button>
                ))}
              </div>
              <div className="flex gap-2.5">
                <button
                  onClick={handleTranslate}
                  className="flex-1 py-3 rounded-xl bg-blue-500 text-white font-semibold text-sm hover:bg-blue-600 transition"
                >
                  {t('langOffer.translateBtn')}
                </button>
                <button
                  onClick={toDashboard}
                  className="px-4 py-3 rounded-xl border border-slate-200 text-slate-500 font-semibold text-sm hover:bg-slate-50 transition"
                >
                  {t('skipBtn')}
                </button>
              </div>
            </>
          )}

          {langPhase === 'translating' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-sm text-slate-500">{t('langOffer.translating')}</p>
            </div>
          )}

          {langPhase === 'done' && (
            <>
              {translatedCount > 0 && (
                <div className="bg-green-50 border border-green-100 rounded-xl p-3 mb-5 text-sm text-green-700">
                  {t('langOffer.success', { count: translatedCount })}
                </div>
              )}
              <button
                onClick={toDashboard}
                className="w-full bg-[var(--coral)] text-white rounded-xl py-3 font-semibold text-base hover:brightness-95 transition flex items-center justify-center gap-2"
              >
                {t('doneBtn')} <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ─── Render: category-select ──────────────────────────────────────────────
  if (phase === 'category-select') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--page-bg,#f7f7f5)] p-4">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-[var(--ink)] mb-2">{t('categorySelectTitle')}</h1>
            <p className="text-slate-500">{t('categorySelectSub')}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {WIZARD_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleSelectCategory(cat)}
                className="bg-white border-2 border-transparent rounded-2xl p-5 text-left hover:border-current shadow-sm hover:shadow-md transition-all group"
                style={{ '--hover-color': cat.color } as React.CSSProperties}
              >
                <div className="text-3xl mb-3">{cat.emoji}</div>
                <div
                  className="text-base font-bold mb-1"
                  style={{ color: cat.color }}
                >
                  {t(cat.labelKey as any)}
                </div>
                <div className="text-xs text-slate-500 leading-relaxed">
                  {t(cat.descKey as any)}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: wizard ───────────────────────────────────────────────────────
  if (!selectedCategory) return null;
  const steps = selectedCategory.steps;
  const currentStep = steps[currentStepIdx];
  const currentState = stepStates[currentStep.id] || { status: 'active', data: {} };
  const totalSteps = steps.length;
  const savedCount = Object.values(stepStates).filter((s) => s.status === 'saved').length;
  const progressPct = Math.round((savedCount / totalSteps) * 100);

  const renderStepForm = () => {
    const data = currentState.data;
    const onChange = (d: any) => updateStepData(currentStep.id, d);
    const itemLabel = currentStep.itemLabelKey ? t(currentStep.itemLabelKey as any) : t('fields.item');

    switch (currentStep.blockType) {
      case 'header':       return <HeaderForm data={data} onChange={onChange} t={t} />;
      case 'services':     return <ServiceForm data={data} onChange={onChange} t={t} itemLabel={itemLabel} />;
      case 'about':
      case 'custom':       return <TextForm data={data} onChange={onChange} t={t} />;
      case 'links':        return <LinksForm data={data} onChange={onChange} t={t} itemLabel={itemLabel} />;
      case 'gallery':      return <GalleryForm data={data} onChange={onChange} t={t} />;
      case 'testimonials': return <TestimonialsForm data={data} onChange={onChange} t={t} />;
      case 'faq':          return <FaqForm data={data} onChange={onChange} t={t} />;
      case 'contact':      return <ContactForm data={data} onChange={onChange} t={t} />;
      default:             return null;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--page-bg,#f7f7f5)] p-4 flex flex-col items-center">
      <div className="w-full max-w-lg py-6">

        {/* ── Üst çubuk ── */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-4 shadow-sm">
          <div className="p-4 pb-3 border-b border-slate-100">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-sm font-bold text-[var(--ink)]">{t('setupTitle')}</span>
              <span className="text-xs text-slate-400 tabular-nums">{savedCount} / {totalSteps}</span>
            </div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">{selectedCategory.emoji}</span>
                <span className="text-xs font-semibold" style={{ color: selectedCategory.color }}>
                  {t(selectedCategory.labelKey as any)}
                </span>
              </div>
              {previewUsername && (
                <a
                  href={`/${locale}/${previewUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-[var(--coral)] transition"
                >
                  {t('previewLink')} <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%`, background: selectedCategory.color }}
              />
            </div>
          </div>

          {/* ── Adım listesi ── */}
          <div className="divide-y divide-slate-100">
            {steps.map((step, idx) => {
              const state = stepStates[step.id];
              const isActive = idx === currentStepIdx;
              const isSaved = state?.status === 'saved';
              const isSkipped = state?.status === 'skipped';
              const label = t(step.labelKey as any);

              return (
                <button
                  key={step.id}
                  onClick={() => jumpToStep(idx)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    isActive
                      ? 'bg-orange-50'
                      : isSaved || isSkipped
                      ? 'hover:bg-slate-50 cursor-pointer'
                      : 'cursor-default'
                  }`}
                >
                  {/* Durum ikonu */}
                  {isSaved ? (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: selectedCategory.color }} />
                  ) : isActive ? (
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[9px] font-bold"
                      style={{ background: selectedCategory.color }}
                    >
                      {idx + 1}
                    </div>
                  ) : isSkipped ? (
                    <div className="w-4 h-4 rounded-full border-2 border-dashed border-slate-300 flex-shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 flex-shrink-0 text-slate-200" />
                  )}

                  <span
                    className={`text-sm font-medium flex-1 ${
                      isActive
                        ? 'text-[var(--ink)] font-bold'
                        : isSaved
                        ? 'text-slate-500 line-through decoration-slate-300'
                        : isSkipped
                        ? 'text-slate-400 italic'
                        : 'text-slate-400'
                    }`}
                  >
                    {label}
                  </span>

                  {isSkipped && (
                    <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      {t('skipped')}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Aktif adım formu ── */}
        <div
          className="bg-white rounded-2xl border shadow-sm overflow-hidden"
          style={{ borderColor: selectedCategory.color, borderWidth: '1.5px', borderLeftWidth: '3px' }}
        >
          <div className="p-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                style={{ background: selectedCategory.color }}
              >
                {currentStepIdx + 1}
              </div>
              <h2 className="text-base font-bold text-[var(--ink)]">
                {t(currentStep.labelKey as any)}
              </h2>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Tavsiye kutusu */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 flex gap-2.5">
              <span className="text-sm flex-shrink-0 mt-0.5">💡</span>
              <p className="text-sm text-amber-800 leading-relaxed">
                {t(currentStep.tipKey as any)}
              </p>
            </div>

            {/* Form alanları */}
            {renderStepForm()}

            {/* Hata */}
            {error && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Butonlar */}
            <div className="flex gap-2.5 pt-1">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition hover:brightness-95 disabled:opacity-60"
                style={{ background: selectedCategory.color }}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {t('saveBtn')}
              </button>
              {!currentStep.required && (
                <button
                  onClick={handleSkip}
                  disabled={isSaving}
                  className="px-4 py-3 rounded-xl border border-slate-200 text-slate-500 font-semibold text-sm hover:bg-slate-50 transition disabled:opacity-60"
                >
                  {t('skipBtn')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
