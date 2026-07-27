'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Download,
  Loader2,
  Music,
  Pause,
  Play,
  Save,
  Trash2,
  Type,
  Upload,
} from 'lucide-react';
import type { CharacterMotion } from '@/config/characters';
import { OVERLAY_FONTS, type OverlayFont } from '@/config/characters';
import {
  MAX_CUTAWAYS,
  MAX_OVERLAYS,
  MAX_OVERLAY_TEXT_LENGTH,
  MAX_PROJECT_NAME_LENGTH,
  STUDIO_ASPECT_RATIOS,
  DEFAULT_TIMELINE,
  studioAspectPreset,
  type StudioAsset,
  type StudioAssetKind,
  type StudioCutaway,
  type StudioFit,
  type StudioImageOverlay,
  type StudioProject,
  type StudioTextOverlay,
  type StudioTimeline,
} from '@/config/studio';
import { downloadBlob } from '@/utils/imageOverlay';
import {
  collectStudioImageUrls,
  drawFrame,
  exportFileExtension,
  exportTimeline,
  pickExportMimeType,
  preloadStudioImages,
} from '@/utils/studioRenderer';

type Selection = { type: 'cutaway' | 'overlay'; id: string } | null;

type Props = {
  characterId: string;
  motion: CharacterMotion;
  project: StudioProject | null;
  assets: StudioAsset[];
  onAssetUploaded: (asset: StudioAsset) => void;
  onAssetDeleted: (assetId: string) => void;
  onProjectSaved: (project: StudioProject) => void;
  onBack: () => void;
};

const clampPct = (v: number) => Math.min(100, Math.max(0, v));

export default function StudioEditor({
  characterId,
  motion,
  project,
  assets,
  onAssetUploaded,
  onProjectSaved,
  onBack,
}: Props) {
  const [timeline, setTimeline] = useState<StudioTimeline>(project?.timeline ?? DEFAULT_TIMELINE);
  const [projectId, setProjectId] = useState<string | null>(project?.id ?? null);
  const [projectName, setProjectName] = useState(project?.name ?? 'Adsız proje');

  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState<Selection>(null);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const musicAudioRef = useRef<HTMLAudioElement>(null);
  const rafRef = useRef<number | null>(null);

  // rAF döngüsü ve export uzun ömürlü callback'ler — her render'da yeniden kurulmadıkları
  // için `timeline`/`imageCache`'i doğrudan closure'dan değil ref'ten okuyorlar, yoksa
  // oynatma sırasında yapılan bir düzenleme (slider vs.) canlı önizlemeye yansımaz.
  const timelineRef = useRef(timeline);
  useEffect(() => {
    timelineRef.current = timeline;
  }, [timeline]);

  const [imageCache, setImageCache] = useState<Map<string, HTMLImageElement>>(new Map());
  const imageCacheRef = useRef(imageCache);
  useEffect(() => {
    imageCacheRef.current = imageCache;
  }, [imageCache]);

  const preset = studioAspectPreset(timeline.aspectRatio);
  const effectiveDuration = Math.max(0, (timeline.trim.end || videoDuration) - timeline.trim.start);

  const updateTimeline = (patch: Partial<StudioTimeline>) => setTimeline((prev) => ({ ...prev, ...patch }));

  // --- Görsel önbellek: cutaway/overlay'lerin referans ettiği görseller önceden yüklenir ---
  // Bağımlılık `timeline`'ın tamamı değil, sadece görsel URL'lerinin İÇERİK anahtarı —
  // yoksa opacity/x/y gibi görselle ilgisiz her küçük değişiklikte gereksiz yeniden yükleme olur.
  const imageUrls = collectStudioImageUrls(timeline);
  const imageUrlsKey = imageUrls.join('|');
  useEffect(() => {
    let cancelled = false;
    preloadStudioImages(imageUrls).then((map) => {
      if (!cancelled) setImageCache(map);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrlsKey]);

  const redraw = (time: number) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawFrame({ ctx, timeline: timelineRef.current, time, video, assets: imageCacheRef.current });
  };

  // Format değişince canvas'ın piksel boyutu değişir — mevcut kareyi hemen yeniden çiz,
  // yoksa boyut değişene kadar siyah/eski kare görünür kalır.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = preset.width;
    canvas.height = preset.height;
    redraw(currentTime);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset.width, preset.height]);

  const stopLoop = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const loop = () => {
    const video = videoRef.current;
    if (!video || video.paused) {
      rafRef.current = null;
      return;
    }
    const tl = timelineRef.current;
    const sourceEnd = tl.trim.end || video.duration;
    if (video.currentTime >= sourceEnd || video.ended) {
      video.pause();
      musicAudioRef.current?.pause();
      setPlaying(false);
      rafRef.current = null;
      return;
    }
    const t = video.currentTime - tl.trim.start;
    redraw(t);
    setCurrentTime(t);
    rafRef.current = requestAnimationFrame(loop);
  };

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (playing) {
      video.pause();
      musicAudioRef.current?.pause();
      setPlaying(false);
      stopLoop();
      return;
    }

    const sourceEnd = timeline.trim.end || video.duration;
    if (video.currentTime < timeline.trim.start || video.currentTime >= sourceEnd) {
      video.currentTime = timeline.trim.start;
    }
    setPlaying(true);
    if (musicAudioRef.current) {
      musicAudioRef.current.volume = timeline.music?.volume ?? 0.5;
      musicAudioRef.current.play().catch(() => {});
    }
    await video.play();
    rafRef.current = requestAnimationFrame(loop);
  };

  const seekTo = (timelineTime: number) => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) {
      video.pause();
      musicAudioRef.current?.pause();
      setPlaying(false);
      stopLoop();
    }
    const target = timeline.trim.start + timelineTime;
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      redraw(timelineTime);
      setCurrentTime(timelineTime);
    };
    video.addEventListener('seeked', onSeeked);
    video.currentTime = target;
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setVideoDuration(video.duration);
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      redraw(0);
    };
    video.addEventListener('seeked', onSeeked);
    video.currentTime = timeline.trim.start;
  };

  // --- Cutaway / Overlay / Müzik düzenleme yardımcıları ---

  const addCutaway = (assetUrl: string) => {
    if (timeline.cutaways.length >= MAX_CUTAWAYS) {
      setError(`En fazla ${MAX_CUTAWAYS} cutaway eklenebilir.`);
      return;
    }
    const start = currentTime;
    const end = Math.min(effectiveDuration || start + 3, start + 3);
    const item: StudioCutaway = { id: crypto.randomUUID(), assetUrl, startTime: start, endTime: end, fit: 'cover' };
    updateTimeline({ cutaways: [...timeline.cutaways, item] });
    setSelected({ type: 'cutaway', id: item.id });
  };

  const updateCutaway = (id: string, patch: Partial<StudioCutaway>) =>
    updateTimeline({ cutaways: timeline.cutaways.map((c) => (c.id === id ? { ...c, ...patch } : c)) });

  const removeCutaway = (id: string) => {
    updateTimeline({ cutaways: timeline.cutaways.filter((c) => c.id !== id) });
    if (selected?.type === 'cutaway' && selected.id === id) setSelected(null);
  };

  const addImageOverlay = (assetUrl: string) => {
    if (timeline.overlays.length >= MAX_OVERLAYS) {
      setError(`En fazla ${MAX_OVERLAYS} overlay eklenebilir.`);
      return;
    }
    const start = currentTime;
    const end = Math.min(effectiveDuration || start + 3, start + 3);
    const item: StudioImageOverlay = {
      id: crypto.randomUUID(),
      kind: 'image',
      assetUrl,
      startTime: start,
      endTime: end,
      x: 62,
      y: 6,
      width: 28,
      opacity: 1,
    };
    updateTimeline({ overlays: [...timeline.overlays, item] });
    setSelected({ type: 'overlay', id: item.id });
  };

  const addTextOverlay = () => {
    if (timeline.overlays.length >= MAX_OVERLAYS) {
      setError(`En fazla ${MAX_OVERLAYS} overlay eklenebilir.`);
      return;
    }
    const start = currentTime;
    const end = Math.min(effectiveDuration || start + 3, start + 3);
    const item: StudioTextOverlay = {
      id: crypto.randomUUID(),
      kind: 'text',
      text: 'Metnini yaz',
      startTime: start,
      endTime: end,
      x: 8,
      y: 78,
      fontSize: 6,
      color: '#FFFFFF',
      align: 'left',
      font: 'bricolage',
      opacity: 1,
    };
    updateTimeline({ overlays: [...timeline.overlays, item] });
    setSelected({ type: 'overlay', id: item.id });
  };

  /** Her iki overlay türünün de paylaştığı alanlar (zaman/konum/opaklık) — kind'a özel alanlar ayrı fonksiyonlarda. */
  const updateOverlayCommon = (
    id: string,
    patch: Partial<{ startTime: number; endTime: number; x: number; y: number; opacity: number }>,
  ) => updateTimeline({ overlays: timeline.overlays.map((o) => (o.id === id ? { ...o, ...patch } : o)) });

  const updateImageOverlay = (id: string, patch: Partial<StudioImageOverlay>) =>
    updateTimeline({
      overlays: timeline.overlays.map((o) => (o.id === id && o.kind === 'image' ? { ...o, ...patch } : o)),
    });

  const updateTextOverlay = (id: string, patch: Partial<StudioTextOverlay>) =>
    updateTimeline({
      overlays: timeline.overlays.map((o) => (o.id === id && o.kind === 'text' ? { ...o, ...patch } : o)),
    });

  const removeOverlay = (id: string) => {
    updateTimeline({ overlays: timeline.overlays.filter((o) => o.id !== id) });
    if (selected?.type === 'overlay' && selected.id === id) setSelected(null);
  };

  // --- Yükleme / kaydetme / export ---

  const uploadAsset = async (file: File, kind: StudioAssetKind): Promise<StudioAsset | null> => {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('kind', kind);
      const res = await fetch(`/api/admin/characters/${characterId}/studio-asset`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Yüklenemedi.');
      const asset = data.asset as StudioAsset;
      onAssetUploaded(asset);
      return asset;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yüklenemedi.');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const saveProject = async () => {
    setSaving(true);
    setError(null);
    try {
      const method = projectId ? 'PATCH' : 'POST';
      const url = projectId
        ? `/api/admin/characters/${characterId}/studio/${projectId}`
        : `/api/admin/characters/${characterId}/studio`;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: projectName, motionId: motion.id, timeline }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kaydedilemedi.');
      const saved = data.project as StudioProject;
      setProjectId(saved.id);
      onProjectSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const exportHint = (() => {
    const mt = pickExportMimeType();
    if (!mt) return 'Bu tarayıcı video kaydını desteklemeyebilir — Chrome ya da Edge dene.';
    return mt.startsWith('video/mp4')
      ? null
      : 'Bu tarayıcı MP4 yerine WebM üretecek — Instagram’a yüklemeden önce dönüştürmen gerekebilir.';
  })();

  const handleExport = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    if (playing) {
      video.pause();
      musicAudioRef.current?.pause();
      setPlaying(false);
      stopLoop();
    }

    setExporting(true);
    setExportProgress(0);
    setError(null);
    try {
      const result = await exportTimeline({
        timeline,
        video,
        canvas,
        assets: imageCache,
        musicAudio: musicAudioRef.current || undefined,
        onProgress: setExportProgress,
      });
      const ext = exportFileExtension(result.mimeType);
      downloadBlob(result.blob, `${characterId}-${Date.now()}.${ext}`);

      // Proje daha önce kaydedildiyse export çıktısını da sunucuya yükleyip proje geçmişinde
      // görünür kılıyoruz — henüz kaydedilmemiş bir proje için bunu atlıyoruz (id yok).
      if (projectId) {
        const uploaded = await uploadAsset(new File([result.blob], `export.${ext}`, { type: result.mimeType }), 'video');
        if (uploaded) {
          await fetch(`/api/admin/characters/${characterId}/studio/${projectId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ outputUrl: uploaded.url }),
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dışa aktarılamadı.');
    } finally {
      setExporting(false);
      redraw(currentTime);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft className="w-4 h-4" /> Geri
        </button>
        <div className="flex items-center gap-2">
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value.slice(0, MAX_PROJECT_NAME_LENGTH))}
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm w-40 sm:w-56"
            placeholder="Proje adı"
          />
          <button
            onClick={saveProject}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Kaydet
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

      <fieldset disabled={exporting} className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6">
        {/* Sol: önizleme + transport + zaman şeridi + export */}
        <div className="space-y-3 min-w-0">
          <div className="relative bg-black rounded-xl overflow-hidden flex items-center justify-center h-[560px]">
            <div 
              className="relative max-w-full max-h-full"
              style={{ 
                aspectRatio: `${preset.width}/${preset.height}`, 
                width: preset.width >= preset.height ? '100%' : 'auto', 
                height: preset.height > preset.width ? '100%' : 'auto',
                containerType: 'size'
              }}
            >
              <canvas
                ref={canvasRef}
                width={preset.width}
                height={preset.height}
                className="absolute inset-0 w-full h-full block"
              />
              <InteractiveOverlayLayer
                timeline={timeline}
                currentTime={currentTime}
                selected={selected}
                onSelect={setSelected}
                updateOverlayCommon={updateOverlayCommon}
                updateImageOverlay={updateImageOverlay}
                updateTextOverlay={updateTextOverlay}
                imageCache={imageCache}
                onDropAsset={(url, kind, x, y) => {
                  const start = currentTime;
                  const end = Math.min(effectiveDuration || start + 3, start + 3);
                  if (kind === 'image') {
                    if (timeline.overlays.length >= MAX_OVERLAYS) {
                      setError(`En fazla ${MAX_OVERLAYS} overlay eklenebilir.`);
                      return;
                    }
                    const item: StudioImageOverlay = {
                      id: crypto.randomUUID(),
                      kind: 'image',
                      assetUrl: url,
                      startTime: start,
                      endTime: end,
                      x,
                      y,
                      width: 28,
                      opacity: 1,
                    };
                    updateTimeline({ overlays: [...timeline.overlays, item] });
                    setSelected({ type: 'overlay', id: item.id });
                  }
                }}
              />
              <video
                ref={videoRef}
                src={motion.video_url}
                crossOrigin="anonymous"
                playsInline
                preload="auto"
                className="absolute w-px h-px opacity-0 pointer-events-none"
                onLoadedMetadata={handleLoadedMetadata}
              />
              {timeline.music && <audio ref={musicAudioRef} src={timeline.music.assetUrl} className="hidden" />}
              {timeline.aspectRatio === '9:16' && (
                <>
                  <div className="absolute inset-x-0 top-[14%] border-t border-dashed border-amber-400/70 pointer-events-none" />
                  <div className="absolute inset-x-0 bottom-[20%] border-t border-dashed border-amber-400/70 pointer-events-none" />
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="p-2.5 rounded-full bg-slate-900 text-white hover:bg-slate-800 shrink-0"
              aria-label={playing ? 'Duraklat' : 'Oynat'}
            >
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={Math.max(0.1, effectiveDuration)}
              step={0.05}
              value={Math.min(currentTime, effectiveDuration)}
              onChange={(e) => seekTo(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-xs text-slate-500 tabular-nums w-24 text-right shrink-0">
              {currentTime.toFixed(1)}s / {effectiveDuration.toFixed(1)}s
            </span>
          </div>

          <TimelineStrip
            timeline={timeline}
            duration={effectiveDuration}
            currentTime={currentTime}
            selected={selected}
            onSelect={setSelected}
          />

          <div className="pt-2 border-t border-slate-200 space-y-2">
            {exporting && (
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all"
                  style={{ width: `${Math.round(exportProgress * 100)}%` }}
                />
              </div>
            )}
            {exportHint && <p className="text-xs text-amber-700">{exportHint}</p>}
            <button
              onClick={handleExport}
              disabled={exporting}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {exporting ? `Dışa aktarılıyor… %${Math.round(exportProgress * 100)}` : 'Dışa Aktar'}
            </button>
            <p className="text-xs text-slate-400 text-center">
              Gerçek zamanlı kaydediliyor — {effectiveDuration.toFixed(0)} sn&apos;lik video ≈{' '}
              {effectiveDuration.toFixed(0)} sn sürer. Sekmeyi ön planda tut.
            </p>
          </div>
        </div>

        {/* Sağ: inspector */}
        <div className="space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Format</h3>
            <div className="flex flex-wrap gap-2">
              {STUDIO_ASPECT_RATIOS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => updateTimeline({ aspectRatio: p.value })}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    timeline.aspectRatio === p.value
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Kırpma</h3>
            <div className="flex items-center gap-3">
              <NumberField
                label="Başlangıç"
                value={timeline.trim.start}
                onChange={(v) => updateTimeline({ trim: { ...timeline.trim, start: Math.max(0, v) } })}
              />
              <NumberField
                label="Bitiş"
                value={timeline.trim.end || videoDuration}
                onChange={(v) => updateTimeline({ trim: { ...timeline.trim, end: v } })}
              />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1.5">Intro & Outro</h3>
            <p className="text-xs text-slate-400 mb-2">
              Videonun en başında veya sonunda tam ekran gösterilir (ses kesilmez).
            </p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="space-y-2">
                <span className="text-xs font-medium text-slate-700">Intro</span>
                {timeline.intro ? (
                  <div className="rounded-lg border border-slate-200 p-2 space-y-2">
                    <div className="flex justify-between items-start">
                      <img src={timeline.intro.assetUrl} alt="" className="w-10 h-10 rounded object-cover" />
                      <button onClick={() => updateTimeline({ intro: null })} className="p-1 text-slate-400 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div>
                      <NumberField label="Süre(sn)" value={timeline.intro.duration} onChange={(v) => updateTimeline({ intro: { ...timeline.intro!, duration: Math.max(0.1, v) } })} compact />
                    </div>
                    <div className="flex gap-1">
                      {(['cover', 'contain'] as StudioFit[]).map((fit) => (
                        <button
                          key={fit}
                          onClick={() => updateTimeline({ intro: { ...timeline.intro!, fit } })}
                          className={`text-[11px] px-2 py-0.5 rounded-full border ${timeline.intro!.fit === fit ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-300 text-slate-500'}`}
                        >
                          {fit === 'cover' ? 'Kırp' : 'Sığdır'}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <AssetPicker
                    kind="image"
                    assets={assets}
                    uploading={uploading}
                    onUpload={(f) => uploadAsset(f, 'image').then((a) => a && updateTimeline({ intro: { assetUrl: a.url, duration: 2, fit: 'cover' } }))}
                    onPick={(a) => updateTimeline({ intro: { assetUrl: a.url, duration: 2, fit: 'cover' } })}
                  />
                )}
              </div>
              <div className="space-y-2">
                <span className="text-xs font-medium text-slate-700">Outro</span>
                {timeline.outro ? (
                  <div className="rounded-lg border border-slate-200 p-2 space-y-2">
                    <div className="flex justify-between items-start">
                      <img src={timeline.outro.assetUrl} alt="" className="w-10 h-10 rounded object-cover" />
                      <button onClick={() => updateTimeline({ outro: null })} className="p-1 text-slate-400 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div>
                      <NumberField label="Süre(sn)" value={timeline.outro.duration} onChange={(v) => updateTimeline({ outro: { ...timeline.outro!, duration: Math.max(0.1, v) } })} compact />
                    </div>
                    <div className="flex gap-1">
                      {(['cover', 'contain'] as StudioFit[]).map((fit) => (
                        <button
                          key={fit}
                          onClick={() => updateTimeline({ outro: { ...timeline.outro!, fit } })}
                          className={`text-[11px] px-2 py-0.5 rounded-full border ${timeline.outro!.fit === fit ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-300 text-slate-500'}`}
                        >
                          {fit === 'cover' ? 'Kırp' : 'Sığdır'}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <AssetPicker
                    kind="image"
                    assets={assets}
                    uploading={uploading}
                    onUpload={(f) => uploadAsset(f, 'image').then((a) => a && updateTimeline({ outro: { assetUrl: a.url, duration: 2, fit: 'cover' } }))}
                    onPick={(a) => updateTimeline({ outro: { assetUrl: a.url, duration: 2, fit: 'cover' } })}
                  />
                )}
              </div>
            </div>

            <div className="flex items-baseline justify-between mb-1.5">
              <h3 className="text-sm font-semibold text-slate-900">Cutaway&apos;ler</h3>
              <span className="text-xs text-slate-400">
                {timeline.cutaways.length}/{MAX_CUTAWAYS}
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-2">
              Seç ya da yükle — oynatma başlığındaki ana eklenir, video görüntüsü değişir ama ses kesilmez.
            </p>
            <AssetPicker
              kind="image"
              assets={assets}
              uploading={uploading}
              onUpload={(f) => uploadAsset(f, 'image').then((a) => a && addCutaway(a.url))}
              onPick={(a) => addCutaway(a.url)}
            />
            <div className="mt-3 space-y-2">
              {timeline.cutaways.map((c) => (
                <div
                  key={c.id}
                  className={`rounded-lg border p-2 ${
                    selected?.id === c.id ? 'border-blue-400 bg-blue-50' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.assetUrl} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                    <div className="flex-1 flex flex-wrap gap-x-3 gap-y-1">
                      <NumberField label="Başl." value={c.startTime} onChange={(v) => updateCutaway(c.id, { startTime: v })} compact />
                      <NumberField label="Bit." value={c.endTime} onChange={(v) => updateCutaway(c.id, { endTime: v })} compact />
                    </div>
                    <button onClick={() => removeCutaway(c.id)} className="p-1.5 text-slate-400 hover:text-red-600 shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex gap-1 mt-2">
                    {(['cover', 'contain'] as StudioFit[]).map((fit) => (
                      <button
                        key={fit}
                        onClick={() => updateCutaway(c.id, { fit })}
                        className={`text-[11px] px-2 py-0.5 rounded-full border ${
                          c.fit === fit ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-300 text-slate-500'
                        }`}
                      >
                        {fit === 'cover' ? 'Kırp' : 'Sığdır'}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <h3 className="text-sm font-semibold text-slate-900">Overlay&apos;ler</h3>
              <span className="text-xs text-slate-400">
                {timeline.overlays.length}/{MAX_OVERLAYS}
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-2">Videonun üstüne biner — logo, ikinci görsel ya da metin.</p>
            <div className="flex items-center gap-2">
              <AssetPicker
                kind="image"
                assets={assets}
                uploading={uploading}
                onUpload={(f) => uploadAsset(f, 'image').then((a) => a && addImageOverlay(a.url))}
                onPick={(a) => addImageOverlay(a.url)}
              />
              <button
                onClick={addTextOverlay}
                className="w-14 h-14 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:border-slate-400 shrink-0"
                title="Metin ekle"
              >
                <Type className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {timeline.overlays.map((o) => (
                <div
                  key={o.id}
                  className={`rounded-lg border p-2 ${
                    selected?.id === o.id ? 'border-blue-400 bg-blue-50' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                      {o.kind === 'image' ? 'GÖRSEL' : 'METİN'}
                    </span>
                    <div className="flex-1" />
                    <button onClick={() => removeOverlay(o.id)} className="p-1 text-slate-400 hover:text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {o.kind === 'image' && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={o.assetUrl} alt="" className="w-10 h-10 rounded object-cover mb-1.5" />
                  )}

                  {o.kind === 'text' && (
                    <textarea
                      value={o.text}
                      onChange={(e) => updateTextOverlay(o.id, { text: e.target.value.slice(0, MAX_OVERLAY_TEXT_LENGTH) })}
                      rows={2}
                      className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs mb-2"
                    />
                  )}

                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    <NumberField label="Başl." value={o.startTime} onChange={(v) => updateOverlayCommon(o.id, { startTime: v })} compact />
                    <NumberField label="Bit." value={o.endTime} onChange={(v) => updateOverlayCommon(o.id, { endTime: v })} compact />
                    <NumberField label="X%" value={o.x} min={0} step={1} onChange={(v) => updateOverlayCommon(o.id, { x: clampPct(v) })} compact />
                    <NumberField label="Y%" value={o.y} min={0} step={1} onChange={(v) => updateOverlayCommon(o.id, { y: clampPct(v) })} compact />
                    {o.kind === 'image' && (
                      <NumberField
                        label="Genişlik%"
                        value={o.width}
                        min={5}
                        step={1}
                        onChange={(v) => updateImageOverlay(o.id, { width: clampPct(v) })}
                        compact
                      />
                    )}
                    {o.kind === 'text' && (
                      <NumberField
                        label="Punto%"
                        value={o.fontSize}
                        min={1}
                        step={0.5}
                        onChange={(v) => updateTextOverlay(o.id, { fontSize: v })}
                        compact
                      />
                    )}
                  </div>

                  {o.kind === 'text' && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <select
                        value={o.font}
                        onChange={(e) => updateTextOverlay(o.id, { font: e.target.value as OverlayFont })}
                        className="rounded border border-slate-300 px-1.5 py-1 text-xs"
                      >
                        {OVERLAY_FONTS.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={o.align}
                        onChange={(e) => updateTextOverlay(o.id, { align: e.target.value as 'left' | 'center' | 'right' })}
                        className="rounded border border-slate-300 px-1.5 py-1 text-xs"
                      >
                        <option value="left">Sola</option>
                        <option value="center">Ortaya</option>
                        <option value="right">Sağa</option>
                      </select>
                      <input
                        type="color"
                        value={o.color}
                        onChange={(e) => updateTextOverlay(o.id, { color: e.target.value })}
                        className="w-7 h-7 rounded border border-slate-300 bg-white"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Müzik</h3>
            {timeline.music ? (
              <div className="rounded-lg border border-slate-200 p-2 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-600 truncate flex items-center gap-1.5">
                    <Music className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {timeline.music.assetUrl.split('/').pop()}
                  </span>
                  <button onClick={() => updateTimeline({ music: null })} className="p-1 text-slate-400 hover:text-red-600 shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-500">
                  Ses seviyesi
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={timeline.music.volume}
                    onChange={(e) => updateTimeline({ music: { ...timeline.music!, volume: Number(e.target.value) } })}
                    className="flex-1"
                  />
                </label>
              </div>
            ) : (
              <AssetPicker
                kind="audio"
                assets={assets}
                uploading={uploading}
                onUpload={(f) =>
                  uploadAsset(f, 'audio').then((a) => a && updateTimeline({ music: { assetUrl: a.url, volume: 0.5 } }))
                }
                onPick={(a) => updateTimeline({ music: { assetUrl: a.url, volume: 0.5 } })}
              />
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={timeline.wordmark}
              onChange={(e) => updateTimeline({ wordmark: e.target.checked })}
              className="rounded border-slate-300"
            />
            talkinbio.com imzası
          </label>
        </div>
      </fieldset>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = 0.1,
  min = 0,
  compact = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  compact?: boolean;
}) {
  return (
    <label className={`text-[11px] text-slate-500 flex items-center gap-1 ${compact ? '' : ''}`}>
      {label}
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        step={step}
        min={min}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-16 rounded border border-slate-300 px-1.5 py-1 text-xs"
      />
    </label>
  );
}

function AssetPicker({
  kind,
  assets,
  uploading,
  onPick,
  onUpload,
}: {
  kind: StudioAssetKind;
  assets: StudioAsset[];
  uploading: boolean;
  onPick: (asset: StudioAsset) => void;
  onUpload: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const filtered = assets.filter((a) => a.kind === kind);
  const accept = kind === 'image' ? 'image/*' : kind === 'audio' ? 'audio/*' : 'video/*';

  return (
    <div className="flex flex-wrap gap-2">
      {filtered.map((asset) => (
        <button
          key={asset.id}
          onClick={() => onPick(asset)}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('application/json', JSON.stringify({ url: asset.url, kind }));
            e.dataTransfer.effectAllowed = 'copy';
          }}
          className="w-14 h-14 rounded-lg overflow-hidden border border-slate-200 hover:border-blue-400 shrink-0 cursor-grab active:cursor-grabbing"
          title={asset.file_name}
        >
          {kind === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={asset.url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
              <Music className="w-5 h-5" />
            </div>
          )}
        </button>
      ))}
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-14 h-14 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:border-slate-400 disabled:opacity-50 shrink-0"
      >
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}

function TimelineStrip({
  timeline,
  duration,
  currentTime,
  selected,
  onSelect,
}: {
  timeline: StudioTimeline;
  duration: number;
  currentTime: number;
  selected: Selection;
  onSelect: (s: Selection) => void;
}) {
  if (!(duration > 0)) return null;
  const pct = (v: number) => `${Math.min(100, Math.max(0, (v / duration) * 100))}%`;

  return (
    <div className="relative h-8 bg-slate-100 rounded-lg overflow-hidden">
      {timeline.intro && (
        <div 
          className="absolute top-0 bottom-0 bg-slate-800/10 border-r border-slate-300" 
          style={{ left: 0, width: pct(timeline.intro.duration) }} 
          title="Intro" 
        />
      )}
      {timeline.outro && (
        <div 
          className="absolute top-0 bottom-0 bg-slate-800/10 border-l border-slate-300" 
          style={{ left: pct(duration - timeline.outro.duration), width: pct(timeline.outro.duration) }} 
          title="Outro" 
        />
      )}
      {timeline.cutaways.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect({ type: 'cutaway', id: c.id })}
          className={`absolute top-0.5 h-3.5 rounded ${selected?.id === c.id ? 'bg-blue-600' : 'bg-blue-400'}`}
          style={{ left: pct(c.startTime), width: `calc(${pct(c.endTime)} - ${pct(c.startTime)})` }}
          title="Cutaway"
        />
      ))}
      {timeline.overlays.map((o) => (
        <button
          key={o.id}
          onClick={() => onSelect({ type: 'overlay', id: o.id })}
          className={`absolute bottom-0.5 h-3.5 rounded ${selected?.id === o.id ? 'bg-purple-600' : 'bg-purple-300'}`}
          style={{ left: pct(o.startTime), width: `calc(${pct(o.endTime)} - ${pct(o.startTime)})` }}
          title={o.kind === 'image' ? 'Görsel overlay' : 'Metin overlay'}
        />
      ))}
      <div className="absolute top-0 bottom-0 w-px bg-slate-900" style={{ left: pct(currentTime) }} />
    </div>
  );
}

function InteractiveOverlayLayer({
  timeline,
  currentTime,
  selected,
  onSelect,
  updateOverlayCommon,
  updateImageOverlay,
  updateTextOverlay,
  onDropAsset,
  imageCache,
}: {
  timeline: StudioTimeline;
  currentTime: number;
  selected: Selection;
  onSelect: (s: Selection) => void;
  updateOverlayCommon: (id: string, patch: any) => void;
  updateImageOverlay: (id: string, patch: any) => void;
  updateTextOverlay: (id: string, patch: any) => void;
  onDropAsset: (url: string, kind: string, x: number, y: number) => void;
  imageCache: Map<string, HTMLImageElement>;
}) {
  const layerRef = useRef<HTMLDivElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.url && layerRef.current) {
        const rect = layerRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
        onDropAsset(data.url, data.kind, x, y);
      }
    } catch (err) {}
  };

  const activeOverlays = timeline.overlays.filter((o) => currentTime >= o.startTime && currentTime < o.endTime);

  return (
    <div
      ref={layerRef}
      className="absolute inset-0 z-10"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={(e) => {
        if (e.target === layerRef.current) onSelect(null);
      }}
    >
      {activeOverlays.map((o) => (
        <InteractiveOverlayItem
          key={o.id}
          overlay={o}
          isSelected={selected?.type === 'overlay' && selected.id === o.id}
          onSelect={() => onSelect({ type: 'overlay', id: o.id })}
          updateCommon={(patch: any) => updateOverlayCommon(o.id, patch)}
          updateImage={(patch: any) => updateImageOverlay(o.id, patch)}
          updateText={(patch: any) => updateTextOverlay(o.id, patch)}
          containerRef={layerRef}
          imageCache={imageCache}
        />
      ))}
    </div>
  );
}

function InteractiveOverlayItem({
  overlay,
  isSelected,
  onSelect,
  updateCommon,
  updateImage,
  updateText,
  containerRef,
  imageCache,
}: {
  overlay: StudioImageOverlay | StudioTextOverlay;
  isSelected: boolean;
  onSelect: () => void;
  updateCommon: (patch: any) => void;
  updateImage: (patch: any) => void;
  updateText: (patch: any) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  imageCache: Map<string, HTMLImageElement>;
}) {
  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    onSelect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startOverlayX = overlay.x;
    const startOverlayY = overlay.y;
    const container = containerRef.current;
    if (!container) return;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const dx = ((moveEvent.clientX - startX) / rect.width) * 100;
      const dy = ((moveEvent.clientY - startY) / rect.height) * 100;

      updateCommon({
        x: Math.max(0, Math.min(100, startOverlayX + dx)),
        y: Math.max(0, Math.min(100, startOverlayY + dy)),
      });
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const handleResizePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = overlay.kind === 'image' ? overlay.width : overlay.fontSize;
    const container = containerRef.current;
    if (!container) return;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      if (overlay.kind === 'image') {
        const dx = ((moveEvent.clientX - startX) / rect.width) * 100;
        updateImage({ width: Math.max(5, Math.min(100, startWidth + dx)) });
      } else {
        const dy = ((moveEvent.clientY - startY) / rect.height) * 100;
        updateText({ fontSize: Math.max(1, Math.min(100, startWidth + dy)) });
      }
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // For images, we try to compute height so the bounding box perfectly matches
  let boxHeight = 'auto';
  if (overlay.kind === 'image') {
    const img = imageCache.get(overlay.assetUrl);
    if (img) {
      const imgAspect = (img.naturalWidth || 1) / (img.naturalHeight || 1);
      // Box width is overlay.width% of container width.
      // Box height% = Box width% / imgAspect * (containerAspect / 1). 
      // Actually it's easier to let CSS do it if we use aspect-ratio!
      boxHeight = 'auto'; // we will use aspect-ratio inline style
    }
  }

  const imgAspect = overlay.kind === 'image' && imageCache.get(overlay.assetUrl)
    ? (imageCache.get(overlay.assetUrl)!.naturalWidth || 1) / (imageCache.get(overlay.assetUrl)!.naturalHeight || 1)
    : undefined;

  return (
    <div
      className={`absolute cursor-move border-2 ${
        isSelected ? 'border-blue-500 bg-blue-500/10' : 'border-transparent hover:border-white/30'
      }`}
      style={{
        left: `${overlay.x}%`,
        top: `${overlay.y}%`,
        width: overlay.kind === 'image' ? `${overlay.width}%` : 'auto',
        aspectRatio: imgAspect ? `${imgAspect}` : undefined,
        padding: overlay.kind === 'text' ? '2px' : '0',
        transform: 'translate(0, 0)',
      }}
      onPointerDown={handlePointerDown}
    >
      {overlay.kind === 'text' && (
        <div
          style={{
            opacity: 0,
            fontSize: `${overlay.fontSize}cqh`,
            fontFamily: overlay.font,
            whiteSpace: 'nowrap',
          }}
        >
          {overlay.text}
        </div>
      )}

      {isSelected && (
        <div
          className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-nwse-resize"
          onPointerDown={handleResizePointerDown}
        />
      )}
    </div>
  );
}
