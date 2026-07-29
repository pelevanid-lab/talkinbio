'use client';

import { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  Clapperboard,
  Loader2,
  Mic,
  Sparkles,
  Trash2,
  Type,
  Upload,
  Video,
} from 'lucide-react';
import {
  ASPECT_RATIOS,
  ESTIMATED_COST_PER_IMAGE_USD,
  MAX_IMAGES_PER_RUN,
  type AspectRatio,
  type CharacterDefinition,
  type CharacterMotion,
  type CharacterShot,
  type Resolution,
  type ScenePreset,
} from '@/config/characters';
import type { CharacterClip } from '@/config/clips';
import {
  DEFAULT_MOTION_MODEL_ID,
  MOTION_AUDIO_EXTENSIONS,
  MOTION_MODELS,
  findMotionModel,
  motionAudioMime,
  motionMaxSeconds,
  motionResolutions,
  type MotionResolution,
} from '@/config/motionModels';
import { PODCAST_SCENE_LIKE_THRESHOLD, PODCAST_VIDEO_MODES, type PodcastVideoMode } from '@/config/beiweLab';
import LabStage, { type StageState } from '@/components/beiwe-lab/LabStage';
import SimilarityRating from '@/components/beiwe-lab/SimilarityRating';
import PodcastRoom from '@/components/rooms/PodcastRoom';
import { readMediaDuration } from '@/utils/readMediaDuration';

const PRESET_GROUPS: ScenePreset['group'][] = ['Kadraj', 'Ortam', 'Aksiyon'];

/* ------------------------------------------------------------------ */
/* Ortak: model + çözünürlük + turbo seçici (iki OmniHuman formu da kullanıyor) */
/* ------------------------------------------------------------------ */
function MotionModelPicker({
  modelId,
  onModelChange,
  resolution,
  onResolutionChange,
  turbo,
  onTurboChange,
}: {
  modelId: string;
  onModelChange: (id: string) => void;
  resolution: MotionResolution;
  onResolutionChange: (r: MotionResolution) => void;
  turbo: boolean;
  onTurboChange: (v: boolean) => void;
}) {
  const model = findMotionModel(modelId) ?? MOTION_MODELS[0];
  const resolutionOptions = motionResolutions(model);
  const activeResolution = resolutionOptions.includes(resolution) ? resolution : resolutionOptions[0];

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        {MOTION_MODELS.map((m) => (
          <button
            key={m.id}
            onClick={() => onModelChange(m.id)}
            className={`w-full text-left rounded-xl border px-3 py-2 transition-colors ${
              model.id === m.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold text-slate-900">{m.label}</span>
              <span className="text-xs text-slate-500 whitespace-nowrap">
                ${m.costPerSecondUsd.toFixed(4).replace(/0+$/, '')}/sn
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{m.hint}</p>
          </button>
        ))}
      </div>

      {(resolutionOptions.length > 1 || model.supportsTurbo) && (
        <div className="flex flex-wrap items-center gap-3">
          {resolutionOptions.length > 1 &&
            resolutionOptions.map((res) => (
              <button
                key={res}
                onClick={() => onResolutionChange(res)}
                className={`px-3 py-1.5 rounded-full border text-xs transition-colors ${
                  activeResolution === res
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
                }`}
              >
                {res} <span className="opacity-70">· {motionMaxSeconds(model, res)}s</span>
              </button>
            ))}
          {model.supportsTurbo && (
            <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
              <input
                type="checkbox"
                checked={turbo}
                onChange={(e) => onTurboChange(e.target.checked)}
                className="rounded border-slate-300"
              />
              Hızlı mod
            </label>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ortak: sahne seçici grid (liked shots) */
/* ------------------------------------------------------------------ */
function ShotPicker({
  shots,
  selected,
  onSelect,
}: {
  shots: CharacterShot[];
  selected: CharacterShot | null;
  onSelect: (shot: CharacterShot) => void;
}) {
  if (shots.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Henüz beğenilen (≥{PODCAST_SCENE_LIKE_THRESHOLD} puan) bir sahne yok.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-64 overflow-y-auto pr-1">
      {shots.map((shot) => (
        <button
          key={shot.id}
          onClick={() => onSelect(shot)}
          className={`relative rounded-lg overflow-hidden border-2 transition-all ${
            selected?.id === shot.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent hover:border-slate-300'
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={shot.image_url} alt="" className="w-full h-auto block" />
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */

type Props = {
  characterId: string;
  character: CharacterDefinition;
  hasIdentity: boolean;
  initialShots: CharacterShot[];
  /** Sunucudan zaten `room: 'podcast'` filtrelenmiş geliyor. */
  initialClips: CharacterClip[];
  initialMotions: CharacterMotion[];
  minimaxVoiceId: string | null;
  minimaxVoiceStatus: string;
};

export default function BeiwePodcastClient({
  characterId,
  character,
  hasIdentity,
  initialShots,
  initialClips,
  initialMotions,
  minimaxVoiceId,
  minimaxVoiceStatus,
}: Props) {
  const [shots, setShots] = useState<CharacterShot[]>(initialShots);
  const [clips, setClips] = useState<CharacterClip[]>(initialClips);
  const [motions, setMotions] = useState<CharacterMotion[]>(initialMotions);
  const [error, setError] = useState<string | null>(null);

  /* ---------------- aşama 1: sahne üret & beğen ---------------- */
  const [presetIds, setPresetIds] = useState<string[]>([]);
  const [intent, setIntent] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio | ''>('');
  const [resolution, setResolution] = useState<Resolution>('1K');
  const [numImages, setNumImages] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [generatingScene, setGeneratingScene] = useState(false);
  const [busyShotId, setBusyShotId] = useState<string | null>(null);

  const selectedPresets = useMemo(
    () => presetIds.map((id) => character.scenePresets.find((p) => p.id === id)).filter(Boolean) as ScenePreset[],
    [character.scenePresets, presetIds],
  );
  const effectiveAspect = aspectRatio || selectedPresets.find((p) => p.aspectRatio)?.aspectRatio || '4:5';

  // Hem AI-üretimi sahneler hem Twin'e yüklenen gerçek referans fotoğraflar burada —
  // ikisi de videoya dönüştürülebilecek eşit derecede geçerli malzeme (bir gerçek
  // fotoğraf, "gerçek bir ortamda çekilmiş sahne"den farksız). Yalnızca "Sahne Üret"
  // GEÇMİŞİ (ne zaman ne ürettim listesi) referans yüklemelerini içermiyor — onlar
  // burada üretilmedi, Twin'in "Yüzü Tanıt" aşamasında yüklendi.
  const sceneShots = useMemo(() => shots, [shots]);
  const uploadedShots = useMemo(() => shots.filter((s) => s.model === 'user-upload'), [shots]);
  const likedShots = useMemo(
    () => sceneShots.filter((s) => (s.similarity_score ?? 0) >= PODCAST_SCENE_LIKE_THRESHOLD),
    [sceneShots],
  );

  const handlePresetToggle = (preset: ScenePreset) => {
    setPresetIds((prev) => {
      const otherGroupPresets = prev.filter(
        (id) => character.scenePresets.find((p) => p.id === id)?.group !== preset.group,
      );
      if (prev.includes(preset.id)) return otherGroupPresets;
      return [...otherGroupPresets, preset.id];
    });
  };

  const generateScene = async () => {
    if (!intent.trim() && presetIds.length === 0) {
      setError('En az bir şablon seç ya da sahneyi tarif et.');
      return;
    }
    setGeneratingScene(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/characters/${characterId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: intent.trim() || undefined,
          presetIds: presetIds.length > 0 ? presetIds : undefined,
          aspectRatio: aspectRatio || undefined,
          resolution,
          numImages,
        }),
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Sunucu hatası (${res.status}): JSON beklenirken başka bir yanıt geldi.`);
      }
      if (!res.ok) throw new Error(data.error || 'Üretilemedi.');
      setShots((prev) => [...(data.shots as CharacterShot[]), ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Üretilemedi.');
    } finally {
      setGeneratingScene(false);
    }
  };

  const rateShot = async (shot: CharacterShot, score: number) => {
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
      setShots((prev) => prev.map((s) => (s.id === shot.id ? { ...s, similarity_score: previous } : s)));
      setError('Puan kaydedilemedi.');
    }
  };

  const removeShot = async (shot: CharacterShot) => {
    // Kanon referans fotoğraflar Beiwe Twin'in kimlik kaynağı — bunlar silinirse
    // (özellikle hepsi silinirse) yeni sahne üretimi kimlik referansı bulamayıp
    // reddediyor (bkz. /generate route'undaki "kanon fotoğraf bulunamadı" hatası).
    const warning = shot.is_canon
      ? 'Bu, Beiwe Twin\'in kimlik referanslarından biri — silmek yeni sahne/video üretimini etkileyebilir. '
      : '';
    if (!confirm(`${warning}Bu kare kalıcı olarak silinsin mi?`)) return;
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

  /* ---------------- aşama 2: video türü seç ---------------- */
  const [videoMode, setVideoMode] = useState<PodcastVideoMode>('video-to-video');

  // Metin ile (OmniHuman)
  const [omniTextShot, setOmniTextShot] = useState<CharacterShot | null>(null);
  const [omniText, setOmniText] = useState('');
  const [omniTextModelId, setOmniTextModelId] = useState(DEFAULT_MOTION_MODEL_ID);
  const [omniTextResolution, setOmniTextResolution] = useState<MotionResolution>('1080p');
  const [omniTextTurbo, setOmniTextTurbo] = useState(false);
  const [omniTextPrompt, setOmniTextPrompt] = useState('');
  const [generatingOmniText, setGeneratingOmniText] = useState<'voice' | 'motion' | null>(null);

  // Sesle (OmniHuman)
  const [omniVoiceShot, setOmniVoiceShot] = useState<CharacterShot | null>(null);
  const [omniAudioFile, setOmniAudioFile] = useState<File | null>(null);
  const [omniAudioSeconds, setOmniAudioSeconds] = useState<number | null>(null);
  const [omniVoiceModelId, setOmniVoiceModelId] = useState(DEFAULT_MOTION_MODEL_ID);
  const [omniVoiceResolution, setOmniVoiceResolution] = useState<MotionResolution>('1080p');
  const [omniVoiceTurbo, setOmniVoiceTurbo] = useState(false);
  const [omniVoicePrompt, setOmniVoicePrompt] = useState('');
  const [generatingOmniVoice, setGeneratingOmniVoice] = useState(false);
  const omniAudioInputRef = useRef<HTMLInputElement>(null);

  const voiceReady = Boolean(minimaxVoiceId) && minimaxVoiceStatus === 'active';

  const generateOmniTextVideo = async () => {
    if (!omniTextShot) return setError('Önce bir sahne seç.');
    if (!omniText.trim()) return setError('Seslendirilecek metni yaz.');
    if (!voiceReady) return setError('Önce Beiwe Voice\'ta sesini klonla ve doğrula.');

    setError(null);
    try {
      setGeneratingOmniText('voice');
      const speakRes = await fetch(`/api/admin/characters/${characterId}/minimax-voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'speak', text: omniText.trim() }),
      });
      const speakData = await speakRes.json();
      if (!speakRes.ok) throw new Error(speakData.error || 'Ses üretilemedi.');

      setGeneratingOmniText('motion');
      const formData = new FormData();
      formData.append('audioUrl', speakData.audioUrl);
      formData.append('enhanceAudio', 'false'); // MiniMax çıktısı zaten temiz
      formData.append('sourceImageUrl', omniTextShot.image_url);
      formData.append('model', omniTextModelId);
      formData.append('resolution', omniTextResolution);
      formData.append('turboMode', String(omniTextTurbo));
      formData.append('inputMode', 'text');
      if (omniTextPrompt.trim()) formData.append('prompt', omniTextPrompt.trim());

      const motionRes = await fetch(`/api/admin/characters/${characterId}/motion`, {
        method: 'POST',
        body: formData,
      });
      const motionData = await motionRes.json();
      if (!motionRes.ok) throw new Error(motionData.error || 'Video üretilemedi.');
      setMotions((prev) => [motionData.motion as CharacterMotion, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Üretilemedi.');
    } finally {
      setGeneratingOmniText(null);
    }
  };

  const handleOmniAudioPicked = async (file: File | null) => {
    setOmniAudioFile(file);
    setOmniAudioSeconds(null);
    if (file) setOmniAudioSeconds(await readMediaDuration(file));
  };

  const generateOmniVoiceVideo = async () => {
    if (!omniVoiceShot) return setError('Önce bir sahne seç.');
    if (!omniAudioFile) return setError('Bir ses dosyası yükle.');

    setError(null);
    setGeneratingOmniVoice(true);
    try {
      const formData = new FormData();
      formData.append('audio', omniAudioFile);
      formData.append('enhanceAudio', 'true');
      if (omniAudioSeconds !== null) formData.append('audioSeconds', String(omniAudioSeconds));
      formData.append('sourceImageUrl', omniVoiceShot.image_url);
      formData.append('model', omniVoiceModelId);
      formData.append('resolution', omniVoiceResolution);
      formData.append('turboMode', String(omniVoiceTurbo));
      formData.append('inputMode', 'voice');
      if (omniVoicePrompt.trim()) formData.append('prompt', omniVoicePrompt.trim());

      const res = await fetch(`/api/admin/characters/${characterId}/motion`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Video üretilemedi.');
      setMotions((prev) => [data.motion as CharacterMotion, ...prev]);
      setOmniAudioFile(null);
      setOmniAudioSeconds(null);
      if (omniAudioInputRef.current) omniAudioInputRef.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Üretilemedi.');
    } finally {
      setGeneratingOmniVoice(false);
    }
  };

  const deleteMotion = async (motion: CharacterMotion) => {
    if (!confirm('Bu video kalıcı olarak silinsin mi?')) return;
    try {
      const res = await fetch(`/api/admin/characters/${characterId}/motion/${motion.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setMotions((prev) => prev.filter((m) => m.id !== motion.id));
    } catch {
      setError('Video silinemedi.');
    }
  };

  /* ---------------- render ---------------- */
  const stage1State: StageState = hasIdentity ? 'open' : 'locked';
  const stage2State: StageState = likedShots.length > 0 ? 'open' : 'locked';

  const activeMode = PODCAST_VIDEO_MODES.find((m) => m.id === videoMode)!;
  const modeIcon: Record<PodcastVideoMode, React.ReactNode> = {
    'video-to-video': <Video className="w-4 h-4" />,
    'text-to-video': <Type className="w-4 h-4" />,
    'voice-to-video': <Mic className="w-4 h-4" />,
  };

  const textMotions = motions.filter((m) => m.input_mode === 'text');
  const voiceMotions = motions.filter((m) => m.input_mode === 'voice');

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-4 flex items-center gap-4">
        <div className="w-11 h-11 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
          <Clapperboard className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{character.name}</p>
          <p className="text-xs text-slate-500">
            {sceneShots.length} sahne · {likedShots.length} beğenilen · {clips.length + motions.length} video
          </p>
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

      {/* ─── Aşama 1: Sahne Üret & Beğen ─────────────────── */}
      <LabStage
        index={1}
        title="Sahne Üret & Beğen"
        question="Hangi sahneler videoya değer?"
        state={stage1State}
        lockedMsg="Önce Beiwe Twin'de yüzünü tanıt"
      >
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

        <div className="border-t border-slate-100 pt-3">
          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            Gelişmiş seçenekler
          </button>
          {showAdvanced && (
            <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
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
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={generateScene}
            disabled={generatingScene}
            className="flex items-center gap-2 bg-blue-600 text-white rounded-lg px-5 py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {generatingScene ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generatingScene ? 'Üretiliyor…' : 'Sahne Üret'}
          </button>
          <span className="text-xs text-slate-400">
            ~${(ESTIMATED_COST_PER_IMAGE_USD * numImages).toFixed(2)} · 1-2 dk
          </span>
        </div>

        {sceneShots.length > 0 && (
          <div className="border-t border-slate-100 pt-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">
              Galeri{' '}
              <span className="text-slate-400 font-normal">
                ({sceneShots.length} kare — {uploadedShots.length} referans fotoğraf dahil)
              </span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {sceneShots.map((shot) => {
                const liked = (shot.similarity_score ?? 0) >= PODCAST_SCENE_LIKE_THRESHOLD;
                const isUpload = shot.model === 'user-upload';
                return (
                  <div
                    key={shot.id}
                    className={`relative rounded-xl overflow-hidden border transition-all ${
                      liked ? 'border-emerald-400 ring-1 ring-emerald-200' : 'border-slate-200'
                    }`}
                  >
                    {isUpload && (
                      <span className="absolute top-2 left-2 z-10 bg-slate-900/80 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        REFERANS
                      </span>
                    )}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={shot.image_url} alt="" className="w-full block bg-slate-100" />
                    <div className="p-2.5 space-y-2">
                      <SimilarityRating
                        score={shot.similarity_score ?? null}
                        onChange={(score) => rateShot(shot, score)}
                        getColor={(n) => (n >= PODCAST_SCENE_LIKE_THRESHOLD ? 'bg-emerald-500' : 'bg-slate-400')}
                        getCaption={(display) =>
                          display === null
                            ? 'Bu sahneyi ne kadar beğendin?'
                            : display >= PODCAST_SCENE_LIKE_THRESHOLD
                              ? `${display}/10 · video için uygun`
                              : `${display}/10 · video için önerilmez`
                        }
                      />
                      <button
                        onClick={() => removeShot(shot)}
                        disabled={busyShotId === shot.id}
                        className="w-full flex items-center justify-center gap-1 rounded-lg border border-slate-200 py-1.5 text-xs text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 disabled:opacity-50"
                      >
                        {busyShotId === shot.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        Sil
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </LabStage>

      {/* ─── Aşama 2: Video Türü Seç ─────────────────────── */}
      <LabStage
        index={2}
        title="Video Türü Seç"
        question="Bu beğenilen sahneden nasıl video çıksın?"
        state={stage2State}
        lockedMsg={`Önce en az bir sahneyi beğen (≥${PODCAST_SCENE_LIKE_THRESHOLD})`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PODCAST_VIDEO_MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setVideoMode(mode.id)}
              className={`text-left rounded-xl border p-4 transition-colors ${
                videoMode === mode.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1 text-slate-900">
                {modeIcon[mode.id]}
                <span className="text-sm font-semibold">{mode.label}</span>
              </div>
              <p className="text-xs text-slate-500 leading-snug">{mode.hint}</p>
            </button>
          ))}
        </div>

        {activeMode.caveat && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{activeMode.caveat}</span>
          </div>
        )}

        {/* ---- Video ile (Wan Motion) — mevcut PodcastRoom bileşeni aynen kullanılıyor ---- */}
        {videoMode === 'video-to-video' && (
          <div className="-mx-6">
            <PodcastRoom
              characterId={characterId}
              shots={sceneShots}
              clips={clips}
              onClipCreated={(clip) => setClips((prev) => [clip, ...prev])}
              onClipDeleted={(clipId) => setClips((prev) => prev.filter((c) => c.id !== clipId))}
            />
          </div>
        )}

        {/* ---- Metin ile (OmniHuman) ---- */}
        {videoMode === 'text-to-video' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 border-t border-slate-100 pt-5">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">1. Sahne seç</h3>
                <ShotPicker shots={likedShots} selected={omniTextShot} onSelect={setOmniTextShot} />
              </div>

              {!voiceReady && (
                <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-400" />
                  <span>Önce Beiwe Voice&apos;ta sesini klonla ve doğrula — bu metin, o klonla seslendirilecek.</span>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">2. Metin</h3>
                <textarea
                  value={omniText}
                  onChange={(e) => setOmniText(e.target.value)}
                  rows={3}
                  placeholder="Karakterin videoda ne söylemesini istiyorsun?"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">3. Model</h3>
                <MotionModelPicker
                  modelId={omniTextModelId}
                  onModelChange={setOmniTextModelId}
                  resolution={omniTextResolution}
                  onResolutionChange={setOmniTextResolution}
                  turbo={omniTextTurbo}
                  onTurboChange={setOmniTextTurbo}
                />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">
                  4. Yönlendirme <span className="font-normal text-slate-500">(opsiyonel)</span>
                </h3>
                <textarea
                  value={omniTextPrompt}
                  onChange={(e) => setOmniTextPrompt(e.target.value)}
                  rows={2}
                  maxLength={600}
                  placeholder="Sakin ve güven veren bir tonda kameraya konuşuyor."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={generateOmniTextVideo}
                disabled={generatingOmniText !== null || !omniTextShot || !omniText.trim() || !voiceReady}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {generatingOmniText ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {generatingOmniText === 'voice'
                  ? 'Seslendiriliyor…'
                  : generatingOmniText === 'motion'
                    ? 'Video üretiliyor…'
                    : 'Video Üret'}
              </button>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">
                Üretilen videolar <span className="text-slate-400 font-normal">({textMotions.length})</span>
              </h3>
              {textMotions.length === 0 ? (
                <div className="flex items-center justify-center h-[200px] bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-sm text-slate-500">Henüz video üretilmedi.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {textMotions.map((motion) => (
                    <div key={motion.id} className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                      <video src={motion.video_url} controls className="w-full max-h-[260px] object-contain bg-black" />
                      <div className="p-2 flex justify-between items-center">
                        <span className="text-[10px] text-slate-500">
                          {new Date(motion.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
                        </span>
                        <button
                          onClick={() => deleteMotion(motion)}
                          className="p-1 rounded border border-slate-300 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---- Sesle (OmniHuman) ---- */}
        {videoMode === 'voice-to-video' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 border-t border-slate-100 pt-5">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">1. Sahne seç</h3>
                <ShotPicker shots={likedShots} selected={omniVoiceShot} onSelect={setOmniVoiceShot} />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">2. Ses dosyası</h3>
                <input
                  ref={omniAudioInputRef}
                  type="file"
                  accept={MOTION_AUDIO_EXTENSIONS.map((e) => `.${e}`).join(',')}
                  onChange={(e) => handleOmniAudioPicked(e.target.files?.[0] || null)}
                  className="hidden"
                  id="omni-voice-upload"
                />
                <label
                  htmlFor="omni-voice-upload"
                  className="flex items-center justify-center gap-2 w-full py-4 px-4 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 hover:border-blue-400 transition-colors"
                >
                  <Upload className="w-5 h-5 text-slate-400" />
                  <span className="text-sm font-medium text-slate-600">
                    {omniAudioFile ? omniAudioFile.name : 'Ses dosyası seç (veya sürükle)'}
                  </span>
                </label>
                {omniAudioFile && (
                  <p className="text-xs text-slate-500 mt-1">
                    {(omniAudioFile.size / 1024 / 1024).toFixed(2)} MB
                    {omniAudioSeconds !== null && <> · {omniAudioSeconds.toFixed(1)} sn</>}
                    {' · '}otomatik pürüzsüzleştirilecek
                  </p>
                )}
                {omniAudioFile && !motionAudioMime(omniAudioFile.name) && (
                  <p className="text-xs text-red-600 mt-1">
                    Desteklenmiyor — kabul edilenler: {MOTION_AUDIO_EXTENSIONS.map((e) => e.toUpperCase()).join(', ')}.
                  </p>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">3. Model</h3>
                <MotionModelPicker
                  modelId={omniVoiceModelId}
                  onModelChange={setOmniVoiceModelId}
                  resolution={omniVoiceResolution}
                  onResolutionChange={setOmniVoiceResolution}
                  turbo={omniVoiceTurbo}
                  onTurboChange={setOmniVoiceTurbo}
                />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">
                  4. Yönlendirme <span className="font-normal text-slate-500">(opsiyonel)</span>
                </h3>
                <textarea
                  value={omniVoicePrompt}
                  onChange={(e) => setOmniVoicePrompt(e.target.value)}
                  rows={2}
                  maxLength={600}
                  placeholder="Sakin ve güven veren bir tonda, ellerini ölçülü kullanıyor."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={generateOmniVoiceVideo}
                disabled={generatingOmniVoice || !omniVoiceShot || !omniAudioFile}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {generatingOmniVoice ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {generatingOmniVoice ? 'Video üretiliyor…' : 'Video Üret'}
              </button>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">
                Üretilen videolar <span className="text-slate-400 font-normal">({voiceMotions.length})</span>
              </h3>
              {voiceMotions.length === 0 ? (
                <div className="flex items-center justify-center h-[200px] bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-sm text-slate-500">Henüz video üretilmedi.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {voiceMotions.map((motion) => (
                    <div key={motion.id} className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                      <video src={motion.video_url} controls className="w-full max-h-[260px] object-contain bg-black" />
                      <div className="p-2 flex justify-between items-center">
                        <span className="text-[10px] text-slate-500">
                          {new Date(motion.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
                        </span>
                        <button
                          onClick={() => deleteMotion(motion)}
                          className="p-1 rounded border border-slate-300 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </LabStage>
    </div>
  );
}
