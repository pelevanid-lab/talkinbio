'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Brain,
  Check,
  ChevronDown,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import type { CharacterShot } from '@/config/characters';
import {
  LORA_MIN_PHOTOS,
  LORA_MIN_SCORE,
  LORA_STATUS_LABELS,
  LORA_TRAINING_THRESHOLD,
  TWIN_VALIDATION_ANGLES,
  TWIN_VERIFIED_SCORE,
  type LoraStatus,
} from '@/config/beiweLab';
import SimilarityRating from '@/components/beiwe-lab/SimilarityRating';
import InstagramImporter from '@/components/InstagramImporter';

export type TwinProfile = {
  identity_prompt: string | null;
  reference_image_url: string | null;
  lora_status: LoraStatus;
  lora_url: string | null;
  lora_trigger_word: string | null;
};

type Props = {
  characterId: string;
  characterName: string;
  initialProfile: TwinProfile;
  initialShots: CharacterShot[];
  /** Instagram içe aktarma yalnız admin route'unu (api/admin/characters/[id]/instagram)
   * kullanıyor — bu Twin akışının çok-kiracılı hâline henüz taşınmadı, o yüzden müşteri
   * sayfası bu butonu gizler. Admin sayfasında varsayılan (true) değişmez. */
  allowInstagramImport?: boolean;
};

/** Yüklenen referans kareler `model: 'user-upload'` ile kaydediliyor (shots POST route). */
const UPLOAD_MODEL = 'user-upload';

/* ------------------------------------------------------------------ */
/* Aşama kabuğu                                                        */
/* ------------------------------------------------------------------ */
function Stage({
  index,
  title,
  question,
  state,
  lockedMsg,
  children,
}: {
  index: number;
  title: string;
  /** Bu aşamanın cevapladığı soru — katmanın sınırını okunur kılar. */
  question: string;
  state: 'locked' | 'open' | 'done';
  lockedMsg?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const locked = state === 'locked';

  return (
    <section
      className={`rounded-2xl border overflow-hidden transition-all ${
        locked ? 'border-slate-200 bg-slate-50/70' : 'border-slate-200 bg-white shadow-sm'
      }`}
    >
      <button
        onClick={() => !locked && setOpen((v) => !v)}
        disabled={locked}
        className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 ${
              state === 'done'
                ? 'bg-emerald-500 text-white'
                : locked
                  ? 'bg-slate-200 text-slate-400'
                  : 'bg-blue-600 text-white'
            }`}
          >
            {state === 'done' ? <Check className="w-4 h-4" /> : index}
          </span>
          <div className="min-w-0">
            <h2 className={`text-sm font-semibold ${locked ? 'text-slate-400' : 'text-slate-900'}`}>
              {title}
            </h2>
            <p className="text-xs text-slate-500 truncate">{question}</p>
          </div>
        </div>
        {locked ? (
          <span className="text-xs text-slate-400 italic flex-shrink-0">{lockedMsg}</span>
        ) : (
          <ChevronDown
            className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        )}
      </button>
      {!locked && open && <div className="px-6 pb-6 space-y-5">{children}</div>}
    </section>
  );
}

/* ------------------------------------------------------------------ */

export default function BeiweTwinClient({
  characterId,
  characterName,
  initialProfile,
  initialShots,
  allowInstagramImport = true,
}: Props) {
  const router = useRouter();
  const [profile, setProfile] = useState<TwinProfile>(initialProfile);
  const [shots, setShots] = useState<CharacterShot[]>(initialShots);
  const [error, setError] = useState<string | null>(null);

  const [teaching, setTeaching] = useState(false);
  const [generatingAngle, setGeneratingAngle] = useState<string | null>(null);
  const [busyShotId, setBusyShotId] = useState<string | null>(null);
  const [loraChecking, setLoraChecking] = useState(false);
  const [loraSubmitting, setLoraSubmitting] = useState(false);
  const [loraError, setLoraError] = useState<string | null>(null);
  const [showInstagram, setShowInstagram] = useState(false);
  const [showIdentityPrompt, setShowIdentityPrompt] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ---------------- türetilmiş durum ---------------- */
  const referenceShots = useMemo(() => shots.filter((s) => s.model === UPLOAD_MODEL), [shots]);
  const twinShots = useMemo(() => shots.filter((s) => s.model !== UPLOAD_MODEL), [shots]);
  const loraPool = useMemo(
    () => shots.filter((s) => (s.similarity_score ?? 0) >= LORA_MIN_SCORE),
    [shots],
  );
  const hasIdentity = Boolean(profile.identity_prompt);
  const isVerified = twinShots.some((s) => (s.similarity_score ?? 0) >= TWIN_VERIFIED_SCORE);
  const loraReady = loraPool.length >= LORA_TRAINING_THRESHOLD;

  /* ---------------- aşama 1: yüzü tanıt ---------------- */
  // Karakter Odası'ndaki onboarding yalnızca reference_image_url yazıyor, identity_prompt'u
  // hiç üretmiyordu — bu yüzden üretim "Karakter kimliği bulunamadı" ile düşebiliyor.
  // Burada zincir tam: yükle → analiz et (identity_prompt) → kanon kare olarak kaydet.
  const teachFace = async (files: File[]) => {
    if (files.length === 0) return;
    setTeaching(true);
    setError(null);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/admin/characters/scene-ref', { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Fotoğraf yüklenemedi.');
        urls.push(data.url);
      }

      const analyzeRes = await fetch('/api/admin/characters/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId, imageUrls: urls }),
      });
      const analyzeData = await analyzeRes.json();
      if (!analyzeRes.ok) throw new Error(analyzeData.error || 'Yüz analizi başarısız.');

      const newShots: CharacterShot[] = [];
      for (const url of urls) {
        const shotRes = await fetch('/api/admin/characters/shots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ characterId, imageUrl: url }),
        });
        const shotData = await shotRes.json();
        if (shotRes.ok && shotData.shot) newShots.push(shotData.shot as CharacterShot);
      }

      setShots((prev) => [...newShots, ...prev]);
      setProfile((prev) => ({
        ...prev,
        identity_prompt: analyzeData.identityPrompt,
        reference_image_url: urls[0],
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yüz tanıtılamadı.');
    } finally {
      setTeaching(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  /* ---------------- aşama 2: twin üret & doğrula ---------------- */
  const generateTwin = async (angle: (typeof TWIN_VALIDATION_ANGLES)[number]) => {
    setGeneratingAngle(angle.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/characters/${characterId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presetIds: [angle.presetId], numImages: 1, resolution: '1K' }),
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Sunucu hatası (${res.status}): JSON beklenirken başka bir yanıt geldi.`);
      }
      if (!res.ok) throw new Error(data.error || 'Twin üretilemedi.');
      setShots((prev) => [...(data.shots as CharacterShot[]), ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Twin üretilemedi.');
    } finally {
      setGeneratingAngle(null);
    }
  };

  const rate = useCallback(async (shot: CharacterShot, score: number) => {
    const previous = shot.similarity_score;
    setShots((prev) => prev.map((s) => (s.id === shot.id ? { ...s, similarity_score: score } : s)));
    try {
      const res = await fetch(`/api/admin/characters/shots/${shot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ similarityScore: score }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setShots((prev) =>
        prev.map((s) => (s.id === shot.id ? { ...s, similarity_score: previous } : s)),
      );
      setError('Puan kaydedilemedi.');
    }
  }, []);

  const removeShot = async (shot: CharacterShot) => {
    if (!confirm('Bu kare kalıcı olarak silinsin mi?')) return;
    setBusyShotId(shot.id);
    try {
      const res = await fetch(`/api/admin/characters/shots/${shot.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setShots((prev) => prev.filter((s) => s.id !== shot.id));
    } catch {
      setError('Kare silinemedi.');
    } finally {
      setBusyShotId(null);
    }
  };

  /* ---------------- aşama 3: LoRA ---------------- */
  const startLoraTraining = async () => {
    setLoraSubmitting(true);
    setLoraError(null);
    try {
      // En benzer kareler başa: route ilk 30'u alıyor ve ilk 10'unu caption'da
      // "high-quality" olarak işaretliyor, sıralama doğrudan eğitim kalitesine yansıyor.
      const photoUrls = [...loraPool]
        .sort((a, b) => (b.similarity_score ?? 0) - (a.similarity_score ?? 0))
        .map((s) => s.image_url);

      const res = await fetch(`/api/admin/characters/${characterId}/lora`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrls }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'LoRA eğitimi başlatılamadı.');
      setProfile((prev) => ({
        ...prev,
        lora_status: 'queued',
        lora_trigger_word: data.triggerWord ?? prev.lora_trigger_word,
      }));
    } catch (err) {
      setLoraError(err instanceof Error ? err.message : 'LoRA eğitimi başlatılamadı.');
    } finally {
      setLoraSubmitting(false);
    }
  };

  const refreshLoraStatus = async () => {
    setLoraChecking(true);
    try {
      const res = await fetch(`/api/admin/characters/${characterId}/lora`);
      const data = await res.json();
      if (res.ok) {
        setProfile((prev) => ({
          ...prev,
          lora_status: (data.status ?? 'none') as LoraStatus,
          lora_url: data.loraUrl ?? prev.lora_url,
          lora_trigger_word: data.triggerWord ?? prev.lora_trigger_word,
        }));
      }
    } catch {
      setError('LoRA durumu okunamadı.');
    } finally {
      setLoraChecking(false);
    }
  };

  /* ---------------- render ---------------- */
  const stage1State = hasIdentity ? 'done' : 'open';
  const stage2State = !hasIdentity ? 'locked' : isVerified ? 'done' : 'open';
  const stage3State = !isVerified ? 'locked' : profile.lora_status === 'ready' ? 'done' : 'open';

  return (
    <div className="space-y-5">
      {/* Özet şerit */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-4 flex flex-wrap items-center gap-x-8 gap-y-3">
        <div className="flex items-center gap-3">
          {profile.reference_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.reference_image_url}
              alt=""
              className="w-11 h-11 rounded-full object-cover border border-slate-200"
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-slate-100 border border-dashed border-slate-300" />
          )}
          <div>
            <p className="text-sm font-semibold text-slate-900">{characterName}</p>
            <p className="text-xs text-slate-500">Twin üretim hattı</p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs">
          <div>
            <p className="text-slate-400">Kimlik</p>
            <p className={`font-semibold ${hasIdentity ? 'text-emerald-600' : 'text-slate-400'}`}>
              {hasIdentity ? 'Tanıtıldı' : 'Bekliyor'}
            </p>
          </div>
          <div>
            <p className="text-slate-400">Twin</p>
            <p className={`font-semibold ${isVerified ? 'text-amber-600' : 'text-slate-400'}`}>
              {isVerified ? 'Doğrulandı' : `${twinShots.length} deneme`}
            </p>
          </div>
          <div>
            <p className="text-slate-400">Eğitim seti</p>
            <p className="font-semibold text-slate-800">
              {loraPool.length}/{LORA_TRAINING_THRESHOLD}
            </p>
          </div>
          <div>
            <p className="text-slate-400">LoRA</p>
            <p className="font-semibold text-slate-800">
              {LORA_STATUS_LABELS[profile.lora_status] ?? profile.lora_status}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-700 text-xs">
            kapat
          </button>
        </div>
      )}

      {/* ─── Aşama 1 ─────────────────────────────────────── */}
      <Stage
        index={1}
        title="Yüzü Tanıt"
        question="Bu twin kimin yüzünden doğuyor?"
        state={stage1State}
      >
        <p className="text-sm text-slate-600">
          Yüklediğin kareler önce görüntü modeliyle analiz edilir ve kişinin kalıcı{' '}
          <strong>kimlik tarifi</strong> çıkarılır. Her twin üretimi bu tarifi ve referans kareyi
          kullanır — sahne değişse de yüz değişmez.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={teaching}
            className="flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {teaching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {teaching ? 'Analiz ediliyor…' : hasIdentity ? 'Yüzü yeniden tanıt' : 'Fotoğraf yükle'}
          </button>
          {allowInstagramImport && (
            <button
              onClick={() => setShowInstagram(true)}
              disabled={teaching}
              className="text-sm font-semibold text-pink-600 bg-pink-50 hover:bg-pink-100 px-4 py-2 rounded-lg disabled:opacity-50"
            >
              Instagram&apos;dan aktar
            </button>
          )}
          <span className="text-xs text-slate-400">
            En net, tek yüzün göründüğü kareler en iyi sonucu verir.
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            multiple
            className="hidden"
            onChange={(e) => teachFace(Array.from(e.target.files || []))}
          />
        </div>

        {referenceShots.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {referenceShots.map((shot) => (
              <div
                key={shot.id}
                className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shot.image_url} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removeShot(shot)}
                  disabled={busyShotId === shot.id}
                  className="absolute inset-x-0 bottom-0 bg-slate-900/70 text-white text-[10px] py-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {busyShotId === shot.id ? '…' : 'Sil'}
                </button>
              </div>
            ))}
          </div>
        )}

        {profile.identity_prompt && (
          <div className="rounded-xl border border-slate-200 bg-slate-50">
            <button
              onClick={() => setShowIdentityPrompt((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-slate-600"
            >
              <span>Üretilen kimlik tarifi (İngilizce)</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${showIdentityPrompt ? 'rotate-180' : ''}`}
              />
            </button>
            {showIdentityPrompt && (
              <p className="px-4 pb-3 text-xs leading-relaxed text-slate-600 font-mono">
                {profile.identity_prompt}
              </p>
            )}
          </div>
        )}
      </Stage>

      {/* ─── Aşama 2 ─────────────────────────────────────── */}
      <Stage
        index={2}
        title="Twin Üret & Doğrula"
        question="Bu yüz gerçekten sana benziyor mu?"
        state={stage2State}
        lockedMsg="Önce yüzü tanıt"
      >
        <p className="text-sm text-slate-600">
          Bu aşamada sahne değil <strong>kimlik</strong> sınanır. Üç sabit açı üret, her kareye
          benzerlik puanı ver. En az bir kare {TWIN_VERIFIED_SCORE}+ alırsa twin doğrulanmış sayılır.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {TWIN_VALIDATION_ANGLES.map((angle) => (
            <button
              key={angle.id}
              onClick={() => generateTwin(angle)}
              disabled={generatingAngle !== null}
              className="text-left rounded-xl border border-slate-200 p-4 hover:border-blue-400 hover:bg-blue-50/50 transition-colors disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:bg-transparent"
            >
              <div className="flex items-center gap-2 mb-1">
                {generatingAngle === angle.id ? (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                ) : (
                  <Sparkles className="w-4 h-4 text-blue-600" />
                )}
                <span className="text-sm font-semibold text-slate-900">{angle.label}</span>
              </div>
              <p className="text-xs text-slate-500 leading-snug">{angle.hint}</p>
            </button>
          ))}
        </div>

        {twinShots.length === 0 ? (
          <p className="text-xs text-slate-400 border-t border-slate-100 pt-4">
            Henüz twin denemesi yok. Yukarıdan bir açı seç.
          </p>
        ) : (
          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">
              Denemeler <span className="font-normal text-slate-400">({twinShots.length})</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {twinShots.map((shot) => {
                const score = shot.similarity_score;
                const verified = (score ?? 0) >= TWIN_VERIFIED_SCORE;
                return (
                  <div
                    key={shot.id}
                    className={`rounded-xl overflow-hidden border transition-all ${
                      verified ? 'border-amber-400 ring-1 ring-amber-200' : 'border-slate-200'
                    }`}
                  >
                    <div className="relative bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={shot.image_url} alt="" className="w-full block" />
                      {verified && (
                        <span className="absolute top-2 right-2 bg-amber-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          DOĞRULANDI
                        </span>
                      )}
                    </div>
                    <div className="p-2.5 space-y-2">
                      <SimilarityRating score={score} onChange={(n) => rate(shot, n)} />
                      <button
                        onClick={() => removeShot(shot)}
                        disabled={busyShotId === shot.id}
                        className="w-full flex items-center justify-center gap-1 rounded-lg border border-slate-200 py-1.5 text-xs text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 disabled:opacity-50"
                      >
                        {busyShotId === shot.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                        Sil
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Stage>

      {/* ─── Aşama 3 ─────────────────────────────────────── */}
      <Stage
        index={3}
        title="LoRA Eğitimi"
        question="Bu yüz kalıcı bir modele dönüşsün mü?"
        state={stage3State}
        lockedMsg={`Önce ${TWIN_VERIFIED_SCORE}+ puanlı bir twin üret`}
      >
        <p className="text-sm text-slate-600">
          {LORA_MIN_SCORE}+ puan alan kareler eğitim setine girer. Set{' '}
          {LORA_TRAINING_THRESHOLD} kareye ulaşınca kişiye özel bir LoRA modeli eğitilebilir —
          ondan sonra her üretim referans görsele değil, modelin kendisine dayanır.
        </p>

        <div>
          <div className="flex items-center justify-between mb-1.5 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-slate-600">
              <Brain className="w-3.5 h-3.5 text-purple-500" />
              Eğitim seti
            </span>
            <span className="text-slate-500">
              {loraPool.length} / {LORA_TRAINING_THRESHOLD} kare
            </span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full transition-all"
              style={{
                width: `${Math.min(100, (loraPool.length / LORA_TRAINING_THRESHOLD) * 100)}%`,
              }}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {profile.lora_status === 'queued' || profile.lora_status === 'training' ? (
            <div className="flex items-center gap-2 text-xs text-purple-700 bg-purple-50 rounded-lg px-3 py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              <span>
                {LORA_STATUS_LABELS[profile.lora_status]} — tetik kelimesi{' '}
                <strong>{profile.lora_trigger_word}</strong>. Sonuç 20-30 dk içinde hazır olur.
              </span>
            </div>
          ) : (
            <button
              onClick={startLoraTraining}
              disabled={!loraReady || loraSubmitting}
              title={!loraReady ? `Önce ${LORA_TRAINING_THRESHOLD} kareye ulaş` : undefined}
              className="flex items-center gap-2 bg-purple-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loraSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
              {loraSubmitting ? 'Arşiv hazırlanıyor…' : 'LoRA Eğitimini Başlat'}
            </button>
          )}
          <button
            onClick={refreshLoraStatus}
            disabled={loraChecking}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 disabled:opacity-50"
          >
            {loraChecking ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            Durumu yenile
          </button>
          {profile.lora_trigger_word && profile.lora_status !== 'queued' && profile.lora_status !== 'training' && (
            <span className="text-xs text-slate-400 font-mono">
              trigger: {profile.lora_trigger_word}
            </span>
          )}
        </div>

        {loraError && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{loraError}</span>
          </div>
        )}

        {profile.lora_status === 'failed' && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>Önceki eğitim denemesi başarısız oldu (fal tarafında). Yeniden başlatabilirsin.</span>
          </div>
        )}

        {!loraReady && (
          <p className="text-xs text-slate-400">
            Set eşiği {LORA_TRAINING_THRESHOLD - loraPool.length} kare uzakta; fal en az{' '}
            {LORA_MIN_PHOTOS} fotoğraf istiyor.
          </p>
        )}
      </Stage>

      {/* Instagram içe aktarma */}
      {showInstagram && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl">
            <InstagramImporter
              characterId={characterId}
              onCancel={() => setShowInstagram(false)}
              onImportComplete={(newShots) => {
                setShots((prev) => [...newShots, ...prev]);
                setShowInstagram(false);
                // Instagram akışı kimlik tarifi üretmiyor; sunucudan tazele ki
                // aşama 1 gerçekten tamamlandıysa o şekilde görünsün.
                router.refresh();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
