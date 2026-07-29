'use client';

import { useRef, useState } from 'react';
import { Loader2, MicVocal, Upload, Play, CheckCircle2, Trash2 } from 'lucide-react';
import type { CharacterShot } from '@/config/characters';
import type { CharacterClip } from '@/config/clips';
import { DEFAULT_PERFORMANCE_MODEL_ID, PERFORMANCE_MODELS, findPerformanceModel } from '@/config/clips';

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
  clips: CharacterClip[];
  onClipCreated: (clip: CharacterClip) => void;
  onClipDeleted: (clipId: string) => void;
};

export default function PodcastRoom({ characterId, shots, clips, onClipCreated, onClipDeleted }: Props) {
  const [selectedShot, setSelectedShot] = useState<CharacterShot | null>(null);
  const [drivingFile, setDrivingFile] = useState<File | null>(null);
  const [drivingSeconds, setDrivingSeconds] = useState<number | null>(null);
  const [modelId, setModelId] = useState(DEFAULT_PERFORMANCE_MODEL_ID);
  const [prompt, setPrompt] = useState('');
  const model = findPerformanceModel(modelId) ?? PERFORMANCE_MODELS[0];
  const [generating, setGenerating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const podcastClips = clips.filter((c) => c.room === 'podcast');

  const handleDrivingPicked = async (file: File | null) => {
    setDrivingFile(file);
    setDrivingSeconds(null);
    setError(null);
    if (file) setDrivingSeconds(await readMediaDuration(file));
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

  const handleGenerate = async () => {
    if (!selectedShot) {
      setError('Lütfen galeriden bir kanon görsel seçin.');
      return;
    }
    if (!drivingFile) {
      setError('Lütfen sürücü video yükleyin — kendini konuşurken/jest yaparken çeken bir video.');
      return;
    }

    setError(null);
    setGenerating(true);
    try {
      const formData = new FormData();
      formData.append('drivingVideo', drivingFile);
      formData.append('sourceImageUrl', selectedShot.image_url);
      formData.append('modelId', model.id);
      if (prompt.trim() && model.supportsPrompt) formData.append('prompt', prompt.trim());

      const res = await fetch(`/api/admin/characters/${characterId}/clips/performance`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Üretilemedi.');

      onClipCreated(data.clip);
      setDrivingFile(null);
      setDrivingSeconds(null);
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
        <MicVocal className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-bold text-slate-900">Podcast Room</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Üretim Formu */}
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">1. Kanon Görsel Seç</h3>
            <p className="text-xs text-slate-500 mb-3">
              Karakterin kimliğini bu kareden alacak — kendi performansın buna giydirilecek.
            </p>
            {(() => {
              const eligibleShots = shots.filter((shot) => shot.similarity_score === null || shot.similarity_score >= 7);
              if (eligibleShots.length === 0) {
                return <p className="text-sm text-slate-500">Önce yukarıdan uygun (7 puan ve üzeri) bir görsel üretmelisiniz.</p>;
              }
              return (
                <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-2 pb-2">
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
            })()}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">2. Sürücü Video Yükle</h3>
            <p className="text-xs text-slate-500 mb-3">
              Kendini, gerçekten söylemek istediğin metni okuyarak/jest yaparak çek — hem hareket hem ses bu videodan
              geliyor (görüntü sessiz üretilip videonun kendi sesi aynen klibe aktarılıyor, sonradan başka ses
              koymuyoruz). Işıklı çek ve kanon karedeki gibi ellerin kadrajda olsun (model görmediği eli tahmin etmek
              zorunda kalırsa bozuk çıkar).
            </p>
            <input
              type="file"
              ref={fileInputRef}
              accept="video/*"
              onChange={(e) => handleDrivingPicked(e.target.files?.[0] || null)}
              className="hidden"
              id="driving-upload"
            />
            <label
              htmlFor="driving-upload"
              className="flex items-center justify-center gap-2 w-full py-4 px-4 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 hover:border-blue-400 transition-colors"
            >
              <Upload className="w-5 h-5 text-slate-400" />
              <span className="text-sm font-medium text-slate-600">
                {drivingFile ? drivingFile.name : 'Sürücü video seçin (veya sürükleyin)'}
              </span>
            </label>
            {drivingFile && (
              <p className="text-xs text-slate-500 mt-2">
                {(drivingFile.size / 1024 / 1024).toFixed(2)} MB
                {drivingSeconds !== null && <> · {drivingSeconds.toFixed(1)} sn</>}
              </p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">3. Model</h3>
            <div className="space-y-2">
              {PERFORMANCE_MODELS.map((m) => (
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

          {model.supportsPrompt && (
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">
                4. Yönlendirme <span className="font-normal text-slate-500">(opsiyonel)</span>
              </h3>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={2}
                maxLength={600}
                placeholder="Sakin, ölçülü mimikler ve doğal jestler — abartısız."
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
              />
              <p className="text-xs text-slate-500 mt-1">
                Mimikler abartılı çıkarsa buraya &ldquo;sakin, ölçülü&rdquo; gibi bir yönlendirme yazmayı dene —{' '}
                {model.label}&apos;ın sunduğu tek doz kontrolü bu.
              </p>
            </div>
          )}

          {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

          <button
            onClick={handleGenerate}
            disabled={generating || !selectedShot || !drivingFile}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Performans Aktarılıyor... (uzun sürebilir, 10sn&apos;lik klip ~10-15 dk)
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                Klip Üret
              </>
            )}
          </button>
          {drivingSeconds !== null && (
            <p className="text-xs text-slate-500 -mt-3">
              ~${(drivingSeconds * model.costPerSecondUsd).toFixed(2)} (tahmin, doğrulanmadı) · {model.label},{' '}
              {drivingSeconds.toFixed(1)} sn × ${model.costPerSecondUsd}/sn
            </p>
          )}
        </div>

        {/* Klip Galerisi */}
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Üretilen Podcast Klipleri <span className="text-slate-400 font-normal">({podcastClips.length})</span>
          </h3>
          {podcastClips.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] bg-slate-50 rounded-xl border border-slate-200 border-dashed">
              <p className="text-sm text-slate-500">Henüz klip üretilmedi.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {podcastClips.map((clip) => (
                <div key={clip.id} className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                  <video src={clip.video_url} controls className="w-full max-h-[320px] object-contain bg-black" />
                  <div className="p-3 flex justify-between items-center gap-2">
                    <span className="text-xs text-slate-500">
                      {new Date(clip.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
                      {' '}
                      {new Date(clip.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      {' · '}
                      {findPerformanceModel(clip.model)?.label ?? clip.model ?? 'bilinmiyor'}
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
