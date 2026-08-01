'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
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
import { creditsForCost } from '@/config/pricing';

type MotionMode = 'reference' | 'scenario';

export type CastCharacterOption = { id: string; name: string; avatarUrl?: string };

type Props = {
  characterId: string;
  shots: CharacterShot[];
  clips: CharacterClip[];
  /** Yardımcı Oyuncular — "Yardımcı Oyuncu" kimlik modunda seçilebilecek karakterler. */
  castCharacters: CastCharacterOption[];
  onClipCreated: (clip: CharacterClip) => void;
  onClipDeleted: (clipId: string) => void;
  /** Müşteri modunda ham $ maliyetini gizle — yalnızca kredi karşılığı görünsün. */
  hideCost?: boolean;
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

export default function ActionRoom({ characterId, shots, clips, castCharacters, onClipCreated, onClipDeleted, hideCost = false }: Props) {
  const t = useTranslations('BeiweLab');
  const [styleId, setStyleId] = useState(DEFAULT_MOTION_STYLE_ID);
  const [identityMode, setIdentityMode] = useState<MotionIdentityMode>('twin');
  const [selectedShot, setSelectedShot] = useState<CharacterShot | null>(null);
  const [personaDescription, setPersonaDescription] = useState('');
  const [castCharacterId, setCastCharacterId] = useState<string>(castCharacters[0]?.id ?? '');

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
    (identityMode === 'twin'
      ? !!selectedShot
      : identityMode === 'cast'
        ? !!castCharacterId
        : personaDescription.trim().length > 0) &&
    (mode === 'reference' ? !!drivingFile : true);

  const handleGenerate = async () => {
    if (identityMode === 'twin' && !selectedShot) {
      setError(t('actionErrorSelectTwinShot'));
      return;
    }
    if (identityMode === 'cast' && !castCharacterId) {
      setError(t('actionErrorSelectCast'));
      return;
    }
    if (identityMode === 'generic' && !personaDescription.trim()) {
      setError(t('actionErrorWritePersona'));
      return;
    }
    if (!scenario.trim()) {
      setError(t('actionErrorWriteScenario'));
      return;
    }
    if (mode === 'reference' && !drivingFile) {
      setError(t('actionErrorUploadVideoOrSwitch'));
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
      } else if (identityMode === 'cast') {
        formData.append('castCharacterId', castCharacterId);
      } else {
        formData.append('personaDescription', personaDescription.trim());
      }

      if (mode === 'reference' && drivingFile) {
        formData.append('drivingVideo', drivingFile);
        formData.append('motionModelId', motionModel.id);
        if (drivingSeconds !== null) formData.append('drivingSeconds', String(drivingSeconds));
      } else {
        formData.append('sceneVideoModelId', sceneModel.id);
      }

      const res = await fetch(`/api/admin/characters/${characterId}/clips/action`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('actionErrorGenerateFailed'));

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
    if (!confirm(t('actionDeleteConfirm'))) return;
    setDeletingId(clipId);
    try {
      const res = await fetch(`/api/admin/characters/${characterId}/clips/${clipId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('actionErrorDeleteFailed'));
      }
      onClipDeleted(clipId);
    } catch (err) {
      alert(err instanceof Error ? err.message : t('actionErrorDelete'));
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
            <h3 className="text-sm font-semibold text-slate-900 mb-1">{t('actionStep1Style')}</h3>
            <p className="text-xs text-slate-500 mb-3">
              {t('actionStep1StyleDesc')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {MOTION_STYLES.map((styleObj) => (
                <button
                  key={styleObj.id}
                  onClick={() => setStyleId(styleObj.id)}
                  className={`text-left rounded-xl border p-3 transition-colors ${
                    styleId === styleObj.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="text-sm font-semibold text-slate-900">{t(styleObj.label as any)}</span>
                  <p className="text-xs text-slate-500 mt-0.5 leading-snug">{t(styleObj.hint as any)}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">{t('actionStep2Identity')}</h3>
            <div className="flex gap-2 mb-3">
              {MOTION_IDENTITY_MODES.map((modeObj) => (
                <button
                  key={modeObj.id}
                  onClick={() => setIdentityMode(modeObj.id)}
                  className={`flex-1 text-left rounded-xl border p-3 transition-colors ${
                    identityMode === modeObj.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="text-sm font-semibold text-slate-900">{t(modeObj.label as any)}</span>
                  <p className="text-xs text-slate-500 mt-0.5 leading-snug">{t(modeObj.hint as any)}</p>
                </button>
              ))}
            </div>

            {identityMode === 'twin' ? (
              (() => {
                const eligibleShots = shots.filter((shot) => shot.similarity_score === null || shot.similarity_score >= 7);
                if (eligibleShots.length === 0) {
                  return <p className="text-sm text-slate-500">{t('actionIdentityTwinLocked')}</p>;
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
            ) : identityMode === 'cast' ? (
              castCharacters.length === 0 ? (
                <p className="text-sm text-slate-500">
                  {t('actionIdentityCastLocked')}
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {castCharacters.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCastCharacterId(c.id)}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-colors ${
                        castCharacterId === c.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {c.avatarUrl ? (
                        <Image
                          src={c.avatarUrl}
                          alt=""
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-slate-200 border border-slate-300" />
                      )}
                      <span className="text-xs font-medium text-slate-700 truncate w-full text-center">{c.name}</span>
                    </button>
                  ))}
                </div>
              )
            ) : (
              <textarea
                value={personaDescription}
                onChange={(e) => setPersonaDescription(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder={t('actionIdentityPersonaPlaceholder')}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
              />
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">{t('actionStep3Source')}</h3>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setMode('reference')}
                className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                  mode === 'reference' ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-200' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {t('actionSourceModeReference')}
              </button>
              <button
                onClick={() => setMode('scenario')}
                className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors relative ${
                  mode === 'scenario' ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-200' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {t('actionSourceModeScenario')}
                <span className="ml-1.5 text-[10px] font-semibold text-amber-600 align-middle">{t('actionExperimentalBadge')}</span>
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
                    {drivingFile ? drivingFile.name : t('actionSourceVideoSelect')}
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
                    <span>{t('actionSourceModelWarning1')}</span>
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
                        <span className="text-sm font-semibold text-slate-900">{t(m.label as any)}</span>
                        <span className="text-xs text-slate-500 whitespace-nowrap">{hideCost ? `≈${creditsForCost(m.costPerSecondUsd)} kredi/sn` : `~$${m.costPerSecondUsd.toFixed(4).replace(/0+$/, '')}/sn ${t('actionCostEstimateUnverified')} · ≈${creditsForCost(m.costPerSecondUsd)} kredi/sn`}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{t(m.hint as any)}</p>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>{t('actionSourceModelWarning2')}</span>
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
                      <span className="text-sm font-semibold text-slate-900">{t(m.label as any)}</span>
                      <span className="text-xs text-slate-500 whitespace-nowrap">~${m.costPerSecondUsd.toFixed(4).replace(/0+$/, '')}/sn (tahmin) · ≈{creditsForCost(m.costPerSecondUsd)} kredi/sn</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{t(m.hint as any)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">{t('actionStep4Scenario')}</h3>
            <p className="text-xs text-slate-500 mb-2">
              {mode === 'reference'
                ? t('actionScenarioDescReference')
                : t('actionScenarioDescScenario')}
            </p>
            <textarea
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              rows={3}
              maxLength={800}
              placeholder={t('actionScenarioPlaceholder')}
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
                {t('actionBtnGenerating')}
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                {t('actionBtnGenerate')}
              </>
            )}
          </button>
          {mode === 'reference' && drivingSeconds !== null && (
            <p className="text-xs text-slate-500 -mt-3">
              {hideCost
                ? `≈${creditsForCost(drivingSeconds * motionModel.costPerSecondUsd)} kredi · ${t(motionModel.label as any)}, ${drivingSeconds.toFixed(1)} sn`
                : `~$${(drivingSeconds * motionModel.costPerSecondUsd).toFixed(2)} {t('actionCostEstimateUnverified')} · ≈${creditsForCost(drivingSeconds * motionModel.costPerSecondUsd)} kredi · ${t(motionModel.label as any)}, ${drivingSeconds.toFixed(1)} sn × $${motionModel.costPerSecondUsd}/sn`}
            </p>
          )}
        </div>

        {/* Klip Galerisi */}
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            {t('actionGeneratedClipsTitle')} <span className="text-slate-400 font-normal">({actionClips.length})</span>
          </h3>
          {actionClips.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] bg-slate-50 rounded-xl border border-slate-200 border-dashed">
              <p className="text-sm text-slate-500">{t('actionNoClips')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {actionClips.map((clip) => (
                <div key={clip.id} className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                  <video src={clip.video_url} controls className="w-full max-h-[320px] object-contain bg-black" />
                  <div className="p-3 flex justify-between items-center gap-2">
                    <span className="text-xs text-slate-500">
                      {clip.label ?? t('actionClipUnknownLabel')}
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
                        title={t('actionClipDeleteBtn')}
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
