'use client';

import { useMemo, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  Loader2,
  Lock,
  Mic,
  Pin,
  PinOff,
  Sparkles,
  Trash2,
  Type,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import {
  ASPECT_RATIOS,
  ESTIMATED_COST_PER_IMAGE_USD,
  MAX_CANON_SHOTS,
  MAX_IMAGES_PER_RUN,
  MAX_SCENE_REFS,
  type AspectRatio,
  type CharacterDefinition,
  type CharacterShot,
  type Resolution,
  type ScenePreset,
} from '@/config/characters';
import type { CharacterClip } from '@/config/clips';
import CharacterOverlayEditor from '@/components/CharacterOverlayEditor';
import StagingSection from '@/components/StagingSection';
import PodcastRoom from '@/components/rooms/PodcastRoom';
import StudioSection from '@/components/StudioSection';
import VideoExtractor from '@/components/VideoExtractor';
import InstagramImporter from '@/components/InstagramImporter';
import VoiceStudio from '@/components/VoiceStudio';

const PRESET_GROUPS: ScenePreset['group'][] = ['Kadraj', 'Ortam', 'Aksiyon'];
const LORA_TRAINING_THRESHOLD = 15; // >=8 puanlı bu kadar kare → LoRA butonu aktif

/* ------------------------------------------------------------------ */
/* StepIndicator                                                        */
/* ------------------------------------------------------------------ */
type StepStatus = 'done' | 'active' | 'locked';

function StepIndicator({
  steps,
  activeStep,
}: {
  steps: { label: string; icon: React.ReactNode }[];
  activeStep: number;
}) {
  return (
    <div className="flex items-start gap-0 w-full overflow-x-auto pb-1">
      {steps.map((step, i) => {
        const status: StepStatus =
          i < activeStep ? 'done' : i === activeStep ? 'active' : 'locked';
        return (
          <div key={i} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  status === 'done'
                    ? 'bg-emerald-500 text-white'
                    : status === 'active'
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                      : 'bg-slate-100 text-slate-400'
                }`}
              >
                {status === 'done' ? <CheckCircle2 className="w-5 h-5" /> : step.icon}
              </div>
              <span
                className={`text-[10px] font-medium text-center leading-tight whitespace-nowrap ${
                  status === 'done'
                    ? 'text-emerald-600'
                    : status === 'active'
                      ? 'text-blue-700'
                      : 'text-slate-400'
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`h-0.5 flex-1 mx-2 mt-[-18px] rounded-full transition-all ${
                  i < activeStep ? 'bg-emerald-400' : 'bg-slate-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* SimilarityRating                                                     */
/* ------------------------------------------------------------------ */
function SimilarityRating({
  shotId,
  score,
  onChange,
}: {
  shotId: string;
  score: number | null;
  onChange: (score: number) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const display = hovered ?? score;

  const color = (n: number) => {
    if (n <= 3) return 'bg-red-500';
    if (n <= 6) return 'bg-amber-400';
    if (n <= 8) return 'bg-emerald-500';
    return 'bg-amber-400'; // gold-ish via amber
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onChange(n)}
            title={`${n}/10`}
            className={`h-2 flex-1 rounded-full transition-all ${
              display !== null && n <= display
                ? color(display)
                : 'bg-slate-200 hover:bg-slate-300'
            }`}
          />
        ))}
      </div>
      <p className="text-[10px] text-slate-400 text-center">
        {display !== null ? `Benzerlik: ${display}/10` : 'Puan ver →'}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* StepSection wrapper                                                  */
/* ------------------------------------------------------------------ */
function StepSection({
  step,
  title,
  subtitle,
  locked,
  lockedMsg,
  children,
}: {
  step: number;
  title: string;
  subtitle?: string;
  locked?: boolean;
  lockedMsg?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <section
      className={`rounded-2xl border shadow-sm overflow-hidden transition-all ${
        locked ? 'border-slate-200 bg-slate-50 opacity-70' : 'border-slate-200 bg-white'
      }`}
    >
      <button
        onClick={() => !locked && setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 text-left"
        disabled={locked}
      >
        <div className="flex items-center gap-3">
          <span
            className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 ${
              locked
                ? 'bg-slate-200 text-slate-400'
                : 'bg-blue-600 text-white'
            }`}
          >
            {step}
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {locked ? (
          <span className="text-xs text-slate-400 italic">{lockedMsg}</span>
        ) : (
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {!locked && open && <div className="px-6 pb-6 space-y-5">{children}</div>}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                       */
/* ------------------------------------------------------------------ */
type Props = {
  character: CharacterDefinition;
  initialShots: CharacterShot[];
  initialClips: CharacterClip[];
};

export default function CharacterRoomClient({ character, initialShots, initialClips }: Props) {
  const router = useRouter();
  const [shots, setShots] = useState<CharacterShot[]>(initialShots);
  const [clips, setClips] = useState<CharacterClip[]>(initialClips);
  const [presetIds, setPresetIds] = useState<string[]>([]);
  const [intent, setIntent] = useState('');
  const [rawPrompt, setRawPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio | ''>('');
  const [resolution, setResolution] = useState<Resolution>('1K');
  const [numImages, setNumImages] = useState(1);
  const [seed, setSeed] = useState('');
  const [allowSceneText, setAllowSceneText] = useState(false);
  const [sceneRefUrls, setSceneRefUrls] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busyShotId, setBusyShotId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [overlayShot, setOverlayShot] = useState<CharacterShot | null>(null);
  
  // Yeni Onboarding Akışı State'leri
  const [onboardingGenerating, setOnboardingGenerating] = useState(false);
  const [onboardingTwin, setOnboardingTwin] = useState<CharacterShot | null>(null);
  const [analyzingIdentity, setAnalyzingIdentity] = useState(false);
  const [isRetraining, setIsRetraining] = useState(false);
  const [showInstagramImporter, setShowInstagramImporter] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canonInputRef = useRef<HTMLInputElement>(null);

  /* Derived state */
  const selectedPresets = useMemo(
    () => presetIds.map((id) => character.scenePresets.find((p) => p.id === id)).filter(Boolean) as ScenePreset[],
    [character.scenePresets, presetIds],
  );
  const canonShots = useMemo(() => shots.filter((s) => s.is_canon), [shots]);
  const ratedShots = useMemo(() => shots.filter((s) => s.similarity_score !== null), [shots]);
  const highScoreShots = useMemo(() => shots.filter((s) => (s.similarity_score ?? 0) >= 8), [shots]);
  const effectiveAspect = aspectRatio || selectedPresets.find((p) => p.aspectRatio)?.aspectRatio || '4:5';

  const isPreset = character.id === 'saule' || character.id === 'beiwe';
  const hasCanonShot = isPreset || canonShots.length > 0;
  const hasStagedShots = shots.some((s) => !s.is_canon && s.created_at);
  const hasSuccessfulTwin = shots.some((s) => (s.similarity_score ?? 0) >= 9);
  const loraReady = highScoreShots.length >= LORA_TRAINING_THRESHOLD;
  
  // Hiç kanon (referans) yüklenmediyse onboarding (kamera+dosya) başlar
  // Veya kullanıcı manuel "yeniden eğit" dediyse.
  const needsOnboarding = !hasCanonShot || isRetraining;

  let activeStep = 0;
  if (needsOnboarding) {
    activeStep = 0;
  } else if (!hasSuccessfulTwin) {
    activeStep = 0;
  } else if (clips.length === 0) {
    activeStep = 1;
  } else {
    activeStep = 2;
  }

  /* Handlers */
  const handlePresetToggle = (preset: ScenePreset) => {
    setPresetIds((prev) => {
      const otherGroupPresets = prev.filter(
        (id) => character.scenePresets.find((p) => p.id === id)?.group !== preset.group,
      );
      if (prev.includes(preset.id)) return otherGroupPresets;
      return [...otherGroupPresets, preset.id];
    });
  };

  const generate = async () => {
    if (!intent.trim() && !rawPrompt.trim() && selectedPresets.length === 0) {
      setError('En az bir şablon seç ya da sahneyi tarif et.');
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/characters/${character.id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: intent.trim() || undefined,
          rawPrompt: rawPrompt.trim() || undefined,
          presetIds: presetIds.length > 0 ? presetIds : undefined,
          aspectRatio: aspectRatio || undefined,
          resolution,
          numImages,
          seed: seed.trim() ? Number(seed.trim()) : undefined,
          sceneRefUrls,
          allowSceneText,
        }),
      });

      let data;
      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch {
        console.error('Parse error. Response text:', text);
        throw new Error(`Sunucu Hatası (${res.status}): JSON bekleniyordu ama başka bir yanıt geldi.`);
      }

      if (!res.ok) throw new Error(data.error || 'Üretilemedi.');
      setShots((prev) => [...(data.shots as CharacterShot[]), ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Üretilemedi.');
    } finally {
      setGenerating(false);
    }
  };

  const uploadSceneRef = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/characters/scene-ref', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Yüklenemedi.');
      setSceneRefUrls((prev) => [...prev, data.url].slice(0, MAX_SCENE_REFS));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yüklenemedi.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleCanon = async (shot: CharacterShot) => {
    setBusyShotId(shot.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/characters/shots/${shot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCanon: !shot.is_canon }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Güncellenemedi.');
      setShots((prev) => prev.map((s) => (s.id === shot.id ? (data.shot as CharacterShot) : s)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Güncellenemedi.');
    } finally {
      setBusyShotId(null);
    }
  };

  const removeShot = async (shot: CharacterShot) => {
    if (!confirm('Bu kare kalıcı olarak silinsin mi?')) return;
    setBusyShotId(shot.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/characters/shots/${shot.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Silinemedi.');
      setShots((prev) => prev.filter((s) => s.id !== shot.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Silinemedi.');
    } finally {
      setBusyShotId(null);
    }
  };

  const rateSimilarity = useCallback(async (shot: CharacterShot, score: number) => {
    // Optimistic update
    setShots((prev) => prev.map((s) => (s.id === shot.id ? { ...s, similarity_score: score } : s)));
    try {
      const res = await fetch(`/api/admin/characters/shots/${shot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ similarityScore: score }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Revert on error
        setShots((prev) => prev.map((s) => (s.id === shot.id ? { ...s, similarity_score: shot.similarity_score } : s)));
        console.error('Puan kaydedilemedi:', data.error);
      } else {
        // Puan kaydedildikten sonra, eğer bu <9 bir puansa ve kullanıcının henüz hiç başarılı (>9) bir sahnesi yoksa
        // Demek ki yüklediği referans fotoğraf işe yaramadı. Baştan referans istemeliyiz.
        if (score < 9 && highScoreShots.length === 0) {
          setIsRetraining(true);
          alert('Bu referans fotoğrafla iyi sonuç alınamıyor gibi görünüyor. Lütfen farklı veya daha net bir fotoğraf yükleyip tekrar deneyin.');
        }
      }
    } catch {
      setShots((prev) => prev.map((s) => (s.id === shot.id ? { ...s, similarity_score: shot.similarity_score } : s)));
    }
  }, [highScoreShots.length, shots]);

  const handleOnboardingExtracted = async (files: File[]) => {
    setAnalyzingIdentity(true);
    setError(null);
    try {
      // 1. Resmi yükle
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/admin/characters/scene-ref', { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Resim yüklenemedi.');
        uploadedUrls.push(data.url);
      }

      if (uploadedUrls.length > 0) {
        await fetch(`/api/admin/characters/${character.id}/profile`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference_image_url: uploadedUrls[0] }),
        });
      }

      // 2. Yükleneni canon olarak kaydet
      const newShots: CharacterShot[] = [];
      for (const url of uploadedUrls) {
        const shotRes = await fetch('/api/admin/characters/shots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ characterId: character.id, imageUrl: url }),
        });
        const shotData = await shotRes.json();
        if (shotRes.ok && shotData.shot) newShots.push(shotData.shot);
      }
      setShots((prev) => [...newShots, ...prev]);
      
      // Onboarding tamamlandı, kullanıcı doğrudan Sahne Üret (Stüdyo) adımına geçer.
      setIsRetraining(false);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kurulum sırasında hata oluştu.');
    } finally {
      setAnalyzingIdentity(false);
    }
  };

  const handleOnboardingScore = async (score: number) => {
    if (!onboardingTwin) return;
    await rateSimilarity(onboardingTwin, score);
    
    if (score >= 9) {
      setIsRetraining(false);
      setOnboardingTwin(null);
      // Son yüklenen kanon fotoğrafının da score'unu güncelle ki lora eğitimi vs. için işe yarasın.
      const lastCanon = shots.find(s => s.is_canon);
      if (lastCanon) rateSimilarity(lastCanon, score);
    } else {
      setOnboardingTwin(null); // Tekrar file upload ekranına döndürür
    }
  };

  const clearReferenceImage = async () => {
    if (!confirm('Referans görseli silmek istediğinize emin misiniz?')) return;
    setAnalyzingIdentity(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/characters/${character.id}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference_image_url: null }),
      });
      if (!res.ok) throw new Error('Görsel silinemedi.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Silinemedi.');
    } finally {
      setAnalyzingIdentity(false);
    }
  };

  /* Card border style */
  const cardBorder = (shot: CharacterShot) => {
    if (shot.is_canon) return 'border-blue-500 ring-1 ring-blue-500';
    const sc = shot.similarity_score;
    if (!sc) return 'border-slate-200';
    if (sc >= 9) return 'border-amber-400 ring-1 ring-amber-300';
    if (sc >= 7) return 'border-emerald-400 ring-1 ring-emerald-200';
    if (sc <= 3) return 'border-red-300';
    return 'border-slate-200';
  };

  const cardOpacity = (shot: CharacterShot) => {
    if (shot.similarity_score !== null && shot.similarity_score <= 3) return 'opacity-60';
    return '';
  };

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */
  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6 items-start">
          {/* Karakter kartı */}
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-bold text-slate-900">{character.name}</h1>
              <p className="text-xs text-slate-500">{character.role}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Kimlik kilitli
                </span>
                <span>Kanon: <strong className="text-slate-800">{canonShots.length}/{MAX_CANON_SHOTS}</strong></span>
                <span>Puan: <strong className="text-slate-800">{ratedShots.length}/{shots.length}</strong></span>
                {!needsOnboarding && (
                  <button 
                    onClick={() => setIsRetraining(true)}
                    className="ml-2 text-blue-600 hover:underline flex items-center gap-1"
                  >
                    Yüzü Yeniden Tanıt
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Step indicator */}
          <StepIndicator
            activeStep={activeStep}
            steps={[
              { label: 'Stüdyo', icon: <span className="text-[11px]">1</span> },
              { label: 'Ses & Klonla', icon: <Mic className="w-3.5 h-3.5" /> },
              { label: 'Video Üret', icon: <Zap className="w-3.5 h-3.5" /> },
              { label: 'Post Production', icon: <span className="text-[11px]">4</span> },
            ]}
          />
        </div>

        {/* LoRA progress */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
              <Brain className="w-3.5 h-3.5 text-purple-500" />
              LoRA Eğitim Hazırlığı
            </div>
            <span className="text-xs text-slate-500">
              {highScoreShots.length} / {LORA_TRAINING_THRESHOLD} yüksek puanlı kare
            </span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full transition-all"
              style={{ width: `${Math.min(100, (highScoreShots.length / LORA_TRAINING_THRESHOLD) * 100)}%` }}
            />
          </div>
          {loraReady && (
            <div className="mt-2">
              <button className="flex items-center gap-2 bg-purple-600 text-white rounded-lg px-4 py-2 text-xs font-semibold hover:bg-purple-700">
                <Brain className="w-3.5 h-3.5" />
                LoRA Eğitimini Başlat — Sprint 2&apos;de aktif
              </button>
            </div>
          )}
          {!loraReady && (
            <div className="flex items-center justify-between mt-2">
              <p className="text-[10px] text-slate-400">
                Galerideki karelere puan vererek LoRA eğitim verisini oluştur. ≥8 puan alan kareler eğitimde kullanılır.
              </p>
              <div className="flex gap-2">
                <button 
                  onClick={() => canonInputRef.current?.click()}
                  disabled={analyzingIdentity}
                  className="text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {analyzingIdentity ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  Cihazdan Yükle
                </button>
                <button 
                  onClick={() => setShowInstagramImporter(true)}
                  className="text-xs font-semibold text-pink-600 bg-pink-50 hover:bg-pink-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  Instagram'dan Aktar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Hidden input for Canon Photos */}
      <input
        ref={canonInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length > 0) handleOnboardingExtracted(files);
        }}
      />
      
      {/* Instagram Importer Modal */}
      {showInstagramImporter && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl">
            <InstagramImporter
              characterId={character.id}
              onCancel={() => setShowInstagramImporter(false)}
              onImportComplete={(newShots) => {
                setShots(prev => [...newShots, ...prev]);
                setShowInstagramImporter(false);
              }}
            />
          </div>
        </div>
      )}

      {/* ─── ADIM 0: Onboarding ──────────────────────────────── */}
      {needsOnboarding && (
        <div className="relative">
          {isRetraining && canonShots.length > 0 && (
            <button 
              onClick={() => setIsRetraining(false)}
              className="absolute -top-10 right-0 text-xs text-slate-500 hover:text-slate-900 z-10"
            >
              İptal et
            </button>
          )}

          <div className="block">
            <VideoExtractor onExtracted={handleOnboardingExtracted} isProcessing={analyzingIdentity} />
          </div>
        </div>
      )}

      {/* ─── ADIM 1: Stüdyo (Sahne Üret) ──────────────────────────────── */}
      {!needsOnboarding && (
        <StepSection
          step={1}
          title="Stüdyo (Sahne Üret)"
          subtitle="Kanon fotoğrafınızı kullanarak sahneler üretin ve puanlayın"
        >
        {/* Preset seçimi */}
        <div className="space-y-3">
          {PRESET_GROUPS.map((group) => (
            <div key={group}>
              <p className="text-xs font-medium text-slate-500 mb-1.5">{group}</p>
              <div className="flex flex-wrap gap-1.5">
                {character.scenePresets
                  .filter((p) => p.group === group)
                  .map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handlePresetToggle(p)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        presetIds.includes(p.id)
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Sahneyi tarif et (Türkçe)</label>
          <textarea
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            rows={2}
            placeholder="Kafede laptopta çalışıyor, akşam ışığı, kameraya bakmıyor."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Sahne referansı */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Sahne referansı <span className="font-normal text-slate-400">(opsiyonel, en fazla {MAX_SCENE_REFS})</span>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {sceneRefUrls.map((url) => (
              <div key={url} className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => setSceneRefUrls((prev) => prev.filter((u) => u !== url))}
                  className="absolute top-0.5 right-0.5 bg-slate-900/70 text-white rounded p-0.5"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
            {sceneRefUrls.length < MAX_SCENE_REFS && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-14 h-14 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:border-slate-400 disabled:opacity-50"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadSceneRef(file);
              }}
            />
          </div>
        </div>

        {/* Gelişmiş */}
        <div className="border-t border-slate-100 pt-3">
          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            Gelişmiş seçenekler
          </button>

          {showAdvanced && (
            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Ham prompt (İngilizce)</label>
                <textarea
                  value={rawPrompt}
                  onChange={(e) => setRawPrompt(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">En-boy</label>
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value as AspectRatio | '')}
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                  >
                    <option value="">Şablondan ({effectiveAspect})</option>
                    {ASPECT_RATIOS.map((a) => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Çözünürlük</label>
                  <select
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value as Resolution)}
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                  >
                    <option value="1K">1K</option>
                    <option value="2K">2K</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Adet</label>
                  <select
                    value={numImages}
                    onChange={(e) => setNumImages(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                  >
                    {Array.from({ length: MAX_IMAGES_PER_RUN }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Seed</label>
                  <input
                    value={seed}
                    onChange={(e) => setSeed(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="rastgele"
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                  />
                </div>
              </div>
              <label className="flex items-start gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={allowSceneText}
                  onChange={(e) => setAllowSceneText(e.target.checked)}
                  className="rounded border-slate-300 mt-0.5"
                />
                Sahnede fiziksel yazıya izin ver (tabela, kupa, tişört)
              </label>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-3">
          <button
            onClick={generate}
            disabled={generating}
            className="flex items-center gap-2 bg-blue-600 text-white rounded-lg px-5 py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generating ? 'Üretiliyor…' : 'Twin Üret'}
          </button>
          <span className="text-xs text-slate-400">
            ~${(ESTIMATED_COST_PER_IMAGE_USD * numImages).toFixed(2)} · 1-2 dk
          </span>
        </div>

        {/* Galeri */}
        {shots.length > 0 && (
          <div className="border-t border-slate-100 pt-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-800">
                Galeri <span className="text-slate-400 font-normal">({shots.length} kare)</span>
              </h3>
              <p className="text-xs text-slate-400">Puanla → kanon sabitle → Adım 2&apos;ye geç</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {shots.map((shot) => (
                <div
                  key={shot.id}
                  className={`rounded-xl overflow-hidden border transition-all ${cardBorder(shot)} ${cardOpacity(shot)}`}
                >
                  <div className="relative bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={shot.image_url} alt="" className="w-full block" />
                    {shot.is_canon && (
                      <span className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        KANON
                      </span>
                    )}
                    {shot.similarity_score !== null && shot.similarity_score >= 9 && (
                      <span className="absolute top-2 right-2 text-base" title="Çok yüksek benzerlik">✨</span>
                    )}
                  </div>

                  <div className="p-2.5 space-y-2">
                    {/* Puan widget */}
                    <SimilarityRating
                      shotId={shot.id}
                      score={shot.similarity_score ?? null}
                      onChange={(score) => rateSimilarity(shot, score)}
                    />

                    {/* Eylemler */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setOverlayShot(shot)}
                        className="flex-1 flex items-center justify-center gap-1 bg-slate-900 text-white rounded-lg px-2 py-1.5 text-xs font-medium hover:bg-slate-800"
                      >
                        <Type className="w-3 h-3" />
                        Metin
                      </button>
                      <a
                        href={shot.image_url}
                        download={`${character.id}-${shot.id.slice(0, 8)}.png`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-slate-500 hover:text-slate-900 bg-slate-100 rounded-lg hover:bg-slate-200"
                        title="İndir"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => toggleCanon(shot)}
                        disabled={busyShotId === shot.id}
                        className="p-1.5 rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                        title={shot.is_canon ? 'Kanon işaretini kaldır' : 'Kanon referans yap'}
                      >
                        {busyShotId === shot.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : shot.is_canon ? (
                          <PinOff className="w-3.5 h-3.5" />
                        ) : (
                          <Pin className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => removeShot(shot)}
                        disabled={busyShotId === shot.id}
                        className="p-1.5 rounded-lg border border-slate-300 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        title="Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {shot.user_intent && (
                      <button
                        onClick={() => {
                          setIntent(shot.user_intent || '');
                          setPresetIds(shot.preset_id ? shot.preset_id.split(',') : []);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="w-full text-[10px] text-slate-400 hover:text-slate-600 text-left truncate"
                      >
                        ↺ Tarifi tekrar kullan
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </StepSection>
      )}

      {/* ─── ADIM 2: Ses Stüdyosu ────────────────────────── */}
      <StepSection
        step={2}
        title="Ses Stüdyosu"
        subtitle="Referans sesinizi yükleyin ve AI Twin'inizin sesini test edin"
        locked={!hasSuccessfulTwin}
        lockedMsg="Önce en az 9 puanlık bir AI Twin üretin"
      >
        <VoiceStudio characterId={character.id} initialVoiceUrl={character.voiceUrl} />
      </StepSection>

      {/* ─── ADIM 3: Podcast Room (performans aktarımı) ─────────── */}
      <StepSection
        step={3}
        title="Podcast Room"
        subtitle="Kanon twin'e kendi performansını (wan-motion) giydir"
        locked={!hasSuccessfulTwin}
        lockedMsg="Önce en az 9 puanlık bir AI Twin üretin"
      >
        <PodcastRoom
          characterId={character.id}
          shots={shots}
          clips={clips}
          onClipCreated={(newClip: CharacterClip) => setClips((prev) => [newClip, ...prev])}
          onClipDeleted={(clipId: string) => setClips((prev) => prev.filter((c) => c.id !== clipId))}
        />
      </StepSection>

      {/* ─── ADIM 4: Post Production ───────────────────────────── */}
      <StepSection
        step={4}
        title="Post Production & Metin Ekleme"
        subtitle="Sahnelere şık metin katmanları, başlıklar ve logolar ekle"
        locked={shots.length === 0}
        lockedMsg="Önce galeride bir görsel oluştur"
      >
        <StudioSection
          characterId={character.id}
          clips={clips}
          onClipUploaded={(clip: CharacterClip) => setClips((prev) => [clip, ...prev])}
        />
      </StepSection>

      {/* Overlay Editor */}
      {overlayShot && (
        <CharacterOverlayEditor
          shot={overlayShot}
          onClose={() => setOverlayShot(null)}
          onSaved={(saved) => {
            setShots((prev) => prev.map((s) => (s.id === saved.id ? saved : s)));
            setOverlayShot(saved);
          }}
        />
      )}
    </div>
  );
}
