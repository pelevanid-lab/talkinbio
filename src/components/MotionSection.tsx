'use client';

import { useRef, useState } from 'react';
import { Loader2, Video, Upload, Play, CheckCircle2, Trash2 } from 'lucide-react';
import type { CharacterShot, CharacterMotion } from '@/config/characters';
import {
  DEFAULT_MOTION_MODEL_ID,
  motionAudioMime,
  motionMaxSeconds,
  motionResolutions,
  MOTION_AUDIO_EXTENSIONS,
  MOTION_MODELS,
  type MotionResolution,
} from '@/config/motionModels';

const AUDIO_LABEL = MOTION_AUDIO_EXTENSIONS.map((e) => e.toUpperCase()).join(', ');

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

type Props = {
  characterId: string;
  shots: CharacterShot[];
  motions: CharacterMotion[];
  onMotionCreated: (motion: CharacterMotion) => void;
  onMotionDeleted: (motionId: string) => void;
};

export default function MotionSection({ characterId, shots, motions, onMotionCreated, onMotionDeleted }: Props) {
  const [selectedShot, setSelectedShot] = useState<CharacterShot | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioSeconds, setAudioSeconds] = useState<number | null>(null);
  const [modelId, setModelId] = useState(DEFAULT_MOTION_MODEL_ID);
  const [resolution, setResolution] = useState<MotionResolution>('1080p');
  const [prompt, setPrompt] = useState('');
  const [turboMode, setTurboMode] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const model = MOTION_MODELS.find((m) => m.id === modelId) ?? MOTION_MODELS[0];
  const resolutionOptions = motionResolutions(model);
  // Seçili çözünürlük yeni modelde yoksa ilkine düşüyoruz — sunucu da aynısını yapıyor,
  // ama sınırları ve maliyeti doğru göstermek için burada da çözmek gerekiyor.
  const activeResolution = resolutionOptions.includes(resolution) ? resolution : resolutionOptions[0];
  const maxSeconds = motionMaxSeconds(model, activeResolution);
  const maxBytes = model.maxAudioMb * 1024 * 1024;

  const tooLong = audioSeconds !== null && audioSeconds > maxSeconds;
  const tooShort = audioSeconds !== null && audioSeconds < model.minAudioSeconds;
  const tooBig = audioFile !== null && audioFile.size > maxBytes;
  const badFormat = audioFile !== null && !motionAudioMime(audioFile.name);
  const audioRejected = tooLong || tooShort || tooBig || badFormat;

  const handleAudioPicked = async (file: File | null) => {
    setAudioFile(file);
    setAudioSeconds(null);
    setError(null);
    if (file) setAudioSeconds(await readMediaDuration(file));
  };

  const handleDelete = async (motionId: string) => {
    if (!confirm('Bu videoyu silmek istediğinize emin misiniz?')) return;
    
    setDeletingId(motionId);
    try {
      const res = await fetch(`/api/admin/characters/${characterId}/motion/${motionId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Silinirken bir hata oluştu.');
      }
      onMotionDeleted(motionId);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Silinemedi.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleGenerate = async () => {
    if (!selectedShot) {
      setError('Lütfen galeriden bir görsel seçin.');
      return;
    }
    if (!audioFile) {
      setError('Lütfen bir ses dosyası yükleyin.');
      return;
    }
    if (audioRejected) {
      setError(
        badFormat
          ? `Bu format desteklenmiyor. Desteklenenler: ${AUDIO_LABEL}.`
          : tooBig
            ? `${model.label} için ses dosyası en fazla ${model.maxAudioMb}MB olabilir.`
            : tooShort
              ? `${model.label} en az ${model.minAudioSeconds} saniyelik ses istiyor.`
              : `Ses ${Math.round(audioSeconds!)} saniye — ${model.label} ${activeResolution} için üst sınır ${maxSeconds} saniye.`,
      );
      return;
    }

    setGenerating(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('sourceImageUrl', selectedShot.image_url);
      formData.append('model', model.id);
      formData.append('resolution', activeResolution);
      formData.append('turboMode', String(turboMode));
      if (prompt.trim()) formData.append('prompt', prompt.trim());
      if (audioSeconds !== null) formData.append('audioSeconds', String(audioSeconds));

      const res = await fetch(`/api/admin/characters/${characterId}/motion`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Video üretilemedi.');

      onMotionCreated(data.motion);
      setAudioFile(null);
      setAudioSeconds(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Üretilemedi.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mt-6">
      <div className="flex items-center gap-2 mb-6">
        <Video className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-bold text-slate-900">Motion (Video Üretimi)</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Üretim Formu */}
        <div className="space-y-6">
          {/* Görsel Seçimi */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">1. Referans Görsel Seç</h3>
            <p className="text-xs text-slate-500 mb-3">Videoda konuşturmak istediğiniz kareyi (ister gerçek fotoğrafınız, ister ürettiğiniz AI Twin) seçin.</p>
            {shots.length === 0 ? (
              <p className="text-sm text-slate-500">Önce yukarıdan bir görsel üretmelisiniz.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-2 pb-2">
                {shots.map((shot) => (
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
            )}
          </div>

          {/* Model — ses sınırlarını ve maliyeti belirlediği için ses yüklemeden önce geliyor */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">2. Model Seç</h3>
            <div className="space-y-2">
              {MOTION_MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setModelId(m.id)}
                  className={`w-full text-left rounded-xl border px-3 py-2.5 transition-colors ${
                    model.id === m.id
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200'
                      : 'border-slate-200 hover:border-slate-300'
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
          </div>

          {/* Ses Yükleme */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              3. Ses Dosyası Yükle{' '}
              <span className="font-normal text-slate-500">
                ({model.minAudioSeconds > 0 ? `${model.minAudioSeconds}-${maxSeconds}s` : `maks ${maxSeconds}s`}, ≤
                {model.maxAudioMb}MB)
              </span>
            </h3>
            <div className="flex flex-col gap-2">
              <input
                type="file"
                ref={fileInputRef}
                accept={MOTION_AUDIO_EXTENSIONS.map((e) => `.${e}`).join(',')}
                onChange={(e) => handleAudioPicked(e.target.files?.[0] || null)}
                className="hidden"
                id="audio-upload"
              />
              <label
                htmlFor="audio-upload"
                className="flex items-center justify-center gap-2 w-full py-4 px-4 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 hover:border-blue-400 transition-colors"
              >
                <Upload className="w-5 h-5 text-slate-400" />
                <span className="text-sm font-medium text-slate-600">
                  {audioFile ? audioFile.name : 'Ses dosyası seçin'}
                </span>
              </label>
              {audioFile && (
                <div
                  className={`flex items-center gap-2 text-xs ${
                    audioRejected ? 'text-red-600 font-medium' : 'text-slate-500'
                  }`}
                >
                  <span>{(audioFile.size / 1024 / 1024).toFixed(2)} MB</span>
                  {audioSeconds !== null && <span>· {audioSeconds.toFixed(1)} sn</span>}
                  {badFormat && <span>· desteklenen: {AUDIO_LABEL}</span>}
                  {tooBig && <span>· sınır {model.maxAudioMb}MB</span>}
                  {tooLong && <span>· sınır {maxSeconds} sn</span>}
                  {tooShort && <span>· en az {model.minAudioSeconds} sn</span>}
                </div>
              )}
            </div>
          </div>

          {/* Çözünürlük — sadece modelin `resolution` alanı varsa; Kling kabul etmiyor */}
          {(resolutionOptions.length > 1 || model.supportsTurbo) && (
            <div>
              {resolutionOptions.length > 1 && (
                <>
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">4. Çözünürlük</h3>
                  <div className="flex gap-2">
                    {resolutionOptions.map((res) => (
                      <button
                        key={res}
                        onClick={() => setResolution(res)}
                        className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                          activeResolution === res
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
                        }`}
                      >
                        {res} <span className="opacity-70">· {motionMaxSeconds(model, res)}s</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              {model.supportsTurbo && (
                <label className="flex items-center gap-2 mt-3 text-xs text-slate-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={turboMode}
                    onChange={(e) => setTurboMode(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Hızlı mod (daha çabuk biter, kalite bir tık düşer)
                </label>
              )}
            </div>
          )}

          {/* Yönlendirme — model bunu sesin tonuyla birlikte jest sinyali olarak kullanıyor */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              5. Yönlendirme <span className="font-normal text-slate-500">(opsiyonel)</span>
            </h3>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={2}
              maxLength={600}
              placeholder="Sakin ve güven veren bir tonda kameraya konuşuyor, ellerini ölçülü kullanıyor."
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
            />
            <p className="text-xs text-slate-500 mt-1">
              Boş bırakırsan model tonu sesten çıkarır. Jest ve mimik dozunu buradan ayarlıyorsun.
            </p>
          </div>

          {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

          <button
            onClick={handleGenerate}
            disabled={generating || !selectedShot || !audioFile || audioRejected}
            className="w-full flex justify-center items-center gap-2 bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {generating ? 'Video Üretiliyor (2-4 dk)...' : 'Videoyu Üret'}
          </button>
          {audioSeconds !== null && !audioRejected && (
            <p className="text-xs text-slate-500 -mt-3">
              ~${(audioSeconds * model.costPerSecondUsd).toFixed(2)} (tahmin, doğrulanmadı) · {model.label},{' '}
              {audioSeconds.toFixed(1)} sn × ${model.costPerSecondUsd}/sn
            </p>
          )}
        </div>

        {/* Video Galerisi */}
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Üretilen Videolar <span className="text-slate-400 font-normal">({motions.length})</span>
          </h3>
          {motions.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] bg-slate-50 rounded-xl border border-slate-200 border-dashed">
              <p className="text-sm text-slate-500">Henüz video üretilmedi.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {motions.map((motion) => (
                <div key={motion.id} className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                  {/* object-contain: model kaynak görselin en-boy oranını koruyor,
                      sabit 4:5 kutuya object-cover ile sığdırmak kafayı kırpıyordu. */}
                  <video
                    src={motion.video_url}
                    controls
                    className="w-full max-h-[320px] object-contain bg-black"
                  />
                  <div className="p-3 flex justify-between items-center">
                    <span className="text-xs text-slate-500">
                      {new Date(motion.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
                    </span>
                    <div className="flex items-center gap-2 mt-3">
                      <a 
                        href={motion.video_url} 
                        download 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex-1 text-center py-1.5 px-3 rounded-lg border border-slate-300 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        İndir
                      </a>
                      <button
                        onClick={() => handleDelete(motion.id)}
                        disabled={deletingId === motion.id}
                        className="p-1.5 rounded-lg border border-slate-300 text-slate-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-50 transition-colors"
                        title="Sil"
                      >
                        {deletingId === motion.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
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
