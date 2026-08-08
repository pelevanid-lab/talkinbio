'use client';

import { useEffect, useRef, useState } from 'react';
import { Reorder } from 'framer-motion';
import {
  ArrowLeft,
  Captions,
  Download,
  Globe,
  ImageIcon,
  Languages,
  Loader2,
  Music,
  Pause,
  Play,
  Save,
  Scissors,
  Sparkles,
  Timer,
  Trash2,
  Type,
  Upload,
  Video,
} from 'lucide-react';
import type { CharacterClip } from '@/config/clips';
import { OVERLAY_FONTS, OVERLAY_LOCALES, type OverlayFont, type OverlayLocale } from '@/config/characters';
import {
  AUDIO_ENHANCE_COST_USD,
  STUDIO_CAPTION_TRANSLATE_COST_USD,
  STUDIO_DUB_COST_USD_PER_MINUTE,
  STUDIO_TRANSCRIBE_COST_USD,
} from '@/config/beiweLab';
import { creditsForCost } from '@/config/pricing';
import {
  MAX_CAPTIONS,
  MAX_CUTAWAYS,
  MAX_DUBS,
  MAX_OVERLAYS,
  MAX_OVERLAY_TEXT_LENGTH,
  MAX_PROJECT_NAME_LENGTH,
  MAX_COUNTDOWN_STEPS,
  MAX_SEQUENCE_CLIPS,
  MAX_SEQUENCE_LAYOUTS,
  MAX_ZOOMS,
  MAX_REFRAME_POINTS,
  MIN_COUNTDOWN_STEPS,
  STUDIO_ASPECT_RATIOS,
  DEFAULT_COLOR_GRADE,
  DEFAULT_COUNTDOWN,
  DEFAULT_COUNTDOWN_DURATION,
  DEFAULT_TIMELINE,
  DEFAULT_TRANSITION,
  sequenceClipDuration,
  sequenceDuration,
  resolveSequencePosition,
  studioAspectPreset,
  type StudioAsset,
  type StudioAssetKind,
  type StudioCaption,
  type StudioColorGrade,
  type StudioCountdown,
  type StudioCutaway,
  type StudioDub,
  type StudioFit,
  type StudioImageOverlay,
  type StudioProject,
  type StudioSequenceClip,
  type StudioSequenceLayout,
  type StudioTextOverlay,
  type StudioTimeline,
  type StudioVideoOverlay,
  type StudioZoom,
  type StudioReframePoint,
  type StudioCutRange,
  CAPTION_STYLE_PRESETS,
  FILLER_WORDS_TR,
  findSilenceCuts,
  groupCaptions,
  parseStudioTimeline,
  removeCutRanges,
} from '@/config/studio';
import { countdownPlan, scheduleCountdownBeeps } from '@/utils/countdown';
import { downloadBlob } from '@/utils/imageOverlay';
import { PLATFORM_TARGET_LUFS, loudnessNormalizationGain, measureIntegratedLoudness } from '@/utils/loudness';
import {
  collectSequenceVideoClips,
  collectStudioImageUrls,
  collectStudioVideoOverlayUrls,
  drawFrame,
  exportFileExtension,
  exportHasIncompatibleAudio,
  exportTimeline,
  exportTimelineFast,
  pickExportMimeType,
  preloadStudioImages,
  syncSequenceVideos,
  syncVideoOverlays,
} from '@/utils/studioRenderer';

type Selection = { type: 'cutaway' | 'overlay' | 'zoom' | 'reframe'; id: string } | null;

type Props = {
  characterId: string;
  motion: CharacterClip;
  /** Ortak klip havuzu — Sekans panelindeki "+ Klip (havuzdan)" seçicisi buradan besleniyor. */
  clips: CharacterClip[];
  project: StudioProject | null;
  assets: StudioAsset[];
  onAssetUploaded: (asset: StudioAsset) => void;
  onAssetDeleted: (assetId: string) => void;
  onProjectSaved: (project: StudioProject) => void;
  onBack: () => void;
};

const clampPct = (v: number) => Math.min(100, Math.max(0, v));

/** Redub hedef dili + altyazı locale şeridi için kısa etiketler. */
const CAPTION_LOCALE_LABEL: Record<OverlayLocale, string> = { tr: 'TR', en: 'EN', ru: 'RU' };

export default function StudioEditor({
  characterId,
  motion,
  clips,
  project,
  assets,
  onAssetUploaded,
  onProjectSaved,
  onBack,
}: Props) {
  // `project.timeline` DB'den ham (doğrulanmamış) geliyor — bu proje daha ÖNCEKİ bir şemayla
  // (ör. zoom/altyazı/videoVolume/sequence alanları eklenmeden önce) kaydedilmiş olabilir.
  // `parseStudioTimeline` eksik alanları makul varsayılanlara tamamlıyor, yoksa
  // `timeline.captions.find(...)` gibi bir erişim eski bir projede undefined üzerinde patlar.
  // `sequence` yoksa (proje `sequence` eklenmeden ÖNCE kaydedilmiş) `fallback` ile eski
  // `motion` prop'undan tek elemanlı bir sekans sentezleniyor (bkz. parseStudioTimeline yorumu).
  // Proje hiç yoksa (yeni proje, StudioSection'ın picker'ından tek bir klip seçilerek açıldı)
  // aynı tek-elemanlı sekans doğrudan kuruluyor.
  const [timeline, setTimeline] = useState<StudioTimeline>(() => {
    const fallback = { clipId: motion.id, videoUrl: motion.video_url };
    if (project?.timeline) {
      return parseStudioTimeline(project.timeline, fallback) || DEFAULT_TIMELINE;
    }
    return {
      ...DEFAULT_TIMELINE,
      sequence: [
        {
          id: crypto.randomUUID(),
          kind: 'video',
          assetUrl: motion.video_url,
          clipId: motion.id,
          sourceStart: 0,
          sourceEnd: 0,
          holdDuration: 0,
          fit: 'cover',
          transitionIn: DEFAULT_TRANSITION,
        },
      ],
    };
  });
  const [projectId, setProjectId] = useState<string | null>(project?.id ?? null);
  const [projectName, setProjectName] = useState(project?.name ?? 'Adsız proje');
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(project?.thumbnail_url ?? null);
  const [savingThumbnail, setSavingThumbnail] = useState(false);

  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState<Selection>(null);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  // Export'un iki aşaması var: önce ses gürlüğü ölçülür (ilerleme yüzdesi anlamsız, birkaç
  // saniye), sonra gerçek zamanlı kayıt başlar. Kullanıcı ilk aşamada "%0'da takıldı"
  // sanmasın diye buton metni ayrışıyor.
  const [exportStage, setExportStage] = useState<'measuring' | 'recording'>('recording');
  const [error, setError] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [enhancingAudio, setEnhancingAudio] = useState(false);
  const [dubbing, setDubbing] = useState(false);
  // Sessizlik/dolgu kelime temizliği — "Sessizlikleri bul" tarama sonucunu bir ÖNİZLEME
  // listesi olarak tutar (null = henüz taranmadı), her aday kendi checkbox'ıyla `selected`
  // taşır ki kullanıcı "Uygula"dan önce istemediğini işaretini kaldırabilsin (kör otomatik
  // silme YOK — Redub'daki Önizle/İşle ile aynı iki-adımlı güvenlik deseni).
  const [silenceThreshold, setSilenceThreshold] = useState(0.6);
  const [cutFillerWords, setCutFillerWords] = useState(false);
  const [silenceCandidates, setSilenceCandidates] = useState<(StudioCutRange & { selected: boolean })[] | null>(null);
  const [dubTargetLocale, setDubTargetLocale] = useState<OverlayLocale>('en');
  const [translatingLocale, setTranslatingLocale] = useState<OverlayLocale | null>(null);
  // Önizleme/export hangi altyazı dilini yakıyor — 'source' = timeline.captions (whisper
  // transkripti), bir locale ise timeline.translatedCaptions[locale] (bkz. redraw/exportArgs).
  const [activeCaptionLocale, setActiveCaptionLocale] = useState<OverlayLocale | 'source'>('source');
  // rAF döngüsündeki `redraw` render-dışı bir closure — `playingRef` ile AYNI gerekçe,
  // state'i doğrudan değil ref'ten okumalı yoksa dil değişimi canlı önizlemeye yansımaz.
  const activeCaptionLocaleRef = useRef(activeCaptionLocale);
  useEffect(() => {
    activeCaptionLocaleRef.current = activeCaptionLocale;
  }, [activeCaptionLocale]);
  // Son export'un hangi yolla (WebCodecs/gerçek-zamanlı) ve ne kadar sürede tamamlandığı —
  // proje planındaki "gerçek kazancı sayıyla doğrula" maddesinin karşılığı, kurucu iki yolu
  // gözle kıyaslayabilsin diye.
  const [lastExportInfo, setLastExportInfo] = useState<{
    method: 'webcodecs' | 'realtime';
    elapsedSeconds: number;
    contentSeconds: number;
  } | null>(null);

  // Sekans video elemanlarının canlı <video> elementleri — `videoOverlayElsRef` ile AYNI
  // desen (aşağısı), assetUrl DEĞİL clip.ID ile anahtarlanır (bkz. StudioSequenceClip yorumu:
  // aynı video iki kez farklı kırpmayla sekansta yer alabilir). Süreleri (`.duration`) render'da
  // (sourceDuration/masterEnd hesapları, TimelineStrip genişlikleri) lazım olduğu için AYRICA
  // `sequenceDurations` state'inde tutuluyor — metadata yüklenince güncelleniyor.
  const sequenceVideoElsRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const [sequenceDurations, setSequenceDurations] = useState<Map<string, number>>(new Map());
  const sequenceDurationsRef = useRef(sequenceDurations);
  useEffect(() => {
    sequenceDurationsRef.current = sequenceDurations;
  }, [sequenceDurations]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const musicAudioRef = useRef<HTMLAudioElement>(null);
  const enhancedAudioRef = useRef<HTMLAudioElement>(null);
  const rafRef = useRef<number | null>(null);
  const virtualTimeRef = useRef(0);
  const lastVirtualTickRef = useRef(0);
  // Eskiden TEK bölüm vardı (preroll/video/postroll, `hasPlayedVideoRef` ile ayrışırdı) — şimdi
  // "video" bölümü N elemanlı bir SEKANS, `phaseRef` + `seqIndexRef` bunun hangi elemanında
  // olduğumuzu tutuyor (bkz. `exportTimeline`'daki AYNI state machine, studioRenderer.ts).
  const phaseRef = useRef<'preroll' | 'sequence' | 'postroll'>('preroll');
  const seqIndexRef = useRef(0);
  const seqItemStartMasterRef = useRef(0);
  // `playing` React state'inin ref aynası — rAF döngüsü/redraw gibi uzun ömürlü, render-dışı
  // kodun güncel değeri stale closure olmadan okuyabilmesi için (timelineRef ile AYNI gerekçe).
  const playingRef = useRef(false);
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);
  // Export ilerleme çubuğu ve buton yüzdesi — BİLEREK React state DEĞİL. Önceki turda
  // setExportProgress'i 150ms'de bire kısmıştık ama her tetiklendiğinde YİNE koca editör
  // ağacını (canvas + 360px'lik tüm kontrol paneli) yeniden render ediyordu; ölçülen export
  // dosyasında tam o periyotla (~150-300ms'de bir) 90-116ms'lik kare donmaları çıktı —
  // reconciliation'ın kendisi darboğazdı, sıklığı değil. Burada DOM'a doğrudan yazıyoruz,
  // React hiç araya girmiyor.
  const progressFillRef = useRef<HTMLDivElement>(null);
  const progressLabelRef = useRef<HTMLSpanElement>(null);
  // Önizleme biplerinin AudioContext'i — export'unkinden AYRI ve yalnızca osilatör çalıyor.
  // Export'taki bağlam `createMediaElementSource` ile video elementini de grafiğe alıyor;
  // burada ona hiç dokunmuyoruz, çünkü bir medya elementi kalıcı olarak tek bir grafiğe
  // bağlanır — önizleme uğruna bağlasaydık export'un ses yönlendirmesini bozardık.
  const previewAudioCtxRef = useRef<AudioContext | null>(null);
  const cancelBeepsRef = useRef<(() => void) | null>(null);
  // Ölçülen LUFS kaynak+kırpma aralığı başına önbelleklenir — aynı projeyi ikinci kez dışa
  // aktarırken sesi yeniden indirip çözmek gereksiz (ölçüm deterministik).
  const loudnessCacheRef = useRef<Map<string, number>>(new Map());

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

  // Video-overlay'lerin canlı <video> elementleri — imageCache'in aksine React state'te
  // TUTULMUYOR (video elementini state'e koymak gereksiz re-render tetikler); bunun yerine
  // aşağıda hidden <video> olarak render edilip ref callback'iyle bu Map'e yazılıyorlar.
  // SADECE redraw/tick/export gibi render-DIŞI (effect/handler/rAF) kod bu ref'i okuyabilir —
  // render sırasında `.current` okumak React'in kurallarına aykırı (bkz. react-hooks/refs).
  // İnteraktif kutunun en-boy oranı gibi RENDER'da lazım olan bilgi için ayrıca
  // `videoOverlayAspects` state'i tutuluyor, metadata yüklenince güncelleniyor.
  const videoOverlayElsRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const [videoOverlayAspects, setVideoOverlayAspects] = useState<Map<string, number>>(new Map());
  const videoOverlayUrls = collectStudioVideoOverlayUrls(timeline);

  const preset = studioAspectPreset(timeline.aspectRatio);
  const sourceDuration = sequenceDuration(timeline.sequence, sequenceDurations);
  const masterStart = Math.min(0, timeline.intro?.offset ?? 0);
  const masterEnd = Math.max(sourceDuration, sourceDuration + (timeline.outro?.offset ?? 0));

  // Redub `motion.video_url`'i (ham kaynak) hedefliyor — trim/sekans DEĞİL, `transcribe`/
  // `enhanceMotionAudio` ile AYNI basitleştirme (bkz. o fonksiyonların yorumları). Süre
  // tahmini için önce o klibin GERÇEK metadata süresi denenir (`sequenceDurations`), yoksa
  // tüm sekansın süresine düşülür — maliyet dakikaya YUKARI yuvarlandığı için hafif bir
  // fazla tahmin zararsız (asla eksik faturalamaz).
  const dubSourceClip = timeline.sequence.find((c) => c.kind === 'video' && c.assetUrl === motion.video_url);
  const dubDurationSeconds = (dubSourceClip && sequenceDurations.get(dubSourceClip.id)) || sourceDuration || 0;

  // "Böl" butonu sadece playhead gerçekten bir VİDEO klibin içindeyse aktif — image
  // klipte veya intro/outro/boşlukta (resolveSequencePosition null döner) devre dışı.
  const splitCandidate = resolveSequencePosition(timeline.sequence, currentTime, sequenceDurations);
  const canSplitAtPlayhead = splitCandidate?.clip.kind === 'video';

  const updateTimeline = (patch: Partial<StudioTimeline>) => setTimeline((prev) => ({ ...prev, ...patch }));

  /** Önizleme bipleri için AudioContext'i ilk ihtiyaçta açar (kullanıcı etkileşimi öncesi açmak tarayıcı tarafından engelleniyor). */
  const ensurePreviewAudioContext = (): AudioContext | null => {
    if (previewAudioCtxRef.current) return previewAudioCtxRef.current;
    const Ctor =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    previewAudioCtxRef.current = new Ctor();
    return previewAudioCtxRef.current;
  };

  useEffect(() => {
    return () => {
      cancelBeepsRef.current?.();
      previewAudioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  /** Intro'nun geri sayım ayarlarını kısmi günceller — geri sayım yoksa hiçbir şey yapmaz. */
  const updateCountdown = (patch: Partial<StudioCountdown>) =>
    setTimeline((prev) =>
      prev.intro?.countdown
        ? { ...prev, intro: { ...prev.intro, countdown: { ...prev.intro.countdown, ...patch } } }
        : prev,
    );

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
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // `playingRef` (React state aynası) — tekil bir elementin `.paused`'ına bakmak artık
    // yeterli değil, aktif olmayan elemanlar zaten `syncSequenceVideos` tarafından duraklatılıyor.
    const isPlaying = playingRef.current;
    syncSequenceVideos(timelineRef.current.sequence, time, isPlaying, sequenceVideoElsRef.current);
    syncVideoOverlays(timelineRef.current.overlays, time, isPlaying, videoOverlayElsRef.current);
    const captionLocale = activeCaptionLocaleRef.current;
    drawFrame({
      ctx,
      timeline: timelineRef.current,
      time,
      sequenceVideos: sequenceVideoElsRef.current,
      assets: imageCacheRef.current,
      videoOverlays: videoOverlayElsRef.current,
      captionsOverride: captionLocale === 'source' ? undefined : timelineRef.current.translatedCaptions[captionLocale],
    });
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

  // Duraklatılmışken bir alan elle düzenlenince (ör. zoom hedefi, cutaway fit'i, overlay
  // opaklığı) canvas'ı hemen yeniden çiz — yoksa değişiklik ancak play/scrub tetiklenince
  // görünür olur, bu da özellikle zoom hedefini konumlarken kafa karıştırıcı olurdu.
  useEffect(() => {
    if (!playing) redraw(currentTime);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline]);

  // `enhancedAudioUrl` varsa anlatım ONDAN çalınır — orijinal video sesi hem hoparlörde
  // duyulmasın hem Web Audio grafiğine (export) karışmasın diye `muted` yapılıyor
  // (studioRenderer.exportTimeline de aynı bayrağa göre hangi kaynağı kaydedeceğine karar veriyor).
  // v1 SINIRI: `enhancedAudioUrl` yalnızca tek elemanlı (legacy) sekansta anlamlı (bkz.
  // exportTimeline'daki useEnhancedAudio yorumu) ama mute'u YİNE DE tüm sekans elemanlarına
  // uyguluyoruz — çok elemanlı bir sekansta zaten enhancedAudioUrl kullanıcı tarafından
  // ayarlanmamış olur (UI onu sadece tek-klip akışında sunuyor).
  useEffect(() => {
    for (const el of sequenceVideoElsRef.current.values()) el.muted = !!timeline.enhancedAudioUrl;
  }, [timeline.enhancedAudioUrl, timeline.sequence]);

  // Anlatım ses seviyesi — aktif kaynak orijinal video mu yoksa iyileştirilmiş ses mi
  // olduğuna bakılmaksızın ikisine de uygulanıyor (sadece biri gerçekten duyulur/kaydedilir).
  useEffect(() => {
    for (const el of sequenceVideoElsRef.current.values()) el.volume = timeline.videoVolume;
    if (enhancedAudioRef.current) enhancedAudioRef.current.volume = timeline.videoVolume;
  }, [timeline.videoVolume, timeline.sequence]);

  const stopLoop = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  /** Bir sekans elemanına geçer — video ise kendi elementini sourceStart'a sarıp oynatmaya
   * başlar (ve varsa legacy enhancedAudio'yu ona senkronlar), görsel ise sanal saati bu
   * elemanın başlangıç zamanına sıfırlar. `exportTimeline`'daki `startSequenceItem` ile
   * AYNI mantık (bkz. studioRenderer.ts) — burası önizleme/rAF tarafı. */
  const startSequenceItemPreview = (index: number, masterAt: number) => {
    seqIndexRef.current = index;
    seqItemStartMasterRef.current = masterAt;
    const tl = timelineRef.current;
    const clip = tl.sequence[index];
    if (!clip) return;
    if (clip.kind === 'video') {
      const el = sequenceVideoElsRef.current.get(clip.id);
      if (el) {
        el.currentTime = clip.sourceStart;
        el.play().catch(() => {});
      }
      if (tl.enhancedAudioUrl && enhancedAudioRef.current && tl.sequence.length <= 1 && el) {
        enhancedAudioRef.current.currentTime = el.currentTime;
        enhancedAudioRef.current.play().catch(() => {});
      }
    } else {
      virtualTimeRef.current = masterAt;
      lastVirtualTickRef.current = performance.now();
    }
  };

  const loop = () => {
    const tl = timelineRef.current;
    if (tl.sequence.length === 0) {
      rafRef.current = null;
      return;
    }
    const liveDurations = sequenceDurationsRef.current;
    const srcDuration = sequenceDuration(tl.sequence, liveDurations);
    const mEnd = Math.max(srcDuration, srcDuration + (tl.outro?.offset ?? 0));

    const now = performance.now();
    const activeClip = phaseRef.current === 'sequence' ? tl.sequence[seqIndexRef.current] : undefined;
    const activeEl =
      activeClip?.kind === 'video' ? sequenceVideoElsRef.current.get(activeClip.id) ?? null : null;
    const usingVirtualClock = phaseRef.current !== 'sequence' || !activeEl;

    let masterTime: number;

    if (usingVirtualClock) {
      // Pre-roll (Intro), Post-roll (Outro) VEYA sekansın o anki elemanı bir sabit görsel.
      const delta = (now - lastVirtualTickRef.current) / 1000;
      masterTime = virtualTimeRef.current + delta;
      virtualTimeRef.current = masterTime;
      lastVirtualTickRef.current = now;
    } else {
      // Sekansın aktif elemanı video: saat tamamen o elementin kendi oynatımına bağlıdır.
      masterTime = seqItemStartMasterRef.current + (activeEl!.currentTime - (activeClip as StudioSequenceClip).sourceStart);
      virtualTimeRef.current = masterTime;
      lastVirtualTickRef.current = now;
    }

    // Faz/eleman geçişlerini kontrol et — `exportTimeline`'daki tick ile AYNI mantık.
    if (phaseRef.current === 'preroll' && masterTime >= 0) {
      phaseRef.current = 'sequence';
      masterTime = 0;
      startSequenceItemPreview(0, 0);
    } else if (phaseRef.current === 'sequence') {
      const clip = tl.sequence[seqIndexRef.current];
      const clipDuration = clip ? sequenceClipDuration(clip, liveDurations) : 0;
      const itemEndMaster = seqItemStartMasterRef.current + clipDuration;
      const itemFinished = !clip
        ? true
        : clip.kind === 'video'
          ? (() => {
              const el = sequenceVideoElsRef.current.get(clip.id);
              return el ? el.currentTime >= clip.sourceStart + clipDuration || el.ended : true;
            })()
          : masterTime >= itemEndMaster;

      if (itemFinished) {
        if (clip?.kind === 'video') sequenceVideoElsRef.current.get(clip.id)?.pause();
        const nextIndex = seqIndexRef.current + 1;
        if (nextIndex < tl.sequence.length) {
          startSequenceItemPreview(nextIndex, itemEndMaster);
          masterTime = itemEndMaster;
        } else {
          phaseRef.current = 'postroll';
          virtualTimeRef.current = itemEndMaster;
          masterTime = itemEndMaster;
          lastVirtualTickRef.current = performance.now();
        }
      }
    }

    // İyileştirilmiş ses (legacy tek-klip) videoyla BAĞIMSIZ oynuyor (ayrı <audio> elementi) —
    // uzun oynatmada birikebilecek kaymayı burada da düzeltiyoruz.
    const enhancedEl = enhancedAudioRef.current;
    const currentActiveEl = phaseRef.current === 'sequence' ? activeSeqVideoEl() : null;
    if (
      tl.enhancedAudioUrl &&
      enhancedEl &&
      tl.sequence.length <= 1 &&
      currentActiveEl &&
      !currentActiveEl.paused &&
      Math.abs(enhancedEl.currentTime - currentActiveEl.currentTime) > 0.15
    ) {
      enhancedEl.currentTime = currentActiveEl.currentTime;
    }

    if (masterTime >= mEnd) {
      for (const clip of tl.sequence) if (clip.kind === 'video') sequenceVideoElsRef.current.get(clip.id)?.pause();
      musicAudioRef.current?.pause();
      enhancedAudioRef.current?.pause();
      setPlaying(false);
      rafRef.current = null;
      setCurrentTime(mEnd);
      redraw(mEnd);
      return;
    }

    redraw(masterTime);
    setCurrentTime(masterTime);
    rafRef.current = requestAnimationFrame(loop);
  };

  /** `phaseRef.current === 'sequence'` iken aktif elemanın <video> elementi, yoksa null —
   * `loop`/senkron kodların tekrarını azaltan küçük bir yardımcı. */
  const activeSeqVideoEl = (): HTMLVideoElement | null => {
    const clip = timelineRef.current.sequence[seqIndexRef.current];
    return clip?.kind === 'video' ? sequenceVideoElsRef.current.get(clip.id) ?? null : null;
  };

  const togglePlay = async () => {
    if (timeline.sequence.length === 0) return;

    if (playing) {
      for (const clip of timeline.sequence) if (clip.kind === 'video') sequenceVideoElsRef.current.get(clip.id)?.pause();
      musicAudioRef.current?.pause();
      enhancedAudioRef.current?.pause();
      cancelBeepsRef.current?.();
      cancelBeepsRef.current = null;
      setPlaying(false);
      stopLoop();
      return;
    }

    if (currentTime >= masterEnd) {
      setCurrentTime(masterStart);
      virtualTimeRef.current = masterStart;
    } else {
      virtualTimeRef.current = currentTime;
    }
    lastVirtualTickRef.current = performance.now();

    // Hangi fazdan/sekans elemanından başlanacağını çöz.
    if (virtualTimeRef.current < 0) {
      phaseRef.current = 'preroll';
    } else if (virtualTimeRef.current >= sourceDuration) {
      phaseRef.current = 'postroll';
    } else {
      phaseRef.current = 'sequence';
      const resolved = resolveSequencePosition(timeline.sequence, virtualTimeRef.current, sequenceDurations);
      if (resolved) {
        seqIndexRef.current = resolved.index;
        seqItemStartMasterRef.current = virtualTimeRef.current - resolved.localTime;
      }
    }

    setPlaying(true);

    if (musicAudioRef.current) {
      musicAudioRef.current.volume = timeline.music?.volume ?? 0.5;
      musicAudioRef.current.play().catch(() => {});
    }

    if (phaseRef.current === 'sequence') {
      const clip = timeline.sequence[seqIndexRef.current];
      if (clip?.kind === 'video') {
        const el = sequenceVideoElsRef.current.get(clip.id);
        if (el) {
          el.currentTime = clip.sourceStart + (virtualTimeRef.current - seqItemStartMasterRef.current);
          if (timeline.enhancedAudioUrl && enhancedAudioRef.current && timeline.sequence.length <= 1) {
            enhancedAudioRef.current.currentTime = el.currentTime;
            await enhancedAudioRef.current.play().catch(() => {});
          }
          await el.play().catch(() => {});
        }
      }
    }

    // Geri sayım bipleri önizlemede de duyulmalı
    const countdown = timeline.intro?.countdown;
    if (countdown?.sound) {
      const elapsed = virtualTimeRef.current - timeline.intro!.offset;
      if (elapsed >= 0 && elapsed < timeline.intro!.duration) {
        const audioCtx = ensurePreviewAudioContext();
        if (audioCtx) {
          await audioCtx.resume().catch(() => {});
          cancelBeepsRef.current = scheduleCountdownBeeps(
            audioCtx,
            audioCtx.destination,
            countdownPlan(timeline.intro!.duration, countdown.steps),
            audioCtx.currentTime,
            elapsed,
          );
        }
      }
    }

    rafRef.current = requestAnimationFrame(loop);
  };

  const seekTo = (masterTime: number) => {
    if (playing) {
      for (const clip of timeline.sequence) if (clip.kind === 'video') sequenceVideoElsRef.current.get(clip.id)?.pause();
      musicAudioRef.current?.pause();
      enhancedAudioRef.current?.pause();
      cancelBeepsRef.current?.();
      cancelBeepsRef.current = null;
      setPlaying(false);
      stopLoop();
    }

    virtualTimeRef.current = masterTime;

    if (masterTime >= 0 && masterTime < sourceDuration) {
      const resolved = resolveSequencePosition(timeline.sequence, masterTime, sequenceDurations);
      if (resolved) {
        phaseRef.current = 'sequence';
        seqIndexRef.current = resolved.index;
        seqItemStartMasterRef.current = masterTime - resolved.localTime;
      }
      if (resolved?.clip.kind === 'video') {
        const el = sequenceVideoElsRef.current.get(resolved.clip.id);
        if (el) {
          const target = resolved.clip.sourceStart + resolved.localTime;
          const onSeeked = () => {
            el.removeEventListener('seeked', onSeeked);
            if (enhancedAudioRef.current && timeline.sequence.length <= 1) enhancedAudioRef.current.currentTime = target;
            redraw(masterTime);
            setCurrentTime(masterTime);
          };
          el.addEventListener('seeked', onSeeked);
          el.currentTime = target;
          return;
        }
      }
      redraw(masterTime);
      setCurrentTime(masterTime);
    } else {
      // Preroll/postroll — sınırdaki klibi (varsa) kendi ucuna "park ederek" bir sonraki
      // geçişte stale kare gösterilmesini engelliyoruz (eski tek-video davranışının aynısı).
      phaseRef.current = masterTime < 0 ? 'preroll' : 'postroll';
      const boundaryClip = masterTime < 0 ? timeline.sequence[0] : timeline.sequence[timeline.sequence.length - 1];
      if (boundaryClip?.kind === 'video') {
        const el = sequenceVideoElsRef.current.get(boundaryClip.id);
        if (el) {
          el.currentTime =
            masterTime < 0
              ? boundaryClip.sourceStart
              : boundaryClip.sourceStart + sequenceClipDuration(boundaryClip, sequenceDurations);
        }
      }
      redraw(masterTime);
      setCurrentTime(masterTime);
    }
  };

  // --- Cutaway / Overlay / Zoom / Müzik düzenleme yardımcıları ---

  const addZoom = () => {
    if (timeline.zooms.length >= MAX_ZOOMS) {
      setError(`En fazla ${MAX_ZOOMS} zoom eklenebilir.`);
      return;
    }
    const start = currentTime;
    const end = Math.min(masterEnd || start + 4, start + 4);
    const item: StudioZoom = {
      id: crypto.randomUUID(),
      startTime: start,
      endTime: end,
      x: 50,
      y: 50,
      scale: 1.6,
      transition: 0.4,
    };
    updateTimeline({ zooms: [...timeline.zooms, item] });
    setSelected({ type: 'zoom', id: item.id });
  };

  const updateZoom = (id: string, patch: Partial<StudioZoom>) =>
    updateTimeline({ zooms: timeline.zooms.map((z) => (z.id === id ? { ...z, ...patch } : z)) });

  const removeZoom = (id: string) => {
    updateTimeline({ zooms: timeline.zooms.filter((z) => z.id !== id) });
    if (selected?.type === 'zoom' && selected.id === id) setSelected(null);
  };

  // --- Yeniden kadraj (akıllı pan) — Zoom ile AYNI ekleme deseni, ama noktalar `time`'a
  // göre SIRALI kalmalı (bkz. resolveReframePoint yorumu) — her ekleme/düzenlemede yeniden sort. ---

  const addReframePoint = () => {
    if (timeline.reframe.length >= MAX_REFRAME_POINTS) {
      setError(`En fazla ${MAX_REFRAME_POINTS} yeniden kadraj noktası eklenebilir.`);
      return;
    }
    const item: StudioReframePoint = { id: crypto.randomUUID(), time: currentTime, x: 50, y: 50 };
    updateTimeline({ reframe: [...timeline.reframe, item].sort((a, b) => a.time - b.time) });
    setSelected({ type: 'reframe', id: item.id });
  };

  const updateReframePoint = (id: string, patch: Partial<StudioReframePoint>) =>
    updateTimeline({
      reframe: timeline.reframe.map((p) => (p.id === id ? { ...p, ...patch } : p)).sort((a, b) => a.time - b.time),
    });

  const removeReframePoint = (id: string) => {
    updateTimeline({ reframe: timeline.reframe.filter((p) => p.id !== id) });
    if (selected?.type === 'reframe' && selected.id === id) setSelected(null);
  };

  // --- Sekans (film rulosu) düzenleme yardımcıları ---

  /** Ortak klip havuzundan bir video sekansın SONUNA eklenir — süresi bilinmediği için
   * (metadata henüz yüklenmedi) sourceEnd=0 sentinel'iyle başlar, ilk kare yüklenince
   * `sequenceDurations` state'i gerçek değeri kaydeder (bkz. video eleman ref callback'i). */
  const addSequenceVideoClip = (clip: CharacterClip) => {
    if (timeline.sequence.length >= MAX_SEQUENCE_CLIPS) {
      setError(`En fazla ${MAX_SEQUENCE_CLIPS} sekans elemanı eklenebilir.`);
      return;
    }
    const item: StudioSequenceClip = {
      id: crypto.randomUUID(),
      kind: 'video',
      assetUrl: clip.video_url,
      clipId: clip.id,
      sourceStart: 0,
      sourceEnd: 0,
      holdDuration: 0,
      fit: 'cover',
      transitionIn: DEFAULT_TRANSITION,
    };
    updateTimeline({ sequence: [...timeline.sequence, item] });
  };

  const addSequenceImageClip = (assetUrl: string) => {
    if (timeline.sequence.length >= MAX_SEQUENCE_CLIPS) {
      setError(`En fazla ${MAX_SEQUENCE_CLIPS} sekans elemanı eklenebilir.`);
      return;
    }
    const item: StudioSequenceClip = {
      id: crypto.randomUUID(),
      kind: 'image',
      assetUrl,
      clipId: null,
      sourceStart: 0,
      sourceEnd: 0,
      holdDuration: 3,
      fit: 'cover',
      transitionIn: DEFAULT_TRANSITION,
    };
    updateTimeline({ sequence: [...timeline.sequence, item] });
  };

  const updateSequenceClip = (id: string, patch: Partial<StudioSequenceClip>) =>
    updateTimeline({ sequence: timeline.sequence.map((c) => (c.id === id ? { ...c, ...patch } : c)) });

  const removeSequenceClip = (id: string) => {
    updateTimeline({ sequence: timeline.sequence.filter((c) => c.id !== id) });
    sequenceVideoElsRef.current.delete(id);
  };

  /** Playhead'deki sekans klibini ikiye böler. `resolveSequencePosition` klip-içi
   *  `localTime`'ı çözüyor ({@link ResolvedSequencePosition}), `sourceStart + localTime`
   *  kesim noktası oluyor. Sekans KÜMÜLATİF/cursor tabanlı (bkz. resolveSequencePosition
   *  yorumu, studio.ts) — bir klip kısaldığında sonraki klipler otomatik kayıyor, elle
   *  zaman kaydırma GEREKMİYOR. Sadece `kind:'video'` için: image'ın "kaynak zamanı" yok,
   *  bölünecek bir şey yok (çağıran taraf UI'da image klipte butonu disabled bırakıyor). */
  const splitSequenceClipAtTime = (masterTime: number) => {
    const pos = resolveSequencePosition(timeline.sequence, masterTime, sequenceDurations);
    if (!pos || pos.clip.kind !== 'video') return;
    if (timeline.sequence.length >= MAX_SEQUENCE_CLIPS) {
      setError(`En fazla ${MAX_SEQUENCE_CLIPS} sekans elemanı eklenebilir.`);
      return;
    }
    const clip = pos.clip;
    const duration = sequenceClipDuration(clip, sequenceDurations);
    const MIN_PIECE_SECONDS = 0.2;
    if (pos.localTime < MIN_PIECE_SECONDS || duration - pos.localTime < MIN_PIECE_SECONDS) {
      setError('Bölme noktası klibin başına/sonuna çok yakın.');
      return;
    }
    const cutSourceTime = clip.sourceStart + pos.localTime;
    const first: StudioSequenceClip = { ...clip, sourceEnd: cutSourceTime };
    // `id` yeni — aynı assetUrl'i ikinci kez süren AYRI bir <video> elemanı gerekiyor
    // (bkz. sequenceVideoElsRef yorumu: aynı video farklı kırpmayla sekansta iki kez
    // yer alabilir). `transitionIn: DEFAULT_TRANSITION` (hard cut) — bölünmüş iki
    // parçanın arasında crossfade beklenmez.
    const second: StudioSequenceClip = { ...clip, id: crypto.randomUUID(), sourceStart: cutSourceTime, transitionIn: DEFAULT_TRANSITION };
    const next = [...timeline.sequence];
    next.splice(pos.index, 1, first, second);
    updateTimeline({ sequence: next });
  };

  /** Ana videoyu belirli bir aralıkta bir kutuya sığdıran split-screen segmenti ekler —
   * `addCutaway`/`addZoom` ile AYNI desen (oynatma başlığından başlar, ~3 sn sürer).
   * Varsayılan ALT yarı: overlay'in "Split ekran" açılışı ÜST yarıyı varsayılan aldığı için
   * ikisi elle sayı girmeden hemen eşleşiyor (bkz. addSequenceLayoutForRange). */
  const addSequenceLayout = (startTime: number, endTime: number, preset?: Partial<StudioSequenceLayout>) => {
    if (timeline.sequenceLayouts.length >= MAX_SEQUENCE_LAYOUTS) {
      setError(`En fazla ${MAX_SEQUENCE_LAYOUTS} split-screen aralığı eklenebilir.`);
      return;
    }
    const item: StudioSequenceLayout = {
      id: crypto.randomUUID(),
      startTime,
      endTime,
      x: 0,
      y: 50,
      width: 100,
      height: 50,
      fit: 'cover',
      ...preset,
    };
    updateTimeline({ sequenceLayouts: [...timeline.sequenceLayouts, item] });
    return item;
  };

  const updateSequenceLayout = (id: string, patch: Partial<StudioSequenceLayout>) =>
    updateTimeline({ sequenceLayouts: timeline.sequenceLayouts.map((l) => (l.id === id ? { ...l, ...patch } : l)) });

  const removeSequenceLayout = (id: string) =>
    updateTimeline({ sequenceLayouts: timeline.sequenceLayouts.filter((l) => l.id !== id) });

  // Whisper marka/uydurma kelimeleri (ör. "talkinbio") bilmediği en yakın gerçek kelimeye
  // ("Tolkien") yuvarlayabiliyor — metni elle düzeltebilmek gerekiyor. Çeviri metinlerinde de
  // AYNI sorun var (model bazen yanlış çevirir) — bu yüzden `locale` parametreli: 'source'
  // kaynak `timeline.captions`'ı, bir `OverlayLocale` ise `translatedCaptions[locale]`'ı
  // düzenler. Zaman damgaları hiçbir zaman burada değişmiyor (kasıtlı — bkz. captionTranslate.ts).
  //
  // `memberIds` alıyor (tek id de olabilir) çünkü "Kelimeleri düzenle" listesi
  // `captionStyle.groupSize` > 1 iken `groupCaptions` ile birleştirilmiş satırlar gösteriyor
  // (bkz. groupCaptions yorumu) — bir grup satırı düzenlendiğinde yazılan METİN TAMAMI
  // grubun İLK id'sine yazılır, gruptaki diğer id'ler boşaltılır (görüntüleme zaten hepsini
  // birleştirip gösterdiği için veri kaybı yok, sadece hangi id'nin ne tuttuğu değişiyor).
  // groupSize=1'de her grup tek id'li olduğundan bu, düz "tek kelime düzenle" ile AYNI davranır.
  const updateCaptionGroupText = (locale: OverlayLocale | 'source', memberIds: string[], text: string) => {
    const [firstId, ...restIds] = memberIds;
    const apply = (c: StudioCaption) =>
      c.id === firstId ? { ...c, text } : restIds.includes(c.id) ? { ...c, text: '' } : c;
    if (locale === 'source') {
      updateTimeline({ captions: timeline.captions.map(apply) });
    } else {
      const list = timeline.translatedCaptions[locale] ?? [];
      updateTimeline({ translatedCaptions: { ...timeline.translatedCaptions, [locale]: list.map(apply) } });
    }
  };

  const addCutaway = (assetUrl: string) => {
    if (timeline.cutaways.length >= MAX_CUTAWAYS) {
      setError(`En fazla ${MAX_CUTAWAYS} cutaway eklenebilir.`);
      return;
    }
    const start = currentTime;
    const end = Math.min(masterEnd || start + 3, start + 3);
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
    const end = Math.min(masterEnd || start + 3, start + 3);
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

  const addVideoOverlay = (assetUrl: string) => {
    if (timeline.overlays.length >= MAX_OVERLAYS) {
      setError(`En fazla ${MAX_OVERLAYS} overlay eklenebilir.`);
      return;
    }
    const start = currentTime;
    const end = Math.min(masterEnd || start + 4, start + 4);
    const item: StudioVideoOverlay = {
      id: crypto.randomUUID(),
      kind: 'video',
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
    const end = Math.min(masterEnd || start + 3, start + 3);
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

  const updateVideoOverlay = (id: string, patch: Partial<StudioVideoOverlay>) =>
    updateTimeline({
      overlays: timeline.overlays.map((o) => (o.id === id && o.kind === 'video' ? { ...o, ...patch } : o)),
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

  // --- Ses iyileştirme / karaoke altyazı (fal.ai) ---

  const enhanceMotionAudio = async () => {
    setEnhancingAudio(true);
    setError(null);
    try {
      // Harici yüklenen klip'lerin ayrı bir audio_url'i yok — video_url'e düşüyoruz
      // (fal-ai/elevenlabs/audio-isolation ikisini de kabul ediyor).
      const res = await fetch(`/api/admin/characters/${characterId}/studio/enhance-audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          motion.audio_url ? { audioUrl: motion.audio_url } : { videoUrl: motion.video_url },
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ses iyileştirilemedi.');
      updateTimeline({ enhancedAudioUrl: data.audioUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ses iyileştirilemedi.');
    } finally {
      setEnhancingAudio(false);
    }
  };

  const transcribeCaptions = async () => {
    setTranscribing(true);
    setError(null);
    try {
      // whisper'ın audio_url alanı mp4'ü doğrudan kabul ediyor — harici yüklenen klip'lerin
      // ayrı bir audio_url'i olmadığında video_url'e düşüyoruz.
      const res = await fetch(`/api/admin/characters/${characterId}/studio/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioUrl: motion.audio_url || motion.video_url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Altyazı çıkarılamadı.');

      // Whisper zaman damgaları orijinal (kırpılmamış) sesin başından itibaren — geri kalan
      // her şeyle AYNI koordinat sistemine (0 = trim.start) geçiriyoruz ki drawFrame'in
      // `time >= c.startTime` karşılaştırması diğer öğelerle tutarlı kalsın.
      const words = data.words as { text: string; start: number; end: number }[];
      const captions: StudioCaption[] = words
        .map((w) => ({
          id: crypto.randomUUID(),
          text: w.text,
          startTime: w.start - timeline.trim.start,
          endTime: w.end - timeline.trim.start,
        }))
        .filter((c) => c.endTime > 0)
        .slice(0, MAX_CAPTIONS);

      updateTimeline({ captions });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Altyazı çıkarılamadı.');
    } finally {
      setTranscribing(false);
    }
  };

  /** `timeline.captions`'daki kelime boşluklarını (+ istenirse dolgu kelimeleri) tarar,
   *  sonucu bir önizleme listesine koyar — hiçbir şeyi HENÜZ uygulamaz (bkz. UI'daki
   *  "Uygula" butonu / applySilenceCuts). */
  const scanSilences = () => {
    const cuts = findSilenceCuts(timeline.captions, silenceThreshold, cutFillerWords ? FILLER_WORDS_TR : undefined);
    setSilenceCandidates(cuts.map((c) => ({ ...c, selected: true })));
  };

  const toggleSilenceCandidate = (index: number) =>
    setSilenceCandidates((prev) => prev && prev.map((c, i) => (i === index ? { ...c, selected: !c.selected } : c)));

  /** Önizlemede işaretli aralıkları `removeCutRanges` ile timeline'a uygular — sekans VE
   *  tüm master-time dizileri (captions, cutaways, zooms, overlays, sequenceLayouts) tek
   *  seferde tutarlı şekilde kesilip kayar (bkz. removeCutRanges yorumu, config/studio.ts). */
  const applySilenceCuts = () => {
    if (!silenceCandidates) return;
    const ranges = silenceCandidates.filter((c) => c.selected).map(({ start, end }) => ({ start, end }));
    if (!ranges.length) return;
    const result = removeCutRanges(timeline, ranges, sequenceDurations);
    if (result.sequence.length > MAX_SEQUENCE_CLIPS) {
      setError(`Bu kesim sekansı ${MAX_SEQUENCE_CLIPS} elemanlık sınırın üstüne çıkarıyor — daha az aralık seç.`);
      return;
    }
    updateTimeline(result);
    setSilenceCandidates(null);
  };

  // --- Redub / çok dilli altyazı (Düzenle) ---

  /** `fal-ai/elevenlabs/dubbing`'i sarar — ayrı bir ses klonu adımına bağımlı DEĞİL,
   *  orijinal konuşmacının sesini kendi başına koruyor (bkz. dubVideo yorumu, fal.ts). */
  const redubVideo = async () => {
    if (!(dubDurationSeconds > 0)) {
      setError('Video süresi henüz bilinmiyor, birazdan tekrar dene.');
      return;
    }
    setDubbing(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/characters/${characterId}/studio/redub`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: motion.video_url,
          targetLang: dubTargetLocale,
          durationSeconds: dubDurationSeconds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Video yeniden seslendirilemedi.');
      const dub = data.dub as StudioDub;
      updateTimeline({ dubs: [...timeline.dubs, dub].slice(-MAX_DUBS) });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Video yeniden seslendirilemedi.');
    } finally {
      setDubbing(false);
    }
  };

  /** "İşle" — bir dublaj sonucunu ANA videoya uygular: `dubSourceClip` (sekanstaki
   *  `motion.video_url`'e sahip eleman) `assetUrl`'ini dublajlı videoya çevirir.
   *  `clipId: null` — dublaj `character_clips` havuzundan gelmiyor, bağımsız bir dosya
   *  (bkz. StudioDub yorumu). `sourceStart/End` 0/0 sentinel'ine sıfırlanır çünkü dublajlı
   *  videonun süresi kaynaktan (kırpma noktalarından) FARKLI olabilir — "tamamını kullan"
   *  güvenli varsayılan, `sequenceDurations` gerçek süreyi metadata yüklenince çözüyor. */
  const applyDubToMainVideo = (dub: StudioDub) => {
    if (!dubSourceClip) {
      setError('Ana video sekansta bulunamadı, dublaj uygulanamadı.');
      return;
    }
    updateSequenceClip(dubSourceClip.id, { assetUrl: dub.videoUrl, clipId: null, sourceStart: 0, sourceEnd: 0 });
  };

  /** Kaynak `timeline.captions`'ın `text`'ini hedef dile çevirir — zaman damgaları asla
   *  modele gönderilmez, kaynaktan aynen kopyalanır (bkz. captionTranslate.ts). ElevenLabs
   *  GEREKMİYOR, mevcut whisper transkripti + bir LLM çağrısı yeterli. */
  const translateCaptionsToLocale = async (targetLocale: OverlayLocale) => {
    if (timeline.captions.length === 0) return;
    setTranslatingLocale(targetLocale);
    setError(null);
    try {
      const res = await fetch(`/api/admin/characters/${characterId}/studio/captions/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ captions: timeline.captions, targetLocale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Altyazı çevrilemedi.');
      updateTimeline({ translatedCaptions: { ...timeline.translatedCaptions, [targetLocale]: data.captions } });
      setActiveCaptionLocale(targetLocale);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Altyazı çevrilemedi.');
    } finally {
      setTranslatingLocale(null);
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
      // `motionId` artık "biricik kaynak" değil, sadece sekansın İLK elemanı — galeri
      // picker'ının hangi kartı göstereceğini bilmesi için (bkz. StudioSection.tsx). Sekans
      // hiç video içermiyorsa (yalnızca görsellerden oluşan bir sekans) `motion.id`'ye düşülür.
      const primaryClipId = timeline.sequence.find((c) => c.kind === 'video')?.clipId ?? motion.id;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: projectName, motionId: primaryClipId, timeline }),
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

  /** Playhead'de canvas'ta o an görünen kareyi proje kapağı yapar — `outputUrl`'ün export
   *  akışıyla AYNI desen (bkz. handleExport'taki uploadAsset+PATCH çağrısı): canvas'tan
   *  blob alınır, mevcut `uploadAsset('image')` ile yüklenir, dönen URL PATCH edilir. Export'un
   *  aksine OTOMATİK değil — kullanıcı ayrı bir eylemle tetikliyor, `saveProject`nin `onProjectSaved`
   *  bildirimi burada KASITLI OLARAK tetiklenmiyor (outputUrl PATCH'i de tetiklemiyor, aynı tutarlılık). */
  const captureThumbnail = async () => {
    if (!projectId) {
      setError('Kapak seçmeden önce projeyi bir kez kaydet.');
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSavingThumbnail(true);
    setError(null);
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      if (!blob) throw new Error('Kare yakalanamadı.');
      const uploaded = await uploadAsset(new File([blob], `cover-${Date.now()}.jpg`, { type: 'image/jpeg' }), 'image');
      if (!uploaded) return; // uploadAsset kendi hatasını zaten setError ile gösterdi
      await fetch(`/api/admin/characters/${characterId}/studio/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thumbnailUrl: uploaded.url }),
      });
      setThumbnailUrl(uploaded.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kapak kaydedilemedi.');
    } finally {
      setSavingThumbnail(false);
    }
  };

  const exportHint = (() => {
    const mt = pickExportMimeType();
    if (!mt) return 'Bu tarayıcı video kaydını desteklemeyebilir — Chrome ya da Edge dene.';
    if (!mt.startsWith('video/mp4')) {
      return 'Bu tarayıcı MP4 yerine WebM üretecek — Instagram’a yüklemeden önce dönüştürmen gerekebilir.';
    }
    if (exportHasIncompatibleAudio(mt)) {
      return 'Bu tarayıcı MP4 kabına AAC yerine Opus ses koyuyor — Instagram’da ses çalmayabilir. Yükledikten sonra sesi kontrol et.';
    }
    return null;
  })();

  const handleExport = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (timeline.sequence.length === 0) {
      setError('Sekans boş — en az bir klip ekle.');
      return;
    }

    if (playing) {
      for (const clip of timeline.sequence) if (clip.kind === 'video') sequenceVideoElsRef.current.get(clip.id)?.pause();
      musicAudioRef.current?.pause();
      cancelBeepsRef.current?.();
      cancelBeepsRef.current = null;
      setPlaying(false);
      stopLoop();
    }

    // Export öncesi TÜM sekans video elemanlarının metadata'sı (süresi) yüklü olmalı — aksi
    // hâlde `sequenceDuration`/`resolveSequencePosition` (dolayısıyla exportTimeline'ın state
    // machine'i) yanlış hesaplar. Zaten yüklenmiş olanlar (readyState >= HAVE_METADATA) anında geçer.
    await Promise.all(
      collectSequenceVideoClips(timeline).map(({ id }) => {
        const el = sequenceVideoElsRef.current.get(id);
        if (!el || el.readyState >= 1) return Promise.resolve();
        return new Promise<void>((resolve) => {
          el.addEventListener('loadedmetadata', () => resolve(), { once: true });
        });
      }),
    );

    setExporting(true);
    if (progressFillRef.current) progressFillRef.current.style.width = '0%';
    setExportStage('measuring');
    setError(null);
    try {
      // Instagram yüklenen videoyu ~-14 LUFS'a normalize ediyor; ham Motion çıktısı ~-22 LUFS
      // civarında olduğu için aradaki farkı platform kendi yükseltiyor ve oda gürültüsünü de
      // beraberinde kaldırıyor. Aynı yükseltmeyi burada, temiz kaynak üzerinde yapıyoruz.
      // Müzik varsa hedef 1 LU aşağı çekiliyor: miks üstüne binen müzik yatağı toplam gürlüğü
      // zaten yukarı taşır, aksi hâlde hedefi aşıp limitleyiciyi sürekli çalıştırırdık.
      //
      // v1 SINIRI: gürlük normalizasyonu yalnızca TEK elemanlı (legacy) sekansta ölçülüyor —
      // çoklu klipte tek bir "anlatım kaynağı" yok, her klip kendi sesiyle akıyor (bkz.
      // exportTimeline'daki useEnhancedAudio yorumu, AYNI v1 sınırı).
      let loudnessGain = 1;
      if (timeline.sequence.length <= 1) {
        const onlyClip = timeline.sequence[0];
        const onlyEl = onlyClip?.kind === 'video' ? sequenceVideoElsRef.current.get(onlyClip.id) : undefined;
        const trimStart = onlyClip?.sourceStart ?? 0;
        const trimEnd = onlyClip?.sourceEnd || onlyEl?.duration || 0;
        const narrationUrl = timeline.enhancedAudioUrl || onlyClip?.assetUrl || motion.video_url;
        if (trimEnd > trimStart) {
          const cacheKey = `${narrationUrl}|${trimStart}|${trimEnd}`;
          let measuredLufs = loudnessCacheRef.current.get(cacheKey) ?? null;
          if (measuredLufs === null) {
            measuredLufs = await measureIntegratedLoudness(narrationUrl, trimStart, trimEnd);
            if (measuredLufs !== null) loudnessCacheRef.current.set(cacheKey, measuredLufs);
          }
          // Ölçülemediyse (kodek/CORS/sessiz kaynak) sese hiç dokunulmuyor — yanlış tahminle
          // yükseltmektense olduğu gibi bırakmak güvenli.
          const targetLufs = timeline.music ? PLATFORM_TARGET_LUFS - 1 : PLATFORM_TARGET_LUFS;
          loudnessGain = measuredLufs === null ? 1 : loudnessNormalizationGain(measuredLufs, targetLufs);
        }
      }

      setExportStage('recording');

      const exportArgs = {
        timeline,
        sequenceVideos: sequenceVideoElsRef.current,
        canvas,
        assets: imageCache,
        videoOverlays: videoOverlayElsRef.current,
        musicAudio: musicAudioRef.current || undefined,
        enhancedAudio: enhancedAudioRef.current || undefined,
        loudnessGain,
        captionsOverride: activeCaptionLocale === 'source' ? undefined : timeline.translatedCaptions[activeCaptionLocale],
        onProgress: (fraction: number) => {
          const pct = Math.round(Math.min(1, fraction) * 100);
          if (progressFillRef.current) progressFillRef.current.style.width = `${pct}%`;
          if (progressLabelRef.current) progressLabelRef.current.textContent = `Dışa aktarılıyor… %${pct}`;
        },
      };

      // Faz B — önce WebCodecs (kare-kare seek + hızlı encode) denenir; tarayıcı desteklemiyorsa
      // ya da beklenmeyen bir hatayla düşerse Faz A'nın gerçek-zamanlı MediaRecorder yoluna
      // SESSİZCE geri dönülür (kullanıcı export'un başarısız olduğunu değil, hangi yolun
      // kullanıldığını görür — bkz. lastExportInfo). Süre ölçümü proje planındaki doğrulama
      // maddesi: "gerçek kazancı sayıyla doğrula".
      const startedAt = performance.now();
      let result: Awaited<ReturnType<typeof exportTimeline>>;
      let usedMethod: 'webcodecs' | 'realtime';
      try {
        result = await exportTimelineFast(exportArgs);
        usedMethod = 'webcodecs';
      } catch (fastErr) {
        console.warn('[studio] WebCodecs export başarısız, gerçek zamanlı yola düşülüyor:', fastErr);
        if (progressFillRef.current) progressFillRef.current.style.width = '0%';
        result = await exportTimeline(exportArgs);
        usedMethod = 'realtime';
      }
      const elapsedSeconds = (performance.now() - startedAt) / 1000;
      setLastExportInfo({ method: usedMethod, elapsedSeconds, contentSeconds: masterEnd - masterStart });

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
                updateVideoOverlay={updateVideoOverlay}
                updateTextOverlay={updateTextOverlay}
                updateZoom={updateZoom}
                updateReframePoint={updateReframePoint}
                imageCache={imageCache}
                videoOverlayAspects={videoOverlayAspects}
                onDropAsset={(url, kind, x, y) => {
                  const start = currentTime;
                  const end = Math.min(masterEnd, start + (kind === 'video' ? 4 : 3));
                  if (kind === 'image' || kind === 'video') {
                    if (timeline.overlays.length >= MAX_OVERLAYS) {
                      setError(`En fazla ${MAX_OVERLAYS} overlay eklenebilir.`);
                      return;
                    }
                    const item: StudioImageOverlay | StudioVideoOverlay = {
                      id: crypto.randomUUID(),
                      kind,
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
              {/* Sekans (film rulosu) video elemanları — `videoOverlayEls` ile AYNI ref-map
                  deseni, assetUrl DEĞİL clip.ID ile anahtarlanır (bkz. `sequenceVideoElsRef`
                  yorumu: aynı video iki kez farklı kırpmayla sekansta yer alabilir). */}
              {collectSequenceVideoClips(timeline).map(({ id, assetUrl }) => (
                <video
                  key={id}
                  ref={(el) => {
                    if (el) sequenceVideoElsRef.current.set(id, el);
                    else sequenceVideoElsRef.current.delete(id);
                  }}
                  src={assetUrl}
                  crossOrigin="anonymous"
                  playsInline
                  preload="auto"
                  className="absolute w-px h-px opacity-0 pointer-events-none"
                  onLoadedMetadata={(e) => {
                    const duration = e.currentTarget.duration;
                    setSequenceDurations((prev) => {
                      const next = new Map(prev);
                      next.set(id, duration);
                      return next;
                    });
                    // Sekansın ilk elemanıysa hemen sourceStart'a sar ki ilk kare (poster)
                    // ham videonun 0. karesi değil, doğru kırpılmış kare olsun.
                    const isFirst = timeline.sequence[0]?.id === id;
                    if (isFirst && phaseRef.current === 'preroll') {
                      const clip = timeline.sequence[0];
                      const target = clip.kind === 'video' ? clip.sourceStart : 0;
                      const el = e.currentTarget;
                      const onSeeked = () => {
                        el.removeEventListener('seeked', onSeeked);
                        redraw(0);
                      };
                      el.addEventListener('seeked', onSeeked);
                      el.currentTime = target;
                    } else if (!playing) {
                      redraw(currentTime);
                    }
                  }}
                />
              ))}
              {timeline.music && <audio ref={musicAudioRef} src={timeline.music.assetUrl} className="hidden" />}
              {timeline.enhancedAudioUrl && (
                <audio
                  ref={enhancedAudioRef}
                  src={timeline.enhancedAudioUrl}
                  crossOrigin="anonymous"
                  className="hidden"
                />
              )}
              {videoOverlayUrls.map((url) => (
                <video
                  key={url}
                  ref={(el) => {
                    if (el) videoOverlayElsRef.current.set(url, el);
                    else videoOverlayElsRef.current.delete(url);
                  }}
                  src={url}
                  crossOrigin="anonymous"
                  muted
                  playsInline
                  preload="auto"
                  onLoadedMetadata={(e) => {
                    const el = e.currentTarget;
                    const aspect = (el.videoWidth || 16) / (el.videoHeight || 9);
                    setVideoOverlayAspects((prev) => new Map(prev).set(url, aspect));
                  }}
                  // `display:none` (Tailwind `hidden`) VERİLMEZ: bazı tarayıcılar display:none
                  // <video>'nun kare decode'unu durdurur/kısar, canvas'a çizilecek kare hiç
                  // gelmez. Ana kaynak videoyla AYNI numara: layout'ta gerçek (1px) yer kaplayan
                  // ama görünmez bir eleman — decode canlı kalıyor.
                  className="absolute w-px h-px opacity-0 pointer-events-none"
                />
              ))}
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
              min={masterStart}
              max={Math.max(masterStart + 0.1, masterEnd)}
              step={0.05}
              value={Math.min(currentTime, masterEnd)}
              onChange={(e) => seekTo(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-xs text-slate-500 tabular-nums w-24 text-right shrink-0">
              {currentTime.toFixed(1)}s / {masterEnd.toFixed(1)}s
            </span>
            <button
              onClick={() => splitSequenceClipAtTime(currentTime)}
              disabled={!canSplitAtPlayhead}
              title="Klibi bu noktada ikiye böl"
              className="p-2 text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
            >
              <Scissors className="w-4 h-4" />
            </button>
          </div>

          <TimelineStrip
            timeline={timeline}
            masterStart={masterStart}
            masterEnd={masterEnd}
            sourceDuration={sourceDuration}
            currentTime={currentTime}
            selected={selected}
            onSelect={setSelected}
          />

          <div className="flex items-center gap-2">
            {thumbnailUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- Supabase storage URL'i, next/image loader'ı gerekmiyor
              <img src={thumbnailUrl} alt="Kapak karesi" className="w-10 h-10 rounded object-cover border border-slate-300 shrink-0" />
            )}
            <button
              onClick={captureThumbnail}
              disabled={savingThumbnail || !projectId}
              title={projectId ? "Şu anki kareyi proje kapağı yap" : 'Kapak seçmeden önce projeyi kaydet'}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 hover:border-slate-400 disabled:opacity-50"
            >
              {savingThumbnail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
              {thumbnailUrl ? 'Kapağı bu kareyle değiştir' : 'Bu kareyi kapak yap'}
            </button>
          </div>

          <div className="pt-2 border-t border-slate-200 space-y-2">
            {exporting && exportStage === 'recording' && (
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                {/* Genişlik export tick döngüsünden DOĞRUDAN DOM'a yazılıyor (bkz. handleExport) —
                    React state'e bağlarsak her karede koca editör ağacını yeniden render ettirip
                    tam da ölçtüğümüz kare donmalarına geri dönerdik. */}
                <div ref={progressFillRef} className="bg-blue-600 h-full transition-all" style={{ width: '0%' }} />
              </div>
            )}
            {exportHint && <p className="text-xs text-amber-700">{exportHint}</p>}
            <button
              onClick={handleExport}
              disabled={exporting}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {!exporting ? (
                'Dışa Aktar'
              ) : exportStage === 'measuring' ? (
                'Ses seviyesi ölçülüyor…'
              ) : (
                <span ref={progressLabelRef}>Dışa aktarılıyor… %0</span>
              )}
            </button>
            <p className="text-xs text-slate-400 text-center">
              Önce WebCodecs (hızlı) denenir, tarayıcı desteklemiyorsa gerçek zamanlıya
              düşülür — {(masterEnd - masterStart).toFixed(0)} sn&apos;lik video gerçek zamanlıda
              ≈ aynı sürede çıkar. Sekmeyi ön planda tut.
            </p>
            {lastExportInfo && (
              <p className="text-xs text-center font-medium text-emerald-700">
                Son export: {lastExportInfo.method === 'webcodecs' ? 'WebCodecs' : 'Gerçek zamanlı'} —{' '}
                {lastExportInfo.elapsedSeconds.toFixed(1)} sn sürdü ({lastExportInfo.contentSeconds.toFixed(0)} sn&apos;lik içerik için).
              </p>
            )}
          </div>
          <div className="space-y-5 pt-4 mt-1 border-t border-slate-200">
          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <h3 className="text-sm font-semibold text-slate-900">Renk &amp; Efekt</h3>
              {(timeline.grade.brightness ||
                timeline.grade.contrast ||
                timeline.grade.saturation ||
                timeline.grade.temperature ||
                timeline.grade.grain ||
                timeline.grade.vignette) && (
                <button
                  onClick={() => updateTimeline({ grade: DEFAULT_COLOR_GRADE })}
                  className="text-xs text-slate-400 hover:text-slate-700"
                >
                  Sıfırla
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400 mb-2">
              Tüm sekansa uygulanır — grain/vignette metin ve overlay&apos;lerin üstünde bir lens
              katmanı gibi durur, renk düzeltmesi sadece görüntüye (sekans/cutaway) uygulanır.
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              {(
                [
                  ['brightness', 'Parlaklık', -100, 100],
                  ['contrast', 'Kontrast', -100, 100],
                  ['saturation', 'Doygunluk', -100, 100],
                  ['temperature', 'Sıcaklık', -100, 100],
                  ['grain', 'Film dokusu', 0, 1],
                  ['vignette', 'Vinyet', 0, 1],
                ] as [keyof StudioColorGrade, string, number, number][]
              ).map(([key, label, min, max]) => (
                <label key={key} className="text-xs text-slate-600 space-y-1">
                  <div className="flex items-center justify-between">
                    <span>{label}</span>
                    <span className="text-slate-400 tabular-nums">{timeline.grade[key].toFixed(max <= 1 ? 2 : 0)}</span>
                  </div>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={max <= 1 ? 0.02 : 1}
                    value={timeline.grade[key]}
                    onChange={(e) => updateTimeline({ grade: { ...timeline.grade, [key]: Number(e.target.value) } })}
                    className="w-full"
                  />
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Anlatım Sesi</h3>
            <label className="flex items-center gap-2 text-xs text-slate-500 mb-3">
              Ses seviyesi
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={timeline.videoVolume}
                onChange={(e) => updateTimeline({ videoVolume: Number(e.target.value) })}
                className="flex-1"
              />
            </label>
            {timeline.enhancedAudioUrl ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                <span className="text-xs text-emerald-700 font-medium flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  Ses iyileştirildi
                </span>
                <button
                  onClick={() => updateTimeline({ enhancedAudioUrl: null })}
                  className="text-xs text-slate-500 hover:text-red-600 shrink-0"
                >
                  Geri al
                </button>
              </div>
            ) : (
              <button
                onClick={enhanceMotionAudio}
                disabled={enhancingAudio}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 hover:border-slate-400 disabled:opacity-50"
              >
                {enhancingAudio ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {enhancingAudio ? 'İyileştiriliyor…' : `Sesi iyileştir (gürültü temizle) · ≈${creditsForCost(AUDIO_ENHANCE_COST_USD)} kredi`}
              </button>
            )}
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

          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <h3 className="text-sm font-semibold text-slate-900">Altyazı (karaoke)</h3>
              {timeline.captions.length > 0 && (
                <span className="text-xs text-slate-400">{timeline.captions.length} kelime</span>
              )}
            </div>
            <p className="text-xs text-slate-400 mb-2">
              Sesi otomatik yazıya döker, tek tek kelimeleri ekrana vurgulu şekilde (TikTok/Reels tarzı) düşürür.
            </p>
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={transcribeCaptions}
                disabled={transcribing}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 hover:border-slate-400 disabled:opacity-50"
              >
                {transcribing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Captions className="w-3.5 h-3.5" />}
                {transcribing
                  ? 'Çıkarılıyor…'
                  : `${timeline.captions.length > 0 ? 'Yeniden oluştur' : 'Altyazıları oluştur'} · ≈${creditsForCost(STUDIO_TRANSCRIBE_COST_USD)} kredi`}
              </button>
              {timeline.captions.length > 0 && (
                <button
                  onClick={() => updateTimeline({ captions: [] })}
                  className="p-2 text-slate-400 hover:text-red-600 shrink-0"
                  title="Altyazıları temizle"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {timeline.captions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {CAPTION_STYLE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => updateTimeline({ captionStyle: { ...timeline.captionStyle, ...preset.style } })}
                      className="px-2 py-1 rounded-full text-[11px] font-medium border border-slate-300 text-slate-600 hover:border-slate-400"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  <NumberField
                    label="X%"
                    value={timeline.captionStyle.x}
                    min={0}
                    step={1}
                    onChange={(v) => updateTimeline({ captionStyle: { ...timeline.captionStyle, x: clampPct(v) } })}
                    compact
                  />
                  <NumberField
                    label="Y%"
                    value={timeline.captionStyle.y}
                    min={0}
                    step={1}
                    onChange={(v) => updateTimeline({ captionStyle: { ...timeline.captionStyle, y: clampPct(v) } })}
                    compact
                  />
                  <NumberField
                    label="Punto%"
                    value={timeline.captionStyle.fontSize}
                    min={1}
                    step={0.5}
                    onChange={(v) => updateTimeline({ captionStyle: { ...timeline.captionStyle, fontSize: v } })}
                    compact
                  />
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={timeline.captionStyle.font}
                    onChange={(e) =>
                      updateTimeline({ captionStyle: { ...timeline.captionStyle, font: e.target.value as OverlayFont } })
                    }
                    className="rounded border border-slate-300 px-1.5 py-1 text-xs"
                  >
                    {OVERLAY_FONTS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="color"
                    value={timeline.captionStyle.color}
                    onChange={(e) => updateTimeline({ captionStyle: { ...timeline.captionStyle, color: e.target.value } })}
                    className="w-7 h-7 rounded border border-slate-300 bg-white"
                  />
                </div>

                <label className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  Hız
                  <select
                    value={timeline.captionStyle.speed}
                    onChange={(e) =>
                      updateTimeline({ captionStyle: { ...timeline.captionStyle, speed: Number(e.target.value) } })
                    }
                    className="rounded border border-slate-300 px-1.5 py-1 text-xs"
                  >
                    <option value={1}>1x · normal</option>
                    <option value={1.25}>1.25x · yavaş</option>
                    <option value={1.5}>1.5x · daha yavaş</option>
                    <option value={1.75}>1.75x</option>
                    <option value={2}>2x · en yavaş</option>
                  </select>
                  <span className="text-slate-400">— kelimeler ekranda daha uzun kalır</span>
                </label>

                <label className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  Kelime grubu
                  <select
                    value={timeline.captionStyle.groupSize}
                    onChange={(e) =>
                      updateTimeline({ captionStyle: { ...timeline.captionStyle, groupSize: Number(e.target.value) } })
                    }
                    className="rounded border border-slate-300 px-1.5 py-1 text-xs"
                  >
                    <option value={1}>1 kelime</option>
                    <option value={2}>2 kelime</option>
                    <option value={3}>3 kelime</option>
                    <option value={4}>4 kelime</option>
                  </select>
                  <span className="text-slate-400">— aynı anda kaç kelime birlikte gösterilsin</span>
                </label>

                <div className="pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-semibold text-slate-700 mb-1">Sessizlik / dolgu kelime temizliği</h4>
                  <p className="text-[11px] text-slate-400 mb-2">
                    Kelimeler arası uzun boşlukları (ve istersen dolgu kelimeleri) bulur — önizlemede
                    onayladıklarını sekanstan keser.
                  </p>
                  <div className="flex items-center gap-3 flex-wrap mb-2">
                    <NumberField label="Eşik (sn)" value={silenceThreshold} min={0.2} step={0.1} onChange={setSilenceThreshold} compact />
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <input
                        type="checkbox"
                        checked={cutFillerWords}
                        onChange={(e) => setCutFillerWords(e.target.checked)}
                        className="rounded border-slate-300"
                      />
                      Dolgu kelimeleri de kes (şey, yani, ıı…)
                    </label>
                  </div>
                  <button
                    onClick={scanSilences}
                    disabled={timeline.captions.length === 0}
                    className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 hover:border-slate-400 disabled:opacity-50"
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    Sessizlikleri bul
                  </button>

                  {silenceCandidates &&
                    (silenceCandidates.length === 0 ? (
                      <p className="text-[11px] text-slate-400 mt-2">Eşiği aşan bir boşluk bulunamadı.</p>
                    ) : (
                      <div className="mt-2 space-y-1.5">
                        <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                          {silenceCandidates.map((c, i) => (
                            <label key={i} className="flex items-center gap-2 text-[11px] text-slate-600">
                              <input
                                type="checkbox"
                                checked={c.selected}
                                onChange={() => toggleSilenceCandidate(i)}
                                className="rounded border-slate-300"
                              />
                              {c.start.toFixed(1)}s – {c.end.toFixed(1)}s ({(c.end - c.start).toFixed(1)}sn)
                            </label>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={applySilenceCuts}
                            disabled={!silenceCandidates.some((c) => c.selected)}
                            className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                          >
                            Uygula ({silenceCandidates.filter((c) => c.selected).length})
                          </button>
                          <button
                            onClick={() => setSilenceCandidates(null)}
                            className="px-3 py-2 text-xs text-slate-500 hover:text-slate-700"
                          >
                            Vazgeç
                          </button>
                        </div>
                      </div>
                    ))}
                </div>

                <div className="pt-1">
                  <p className="text-[11px] text-slate-400 mb-1.5">Önizleme/export dili — çevrilmemiş bir dile tıklamak çeviriyi başlatır.</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => setActiveCaptionLocale('source')}
                      className={`px-2 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                        activeCaptionLocale === 'source'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'border-slate-300 text-slate-600 hover:border-slate-400'
                      }`}
                    >
                      Kaynak
                    </button>
                    {OVERLAY_LOCALES.map((loc) => {
                      const translated = timeline.translatedCaptions[loc];
                      const hasTranslation = Boolean(translated?.length);
                      const isActive = activeCaptionLocale === loc;
                      const isTranslating = translatingLocale === loc;
                      return (
                        <button
                          key={loc}
                          onClick={() => (hasTranslation ? setActiveCaptionLocale(loc) : translateCaptionsToLocale(loc))}
                          disabled={isTranslating}
                          title={hasTranslation ? undefined : `Bu dile çevir · ≈${creditsForCost(STUDIO_CAPTION_TRANSLATE_COST_USD)} kredi`}
                          className={`px-2 py-1 rounded-full text-[11px] font-medium border flex items-center gap-1 transition-colors disabled:opacity-50 ${
                            isActive
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'border-slate-300 text-slate-600 hover:border-slate-400'
                          }`}
                        >
                          {isTranslating ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : !hasTranslation ? (
                            <Languages className="w-3 h-3" />
                          ) : null}
                          {CAPTION_LOCALE_LABEL[loc]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <details className="pt-1">
                  <summary className="text-xs text-slate-500 cursor-pointer select-none hover:text-slate-700">
                    Kelimeleri düzenle
                    {activeCaptionLocale !== 'source' && ` (${CAPTION_LOCALE_LABEL[activeCaptionLocale]})`}
                  </summary>
                  <div className="mt-2 max-h-56 overflow-y-auto space-y-1 pr-1">
                    {groupCaptions(
                      activeCaptionLocale === 'source' ? timeline.captions : timeline.translatedCaptions[activeCaptionLocale] ?? [],
                      timeline.captionStyle.groupSize,
                    ).map((g) => (
                      <div key={g.id} className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 w-9 shrink-0 tabular-nums text-right">
                          {g.startTime.toFixed(1)}s
                        </span>
                        <input
                          value={g.text}
                          onChange={(e) => updateCaptionGroupText(activeCaptionLocale, g.memberIds, e.target.value)}
                          className="flex-1 rounded border border-slate-300 px-1.5 py-0.5 text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <h3 className="text-sm font-semibold text-slate-900">Redub — başka dilde seslendir</h3>
              {timeline.dubs.length > 0 && <span className="text-xs text-slate-400">{timeline.dubs.length} sürüm</span>}
            </div>
            <p className="text-xs text-slate-400 mb-2">
              Orijinal konuşmacının ses karakterini koruyarak videoyu seçtiğin dilde yeniden seslendirir.
            </p>
            <div className="flex items-center gap-2 mb-2">
              <select
                value={dubTargetLocale}
                onChange={(e) => setDubTargetLocale(e.target.value as OverlayLocale)}
                className="rounded border border-slate-300 px-2 py-2 text-xs"
              >
                {OVERLAY_LOCALES.map((loc) => (
                  <option key={loc} value={loc}>
                    {CAPTION_LOCALE_LABEL[loc]}
                  </option>
                ))}
              </select>
              <button
                onClick={redubVideo}
                disabled={dubbing || !(dubDurationSeconds > 0)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 hover:border-slate-400 disabled:opacity-50"
              >
                {dubbing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                {dubbing
                  ? 'Seslendiriliyor…'
                  : `Seslendir · ≈${creditsForCost(Math.ceil((dubDurationSeconds || 1) / 60) * STUDIO_DUB_COST_USD_PER_MINUTE)} kredi`}
              </button>
            </div>
            {timeline.dubs.length > 0 && (
              <div className="space-y-1.5">
                {timeline.dubs.map((d) => (
                  <div key={d.id} className="rounded-lg border border-slate-200 p-1.5 text-xs space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium shrink-0">
                        {CAPTION_LOCALE_LABEL[d.locale]}
                      </span>
                      <span className="flex-1 truncate text-slate-400">{new Date(d.createdAt).toLocaleString('tr-TR')}</span>
                      <button
                        onClick={() => updateTimeline({ dubs: timeline.dubs.filter((x) => x.id !== d.id) })}
                        className="p-0.5 text-slate-400 hover:text-red-600 shrink-0"
                        title="Sil"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <a
                        href={d.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 text-center rounded border border-slate-300 px-2 py-1 text-slate-600 hover:border-slate-400"
                      >
                        Önizle
                      </a>
                      <button
                        onClick={() => applyDubToMainVideo(d)}
                        title="Ana videoyu bu dublajla değiştir"
                        className="flex-1 rounded bg-slate-900 px-2 py-1 text-white hover:bg-slate-800"
                      >
                        İşle
                      </button>
                    </div>
                  </div>
                ))}
              </div>
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
            <div className="flex items-baseline justify-between mb-1.5">
              <h3 className="text-sm font-semibold text-slate-900">Sekans (film rulosu)</h3>
              <span className="text-xs text-slate-400">
                {timeline.sequence.length}/{MAX_SEQUENCE_CLIPS}
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-2">
              Klipleri arka arkaya diz, aralarına sabit görsel ekle — sıra burada yukarıdan
              aşağıya oynatılır.
            </p>

            <Reorder.Group
              axis="y"
              values={timeline.sequence}
              onReorder={(newSequence) => updateTimeline({ sequence: newSequence })}
              className="space-y-2 mb-3"
            >
              {timeline.sequence.map((clip, index) => {
                const duration = sequenceClipDuration(clip, sequenceDurations);
                return (
                  <Reorder.Item
                    key={clip.id}
                    value={clip}
                    className="rounded-lg border border-slate-200 p-2 bg-white cursor-grab active:cursor-grabbing relative"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-400 w-4 text-center shrink-0">{index + 1}</span>
                      {clip.kind === 'video' ? (
                        <video src={clip.assetUrl} muted className="w-10 h-10 rounded object-cover shrink-0" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={clip.assetUrl} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                      )}
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0">
                        {clip.kind === 'video' ? 'VİDEO' : 'GÖRSEL'}
                      </span>
                      <span className="text-xs text-slate-500 tabular-nums flex-1 text-right">{duration.toFixed(1)} sn</span>
                      <button
                        onClick={() => removeSequenceClip(clip.id)}
                        disabled={timeline.sequence.length <= 1}
                        className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-30 disabled:hover:text-slate-400 shrink-0"
                        title={timeline.sequence.length <= 1 ? 'Sekans en az bir eleman içermeli' : 'Kaldır'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {clip.kind === 'image' ? (
                      <div className="flex items-center gap-3 mt-2">
                        <NumberField
                          label="Süre (sn)"
                          value={clip.holdDuration}
                          min={0.1}
                          step={0.1}
                          onChange={(v) => updateSequenceClip(clip.id, { holdDuration: Math.max(0.1, v) })}
                          compact
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 mt-2">
                        <NumberField
                          label="Başl."
                          value={clip.sourceStart}
                          min={0}
                          step={0.1}
                          onChange={(v) => updateSequenceClip(clip.id, { sourceStart: Math.max(0, v) })}
                          compact
                        />
                        <NumberField
                          label="Bit."
                          value={clip.sourceEnd || sequenceDurations.get(clip.id) || 0}
                          step={0.1}
                          onChange={(v) => updateSequenceClip(clip.id, { sourceEnd: v })}
                          compact
                        />
                      </div>
                    )}
                  </Reorder.Item>
                );
              })}
            </Reorder.Group>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[11px] text-slate-500 mb-1">+ Klip (havuzdan)</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {clips.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => addSequenceVideoClip(c)}
                      disabled={timeline.sequence.length >= MAX_SEQUENCE_CLIPS}
                      className="rounded border border-slate-200 overflow-hidden hover:border-blue-400 disabled:opacity-40"
                      title={c.label || c.room}
                    >
                      <video src={c.video_url} muted className="w-full aspect-square object-cover" />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 mb-1">+ Görsel</p>
                <AssetPicker
                  kind="image"
                  assets={assets}
                  uploading={uploading}
                  onUpload={(f) => uploadAsset(f, 'image').then((a) => a && addSequenceImageClip(a.url))}
                  onPick={(a) => addSequenceImageClip(a.url)}
                />
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="flex items-baseline justify-between mb-1.5">
                <h4 className="text-xs font-semibold text-slate-700">Split ekran (ana video)</h4>
                <span className="text-xs text-slate-400">
                  {timeline.sequenceLayouts.length}/{MAX_SEQUENCE_LAYOUTS}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2">
                Videonun sadece bu aralıklarında ana video bir kutuya sığdırılır (varsayılan alt
                yarı) — aralık dışında yine tam ekran. Diğer yarıyı doldurmak için bir görsel/
                video overlay ekleyip kartında &quot;Split ekran&quot;ı aç; overlay&apos;in kendi
                zaman aralığı için otomatik eşleşen bir üst-yarı segmenti burada da belirir.
              </p>
              <button
                onClick={() => {
                  const start = currentTime;
                  const end = Math.min(masterEnd || start + 3, start + 3);
                  addSequenceLayout(start, end);
                }}
                disabled={timeline.sequenceLayouts.length >= MAX_SEQUENCE_LAYOUTS}
                className="text-xs font-medium rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-slate-500 hover:border-slate-400 disabled:opacity-50"
              >
                + Split ekran aralığı ekle
              </button>
              <div className="mt-2 space-y-2">
                {timeline.sequenceLayouts.map((l) => (
                  <div key={l.id} className="rounded-lg border border-slate-200 p-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex flex-wrap gap-x-3 gap-y-1">
                        <NumberField label="Başl." value={l.startTime} onChange={(v) => updateSequenceLayout(l.id, { startTime: v })} compact />
                        <NumberField label="Bit." value={l.endTime} onChange={(v) => updateSequenceLayout(l.id, { endTime: v })} compact />
                      </div>
                      <button onClick={() => removeSequenceLayout(l.id)} className="p-1.5 text-slate-400 hover:text-red-600 shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => updateSequenceLayout(l.id, { x: 0, y: 0, width: 100, height: 50 })}
                        className="text-[11px] px-2 py-1 rounded-full border border-slate-300 text-slate-500 hover:border-slate-900 hover:text-slate-900"
                      >
                        Üst yarı
                      </button>
                      <button
                        onClick={() => updateSequenceLayout(l.id, { x: 0, y: 50, width: 100, height: 50 })}
                        className="text-[11px] px-2 py-1 rounded-full border border-slate-300 text-slate-500 hover:border-slate-900 hover:text-slate-900"
                      >
                        Alt yarı
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      <NumberField label="X%" value={l.x} min={0} step={1} onChange={(v) => updateSequenceLayout(l.id, { x: clampPct(v) })} compact />
                      <NumberField label="Y%" value={l.y} min={0} step={1} onChange={(v) => updateSequenceLayout(l.id, { y: clampPct(v) })} compact />
                      <NumberField
                        label="Genişlik%"
                        value={l.width}
                        min={5}
                        step={1}
                        onChange={(v) => updateSequenceLayout(l.id, { width: clampPct(v) })}
                        compact
                      />
                      <NumberField
                        label="Yükseklik%"
                        value={l.height}
                        min={5}
                        step={1}
                        onChange={(v) => updateSequenceLayout(l.id, { height: clampPct(v) })}
                        compact
                      />
                    </div>
                    <div className="flex gap-1">
                      {(['cover', 'contain'] as StudioFit[]).map((fit) => (
                        <button
                          key={fit}
                          onClick={() => updateSequenceLayout(l.id, { fit })}
                          className={`text-[11px] px-2 py-0.5 rounded-full border ${
                            l.fit === fit ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-300 text-slate-500'
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
                      {timeline.intro.assetUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={timeline.intro.assetUrl} alt="" className="w-10 h-10 rounded object-cover" />
                      ) : (
                        // Görselsiz geri sayım intro'su — küçük önizleme olarak noktaları gösteriyoruz.
                        <div
                          className="w-10 h-10 rounded flex items-center justify-center gap-0.5 border border-slate-200"
                          style={{ backgroundColor: timeline.intro.countdown?.background ?? '#F2EFE6' }}
                        >
                          {Array.from({ length: timeline.intro.countdown?.steps ?? 3 }).map((_, i) => (
                            <span
                              key={i}
                              className="w-1 h-1 rounded-full"
                              style={{ backgroundColor: timeline.intro!.countdown?.color ?? '#14231F' }}
                            />
                          ))}
                        </div>
                      )}
                      <button onClick={() => updateTimeline({ intro: null })} className="p-1 text-slate-400 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      <NumberField
                        label="Başl."
                        value={timeline.intro.offset}
                        min={-2}
                        step={0.1}
                        onChange={(v) => {
                          const newOffset = Math.max(-2, v);
                          const oldEnd = timeline.intro!.offset + timeline.intro!.duration;
                          const newDuration = Math.max(0.1, oldEnd - newOffset);
                          updateTimeline({ intro: { ...timeline.intro!, offset: newOffset, duration: newDuration } });
                        }}
                        compact
                      />
                      <NumberField
                        label="Bit."
                        value={timeline.intro.offset + timeline.intro.duration}
                        step={0.1}
                        // Intro bitişinin bir üst limiti yok, ama mantıken çok uzamasın.
                        onChange={(v) => {
                          const newDuration = Math.max(0.1, v - timeline.intro!.offset);
                          updateTimeline({ intro: { ...timeline.intro!, duration: newDuration } });
                        }}
                        compact
                      />
                    </div>
                    {timeline.intro.assetUrl && (
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
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <AssetPicker
                      kind="image"
                      assets={assets}
                      uploading={uploading}
                      onUpload={(f) => uploadAsset(f, 'image').then((a) => a && updateTimeline({ intro: { assetUrl: a.url, duration: 2, offset: 0, fit: 'cover', countdown: null } }))}
                      onPick={(a) => updateTimeline({ intro: { assetUrl: a.url, duration: 2, offset: 0, fit: 'cover', countdown: null } })}
                    />
                    <button
                      onClick={() =>
                        updateTimeline({
                          intro: {
                            assetUrl: null,
                            duration: DEFAULT_COUNTDOWN_DURATION,
                            offset: 0,
                            fit: 'cover',
                            countdown: DEFAULT_COUNTDOWN,
                          },
                        })
                      }
                      className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 py-1.5 text-[11px] font-medium text-slate-600 hover:border-slate-900 hover:text-slate-900"
                    >
                      <Timer className="w-3.5 h-3.5" /> Geri sayım
                    </button>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <span className="text-xs font-medium text-slate-700">Outro</span>
                {timeline.outro ? (
                  <div className="rounded-lg border border-slate-200 p-2 space-y-2">
                    <div className="flex justify-between items-start">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={timeline.outro.assetUrl ?? undefined} alt="" className="w-10 h-10 rounded object-cover" />
                      <button onClick={() => updateTimeline({ outro: null })} className="p-1 text-slate-400 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      <NumberField
                        label="Başl."
                        value={sourceDuration + timeline.outro.offset - timeline.outro.duration}
                        step={0.1}
                        onChange={(v) => {
                          const oldEnd = sourceDuration + timeline.outro!.offset;
                          const newDuration = Math.max(0.1, oldEnd - v);
                          updateTimeline({ outro: { ...timeline.outro!, duration: newDuration } });
                        }}
                        compact
                      />
                      <NumberField
                        label="Bit."
                        value={sourceDuration + timeline.outro.offset}
                        max={sourceDuration + 2}
                        step={0.1}
                        onChange={(v) => {
                          const newOffset = Math.min(2, v - sourceDuration);
                          const oldStart = sourceDuration + timeline.outro!.offset - timeline.outro!.duration;
                          const newDuration = Math.max(0.1, (sourceDuration + newOffset) - oldStart);
                          updateTimeline({ outro: { ...timeline.outro!, offset: newOffset, duration: newDuration } });
                        }}
                        compact
                      />
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
                    onUpload={(f) => uploadAsset(f, 'image').then((a) => a && updateTimeline({ outro: { assetUrl: a.url, duration: 2, offset: 0, fit: 'cover', countdown: null } }))}
                    onPick={(a) => updateTimeline({ outro: { assetUrl: a.url, duration: 2, offset: 0, fit: 'cover', countdown: null } })}
                  />
                )}
              </div>
            </div>

            {/* Geri sayım ayarları tam genişlikte: intro hücresi (2 sütunun biri) bu kadar
                kontrolü taşıyamayacak kadar dar. */}
            {timeline.intro?.countdown && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2.5 mb-6">
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                  <Timer className="w-3.5 h-3.5" /> Geri sayım
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <NumberField
                    label="Nokta"
                    value={timeline.intro.countdown.steps}
                    step={1}
                    min={MIN_COUNTDOWN_STEPS}
                    onChange={(v) => updateCountdown({ steps: Math.round(Math.min(MAX_COUNTDOWN_STEPS, Math.max(MIN_COUNTDOWN_STEPS, v))) })}
                    compact
                  />
                  <label className="text-[11px] text-slate-500 flex items-center gap-1">
                    Nokta rengi
                    <input
                      type="color"
                      value={timeline.intro.countdown.color}
                      onChange={(e) => updateCountdown({ color: e.target.value })}
                      className="w-7 h-7 rounded border border-slate-300 bg-white"
                    />
                  </label>
                  {!timeline.intro.assetUrl && (
                    <label className="text-[11px] text-slate-500 flex items-center gap-1">
                      Zemin
                      <input
                        type="color"
                        value={timeline.intro.countdown.background}
                        onChange={(e) => updateCountdown({ background: e.target.value })}
                        className="w-7 h-7 rounded border border-slate-300 bg-white"
                      />
                    </label>
                  )}
                  <div className="flex gap-1">
                    {(['drain', 'fill'] as const).map((direction) => (
                      <button
                        key={direction}
                        onClick={() => updateCountdown({ direction })}
                        className={`text-[11px] px-2 py-1 rounded-full border ${timeline.intro!.countdown!.direction === direction ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-300 text-slate-500'}`}
                      >
                        {direction === 'drain' ? 'Sönerek' : 'Yanarak'}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => updateCountdown({ sound: !timeline.intro!.countdown!.sound })}
                    className={`text-[11px] px-2 py-1 rounded-full border ${timeline.intro.countdown.sound ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-300 text-slate-500'}`}
                  >
                    {timeline.intro.countdown.sound ? 'Bip sesi açık' : 'Bip sesi kapalı'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Vuruşlar {(timeline.intro.duration / (timeline.intro.countdown.steps + 1)).toFixed(2)} sn arayla; sonuncudan sonra uzun
                  &quot;yayın&quot; bipi çalar. Intro sesi kesmediği için geri sayım konuşmanın ÜSTÜNE biner — süreyi
                  konuşmaya başlamadan önceki sessizliğe göre ayarla.
                </p>
              </div>
            )}

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
              <h3 className="text-sm font-semibold text-slate-900">Zoom (kamera yakınlaştırma)</h3>
              <span className="text-xs text-slate-400">
                {timeline.zooms.length}/{MAX_ZOOMS}
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-2">
              Bu aralıkta tüm kare (video + üstündeki overlay) hedef noktaya doğru büyür — ör. el trackpad&apos;e
              değince ekrana yaklaşmak için. Oynatma başlığındaki ana eklenir. Eklendikten (ya da bir zoom satırına
              tıklandıktan) sonra önizlemede yeşil kare belirir — onu ekranın üzerine sürükle ya da önizlemeye
              tıkla, X%/Y%&apos;yi elle girmene gerek yok.
            </p>
            <button
              onClick={addZoom}
              disabled={timeline.zooms.length >= MAX_ZOOMS}
              className="text-xs font-medium rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-slate-500 hover:border-slate-400 disabled:opacity-50"
            >
              + Zoom ekle
            </button>
            <div className="mt-3 space-y-2">
              {timeline.zooms.map((z) => (
                <div
                  key={z.id}
                  onClick={() => setSelected({ type: 'zoom', id: z.id })}
                  className={`rounded-lg border p-2 cursor-pointer ${
                    selected?.id === z.id ? 'border-blue-400 bg-blue-50' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex flex-wrap gap-x-3 gap-y-1">
                      <NumberField label="Başl." value={z.startTime} onChange={(v) => updateZoom(z.id, { startTime: v })} compact />
                      <NumberField label="Bit." value={z.endTime} onChange={(v) => updateZoom(z.id, { endTime: v })} compact />
                    </div>
                    <button onClick={() => removeZoom(z.id)} className="p-1.5 text-slate-400 hover:text-red-600 shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                    <NumberField label="Hedef X%" value={z.x} min={0} step={1} onChange={(v) => updateZoom(z.id, { x: clampPct(v) })} compact />
                    <NumberField label="Hedef Y%" value={z.y} min={0} step={1} onChange={(v) => updateZoom(z.id, { y: clampPct(v) })} compact />
                    <NumberField label="Ölçek" value={z.scale} min={1} step={0.1} onChange={(v) => updateZoom(z.id, { scale: Math.max(1, Math.min(4, v)) })} compact />
                    <NumberField label="Geçiş(sn)" value={z.transition} min={0} step={0.1} onChange={(v) => updateZoom(z.id, { transition: Math.max(0, Math.min(3, v)) })} compact />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <h3 className="text-sm font-semibold text-slate-900">Yeniden Kadraj</h3>
              <span className="text-xs text-slate-400">
                {timeline.reframe.length}/{MAX_REFRAME_POINTS}
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-2">
              Kaynak video hedef en-boy oranından farklıysa (ör. yatay çekim dikey formata),
              sabit merkez kırpma özneyi kadraj dışı bırakabilir. Birkaç noktada odak
              noktasını işaretle, aralarda otomatik kayar (pan) — kaynak/hedef oran
              AYNIYSA etkisi olmaz. Eklendikten (ya da bir satıra tıklandıktan) sonra
              önizlemede yeşil kare belirir, onu sürükle/tıkla.
            </p>
            <button
              onClick={addReframePoint}
              disabled={timeline.reframe.length >= MAX_REFRAME_POINTS}
              className="text-xs font-medium rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-slate-500 hover:border-slate-400 disabled:opacity-50"
            >
              + Nokta ekle (şu an)
            </button>
            <div className="mt-3 space-y-2">
              {timeline.reframe.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelected({ type: 'reframe', id: p.id })}
                  className={`rounded-lg border p-2 cursor-pointer ${
                    selected?.type === 'reframe' && selected.id === p.id ? 'border-blue-400 bg-blue-50' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex flex-wrap gap-x-3 gap-y-1">
                      <NumberField label="Zaman" value={p.time} min={0} step={0.1} onChange={(v) => updateReframePoint(p.id, { time: Math.max(0, v) })} compact />
                      <NumberField label="X%" value={p.x} min={0} step={1} onChange={(v) => updateReframePoint(p.id, { x: clampPct(v) })} compact />
                      <NumberField label="Y%" value={p.y} min={0} step={1} onChange={(v) => updateReframePoint(p.id, { y: clampPct(v) })} compact />
                    </div>
                    <button onClick={() => removeReframePoint(p.id)} className="p-1.5 text-slate-400 hover:text-red-600 shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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
            <p className="text-xs text-slate-400 mb-2">
              Videonun üstüne biner — logo, ikinci görsel/video ya da metin. Ekrana monte edilecek görüntü için video
              yükle, konumunu ekranın üzerine sürükle ve zaman aralığını (ör. elin trackpad&apos;e değdiği ~4 sn) ayarla.
            </p>
            <div className="flex items-center gap-2">
              <AssetPicker
                kind="image"
                assets={assets}
                uploading={uploading}
                onUpload={(f) => uploadAsset(f, 'image').then((a) => a && addImageOverlay(a.url))}
                onPick={(a) => addImageOverlay(a.url)}
              />
              <AssetPicker
                kind="video"
                assets={assets}
                uploading={uploading}
                onUpload={(f) => uploadAsset(f, 'video').then((a) => a && addVideoOverlay(a.url))}
                onPick={(a) => addVideoOverlay(a.url)}
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
                      {o.kind === 'image' ? 'GÖRSEL' : o.kind === 'video' ? 'VİDEO' : 'METİN'}
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

                  {o.kind === 'video' && (
                    <video src={o.assetUrl} muted className="w-10 h-10 rounded object-cover mb-1.5" />
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
                      <>
                        <NumberField
                          label="Genişlik%"
                          value={o.width}
                          min={5}
                          step={1}
                          onChange={(v) => updateImageOverlay(o.id, { width: clampPct(v) })}
                          compact
                        />
                        {o.height !== undefined && (
                          <NumberField
                            label="Yükseklik%"
                            value={o.height}
                            min={5}
                            step={1}
                            onChange={(v) => updateImageOverlay(o.id, { height: clampPct(v) })}
                            compact
                          />
                        )}
                      </>
                    )}
                    {o.kind === 'video' && (
                      <>
                        <NumberField
                          label="Genişlik%"
                          value={o.width}
                          min={5}
                          step={1}
                          onChange={(v) => updateVideoOverlay(o.id, { width: clampPct(v) })}
                          compact
                        />
                        {o.height !== undefined && (
                          <NumberField
                            label="Yükseklik%"
                            value={o.height}
                            min={5}
                            step={1}
                            onChange={(v) => updateVideoOverlay(o.id, { height: clampPct(v) })}
                            compact
                          />
                        )}
                      </>
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

                  {(o.kind === 'image' || o.kind === 'video') && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <button
                        onClick={() => {
                          // Açılınca konumu otomatik ÜST yarıya (x:0,y:0,width:100,height:50)
                          // ayarlıyoruz VE ana videoyu da AYNI zaman aralığında (o.startTime..
                          // o.endTime) otomatik ALT yarıya sığdıran bir sequenceLayout ekliyoruz
                          // — kullanıcı iki ayrı yerde elle sayı girmeden split-screen kurulmuş
                          // oluyor. Kapatınca overlay'in kendi kutusu kalkar ama otomatik eklenen
                          // ana-video segmenti BİLEREK silinmiyor (Sekans panelinde çöp kutusuyla
                          // elle kaldırılır) — hangi segmentin hangi overlay'e ait olduğunu
                          // izleyen bir bağ tutmuyoruz, basit tutmak tercih edildi.
                          if (o.height === undefined) {
                            const patch = { x: 0, y: 0, width: 100, height: 50, overlayFit: 'cover' as StudioFit };
                            if (o.kind === 'image') updateImageOverlay(o.id, patch);
                            else updateVideoOverlay(o.id, patch);
                            addSequenceLayout(o.startTime, o.endTime, { x: 0, y: 50, width: 100, height: 50, fit: 'cover' });
                          } else if (o.kind === 'image') {
                            updateImageOverlay(o.id, { height: undefined });
                          } else {
                            updateVideoOverlay(o.id, { height: undefined });
                          }
                        }}
                        className={`text-[11px] px-2 py-0.5 rounded-full border ${
                          o.height !== undefined ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-300 text-slate-500'
                        }`}
                        title="Ekranı ikiye bölmek (split-screen/PiP) için aspect kilidini kaldırıp keyfi bir kutu tanımlar."
                      >
                        Split ekran
                      </button>
                      {o.height !== undefined &&
                        (['cover', 'contain'] as StudioFit[]).map((fit) => (
                          <button
                            key={fit}
                            onClick={() =>
                              o.kind === 'image' ? updateImageOverlay(o.id, { overlayFit: fit }) : updateVideoOverlay(o.id, { overlayFit: fit })
                            }
                            className={`text-[11px] px-2 py-0.5 rounded-full border ${
                              (o.overlayFit ?? 'cover') === fit ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-300 text-slate-500'
                            }`}
                          >
                            {fit === 'cover' ? 'Kırp' : 'Sığdır'}
                          </button>
                        ))}
                    </div>
                  )}

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
  max,
  compact = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  compact?: boolean;
}) {
  return (
    <label className={`text-[11px] text-slate-500 flex items-center gap-1 ${compact ? '' : ''}`}>
      {label}
      <input
        type="number"
        value={Number.isFinite(value) ? Number(value.toFixed(2)) : 0}
        step={step}
        min={min}
        max={max}
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
  // Görsel/video yükleme butonları aynı boş-durum ikonuna sahip olmasın diye (ikisi de
  // sadece "Upload" oku gösteriyordu, hangisinin hangisi olduğu belli olmuyordu) tür bazlı
  // ikon + tooltip kullanılıyor.
  const KindIcon = kind === 'image' ? ImageIcon : kind === 'video' ? Video : Music;
  const kindLabel = kind === 'image' ? 'Görsel yükle' : kind === 'video' ? 'Video yükle' : 'Ses yükle';

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
          ) : kind === 'video' ? (
            <video src={asset.url} muted className="w-full h-full object-cover" />
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
        title={kindLabel}
        className="relative w-14 h-14 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:border-slate-400 disabled:opacity-50 shrink-0"
      >
        {uploading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <KindIcon className="w-5 h-5" />
            <Upload className="w-2.5 h-2.5 absolute bottom-1 right-1 bg-white rounded-full ring-1 ring-slate-200 p-0.5 text-slate-400" />
          </>
        )}
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
  masterStart,
  masterEnd,
  sourceDuration,
  currentTime,
  selected,
  onSelect,
}: {
  timeline: StudioTimeline;
  masterStart: number;
  masterEnd: number;
  sourceDuration: number;
  currentTime: number;
  selected: Selection;
  onSelect: (s: Selection) => void;
}) {
  const total = masterEnd - masterStart;
  if (!(total > 0)) return null;
  
  const pct = (t: number) => {
    // Map absolute time t to a percentage of the total timeline length
    return `${Math.min(100, Math.max(0, ((t - masterStart) / total) * 100))}%`;
  };

  return (
    <div className="relative h-8 bg-slate-100 rounded-lg overflow-hidden">
      {/* Video duration representation */}
      <div 
        className="absolute top-0 bottom-0 bg-blue-100/30" 
        style={{ left: pct(0), width: `calc(${pct(sourceDuration)} - ${pct(0)})` }} 
      />
      {timeline.intro && (
        <div 
          className="absolute top-0 bottom-0 bg-slate-800/10 border-r border-slate-300" 
          style={{ left: pct(timeline.intro.offset), width: `calc(${pct(timeline.intro.offset + timeline.intro.duration)} - ${pct(timeline.intro.offset)})` }} 
          title="Intro" 
        />
      )}
      {timeline.outro && (
        <div 
          className="absolute top-0 bottom-0 bg-slate-800/10 border-l border-slate-300" 
          style={{ left: pct(sourceDuration + timeline.outro.offset - timeline.outro.duration), width: `calc(${pct(sourceDuration + timeline.outro.offset)} - ${pct(sourceDuration + timeline.outro.offset - timeline.outro.duration)})` }} 
          title="Outro" 
        />
      )}
      {timeline.zooms.map((z) => (
        <button
          key={z.id}
          onClick={() => onSelect({ type: 'zoom', id: z.id })}
          className={`absolute inset-y-0 border-x ${
            selected?.id === z.id ? 'bg-emerald-400/40 border-emerald-600' : 'bg-emerald-400/20 border-emerald-500/50'
          }`}
          style={{ left: pct(z.startTime), width: `calc(${pct(z.endTime)} - ${pct(z.startTime)})` }}
          title="Zoom"
        />
      ))}
      {timeline.captions.length > 0 && (
        // Yüzlerce kelimeyi tek tek çizmek yerine (DOM şişirir, tek tek seçilebilir de
        // değiller — stil tek bir yerden yönetiliyor) TEK bir kapsama şeridi gösteriliyor.
        <div
          className="absolute top-1 bottom-1 rounded bg-sky-400/25 border border-sky-400/50"
          style={{
            left: pct(timeline.captions[0].startTime),
            width: `calc(${pct(timeline.captions[timeline.captions.length - 1].endTime)} - ${pct(timeline.captions[0].startTime)})`,
          }}
          title={`Altyazı (${timeline.captions.length} kelime)`}
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
          title={o.kind === 'image' ? 'Görsel overlay' : o.kind === 'video' ? 'Video overlay' : 'Metin overlay'}
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
  updateVideoOverlay,
  updateTextOverlay,
  updateZoom,
  updateReframePoint,
  onDropAsset,
  imageCache,
  videoOverlayAspects,
}: {
  timeline: StudioTimeline;
  currentTime: number;
  selected: Selection;
  onSelect: (s: Selection) => void;
  updateOverlayCommon: (id: string, patch: any) => void;
  updateImageOverlay: (id: string, patch: any) => void;
  updateVideoOverlay: (id: string, patch: any) => void;
  updateTextOverlay: (id: string, patch: any) => void;
  updateZoom: (id: string, patch: Partial<StudioZoom>) => void;
  updateReframePoint: (id: string, patch: Partial<StudioReframePoint>) => void;
  onDropAsset: (url: string, kind: string, x: number, y: number) => void;
  imageCache: Map<string, HTMLImageElement>;
  videoOverlayAspects: Map<string, number>;
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
  // Zoom/Reframe hedefi, overlay'lerin aksine SADECE aktifse değil seçiliyken her zaman
  // gösterilir — kullanıcı hangi zamanda olursa olsun hedefi görüp konumlandırabilsin diye.
  const selectedZoom = selected?.type === 'zoom' ? timeline.zooms.find((z) => z.id === selected.id) : undefined;
  const selectedReframePoint =
    selected?.type === 'reframe' ? timeline.reframe.find((p) => p.id === selected.id) : undefined;

  return (
    <div
      ref={layerRef}
      className="absolute inset-0 z-10"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={(e) => {
        if (e.target !== layerRef.current) return;
        if (selectedZoom) {
          const rect = layerRef.current.getBoundingClientRect();
          const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
          const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
          updateZoom(selectedZoom.id, { x, y });
          return;
        }
        if (selectedReframePoint) {
          const rect = layerRef.current.getBoundingClientRect();
          const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
          const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
          updateReframePoint(selectedReframePoint.id, { x, y });
          return;
        }
        onSelect(null);
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
          updateVideo={(patch: any) => updateVideoOverlay(o.id, patch)}
          updateText={(patch: any) => updateTextOverlay(o.id, patch)}
          containerRef={layerRef}
          imageCache={imageCache}
          videoOverlayAspects={videoOverlayAspects}
        />
      ))}
      {selectedZoom && (
        <ZoomTargetMarker
          zoom={selectedZoom}
          containerRef={layerRef}
          onDrag={(x, y) => updateZoom(selectedZoom.id, { x, y })}
        />
      )}
      {selectedReframePoint && (
        <ReframeTargetMarker
          point={selectedReframePoint}
          containerRef={layerRef}
          onDrag={(x, y) => updateReframePoint(selectedReframePoint.id, { x, y })}
        />
      )}
    </div>
  );
}

/**
 * Zoom'un yakınlaşacağı noktayı önizlemede gösterir ve sürüklenebilir yapar — kare, mevcut
 * `scale` ile zoom yapıldığında ekranda kalacak alanı (100/scale %) önizler, böylece
 * kullanıcı ekranın sınırlarına göre hedefi gözle ayarlayabiliyor (bkz. ekran görüntüsündeki
 * elle çizilmiş daire — bu bileşen aynı ihtiyacı sürükle-bırak ile karşılıyor).
 */
function ZoomTargetMarker({
  zoom,
  containerRef,
  onDrag,
}: {
  zoom: StudioZoom;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onDrag: (x: number, y: number) => void;
}) {
  const boxSize = Math.min(90, 100 / zoom.scale);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    const container = containerRef.current;
    if (!container) return;

    const move = (moveEvent: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((moveEvent.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((moveEvent.clientY - rect.top) / rect.height) * 100));
      onDrag(x, y);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div
      className="absolute border-2 border-emerald-400 bg-emerald-400/10 cursor-move flex items-center justify-center"
      style={{
        left: `${zoom.x}%`,
        top: `${zoom.y}%`,
        width: `${boxSize}%`,
        height: `${boxSize}%`,
        transform: 'translate(-50%, -50%)',
      }}
      onPointerDown={handlePointerDown}
      title="Yakınlaşma hedefi — sürükle ya da önizlemeye tıkla"
    >
      <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow" />
    </div>
  );
}

/** `ZoomTargetMarker` ile AYNI sürükle-bırak deseni — ama `scale` yok (Reframe bir kutu
 *  değil, TEK odak noktası), boyut sabit küçük bir daire. */
function ReframeTargetMarker({
  point,
  containerRef,
  onDrag,
}: {
  point: StudioReframePoint;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onDrag: (x: number, y: number) => void;
}) {
  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    const container = containerRef.current;
    if (!container) return;

    const move = (moveEvent: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((moveEvent.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((moveEvent.clientY - rect.top) / rect.height) * 100));
      onDrag(x, y);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div
      className="absolute w-8 h-8 rounded-full border-2 border-emerald-400 bg-emerald-400/10 cursor-move flex items-center justify-center"
      style={{ left: `${point.x}%`, top: `${point.y}%`, transform: 'translate(-50%, -50%)' }}
      onPointerDown={handlePointerDown}
      title="Kadraj odağı — sürükle ya da önizlemeye tıkla"
    >
      <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow" />
    </div>
  );
}

function InteractiveOverlayItem({
  overlay,
  isSelected,
  onSelect,
  updateCommon,
  updateImage,
  updateVideo,
  updateText,
  containerRef,
  imageCache,
  videoOverlayAspects,
}: {
  overlay: StudioImageOverlay | StudioTextOverlay | StudioVideoOverlay;
  isSelected: boolean;
  onSelect: () => void;
  updateCommon: (patch: any) => void;
  updateImage: (patch: any) => void;
  updateVideo: (patch: any) => void;
  updateText: (patch: any) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  imageCache: Map<string, HTMLImageElement>;
  videoOverlayAspects: Map<string, number>;
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
    const startWidth = overlay.kind === 'text' ? overlay.fontSize : overlay.width;
    const container = containerRef.current;
    if (!container) return;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      if (overlay.kind === 'image') {
        const dx = ((moveEvent.clientX - startX) / rect.width) * 100;
        updateImage({ width: Math.max(5, Math.min(100, startWidth + dx)) });
      } else if (overlay.kind === 'video') {
        const dx = ((moveEvent.clientX - startX) / rect.width) * 100;
        updateVideo({ width: Math.max(5, Math.min(100, startWidth + dx)) });
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

  // Görsel/video overlay'lerin sınır kutusu, medyanın kendi en-boy oranını kullanır (CSS
  // aspect-ratio ile) — böylece sürükle-boyutlandır kutusu gerçek çizilen alanla eşleşir.
  const imgAspect =
    overlay.kind === 'image' && imageCache.get(overlay.assetUrl)
      ? (imageCache.get(overlay.assetUrl)!.naturalWidth || 1) / (imageCache.get(overlay.assetUrl)!.naturalHeight || 1)
      : overlay.kind === 'video'
        ? videoOverlayAspects.get(overlay.assetUrl) ?? 16 / 9 // metadata henüz yüklenmediyse makul bir varsayılan
        : undefined;

  return (
    <div
      className={`absolute cursor-move border-2 ${
        isSelected ? 'border-blue-500 bg-blue-500/10' : 'border-transparent hover:border-white/30'
      }`}
      style={{
        left: `${overlay.x}%`,
        top: `${overlay.y}%`,
        width: overlay.kind === 'image' || overlay.kind === 'video' ? `${overlay.width}%` : 'auto',
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
