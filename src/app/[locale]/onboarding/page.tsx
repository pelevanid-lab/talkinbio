'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Circle, Loader2, Plus, Trash2, ChevronRight, ChevronLeft, Globe, ExternalLink, Mail, Lock } from 'lucide-react';
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
  // Var olan bir blocks satırının id'si — dolu olduğunda handleSave INSERT değil UPDATE yapar.
  // Bir adıma geri dönüp tekrar "Kaydet"e basmak (jumpToStep her zaman 0. adıma izin verir,
  // kayıtlı adımlara da izin verir) eskiden HER ZAMAN yeni bir satır ekliyordu — aynı blok
  // ikinci, üçüncü kez oluşuyordu. blockId bilindiğinde artık üstüne yazılıyor.
  blockId?: string;
}

// ─── Yardımcı fonksiyonlar ────────────────────────────────────────────────────

// Önce çıplak (suffix'siz) adı dener — boştaysa kullanıcı gerçekten yazdığı/istediği
// kullanıcı adını alır (bkz. Zara Bekar testi: "zarabekar" yazıp "zarabekar7439"
// almak kafa karıştırıyordu). Sadece çakışma varsa rastgele 4 haneli suffix'li
// varyantlar denenir; DB'ye birkaç ardışık sorgu pahasına gerçek bir kullanıcı adı
// üretir. supabase parametresi gerekiyor çünkü artık uniqueness DB'den kontrol ediliyor.
async function generateUsername(
  supabase: ReturnType<typeof createClient>,
  name: string,
  desired?: string
): Promise<string> {
  // Hero'daki input'tan gelen istenen kullanıcı adı (desired) varsa öncelik
  // onda — landing'de kullanıcının yazdığı adres öyle görünsün diye.
  const source = (desired?.trim() ? desired : name);
  const base = source
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '') || 'user';

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? base : base + Math.floor(Math.random() * 9000 + 1000);
    const { data: existing } = await supabase.from('businesses').select('id').eq('username', candidate).maybeSingle();
    if (!existing) return candidate;
  }
  // Son çare — pratikte hiç çakışmayacak kadar benzersiz bir suffix.
  return base + Date.now().toString().slice(-6);
}

function buildBlockContent(blockType: string, data: any, locale: string): any {
  switch (blockType) {
    case 'services':
    case 'pricing':
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

// buildBlockContent'in tersi — yarım kalmış bir sihirbaza dönüşte var olan bir blok bulunduğunda
// içeriğini adım formunun beklediği düz (locale'siz) şekle geri çevirir. Eskiden dönüşte
// `data: {}` set ediliyordu — adım "kayıtlı" görünüyordu ama forma geri dönülünce alanlar
// bomboş çıkıyordu; kullanıcı doldurup tekrar kaydedince buildBlockContent + handleSave'in eski
// INSERT-only davranışı aynı bloğu ikinci kez ekliyordu (bkz. StepState.blockId).
function parseBlockContent(blockType: string, content: any, locale: string): any {
  if (!content) return {};
  switch (blockType) {
    case 'services':
    case 'pricing':
      return {
        items: (content.items || []).map((item: any) => ({
          title: item?.[locale]?.title || '',
          description: item?.[locale]?.description || '',
          price: item?.price || '',
          mediaUrl: item?.mediaUrl || '',
        })),
      };
    case 'about':
    case 'custom':
      return { text: content?.[locale]?.text || '' };
    case 'links':
      return {
        items: (content.items || []).map((item: any) => ({
          label: item?.label || '',
          url: item?.url || '',
        })),
      };
    case 'gallery':
      return {
        items: (content.items || []).map((item: any) => ({
          url: item?.url || '',
          caption: item?.caption?.[locale] || '',
        })),
      };
    case 'testimonials':
      return {
        items: (content.items || []).map((item: any) => ({
          quote: item?.quote?.[locale] || '',
          author: item?.author || '',
          role: item?.role?.[locale] || '',
        })),
      };
    case 'faq':
      return {
        items: (content.items || []).map((item: any) => ({
          question: item?.question?.[locale] || '',
          answer: item?.answer?.[locale] || '',
        })),
      };
    default:
      return content;
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

// ─── Genel liste formu ──────────────────────────────────────────────────────
// Hizmetler/Paketler, Bağlantılar, Referanslar, SSS adımları neredeyse birebir aynı
// "kart listesi + ekle/sil" iskeletini kopyalıyordu (~250 satır tekrar). Galeri hariç
// (2 sütunlu resim ızgarası gerçekten farklı bir görünüm — kendi bileşeninde kalıyor)
// hepsi tek bir alan-listesi tarifiyle burada üretiliyor.
type ItemField = {
  key: string;
  kind: 'colored' | 'coloredMultiline' | 'text' | 'media';
  placeholder?: string; // 'media' kind kullanmıyor (MediaUploader kendi metnini alır)
  label?: React.ReactNode; // yoksa etiketsiz render edilir (örn. testimonials'ın author/role'ü)
  half?: boolean; // ardışık iki `half` alan aynı satırda yan yana durur
  bold?: boolean;
};

function ItemListForm({
  data, onChange, t, fields, newItem,
}: { data: any; onChange: (d: any) => void; t: any; fields: ItemField[]; newItem: Record<string, string> }) {
  const items: any[] = data.items || [];
  const update = (idx: number, field: string, val: string) => {
    const next = items.map((it, i) => i === idx ? { ...it, [field]: val } : it);
    onChange({ ...data, items: next });
  };
  const remove = (idx: number) => onChange({ ...data, items: items.filter((_, i) => i !== idx) });
  const add = () => onChange({ ...data, items: [...items, newItem] });

  const renderField = (item: any, idx: number, f: ItemField) => {
    const value = item[f.key] || '';
    const onFieldChange = (v: string) => update(idx, f.key, v);
    const body = f.kind === 'media' ? (
      <MediaUploader value={value} onChange={onFieldChange} label={t('fields.uploadLabel')} />
    ) : f.kind === 'text' ? (
      <input
        value={value}
        onChange={(e) => onFieldChange(e.target.value)}
        placeholder={f.placeholder}
        className="w-full px-2.5 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-[var(--coral)]"
      />
    ) : (
      <ColoredTextField
        compact
        multiline={f.kind === 'coloredMultiline'}
        value={value}
        onChange={onFieldChange}
        placeholder={f.placeholder}
        className={`w-full px-2.5 py-2 border border-slate-200 rounded focus:outline-none focus:border-[var(--coral)] text-sm ${f.bold ? 'font-medium' : ''} ${f.kind === 'coloredMultiline' ? 'min-h-[60px]' : ''}`}
      />
    );
    if (!f.label) return body;
    return (
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">{f.label}</label>
        {body}
      </div>
    );
  };

  // `half` alanları çift çift aynı satıra grupla (örn. referansların yazar/unvanı)
  const rows: ItemField[][] = [];
  for (let i = 0; i < fields.length; i++) {
    if (fields[i].half && fields[i + 1]?.half) {
      rows.push([fields[i], fields[i + 1]]);
      i++;
    } else {
      rows.push([fields[i]]);
    }
  }

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={idx} className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2.5 relative">
          <button onClick={() => remove(idx)} className="absolute top-2 right-2 text-red-400 hover:text-red-600 p-1 rounded">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {rows.map((row, rIdx) => row.length === 1 ? (
            <div key={rIdx}>{renderField(item, idx, row[0])}</div>
          ) : (
            <div key={rIdx} className="flex gap-2">
              {row.map((f) => <div key={f.key} className="flex-1">{renderField(item, idx, f)}</div>)}
            </div>
          ))}
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
  // Adım listesi varsayılan olarak kapalı — eskiden her adımda tüm liste açık duruyordu,
  // tek bir alanı doldurmak için ekranın yarısı bu krom'a gidiyordu (bkz. ilerleme çubuğu +
  // adım listesi + kart aynı bilgiyi üç kez tekrarlıyordu). İsteyen "Adımlar" satırına
  // dokunup açabiliyor; jumpToStep davranışı değişmedi.
  const [stepListOpen, setStepListOpen] = useState(false);

  // ── Sihirbaz sonu: hesap oluşturma kapısı (anonim → kalıcı hesap) ─────────
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState('');
  const [signupEmailSent, setSignupEmailSent] = useState(false);

  // ── Paylaşılan demo linkinden "devral" (?claim=username) ─────────────────
  // Bu tarayıcı o business'ı hiç oluşturmadı — sadece linki aldı. Dolu ise
  // hesap kapısı ekranı "kendi sihirbazını bitir" yerine "bu sayfayı devral"
  // moduna geçer (bkz. handleClaimEmailPassword/handleClaimGoogle/runClaim).
  const [claimUsername, setClaimUsername] = useState<string | null>(null);

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

  // ── Devral: sunucudaki /api/businesses/claim'e istek atıp owner_id'yi bu
  // (artık kalıcı) kullanıcıya taşır — RLS "owner_id = auth.uid()" olduğu için
  // client tarafından doğrudan yapılamaz, service-role gerektirir.
  const runClaim = useCallback(async (username: string) => {
    try {
      const res = await fetch('/api/businesses/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || t('errors.generic'));
      setBusinessId(json.businessId || null);
      setPreviewUsername(username);
      setPhase('done');
    } catch (err: any) {
      setSignupError(err.message || t('errors.generic'));
    } finally {
      setSignupLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const username = new URLSearchParams(window.location.search).get('username');
    if (username) setDesiredUsername(username);
  }, []);

  // ── Yükleme: oturum + mevcut işletme kontrolü ─────────────────────────────
  useEffect(() => {
    const init = async () => {
      const claim = new URLSearchParams(window.location.search).get('claim');

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

      if (claim) {
        // Paylaşılan demo linkinden geldi — bu oturumun kendi business'ı yok,
        // hedef username'i devralması gerekiyor. Zaten kalıcı bir hesabı varsa
        // (linke başka bir Talkinbio hesabıyla girilmiş) direkt devral, anonimse
        // önce hesap kapısını (aşağıdaki 'signup' fazı, devral modunda) göster.
        setClaimUsername(claim);
        setPreviewUsername(claim);
        if (!user.is_anonymous) {
          await runClaim(claim);
        } else {
          setPhase('signup');
        }
        return;
      }

      const { data: biz } = await supabase
        .from('businesses')
        .select('id, username, setup_completed, category_id, credit_balance, name, tagline, contact_method, contact_value')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (biz?.setup_completed) {
        router.replace('/dashboard/editor');
        return;
      }

      if (biz && !biz.setup_completed) {
        // Yarım kalmış wizard — mevcut blokları/işletme verisini geri yükleyerek durumu kur.
        // NOT: sadece "hangi adımlar kayıtlı" değil, o adımların GERÇEK VERİSİ de geri
        // yükleniyor (bkz. parseBlockContent) — eskiden data: {} set ediliyordu, kullanıcı
        // geri dönüp forma bakınca alanlar bomboş görünüyordu.
        setBusinessId(biz.id);
        setPreviewUsername(biz.username);
        const cat = biz.category_id ? getCategoryById(biz.category_id) : null;
        if (cat) {
          setSelectedCategory(cat);
          const { data: blocks } = await supabase
            .from('blocks')
            .select('type, id, content')
            .eq('business_id', biz.id);
          const blocksByType = new Map((blocks || []).map((b: any) => [b.type, b]));
          const initial: Record<string, StepState> = {};
          cat.steps.forEach((step) => {
            if (step.blockType === 'header') {
              // Business satırı var olduğu için header her zaman kayıtlı sayılır — ama verisi
              // de geri yüklenir, aksi halde geri dönülünce boş görünen isim/slogan alanları
              // tekrar kaydedilince yeni bir business satırı (bkz. handleSave) oluşturuyordu.
              initial[step.id] = { status: 'saved', data: { name: biz.name || '', tagline: biz.tagline?.[locale] || biz.tagline?.tr || '' } };
            } else if (step.blockType === 'contact') {
              // Eskiden koşulsuz "saved" işaretleniyordu — hiç doldurulmamış olsa bile.
              const hasContactValue = !!(biz.contact_method && biz.contact_value);
              let methods: Record<string, boolean> = {};
              let values: Record<string, string> = {};
              if (hasContactValue) {
                const selectedKeys = (biz.contact_method || '').split(',').filter(Boolean);
                try { values = biz.contact_value ? JSON.parse(biz.contact_value) : {}; } catch { values = {}; }
                methods = Object.fromEntries(selectedKeys.map((k: string) => [k, true]));
              }
              initial[step.id] = { status: hasContactValue ? 'saved' : 'pending', data: { methods, values } };
            } else {
              const block = blocksByType.get(step.blockType) as { id: string; content: any } | undefined;
              initial[step.id] = block
                ? { status: 'saved', data: parseBlockContent(step.blockType, block.content, locale), blockId: block.id }
                : { status: 'pending', data: {} };
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

    // Blok adımları için: var olan blockId biliniyorsa UPDATE, yoksa INSERT. Yeni bir blok
    // oluşursa aşağıda güncellenir — böylece "kayıtlı" bir adıma geri dönüp tekrar kaydetmek
    // artık aynı bloğu ikinci kez eklemek yerine üstüne yazıyor (bkz. StepState.blockId).
    let savedBlockId = stepStates[step.id]?.blockId;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum bulunamadı');

      if (step.blockType === 'header') {
        const name = (data.name || '').trim();
        if (!name) { setError(t('errors.nameRequired')); setIsSaving(false); return; }
        const tagline = (data.tagline || '').trim();

        if (businessId) {
          // İşletme zaten var (bu adıma geri dönülmüş) — username'e DOKUNULMAZ, zaten
          // paylaşılmış bir önizleme linki olabilir. Diğer dillerin tagline'ı korunur.
          const { data: current } = await supabase.from('businesses').select('tagline').eq('id', businessId).single();
          const mergedTagline = { ...(current?.tagline || {}), ...(tagline ? { [locale]: tagline } : {}) };
          const { error: updErr } = await supabase
            .from('businesses')
            .update({ name, ...(Object.keys(mergedTagline).length ? { tagline: mergedTagline } : {}) })
            .eq('id', businessId);
          if (updErr) throw new Error(t('errors.createFailed'));
        } else {
          const username = await generateUsername(supabase, name, desiredUsername);
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
        }

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
        // NOT: contact_method TÜM seçilen kanalların virgülle ayrılmış listesi olmalı (bkz.
        // ArchetypeRenderer/semantic-query'nin .split(',') beklentisi) — eskiden yalnızca
        // selected[0] yazılıyordu, birden fazla kanal seçilince ilki dışındakiler public
        // sayfada hiç görünmüyordu (contact_value'daki veri sessizce ölü kalıyordu).
        const contactMethod = selected.join(',');
        const contactValue = JSON.stringify(
          selected.reduce((acc, m) => ({ ...acc, [m]: values[m] }), {} as Record<string, string>)
        );
        await supabase
          .from('businesses')
          .update({ contact_method: contactMethod, contact_value: contactValue })
          .eq('id', businessId);

      } else {
        // Blok oluştur veya (blockId biliniyorsa) var olanı güncelle
        if (!businessId) throw new Error('İşletme kimliği bulunamadı');
        const content = buildBlockContent(step.blockType, data, locale);
        const label = t(step.labelKey as any);

        if (savedBlockId) {
          const { error: updErr } = await supabase
            .from('blocks')
            .update({ content, title: label })
            .eq('id', savedBlockId);
          if (updErr) throw new Error(t('errors.generic'));
        } else {
          const { data: newBlock, error: insErr } = await supabase
            .from('blocks')
            .insert({
              business_id: businessId,
              type: step.blockType,
              title: label,
              content,
              order: currentStepIdx,
              is_visible: true,
            })
            .select('id')
            .single();
          if (insErr) throw new Error(t('errors.generic'));
          savedBlockId = newBlock?.id;
        }
      }

      // Adımı kayıtlı işaretle ve ilerle
      setStepStates((prev) => ({
        ...prev,
        [step.id]: { ...prev[step.id], status: 'saved', blockId: savedBlockId },
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
  // Onay e-postası/Google dönüşü sonrası tekrar /onboarding'e düşüldüğünde
  // devral modunun (?claim=...) unutulmaması için next path'e geri ekleniyor.
  const nextOnboardingPath = () =>
    `/${locale}/onboarding${claimUsername ? `?claim=${encodeURIComponent(claimUsername)}` : ''}`;

  const handleClaimEmailPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupLoading(true);
    setSignupError('');
    try {
      const { data, error: updErr } = await supabase.auth.updateUser(
        { email: signupEmail, password: signupPassword },
        { emailRedirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(nextOnboardingPath())}` }
      );
      if (updErr) throw updErr;

      if (data.user && !data.user.is_anonymous) {
        // E-posta onayı kapalıysa dönüşüm anında tamamlanır — beklemeden devam et.
        if (claimUsername) await runClaim(claimUsername);
        else if (businessId) await finishWizardOrGate(businessId, data.user);
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
        options: { redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(nextOnboardingPath())}` },
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
          {/* Devral modunda (?claim=...) bu tarayıcı hiç wizard adımı doldurmadı —
              selectedCategory boş, "adımlara dön" burada geçersiz. */}
          {!claimUsername && (
            <button
              type="button"
              onClick={() => { setStepListOpen(true); setPhase('wizard'); }}
              className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-[var(--ink)] mb-4 -ml-1"
            >
              <ChevronLeft className="w-4 h-4" /> {t('signupGate.backToSteps')}
            </button>
          )}

          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 text-[var(--teal)] rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--ink)] mb-2">
              {claimUsername ? t('claimGate.title') : t('signupGate.title')}
            </h1>
            <p className="text-slate-500 text-sm">
              {claimUsername ? t('claimGate.sub') : t('signupGate.sub')}
            </p>
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
                  {signupLoading ? tReg('loading') : (claimUsername ? t('claimGate.submitBtn') : t('signupGate.submitBtn'))}
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
    const toDashboard = () => router.push('/dashboard/editor');

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

    const optionalSuffix = <span className="font-normal text-slate-400">({t('fields.optional')})</span>;

    switch (currentStep.blockType) {
      case 'header':       return <HeaderForm data={data} onChange={onChange} t={t} />;
      case 'services':
      case 'pricing':
        return (
          <ItemListForm
            data={data} onChange={onChange} t={t}
            newItem={{ title: '', description: '', price: '', mediaUrl: '' }}
            fields={[
              { key: 'title', kind: 'colored', placeholder: t('fields.itemName'), label: itemLabel },
              { key: 'description', kind: 'coloredMultiline', placeholder: t('fields.descriptionPlaceholder'), label: <>{t('fields.description')} {optionalSuffix}</> },
              { key: 'price', kind: 'text', placeholder: t('fields.pricePlaceholder'), label: <>{t('fields.price')} {optionalSuffix}</> },
              { key: 'mediaUrl', kind: 'media', label: <>{t('fields.media')} {optionalSuffix}</> },
            ]}
          />
        );
      case 'about':
      case 'custom':       return <TextForm data={data} onChange={onChange} t={t} />;
      case 'links':
        return (
          <ItemListForm
            data={data} onChange={onChange} t={t}
            newItem={{ label: '', url: '' }}
            fields={[
              { key: 'label', kind: 'colored', placeholder: t('fields.linkLabel'), label: itemLabel },
              { key: 'url', kind: 'text', placeholder: 'https://' },
            ]}
          />
        );
      case 'gallery':      return <GalleryForm data={data} onChange={onChange} t={t} />;
      case 'testimonials':
        return (
          <ItemListForm
            data={data} onChange={onChange} t={t}
            newItem={{ quote: '', author: '', role: '' }}
            fields={[
              { key: 'quote', kind: 'coloredMultiline', placeholder: t('fields.quote') },
              { key: 'author', kind: 'text', placeholder: t('fields.author'), half: true },
              { key: 'role', kind: 'text', placeholder: t('fields.role'), half: true },
            ]}
          />
        );
      case 'faq':
        return (
          <ItemListForm
            data={data} onChange={onChange} t={t}
            newItem={{ question: '', answer: '' }}
            fields={[
              { key: 'question', kind: 'colored', placeholder: t('fields.question'), bold: true },
              { key: 'answer', kind: 'coloredMultiline', placeholder: t('fields.answer') },
            ]}
          />
        );
      case 'contact':      return <ContactForm data={data} onChange={onChange} t={t} />;
      default:             return null;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--page-bg,#f7f7f5)] p-4 flex flex-col items-center">
      <div className="w-full max-w-lg py-6">

        {/* ── Üst çubuk ── */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-4 shadow-sm">
          <div className="p-4 pb-3">
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

          {/* Adım listesi varsayılan kapalı — bkz. stepListOpen tanımı. Kapalıyken bile
              hangi adımda olunduğu üstteki "x/y" sayacı ve ilerleme çubuğuyla zaten belli. */}
          <button
            type="button"
            onClick={() => setStepListOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2 border-t border-slate-100 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition"
          >
            {t('stepListToggle')}
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${stepListOpen ? 'rotate-90' : ''}`} />
          </button>

          {/* ── Adım listesi ── */}
          <div className={`divide-y divide-slate-100 border-t border-slate-100 ${stepListOpen ? '' : 'hidden'}`}>
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
