'use client';

import { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clapperboard, Loader2, Play, Trash2, Upload } from 'lucide-react';
import type { CharacterShot } from '@/config/characters';
import type { CharacterClip } from '@/config/clips';
import { FULL_BODY_MOTION_MODELS, SCENE_VIDEO_MODELS, findFullBodyMotionModel, findSceneVideoModel } from '@/config/clips';
import {
  DEFAULT_MOTION_STYLE_ID,
  MOTION_IDENTITY_MODES,
  MOTION_STYLES,
  type MotionIdentityMode,
} from '@/config/motionStyles';

type MotionMode = 'reference' | 'scenario';

type Props = {
  characterId: string;
  shots: CharacterShot[];
  clips: CharacterClip[];
  onClipCreated: (clip: CharacterClip) => void;
  onClipDeleted: (clipId: string) => void;
};

/** Dosyanın süresini tarayıcıda ölçer; okunamazsa null döner (sunucu yine de sınırı uygular). */
function readMediaDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement('video');
    el.preload = 'metadata';
    const done = (value: number | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    el.onloadedmetadata = () => done(Number.isFinite(el.duration) ? el.duration : null);
    el.onerror = () => done(null);
    el.src = url;
  });
}

export default function ActionRoom({ characterId, shots, clips, onClipCreated, onClipDeleted }: Props) {
  const [styleId, setStyleId] = useState(DEFAULT_MOTION_STYLE_ID);
  const [identityMode, setIdentityMode] = useState<MotionIdentityMode>('twin');
  const [selectedShot, setSelectedShot] = useState<CharacterShot | null>(null);
  const [personaDescription, setPersonaDescription] = useState('');

  const [mode, setMode] = useState<MotionMode>('reference');
  const [drivingFile, setDrivingFile] = useState<File | null>(null);
  const [drivingSeconds, setDrivingSeconds] = useState<number | null>(null);
  const [motionModelId, setMotionModelId] = useState(FULL_BODY_MOTION_MODELS[0].id);
  const [sceneModelId, setSceneModelId] = useState(SCENE_VIDEO_MODELS[0].id);
  const [scenario, setScenario] = useState('');

  const [generating, setGenerating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const actionClips = clips.filter((c) => c.room === 'action');
  const motionModel = findFullBodyMotionModel(motionModelId) ?? FULL_BODY_MOTION_MODELS[0];
  const sceneModel = findSceneVideoModel(sceneModelId) ?? SCENE_VIDEO_MODELS[0];

  const handleDrivingPicked = async (file: File | null) => {
    setDrivingFile(file);
    setDrivingSeconds(null);
    setError(null);
    if (file) setDrivingSeconds(await readMediaDuration(file));
  };

  const canGenerate =
    scenario.trim().length > 0 &&
    (identityMode === 'twin' ? !!selectedShot : personaDescription.trim().length > 0) &&
    (mode === 'reference' ? !!drivingFile : true);

  const handleGenerate = async () => {
    if (identityMode === 'twin' && !selectedShot) {
      setError('Lütfen Twin galerisinden bir kare seçin.');
      return;
    }
    if (identityMode === 'generic' && !personaDescription.trim()) {
      setError('Lütfen jenerik karakter için bir persona tarifi yazın.');
      return;
    }
    if (!scenario.trim()) {
      setError('Lütfen bir senaryo/detay metni yazın.');
      return;
    }
    if (mode === 'reference' && !drivingFile) {
      setError('Lütfen bir örnek/trend video yükleyin — ya da "Sadece senaryodan üret" moduna geçin.');
      return;
    }

    setError(null);
    setGenerating(true);
    try {
      const formData = new FormData();
      formData.append('mode', mode);
      formData.append('identityMode', identityMode);
      formData.append('styleId', styleId);
      formData.append('scenario', scenario.trim());

      if (identityMode === 'twin' && selectedShot) {
        formData.append('sourceShotUrl', selectedShot.image_url);
      } else {
        formData.append('personaDescription', personaDescription.trim());
      }

      if (mode === 'reference' && drivingFile) {
        formData.append('drivingVideo', drivingFile);
        formData.append('motionModelId', motionModel.id);
      } else {
        formData.append('sceneVideoModelId', sceneModel.id);
      }

      const res = await fetch(`/api/admin/characters/${characterId}/clips/action`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Üretilemedi.');

      onClipCreated(data.clip);
      setDrivingFile(null);
      setDrivingSeconds(null);
      setScenario('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Üretilemedi.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (clipId: string) => {
    if (!confirm('Bu klibi silmek istediğinize emin misiniz?')) return;
    setDeletingId(clipId);
    try {
      const res = await fetch(`/api/admin/characters/${characterId}/clips/${clipId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Silinirken bir hata oluştu.');
      }
      onClipDeleted(clipId);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Silinemedi.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mt-6">
      <div className="flex items-center gap-2 mb-6">
        <Clapperboard className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-bold text-slate-900">Action Room</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Üretim Formu */}
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">1. Stil</h3>
            <p className="text-xs text-slate-500 mb-3">
              Kaynak görsel bu stille yeniden üretilir — hareket aynı kalır, görünüm değişir.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {MOTION_STYLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStyleId(s.id)}
                  className={`text-left rounded-xl border p-3 transition-colors ${
                    styleId === s.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="text-sm font-semibold text-slate-900">{s.label}</span>
                  <p className="text-xs text-slate-500 mt-0.5 leading-snug">{s.hint}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">2. Kimlik</h3>
            <div className="flex gap-2 mb-3">
              {MOTION_IDENTITY_MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setIdentityMode(m.id)}
                  className={`flex-1 text-left rounded-xl border p-3 transition-colors ${
                    identityMode === m.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="text-sm font-semibold text-slate-900">{m.label}</span>
                  <p className="text-xs text-slate-500 mt-0.5 leading-snug">{m.hint}</p>
                </button>
              ))}
            </div>

            {identityMode === 'twin' ? (
              (() => {
                const eligibleShots = shots.filter((shot) => shot.similarity_score === null || shot.similarity_score >= 7);
                if (eligibleShots.length === 0) {
                  return <p className="text-sm text-slate-500">Önce Beiwe Twin&apos;de uygun (7 puan ve üzeri) bir görsel üretmelisiniz.</p>;
                }
                return (
                  <div className="grid grid-cols-3 gap-2 max-h-[220px] overflow-y-auto pr-2 pb-2">
                    {eligibleShots.map((shot) => (
                      <button
                        key={shot.id}
                        onClick={() => setSelectedShot(shot)}
                        className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                          selectedShot?.id === shot.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent hover:border-slate-300'
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={shot.image_url} alt="" className="w-full h-auto block" />
                        {selectedShot?.id === shot.id && (
                          <div className="absolute top-1 right-1 bg-white rounded-full">
                            <CheckCircle2 className="w-4 h-4 text-blue-600" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                );
              })()
            ) : (
              <textarea
                value={personaDescription}
                onChange={(e) => setPersonaDescription(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="ör. 30'larında, sokak modası, enerjik bir karakter"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
              />
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">3. Hareket kaynağı</h3>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setMode('reference')}
                className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                  mode === 'reference' ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-200' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                Örnek/trend video yükle
              </button>
              <button
                onClick={() => setMode('scenario')}
                className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors relative ${
                  mode === 'scenario' ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-200' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                Sadece senaryodan üret
                <span className="ml-1.5 text-[10px] font-semibold text-amber-600 align-middle">deneysel</span>
              </button>
            </div>

            {mode === 'reference' ? (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="video/*"
                  onChange={(e) => handleDrivingPicked(e.target.files?.[0] || null)}
                  className="hidden"
                  id="action-driving-upload"
                />
                <label
                  htmlFor="action-driving-upload"
                  className="flex items-center justify-center gap-2 w-full py-4 px-4 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 hover:border-blue-400 transition-colors"
                >
                  <Upload className="w-5 h-5 text-slate-400" />
                  <span className="text-sm font-medium text-slate-600">
                    {drivingFile ? drivingFile.name : 'Örnek/trend video seçin (veya sürükleyin)'}
                  </span>
                </label>
                {drivingFile && (
                  <p className="text-xs text-slate-500 mt-2">
                    {(drivingFile.size / 1024 / 1024).toFixed(2)} MB
                    {drivingSeconds !== null && <> · {drivingSeconds.toFixed(1)} sn</>}
                  </p>
                )}

                <div className="mt-3 space-y-1.5">
                  <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>Podcast&apos;in yüz/mimik modelleri (wan-motion/DreamActor) burada KULLANILMIYOR — boydan/tüm gövde hareketine uygun ayrı bir model ailesi, henüz doğrulanmadı.</span>
                  </div>
                  {FULL_BODY_MOTION_MODELS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMotionModelId(m.id)}
                      className={`w-full text-left rounded-xl border px-3 py-2 transition-colors ${
                        motionModel.id === m.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-900">{m.label}</span>
                        <span className="text-xs text-slate-500 whitespace-nowrap">~${m.costPerSecondUsd.toFixed(4).replace(/0+$/, '')}/sn (tahmin)</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{m.hint}</p>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>Bu mod henüz gerçek bir üretimle doğrulanmadı — ilk denemede sonucu gözle değerlendir.</span>
                </div>
                {SCENE_VIDEO_MODELS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSceneModelId(m.id)}
                    className={`w-full text-left rounded-xl border px-3 py-2 transition-colors ${
                      sceneModel.id === m.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-900">{m.label}</span>
                      <span className="text-xs text-slate-500 whitespace-nowrap">~${m.costPerSecondUsd.toFixed(4).replace(/0+$/, '')}/sn (tahmin)</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{m.hint}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">4. Senaryo / detay</h3>
            <p className="text-xs text-slate-500 mb-2">
              {mode === 'reference'
                ? 'Yüklediğin videonun üzerine ne olmasını istediğini yaz — hareketi yönlendiren ek talimat.'
                : 'Sürücü video yok, video doğrudan bu tarifle üretilecek — ne kadar somut yazarsan sonuç o kadar isabetli olur.'}
            </p>
            <textarea
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              rows={3}
              maxLength={800}
              placeholder="ör. Karakter kameraya doğru yürüyüp gülümsüyor, arkasında şehir ışıkları."
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

          <button
            onClick={handleGenerate}
            disabled={generating || !canGenerate}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Üretiliyor... (uzun sürebilir)
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                Klip Üret
              </>
            )}
          </button>
          {mode === 'reference' && drivingSeconds !== null && (
            <p className="text-xs text-slate-500 -mt-3">
              ~${(drivingSeconds * motionModel.costPerSecondUsd).toFixed(2)} (tahmin, doğrulanmadı) · {motionModel.label},{' '}
              {drivingSeconds.toFixed(1)} sn × ${motionModel.costPerSecondUsd}/sn
            </p>
          )}
        </div>

        {/* Klip Galerisi */}
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Üretilen Action Klipleri <span className="text-slate-400 font-normal">({actionClips.length})</span>
          </h3>
          {actionClips.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] bg-slate-50 rounded-xl border border-slate-200 border-dashed">
              <p className="text-sm text-slate-500">Henüz klip üretilmedi.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {actionClips.map((clip) => (
                <div key={clip.id} className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                  <video src={clip.video_url} controls className="w-full max-h-[320px] object-contain bg-black" />
                  <div className="p-3 flex justify-between items-center gap-2">
                    <span className="text-xs text-slate-500">
                      {clip.label ?? 'bilinmiyor'}
                      {' · '}
                      {new Date(clip.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
                    </span>
                    <div className="flex items-center gap-2">
                      <a
                        href={clip.video_url}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="text-center py-1.5 px-3 rounded-lg border border-slate-300 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        İndir
                      </a>
                      <button
                        onClick={() => handleDelete(clip.id)}
                        disabled={deletingId === clip.id}
                        className="p-1.5 rounded-lg border border-slate-300 text-slate-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-50 transition-colors"
                        title="Sil"
                      >
                        {deletingId === clip.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
