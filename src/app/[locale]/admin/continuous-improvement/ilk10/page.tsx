'use client';

import AdminLayout from '@/components/AdminLayout';
import ContinuousImprovementTabs from '@/components/ContinuousImprovementTabs';
import { useEffect, useState } from 'react';
import {
  Target, Users, DollarSign, CalendarClock, MessageCircle,
  Copy, Check, XCircle, Plus, Trash2, NotebookPen, TrendingUp, Pencil, X, Save, Table2
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* OYUN KİTABI — statik. Beachhead + funnel + itiraz + ritim.          */
/* Karar kaynağı: Yalın Kanvas "müşteri segmenti". Beachhead = solo    */
/* diyetisyen (2026-07-24). Değişiklik kod bazında güncellenir.        */
/* GÜNLÜK bölümü statik değil — tarayıcıda (localStorage) saklanır.    */
/* ------------------------------------------------------------------ */

const stats = [
  { icon: Users, label: 'Beachhead', value: 'Solo diyetisyen', sub: 'linktree var + online danışan alan' },
  { icon: TrendingUp, label: 'Takipçi aralığı', value: '3K – 30K', sub: 'DM acısı taze, kendi DM’ine bakıyor' },
  { icon: DollarSign, label: 'Fiyat', value: '$9/ay', sub: '~300 TL · doğrulama fiyatı' },
  { icon: CalendarClock, label: 'Ritim & hedef', value: 'Günde 10 temas', sub: 'haftada 1-2 kapama · 10 müşteri ≈ 6-10 hafta' },
];

const funnel = [
  {
    step: '1',
    title: '1. temas — satış değil, cevap için',
    note: 'Link yok, pitch yok. Tek net soru, tam acıyı isimlendir.',
    message:
      'Merhaba [isim] 🙌 Online danışan alıyorsun sanırım — DM’den gelen "fiyat ne, nasıl başlıyoruz" sorularına tek tek mi yazıyorsun, yoksa bir yere mi yönlendiriyorsun?',
  },
  {
    step: '2',
    title: '2. mesaj — acıyı büyüt + değer',
    note: 'Cevap gelince. Düşük taahhüt ("beğenmezsen sil") = yüksek evet oranı.',
    message:
      'Tahmin etmiştim 🙂 Çoğu diyetisyen günde 10-15 aynı soruya yazmaktan yoruluyor, bir kısmı da o arada kaçıp gidiyor. Tam bunun için küçük bir şey yaptım — senin bio linkin gibi ama geleni otomatik karşılayıp paket/fiyat/randevuya yönlendiriyor. İstersen senin sayfana göre 2 dakikalık bir örnek hazırlayıp atayım, beğenmezsen sil gitsin?',
  },
  {
    step: '3',
    title: '3. adım — kişisel demo',
    note: 'Onun gerçek linki/markasıyla 2 dk’lık Loom çek, at. Ürünü değil, hazır sonucunu göster.',
    message: null,
  },
  {
    step: '4',
    title: 'Kapama',
    note: 'Satışı varsay ("kuralım mı?"), riski kaldır, fiyatı net söyle, tek adım.',
    message:
      'Nasıl buldun? 🙂 İstersen ilk hafta kurulumunu ben yapayım, sen sadece linki bio’na koy. Aylık 9 dolar (~300 TL), istediğin an bırakırsın. Kuralım mı?',
  },
];

const objections = [
  {
    q: '"Düşüneyim"',
    a: 'Tabii 🙂 Kurulumu ben yaptığım için sana sıfır iş. Bu haftaki danışan sorularını kaçırmamak için bugün kurup dursun, beğenmezsen hafta sonu kapatırız — olur mu?',
  },
  {
    q: '"Linktree kullanıyorum zaten"',
    a: 'Linktree sadece link listesi, geleni öylece bırakıyor. Bu ise gelenle konuşup doğru pakete/randevuya götürüyor — tıklayıp çıkanı elde tutuyor. Farkı örnekte görürsün.',
  },
  {
    q: '"Pahalı / ücretsizi var mı"',
    a: '9 dolar bir danışanın onda biri bile değil; tek danışan getirse kendini 10’a katlar. Ücretsiz sürüm yok çünkü kurulumu bizzat ben yapıp destekliyorum.',
  },
  {
    q: '"Vaktim yok"',
    a: 'Zaten o yüzden ben kuruyorum, senden 5 dakika bile istemiyorum 🙂',
  },
];

const followUp =
  'Selam [isim], o soruyu sormamın sebebi diyetisyenlere özel küçük bir şey hazırlamış olmam — ilgilenirsen 2 dk’lık örnek atarım, ilgilenmezsen hiç dert değil 🙂';

/* ------------------------------------------------------------------ */
/* Adaylar (Leads) — localStorage, düzenlenebilir tablo                 */
/* Seed: 2026-07-24 araştırması + önceliklendirme.                     */
/* ------------------------------------------------------------------ */

type Aday = {
  id: string;
  hesap: string;
  takipci: string;
  gelir: 'Yüksek' | 'Orta' | 'Düşük';
  not_: string;
  asama: 'Bekliyor' | 'Temas' | 'Cevap' | 'Demo' | 'Ödedi' | 'Vazgeçti';
  oncelik: 'Yüksek' | 'Orta' | 'Düşük';
};

const ADAYLAR_KEY = 'ilk10-adaylar-v1';

const seedAdaylar: Aday[] = [
  {
    id: 'seed-5',
    hesap: 'diyetisyenfatmalikos',
    takipci: '15.6K',
    gelir: 'Orta',
    not_: 'Bio\'da WP var. Mevcut bir bot karşılama yapmıyor — sorunu zaten kanıtlamış, en sıcak aday.',
    asama: 'Bekliyor',
    oncelik: 'Yüksek',
  },
  {
    id: 'seed-2',
    hesap: 'dyetelifakca',
    takipci: '4.9K',
    gelir: 'Orta',
    not_: 'Bio\'da çok uzun bir anket var. Anket yerine Saule konuşması net pitch açısı — "anketi kaç kişi bitiriyor" ile aç.',
    asama: 'Bekliyor',
    oncelik: 'Yüksek',
  },
  {
    id: 'seed-4',
    hesap: 'dyt.edanurbolukbas',
    takipci: '8.4K',
    gelir: 'Orta',
    not_: 'Bio\'da Shopier var — ödeme almaya alışkın, dijital ürün satıyor.',
    asama: 'Bekliyor',
    oncelik: 'Orta',
  },
  {
    id: 'seed-1',
    hesap: 'diyetisyenecrinavci',
    takipci: '19.4K',
    gelir: 'Yüksek',
    not_: 'Yüksek gelir grubu, ödeme sürtünmesi düşük olmalı.',
    asama: 'Bekliyor',
    oncelik: 'Orta',
  },
  {
    id: 'seed-3',
    hesap: 'diyetisyensedaozguzel',
    takipci: '3.3K',
    gelir: 'Orta',
    not_: 'Bio\'da WP, işletme hesabı ama karşılama mesajı gelmiyor. Takipçi alt sınırda.',
    asama: 'Bekliyor',
    oncelik: 'Düşük',
  },
  {
    id: 'seed-6',
    hesap: 'uzm.dyt.nilhanesim',
    takipci: '30.7K',
    gelir: 'Orta',
    not_: 'Website + doktortakvimi.com. Üst sınırda takipçi, muhtemelen ekip var. DoktorTakvimi rakip sinyali — birkaç diyetisyende görüldü.',
    asama: 'Bekliyor',
    oncelik: 'Düşük',
  },
];

const asamaRenk: Record<Aday['asama'], string> = {
  Bekliyor: 'bg-slate-100 text-slate-600',
  Temas: 'bg-blue-100 text-blue-700',
  Cevap: 'bg-amber-100 text-amber-700',
  Demo: 'bg-purple-100 text-purple-700',
  Ödedi: 'bg-emerald-100 text-emerald-700',
  Vazgeçti: 'bg-red-100 text-red-600',
};

const oncelikRenk: Record<Aday['oncelik'], string> = {
  Yüksek: 'text-red-600',
  Orta: 'text-amber-600',
  Düşük: 'text-slate-400',
};

function Adaylar() {
  const [adaylar, setAdaylar] = useState<Aday[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ADAYLAR_KEY);
      setAdaylar(raw ? JSON.parse(raw) : seedAdaylar);
    } catch {
      setAdaylar(seedAdaylar);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(ADAYLAR_KEY, JSON.stringify(adaylar));
    } catch {
      /* geç */
    }
  }, [adaylar, loaded]);

  function update(id: string, field: keyof Aday, value: string) {
    setAdaylar((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)));
  }

  function remove(id: string) {
    setAdaylar((prev) => prev.filter((a) => a.id !== id));
  }

  function addRow() {
    setAdaylar((prev) => [
      ...prev,
      { id: crypto.randomUUID(), hesap: '', takipci: '', gelir: 'Orta', not_: '', asama: 'Bekliyor', oncelik: 'Orta' },
    ]);
  }

  const inputCls =
    'w-full text-sm border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:bg-white rounded px-1.5 py-1';
  const selectCls =
    'text-xs font-semibold border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500/40 rounded px-1 py-0.5 cursor-pointer';

  return (
    <section>
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Table2 className="w-5 h-5 text-slate-600" /> Adaylar
        </h2>
        <button
          onClick={addRow}
          className="flex items-center gap-1.5 text-xs font-medium bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Yeni aday
        </button>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Bu tarayıcıda saklanır, hücrelere tıklayıp doğrudan düzenle. Öncelik sırası: yüksek acı sinyali (mevcut bot/anket sorunu, ödemeye alışkınlık) &gt; nötr.
      </p>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b border-slate-100 text-left">
              <th className="px-3 py-2.5 text-[10px] uppercase tracking-wider text-slate-400 font-bold w-[16%]">Hesap</th>
              <th className="px-3 py-2.5 text-[10px] uppercase tracking-wider text-slate-400 font-bold w-[8%]">Takipçi</th>
              <th className="px-3 py-2.5 text-[10px] uppercase tracking-wider text-slate-400 font-bold w-[9%]">Gelir Grubu</th>
              <th className="px-3 py-2.5 text-[10px] uppercase tracking-wider text-slate-400 font-bold">Not</th>
              <th className="px-3 py-2.5 text-[10px] uppercase tracking-wider text-slate-400 font-bold w-[9%]">Aşama</th>
              <th className="px-3 py-2.5 text-[10px] uppercase tracking-wider text-slate-400 font-bold w-[7%]">Öncelik</th>
              <th className="px-3 py-2.5 w-[4%]" />
            </tr>
          </thead>
          <tbody>
            {adaylar.map((a) => (
              <tr key={a.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 align-top">
                <td className="px-2 py-1.5">
                  <input
                    value={a.hesap}
                    onChange={(e) => update(a.id, 'hesap', e.target.value)}
                    placeholder="@kullaniciadi"
                    className={`${inputCls} font-medium text-slate-900`}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    value={a.takipci}
                    onChange={(e) => update(a.id, 'takipci', e.target.value)}
                    placeholder="0K"
                    className={inputCls}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <select
                    value={a.gelir}
                    onChange={(e) => update(a.id, 'gelir', e.target.value)}
                    className={`${selectCls} text-slate-600`}
                  >
                    <option>Yüksek</option>
                    <option>Orta</option>
                    <option>Düşük</option>
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  <textarea
                    value={a.not_}
                    onChange={(e) => update(a.id, 'not_', e.target.value)}
                    placeholder="Gözlem, açılış açısı…"
                    rows={2}
                    className={`${inputCls} resize-y text-slate-600 leading-snug`}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <select
                    value={a.asama}
                    onChange={(e) => update(a.id, 'asama', e.target.value)}
                    className={`${selectCls} ${asamaRenk[a.asama]}`}
                  >
                    <option>Bekliyor</option>
                    <option>Temas</option>
                    <option>Cevap</option>
                    <option>Demo</option>
                    <option>Ödedi</option>
                    <option>Vazgeçti</option>
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  <select
                    value={a.oncelik}
                    onChange={(e) => update(a.id, 'oncelik', e.target.value)}
                    className={`${selectCls} ${oncelikRenk[a.oncelik]}`}
                  >
                    <option>Yüksek</option>
                    <option>Orta</option>
                    <option>Düşük</option>
                  </select>
                </td>
                <td className="px-2 py-1.5 text-center">
                  <button
                    onClick={() => remove(a.id)}
                    className="text-slate-300 hover:text-red-500 transition-colors"
                    aria-label="Sil"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loaded && adaylar.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-6">Henüz aday yok. "Yeni aday" ile ekle.</p>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Copy button                                                          */
/* ------------------------------------------------------------------ */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard yoksa sessiz geç */
        }
      }}
      className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors shrink-0"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Kopyalandı' : 'Kopyala'}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Günlük — localStorage                                                */
/* ------------------------------------------------------------------ */

type Entry = { id: string; date: string; text: string };
const STORAGE_KEY = 'ilk10-gunluk-v1';

function Gunluk() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [draft, setDraft] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  // Mount'ta yükle (hydration uyumsuzluğunu önlemek için useEffect)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setEntries(JSON.parse(raw));
    } catch {
      /* geç */
    }
    setLoaded(true);
  }, []);

  // Değişince kaydet
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      /* geç */
    }
  }, [entries, loaded]);

  function add() {
    const text = draft.trim();
    if (!text) return;
    const today = new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });
    setEntries((prev) => [{ id: crypto.randomUUID(), date: today, text }, ...prev]);
    setDraft('');
  }

  function remove(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function startEdit(e: Entry) {
    setEditingId(e.id);
    setEditDraft(e.text);
  }

  function saveEdit() {
    if (!editDraft.trim() || !editingId) return;
    setEntries(prev => prev.map(entry => entry.id === editingId ? { ...entry, text: editDraft.trim() } : entry));
    setEditingId(null);
    setEditDraft('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft('');
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <NotebookPen className="w-4 h-4 text-slate-600" />
        <h2 className="font-bold text-slate-800">Günlük</h2>
        <span className="text-xs text-slate-400 ml-auto">Bu tarayıcıda saklanır · her gün ne yaptın / ne öğrendin / ne çalıştı</span>
      </div>

      <div className="p-5 space-y-4">
        {/* Yeni giriş */}
        <div className="flex flex-col gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') add();
            }}
            placeholder="Bugün 10 diyetisyene yazdım, 3 cevap, 1 demo istedi… (Ctrl/⌘+Enter ile ekle)"
            rows={3}
            className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400"
          />
          <button
            onClick={add}
            disabled={!draft.trim()}
            className="self-end flex items-center gap-1.5 text-sm font-medium bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-700 disabled:opacity-40 transition-colors"
          >
            <Plus className="w-4 h-4" /> Ekle
          </button>
        </div>

        {/* Girişler */}
        {loaded && entries.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-6">Henüz giriş yok. Bugünün ilk notunu yaz.</p>
        )}
        <div className="space-y-3">
          {entries.map((e) => (
            <div key={e.id} className="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-mono font-bold text-slate-500">{e.date}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEdit(e)}
                    className="text-slate-300 hover:text-blue-500 transition-colors"
                    aria-label="Düzenle"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => remove(e.id)}
                    className="text-slate-300 hover:text-red-500 transition-colors"
                    aria-label="Sil"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {editingId === e.id ? (
                <div className="mt-2 flex flex-col gap-2">
                  <textarea
                    value={editDraft}
                    onChange={(ev) => setEditDraft(ev.target.value)}
                    onKeyDown={(ev) => {
                      if (ev.key === 'Escape') cancelEdit();
                      if ((ev.metaKey || ev.ctrlKey) && ev.key === 'Enter') saveEdit();
                    }}
                    rows={3}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={cancelEdit}
                      className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg"
                    >
                      <X className="w-3.5 h-3.5" /> İptal
                    </button>
                    <button
                      onClick={saveEdit}
                      disabled={!editDraft.trim()}
                      className="flex items-center gap-1 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 px-3 py-1.5 rounded-lg disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" /> Kaydet
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{e.text}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

export default function Ilk10Page() {
  return (
    <AdminLayout>
      <ContinuousImprovementTabs />

      <div className="mt-6 space-y-10">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-5 h-5 text-slate-600" />
            <h1 className="text-3xl font-bold text-slate-900">İlk 10 Ödeyen Müşteri</h1>
          </div>
          <p className="text-slate-500 text-sm">
            Tek segmentli manuel satış oyun kitabı. 10 müşteriyi de solo diyetisyenden çıkar.
          </p>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            V.1 · 2026-07-24 — oyun kitabı statik (kod bazında güncellenir); günlük tarayıcıda saklanır. Beachhead kaynağı: Yalın Kanvas müşteri segmenti.
          </p>
        </div>

        {/* Özet şerit */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-slate-600" />
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{s.label}</span>
                </div>
                <p className="text-lg font-bold text-slate-900 leading-tight">{s.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.sub}</p>
              </div>
            );
          })}
        </div>

        {/* Funnel */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-slate-600" /> Mesaj Akışı (Funnel)
          </h2>
          <p className="text-xs text-slate-500 mb-5">
            [isim] alanını kişiselleştir. İlk mesajın amacı satmak değil, cevap almak.
          </p>
          <div className="space-y-4">
            {funnel.map((f) => (
              <div key={f.step} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-mono shrink-0 mt-0.5">
                    {f.step}
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-900 leading-tight">{f.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{f.note}</p>
                  </div>
                </div>
                {f.message && (
                  <div className="px-5 py-4 bg-slate-50 flex items-start gap-3">
                    <p className="text-sm text-slate-700 leading-relaxed flex-1 whitespace-pre-wrap">{f.message}</p>
                    <CopyButton text={f.message} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* İtirazlar */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-slate-600" /> İtiraz Cevapları
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {objections.map((o) => (
              <div key={o.q} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <p className="text-sm font-bold text-slate-900 mb-1.5">{o.q}</p>
                <div className="flex items-start gap-2">
                  <p className="text-sm text-slate-700 leading-relaxed flex-1">{o.a}</p>
                  <CopyButton text={o.a} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Ritim / takip */}
        <section className="bg-slate-900 rounded-2xl p-6 text-white">
          <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-amber-400" /> Temas Ritmi
          </h2>
          <ul className="space-y-2 text-sm text-slate-300 leading-relaxed">
            <li>• Günde <strong className="text-white">10 yeni ilk-temas.</strong> Cevap verenlere <strong className="text-white">aynı gün</strong> dön.</li>
            <li>• Cevap yoksa 3-4 gün sonra <strong className="text-white">tek</strong> yumuşak takip, sonra bırak (max 2 dürtme).</li>
            <li>• Huni takibi: <strong className="text-white">Temas → Cevap → Demo izledi → Ödedi.</strong> En çok nerede düştüğünü gör, orayı düzelt.</li>
          </ul>
          <div className="mt-4 bg-white/10 rounded-xl p-4 flex items-start gap-3 border border-white/10">
            <p className="text-sm text-slate-200 leading-relaxed flex-1 whitespace-pre-wrap">{followUp}</p>
            <CopyButton text={followUp} />
          </div>
        </section>

        {/* Adaylar */}
        <Adaylar />

        {/* Günlük */}
        <Gunluk />
      </div>
    </AdminLayout>
  );
}
