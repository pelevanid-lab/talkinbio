'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, Download, ImageIcon, Loader2, Save, Undo2, Upload, Wand2, X } from 'lucide-react';
import type { CharacterShot } from '@/config/characters';
import type { OverlayLocale } from '@/config/characters';
import { OVERLAY_LOCALES } from '@/config/characters';
import type { CharacterClip } from '@/config/clips';
import type { StudioAsset } from '@/config/studio';
import {
  ESTIMATED_BG_REMOVAL_COST_USD,
  POST_FORMATS,
  POST_TEMPLATES,
  type PostFormat,
  type PostTemplate,
  type PostTemplateId,
} from '@/config/post';
import { findCuratedPostFont, googleFontsHref } from '@/config/postFonts';
import { ANIMATED_POST_DURATION_MS, canvasToPng, renderPost, type PostTexts } from '@/utils/postRenderer';
import { downloadBlob, loadMedia, type LoadedMedia } from '@/utils/imageOverlay';
import { creditsForCost } from '@/config/pricing';

// Bu sayfa bilerek LabStage (aşama akordiyonu) kullanmıyor: Twin/Voice/Podcast sıralı
// birer üretim hattı, burası ise canlı önizlemeli bir EDİTÖR — kontrolü değiştirip
// sonucu anında görmek gerekiyor, katlanan bölümler bunu bozardı. Görsel dil (kart,
// renk, tipografi) aynı kalıyor.

const LOCALE_LABEL: Record<OverlayLocale, string> = { tr: 'Türkçe', en: 'English', ru: 'Русский' };

/** `items` yalnız `imageMode:'list'` şablonlarda (ör. 'ilham-karti') kullanılıyor — sabit 4
 *  boş satırla başlıyor, doldurulmayanlar `renderPost` tarafında zaten atlanıyor. */
const EMPTY_ITEMS = () => Array.from({ length: 4 }, () => ({ title: '', body: '' }));

const EMPTY_TEXTS: Record<OverlayLocale, PostTexts> = {
  tr: { headline: '', subline: '', items: EMPTY_ITEMS() },
  en: { headline: '', subline: '', items: EMPTY_ITEMS() },
  ru: { headline: '', subline: '', items: EMPTY_ITEMS() },
};

type Props = {
  /** Twin + Yardımcı Oyuncular'ın (Saule/Beiwe/eklenen sanal karakterler) TÜMÜNÜN kare
   *  galerisi — tek karaktere kilitli değil, bkz. beiweLabScope.ts. */
  shots: CharacterShot[];
  /** Aynı kadronun Podcast/Motion'da ürettiği videolar — galeri artık foto+video karışık. */
  clips: CharacterClip[];
  /** `character_studio_assets` — "Arka planı kaldır" ve "Stüdyo kütüphanesine kaydet"
   *  sonuçlarının düştüğü havuz (bkz. removeBackground/saveToLibrary). Bu ikisi olmadan
   *  üretilen görsel hiçbir yerde görünmüyordu — bkz. proje geçmişi, bulunan hata. */
  assets: StudioAsset[];
  /** Kaydedilen gönderilerin yükleneceği karakter kapsamı — Beiwe Studio'nun asset
   *  kütüphanesiyle (character_studio_assets) AYNI kapsam, bkz. saveToLibrary yorumu. */
  characterId: string;
  /** Müşteri modunda ham $ maliyetini gizle — yalnızca kredi karşılığı görünsün. */
  hideCost?: boolean;
};

export default function BeiwePostClient({ shots, clips, assets: initialAssets, characterId, hideCost = false }: Props) {
  // Sunucudan gelen ilk listeye "Arka planı kaldır"/"Stüdyo kütüphanesine kaydet" sonuçları
  // CANLI ekleniyor — sayfa yenilenmeden galeri güncel kalsın diye (bkz. removeBackground/saveToLibrary).
  const [libraryAssets, setLibraryAssets] = useState<StudioAsset[]>(initialAssets);
  const [templateId, setTemplateId] = useState<PostTemplateId>('ekran');
  const [formatId, setFormatId] = useState(POST_FORMATS[0].id);
  const [locale, setLocale] = useState<OverlayLocale>('tr');
  const [texts, setTexts] = useState<Record<OverlayLocale, PostTexts>>(EMPTY_TEXTS);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [uploadedName, setUploadedName] = useState<string | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  // İnce ayarlar — şablonun kilidini bozmadan kullanıcının "obje büyült/küçült",
  // "objenin/yazının konumu", "renk tonu" isteği (bkz. renderPost'taki PostAdjustments
  // yorumu). Şablon değişince sıfırlanır (aşağıdaki useEffect) — her şablon kendi
  // varsayılan yerleşimiyle başlasın diye.
  const [imageScale, setImageScale] = useState(1);
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  const [textOffset, setTextOffset] = useState({ x: 0, y: 0 });
  const [hueShift, setHueShift] = useState(0);
  const [textScale, setTextScale] = useState(1);
  // null = şablonun kilitli rengi — kullanıcı bir renk seçince o rengin YERİNE geçer.
  const [textColor, setTextColor] = useState<string | null>(null);
  // Yalnız 'contain' şablonlarda anlamlı — Obje sürüklenip Yazı'nın üstüne gelince hangisi görünsün.
  const [textOnTop, setTextOnTop] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mediaObj, setMediaObj] = useState<LoadedMedia | null>(null);
  // Hareketli: başlık/alt satır kayarak beliriyor, görsel yavaşça yakınlaşıyor (Ken Burns),
  // zeminde hafif bir ışık huzmesi geziyor — bkz. `postRenderer.ts`. Video/görsel/görselsiz
  // her şablonda çalışır, süre kilitli (ANIMATED_POST_DURATION_MS).
  const [animated, setAnimated] = useState(false);

  const [removingBackground, setRemovingBackground] = useState(false);
  // Arka planı kaldırılmış görselin ÖNCESİNİ tutar — "Orijinali geri getir" bunu geri yükler.
  // `imageUrl` bg-kaldırma sonrası fal'ın URL'ine geçtiği için orijinali ayrıca saklamak gerekiyor.
  const [previousImageUrl, setPreviousImageUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Sürükle-bırak tutamaçları canvas'ın CSS boyutuna göre yüzde hesaplıyor — canvas
  // `w-full h-auto` (duyarlı) olduğu için gerçek piksel boyutu ancak bu wrapper'ın
  // `getBoundingClientRect()`'iyle bilinebilir (bkz. startDrag).
  const previewWrapRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Yerel dosyalar için oluşturulan object URL'i serbest bırakmak gerekiyor.
  const objectUrlRef = useRef<string | null>(null);
  // "Arka planı kaldır" fal'a erişilebilir bir https URL istiyor — object URL tarayıcıya
  // özel olduğu için cihazdan yüklenen dosyanın KENDİSİ (multipart gönderim için) burada
  // ayrıca tutuluyor; galeriden seçilen görsellerde zaten gerçek bir Supabase URL'i var.
  const uploadedFileRef = useRef<File | null>(null);
  // "Hareketli" önizleme döngüsünün başlangıç zamanı — indirme sırasında bu döngü
  // duraklatılır (capturingRef), aksi halde ikinci bir paint() kaynağı yarış durumu yaratır.
  const animationStartRef = useRef<number>(0);
  const capturingRef = useRef(false);

  const template = POST_TEMPLATES.find((t) => t.id === templateId) as PostTemplate;
  const format = POST_FORMATS.find((f) => f.id === formatId) as PostFormat;
  const needsImage = template.imageMode !== 'none' && template.imageMode !== 'list';

  // Durum değiştirmeyen saf çizim — hem önizleme efekti hem indirme bunu kullanıyor.
  // setState'i buraya koymuyoruz: efekt gövdesinde senkron setState zincirleme
  // render tetikliyor (react-hooks/set-state-in-effect).
  const paint = useCallback(
    async (targetLocale: OverlayLocale, elapsedMs?: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      await renderPost({
        canvas,
        template,
        format,
        texts: texts[targetLocale],
        mediaObj: needsImage ? mediaObj : null,
        elapsedMs,
        adjustments: {
          imageScale,
          imageOffsetX: imageOffset.x,
          imageOffsetY: imageOffset.y,
          textOffsetX: textOffset.x,
          textOffsetY: textOffset.y,
          hueShift,
          textScale,
          textColor,
          textOnTop,
        },
      });
    },
    [template, format, texts, mediaObj, needsImage, imageScale, imageOffset, textOffset, hueShift, textScale, textColor, textOnTop],
  );

  // Şablon değişince ince ayarlar sıfırlanır — her şablon kendi kilitli varsayılan
  // yerleşimiyle başlasın, önceki şablonda sürüklenen konum yeni şablona sızmasın.
  useEffect(() => {
    setImageScale(1);
    setImageOffset({ x: 0, y: 0 });
    setTextOffset({ x: 0, y: 0 });
    setHueShift(0);
    setTextScale(1);
    setTextColor(null);
    setTextOnTop(false);
  }, [templateId]);

  /**
   * Önizlemedeki "Obje" ya da "Yazı" tutamacını sürüklemeye başlar — fare/parmak hareketini
   * canvas'ın CSS boyutuna göre yüzdeye çevirip ilgili ofset state'ini günceller. Tutamaç
   * gerçek görselin/metnin TAM üstünde durmuyor (şablona göre yeri değişir, hesaplaması
   * `postRenderer.ts`'in kendi yerleşim mantığını JS'te tekrarlamayı gerektirirdi) — sabit
   * bir konumdan başlayıp GÖRECELİ hareketi aktarıyor, bu da "sürükle" hissi için yeterli.
   */
  const startDrag = (kind: 'image' | 'text') => (e: React.PointerEvent) => {
    e.preventDefault();
    const wrap = previewWrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startOffset = kind === 'image' ? imageOffset : textOffset;
    const setOffset = kind === 'image' ? setImageOffset : setTextOffset;

    const onMove = (moveEvent: PointerEvent) => {
      const dxPct = ((moveEvent.clientX - startX) / rect.width) * 100;
      const dyPct = ((moveEvent.clientY - startY) / rect.height) * 100;
      setOffset({ x: startOffset.x + dxPct, y: startOffset.y + dyPct });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // Şablonun kilitli fontu — sadece Post editöründe, runtime'da `<link>` enjekte edilir (bkz.
  // config/postFonts.ts başlık yorumu: next/font DEĞİL, 30+ fontu build-time'da self-host
  // etmek gereksiz bundle şişmesi olurdu). `data-post-font` ile aynı font iki kez eklenmiyor;
  // henüz yüklenmemişse `load` olayında bir kez daha çizip fallback fontla kalan karenin
  // önüne geçiyoruz.
  useEffect(() => {
    const font = findCuratedPostFont(template.fontId);
    if (!font) return;

    const existing = document.querySelector<HTMLLinkElement>(`link[data-post-font="${font.id}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        paint(locale).catch(() => {});
      } else {
        existing.addEventListener('load', () => paint(locale).catch(() => {}), { once: true });
      }
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = googleFontsHref(font);
    link.dataset.postFont = font.id;
    link.onload = () => {
      link.dataset.loaded = 'true';
      paint(locale).catch(() => {});
    };
    document.head.appendChild(link);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template.fontId]);

  // Load media whenever imageUrl changes
  useEffect(() => {
    let cancelled = false;
    if (!imageUrl) {
      setMediaObj(null);
      return;
    }
    loadMedia(imageUrl, isVideo)
      .then((obj) => {
        if (!cancelled) {
          setMediaObj(obj);
          if (isVideo) {
            const video = obj.element as HTMLVideoElement;
            video.loop = true;
            video.play().catch(() => {}); // Autoplay might fail, ignore
          }
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Görsel/video yüklenemedi.');
      });
    return () => {
      cancelled = true;
    };
  }, [imageUrl, isVideo]);

  // Main animation / paint loop
  useEffect(() => {
    let cancelled = false;

    if (isVideo && mediaObj) {
      const video = mediaObj.element as HTMLVideoElement;
      const loop = async () => {
        if (cancelled) return;
        if (!capturingRef.current) {
          try { await paint(locale, animated ? video.currentTime * 1000 : undefined); } catch (e) {}
        }
        animationRef.current = requestAnimationFrame(loop);
      };
      animationRef.current = requestAnimationFrame(loop);
    } else if (animated) {
      // Medyasız/görselli ama sabit görsel: kendi zamanlayıcımızla önizlemeyi döngüye sokuyoruz
      // (video elementi yok, currentTime'a bağlı olamayız). ANIMATED_POST_DURATION_MS dolunca
      // yeniden başlar — yalnızca önizleme için, indirme kendi tek geçişini yapıyor (bkz. download).
      animationStartRef.current = performance.now();
      const loop = async () => {
        if (cancelled) return;
        if (!capturingRef.current) {
          const elapsed = performance.now() - animationStartRef.current;
          if (elapsed >= ANIMATED_POST_DURATION_MS) animationStartRef.current = performance.now();
          try { await paint(locale, elapsed % ANIMATED_POST_DURATION_MS); } catch {}
        }
        animationRef.current = requestAnimationFrame(loop);
      };
      animationRef.current = requestAnimationFrame(loop);
    } else {
      void (async () => {
        try {
          await paint(locale);
        } catch (err) {
          if (!cancelled) setError(err instanceof Error ? err.message : 'Önizleme çizilemedi.');
        }
      })();
    }

    return () => {
      cancelled = true;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [paint, locale, isVideo, mediaObj, animated]);

  // Bileşen kalkarken son object URL'i bırak.
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const pickLocalFile = (file: File) => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    uploadedFileRef.current = file;
    setPreviousImageUrl(null);
    setImageUrl(url);
    setIsVideo(file.type.startsWith('video/'));
    setUploadedName(file.name);
  };

  const pickGalleryShot = (shot: CharacterShot) => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    uploadedFileRef.current = null;
    setPreviousImageUrl(null);
    setImageUrl(shot.image_url);
    setIsVideo(false);
    setUploadedName(null);
    setShowGallery(false);
  };

  /** Galeriden bir VİDEO seçer — Podcast/Motion çıktısı, `pickGalleryShot` ile AYNI akış,
   * yalnızca `isVideo:true` ve kaynak `clip.video_url`. */
  const pickGalleryClip = (clip: CharacterClip) => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    uploadedFileRef.current = null;
    setPreviousImageUrl(null);
    setImageUrl(clip.video_url);
    setIsVideo(true);
    setUploadedName(null);
    setShowGallery(false);
  };

  /** Galeriden daha önce kaydedilmiş bir görsel seçer ("Arka planı kaldır"/"Stüdyo
   * kütüphanesine kaydet" çıktısı) — `pickGalleryShot` ile AYNI akış. */
  const pickGalleryAsset = (asset: StudioAsset) => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    uploadedFileRef.current = null;
    setPreviousImageUrl(null);
    setImageUrl(asset.url);
    setIsVideo(false);
    setUploadedName(null);
    setShowGallery(false);
  };

  /** Cihazdan yüklenen dosyayı (varsa) ya da galeriden seçilen gerçek URL'i fal'a gönderip
   * arka planını kaldırır — sunucu tarafı `remove-background` route'u iki girdiyi de kabul
   * ediyor (bkz. o route'un yorumu). */
  const removeBackground = async () => {
    if (!imageUrl) return;
    setRemovingBackground(true);
    setError(null);
    try {
      let res: Response;
      if (uploadedFileRef.current) {
        const formData = new FormData();
        formData.append('file', uploadedFileRef.current);
        res = await fetch(`/api/admin/characters/${characterId}/post/remove-background`, {
          method: 'POST',
          body: formData,
        });
      } else {
        res = await fetch(`/api/admin/characters/${characterId}/post/remove-background`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl }),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Arka plan kaldırılamadı.');

      setPreviousImageUrl(imageUrl);
      // Sonuç artık fal'ın DEĞİL, sunucunun Supabase'e re-host edip döndürdüğü kalıcı bir
      // URL (bkz. route'un yorumu) — object URL değil, bu yüzden `uploadedFileRef`'i
      // temizlemiyoruz ama artık ihtiyaç yok (yeni imageUrl zaten https).
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setImageUrl(data.url);
      // Route `character_studio_assets`e kaydettiyse (`saved:true`) galeriye canlı ekle —
      // aksi hâlde kullanıcı ürettiği görseli bir daha hiçbir yerde bulamıyordu.
      if (data.saved && data.asset) {
        setLibraryAssets((prev) => [data.asset as StudioAsset, ...prev]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Arka plan kaldırılamadı.');
    } finally {
      setRemovingBackground(false);
    }
  };

  const restoreOriginal = () => {
    if (!previousImageUrl) return;
    setImageUrl(previousImageUrl);
    setPreviousImageUrl(null);
  };

  const clearImage = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    uploadedFileRef.current = null;
    setPreviousImageUrl(null);
    setImageUrl(null);
    setIsVideo(false);
    setUploadedName(null);
  };

  const setText = (field: keyof PostTexts, value: string) => {
    setTexts((prev) => ({ ...prev, [locale]: { ...prev[locale], [field]: value } }));
  };

  /** "İlham kartı" (`imageMode:'list'`) için 4 sabit {title, body} çiftinden birini günceller. */
  const setItemField = (index: number, field: 'title' | 'body', value: string) => {
    setTexts((prev) => {
      const items = [...(prev[locale].items ?? EMPTY_ITEMS())];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, [locale]: { ...prev[locale], items } };
    });
  };

  /**
   * Önizlemeyi son bir kez üretip tek bir çıktı bloğuna çevirir — `download` (cihaza indir)
   * ve `saveToLibrary` (Beiwe Studio'nun asset kütüphanesine kaydet) AYNI üç dalı (video
   * kaynaklı / hareketli-ama-görsel / sabit) paylaşıyor, sonucu ne yapacaklarında ayrışıyorlar.
   */
  const produceExportBlob = async (
    targetLocale: OverlayLocale,
  ): Promise<{ blob: Blob; ext: string; kind: 'image' | 'video' }> => {
    const canvas = canvasRef.current;
    if (!canvas) throw new Error('Canvas hazır değil.');

    if (isVideo && mediaObj) {
      const video = mediaObj.element as HTMLVideoElement;
      const duration = video.duration || 10;

      // Start playing from beginning
      video.currentTime = 0;
      await video.play().catch(() => {});

      // Record stream
      const stream = canvas.captureStream(60); // 60 FPS

      // Use H264 WebM if possible for better quality/compatibility
      let mimeType = 'video/webm';
      if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
        mimeType = 'video/webm;codecs=h264';
      }

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 8000000, // 8 Mbps high quality
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);

      return new Promise((resolve, reject) => {
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          resolve({ blob, ext: mimeType.includes('mp4') ? 'mp4' : 'webm', kind: 'video' });
        };
        recorder.onerror = (e) => reject(e);
        recorder.start();

        // Stop when video ends
        setTimeout(() => {
          recorder.stop();
        }, duration * 1000);
      });
    }

    if (animated) {
      // Medyasız/sabit-görsel hareketli export — video elementi yok, kendi zamanlayıcımızla
      // tek geçiş çiziyoruz. Önizleme döngüsü (yukarıdaki useEffect) `capturingRef` sayesinde
      // bu sırada duraklıyor — aksi halde iki ayrı paint() kaynağı canvas'ı yarışarak boyar.
      capturingRef.current = true;
      try {
        const stream = canvas.captureStream(60);
        let mimeType = 'video/webm';
        if (MediaRecorder.isTypeSupported('video/mp4')) {
          mimeType = 'video/mp4';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
          mimeType = 'video/webm;codecs=h264';
        }

        const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8000000 });
        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => chunks.push(e.data);

        return await new Promise<{ blob: Blob; ext: string; kind: 'video' }>((resolve, reject) => {
          const start = performance.now();
          recorder.onstop = () => {
            const blob = new Blob(chunks, { type: mimeType });
            resolve({ blob, ext: mimeType.includes('mp4') ? 'mp4' : 'webm', kind: 'video' });
          };
          recorder.onerror = (e) => reject(e);
          recorder.start();

          const captureFrame = () => {
            const elapsed = performance.now() - start;
            if (elapsed >= ANIMATED_POST_DURATION_MS) {
              paint(targetLocale, ANIMATED_POST_DURATION_MS).finally(() => recorder.stop());
              return;
            }
            paint(targetLocale, elapsed).finally(() => requestAnimationFrame(captureFrame));
          };
          captureFrame();
        });
      } finally {
        capturingRef.current = false;
        animationStartRef.current = performance.now();
      }
    }

    await paint(targetLocale);
    const blob = await canvasToPng(canvas);
    return { blob, ext: 'png', kind: 'image' };
  };

  const download = async (targetLocale: OverlayLocale) => {
    setDownloading(true);
    setError(null);
    try {
      const { blob, ext } = await produceExportBlob(targetLocale);
      const suffix = animated && !isVideo ? '-hareketli' : '';
      downloadBlob(blob, `talkinbio-${template.id}-${format.id}-${targetLocale}${suffix}.${ext}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'İndirilemedi.');
    } finally {
      setDownloading(false);
      if (targetLocale !== locale) await paint(locale).catch(() => {});
    }
  };

  /**
   * Render edilen gönderiyi indirmek yerine (ya da onun yanında) Beiwe Studio'nun ortak asset
   * kütüphanesine (`character_studio_assets`) yükler — Studio'daki AssetPicker (cutaway/
   * overlay/sekans-görsel seçicileri) bu tabloyu ZATEN okuyor, bu yüzden Studio tarafında
   * hiçbir yeni kod gerekmiyor: aynı `characterId` (TWIN_CHARACTER_ID) kapsamında kaydedilen
   * bir gönderi Studio'yu açar açmaz oradaki seçicilerde belirir.
   */
  const saveToLibrary = async (targetLocale: OverlayLocale) => {
    setSaving(true);
    setError(null);
    setSavedMessage(null);
    try {
      const { blob, ext, kind } = await produceExportBlob(targetLocale);
      const fileName = `talkinbio-${template.id}-${format.id}-${targetLocale}.${ext}`;
      const formData = new FormData();
      formData.append('file', new File([blob], fileName, { type: blob.type }));
      formData.append('kind', kind);
      const res = await fetch(`/api/admin/characters/${characterId}/studio-asset`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kaydedilemedi.');
      setSavedMessage('Kaydedildi — Beiwe Studio’daki galeriden erişebilirsin.');
      // Görselse Post'un KENDİ galerisine de canlı ekleniyor (video zaten `clips`ten geliyor,
      // burada tekrar eklenmiyor — o havuz character_clips, bu character_studio_assets, ikisi ayrı).
      if (kind === 'image' && data.asset) {
        setLibraryAssets((prev) => [data.asset as StudioAsset, ...prev]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kaydedilemedi.');
    } finally {
      setSaving(false);
      if (targetLocale !== locale) await paint(locale).catch(() => {});
    }
  };

  // Tek üretimden üç dil: metin katman olduğu için görseli yeniden üretmeye gerek yok.
  const downloadAll = async () => {
    setDownloading(true);
    setError(null);
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      for (const l of OVERLAY_LOCALES) {
        if (!texts[l].headline.trim() && !texts[l].subline.trim()) continue;
        await paint(l);
        const blob = await canvasToPng(canvas);
        downloadBlob(blob, `talkinbio-${template.id}-${format.id}-${l}.png`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'İndirilemedi.');
    } finally {
      setDownloading(false);
      await paint(locale).catch(() => {});
    }
  };

  const filledLocales = OVERLAY_LOCALES.filter(
    (l) => texts[l].headline.trim() || texts[l].subline.trim(),
  );

  return (
    <div className="space-y-5">
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-700 text-xs">
            kapat
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-5 items-start">
        {/* ─── Kontroller ─────────────────────────────── */}
        <div className="space-y-5">
          {/* Şablon */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-900">Şablon</h2>
            <p className="text-xs text-slate-500 mb-3">
              Tipografi, konum ve renk şablonun içinde <strong>kilitli</strong> — ızgaranın marka
              gibi durmasını sağlayan şey bu. Sen yalnızca metni, görseli ve formatı seçiyorsun.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {POST_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTemplateId(t.id)}
                  className={`text-left rounded-xl border p-3 transition-colors ${
                    templateId === t.id
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900">{t.label}</span>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">{t.pillar}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 leading-snug">{t.hint}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Format */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Format</h2>
            <div className="flex flex-wrap gap-2">
              {POST_FORMATS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFormatId(f.id)}
                  title={f.hint}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                    formatId === f.id
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
                  }`}
                >
                  {f.label}
                  <span className="opacity-60 ml-1.5">
                    {f.width}×{f.height}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Hareket */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Hareket</h2>
                <p className="text-xs text-slate-500 mt-0.5 leading-snug max-w-md">
                  Başlık/alt satır kayarak belirir, görsel yavaşça yakınlaşır, zeminde hafif bir ışık
                  huzmesi gezer — ~4 saniyelik bir klibe dönüşür. Süre ve eğri şablon gibi kilitli.
                </p>
              </div>
              <button
                onClick={() => setAnimated((v) => !v)}
                role="switch"
                aria-checked={animated}
                className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${animated ? 'bg-blue-600' : 'bg-slate-300'}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${animated ? 'translate-x-5' : ''}`}
                />
              </button>
            </div>
          </section>

          {/* Görsel */}
          {needsImage && (
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-slate-900">Görsel</h2>
              <p className="text-xs text-slate-500 mb-3">
                {template.imageMode === 'contain'
                  ? 'Ekran kaydı/görüntüsü çerçevelenir, kırpılmaz — arayüzün tamamı görünür kalır.'
                  : template.imageMode === 'card'
                    ? 'Kartın solunda küçük bir küçük resim olarak durur — opsiyonel, boş bırakılabilir.'
                    : 'Görsel tam kanar ve formata göre kırpılır.'}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-blue-700"
                >
                  <Upload className="w-4 h-4" />
                  Cihazdan yükle
                </button>
                <button
                  onClick={() => setShowGallery((v) => !v)}
                  disabled={shots.length === 0 && clips.length === 0 && libraryAssets.length === 0}
                  className="flex items-center gap-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg px-4 py-2 disabled:opacity-40"
                >
                  <ImageIcon className="w-4 h-4" />
                  Galeriden seç ({shots.length + clips.length + libraryAssets.length})
                </button>
                {imageUrl && !isVideo && (
                  <button
                    onClick={removeBackground}
                    disabled={removingBackground}
                    title="fal.ai ile görseldeki arka planı kaldırır — obje/kişi zeminden ayrılır."
                    className="flex items-center gap-2 text-sm font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg px-4 py-2 disabled:opacity-50"
                  >
                    {removingBackground ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    Arka planı kaldır
                  </button>
                )}
                {previousImageUrl && (
                  <button
                    onClick={restoreOriginal}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    Orijinali geri getir
                  </button>
                )}
                {imageUrl && (
                  <button
                    onClick={clearImage}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600"
                  >
                    <X className="w-3.5 h-3.5" />
                    Kaldır
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) pickLocalFile(file);
                    e.target.value = '';
                  }}
                />
              </div>

              {imageUrl && !isVideo && (
                <p className="text-[11px] text-slate-400 mt-1.5">
                  {hideCost
                    ? `Arka planı kaldırma maliyeti ≈${creditsForCost(ESTIMATED_BG_REMOVAL_COST_USD)} kredi.`
                    : `Arka planı kaldırma maliyeti ~$${ESTIMATED_BG_REMOVAL_COST_USD.toFixed(4)}/görsel (doğrulandı, 2026-07-31) · ≈${creditsForCost(ESTIMATED_BG_REMOVAL_COST_USD)} kredi.`}
                </p>
              )}

              {uploadedName && <p className="text-xs text-slate-500 mt-2">{uploadedName}</p>}

              {showGallery && (shots.length > 0 || clips.length > 0 || libraryAssets.length > 0) && (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-3 max-h-56 overflow-y-auto pr-1">
                  {/* Twin + Yardımcı Oyuncular'ın TÜM kadrosu — tek karaktere kilitli değil,
                      bkz. BeiwePostPage'teki getAllBeiweLabCharacterIds. */}
                  {shots.map((shot) => (
                    <button
                      key={shot.id}
                      onClick={() => pickGalleryShot(shot)}
                      className="rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-400 transition-colors"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={shot.image_url} alt="" className="w-full h-auto block" />
                    </button>
                  ))}
                  {clips.map((clip) => (
                    <button
                      key={clip.id}
                      onClick={() => pickGalleryClip(clip)}
                      className="relative rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-400 transition-colors bg-black"
                      title="Podcast/Motion videosu"
                    >
                      <video src={clip.video_url} muted className="w-full aspect-square object-cover block" />
                      <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] font-semibold px-1 py-0.5 rounded">
                        VİDEO
                      </span>
                    </button>
                  ))}
                  {/* "Arka planı kaldır" / "Stüdyo kütüphanesine kaydet" çıktıları — bkz.
                      removeBackground/saveToLibrary, buraya CANLI ekleniyor. */}
                  {libraryAssets.map((asset) => (
                    <button
                      key={asset.id}
                      onClick={() => pickGalleryAsset(asset)}
                      className="relative rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-400 transition-colors bg-[repeating-conic-gradient(#e5e7eb_0%_25%,white_0%_50%)] bg-[length:12px_12px]"
                      title="Kaydedilmiş görsel"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={asset.url} alt="" className="w-full aspect-square object-contain block" />
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Metin */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-900">Metin</h2>
              <div className="flex gap-1">
                {OVERLAY_LOCALES.map((l) => {
                  const filled = texts[l].headline.trim() || texts[l].subline.trim();
                  return (
                    <button
                      key={l}
                      onClick={() => setLocale(l)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        locale === l
                          ? 'bg-slate-900 text-white'
                          : filled
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {LOCALE_LABEL[l]}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="block text-xs font-medium text-slate-600 mb-1">Başlık</label>
            <textarea
              value={texts[locale].headline}
              onChange={(e) => setText('headline', e.target.value)}
              rows={2}
              placeholder={
                template.id === 'soz'
                  ? 'Günde 15 kere aynı soruya cevap yazıyorsun.'
                  : 'DM’e gelen “fiyat ne?” sorusu 3 saniyede kapanıyor.'
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <label className="block text-xs font-medium text-slate-600 mb-1 mt-3">
              Alt satır <span className="font-normal text-slate-400">(opsiyonel)</span>
            </label>
            <textarea
              value={texts[locale].subline}
              onChange={(e) => setText('subline', e.target.value)}
              rows={2}
              placeholder="Bio linkin artık cevap veriyor."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <p className="text-[11px] text-slate-400 mt-2">
              Metin katman olarak biniyor — tek görselden üç dilde gönderi çıkar, düzeltme
              için yeniden üretim gerekmez.
            </p>

            {template.imageMode === 'list' && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <h3 className="text-xs font-semibold text-slate-700 mb-1">İpucu kartları</h3>
                <p className="text-[11px] text-slate-400 mb-3">
                  Başlığın altında 2x2 ızgara olarak dizilir — boş bırakılanlar atlanır.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(texts[locale].items ?? EMPTY_ITEMS()).map((item, i) => (
                    <div key={i} className="rounded-lg border border-slate-200 p-2.5 space-y-1.5">
                      <input
                        value={item.title}
                        onChange={(e) => setItemField(i, 'title', e.target.value)}
                        placeholder={`İpucu ${i + 1} başlığı`}
                        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <textarea
                        value={item.body}
                        onChange={(e) => setItemField(i, 'body', e.target.value)}
                        rows={2}
                        placeholder="Kısa açıklama"
                        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* ─── Önizleme ─────────────────────────────── */}
        <div className="lg:sticky lg:top-4 space-y-3">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-900">Önizleme</h2>
              {downloading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
            </div>
            <div ref={previewWrapRef} className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
              <canvas ref={canvasRef} className="w-full h-auto block" />
              {needsImage && mediaObj && !isVideo && (
                <button
                  onPointerDown={startDrag('image')}
                  title="Sürükleyerek objenin/görselin konumunu değiştir"
                  className="absolute w-8 h-8 -ml-4 -mt-4 rounded-full bg-purple-600/90 text-white text-[10px] font-bold flex items-center justify-center cursor-grab active:cursor-grabbing shadow-lg border-2 border-white touch-none"
                  style={{ left: `calc(50% + ${imageOffset.x}%)`, top: `calc(60% + ${imageOffset.y}%)` }}
                >
                  Obje
                </button>
              )}
              {(texts[locale].headline.trim() || texts[locale].subline.trim()) && (
                <button
                  onPointerDown={startDrag('text')}
                  title="Sürükleyerek yazının konumunu değiştir"
                  className="absolute w-8 h-8 -ml-4 -mt-4 rounded-full bg-slate-900/90 text-white text-[10px] font-bold flex items-center justify-center cursor-grab active:cursor-grabbing shadow-lg border-2 border-white touch-none"
                  style={{ left: `calc(50% + ${textOffset.x}%)`, top: `calc(20% + ${textOffset.y}%)` }}
                >
                  Yazı
                </button>
              )}
            </div>
            {needsImage && template.imageMode !== 'card' && !imageUrl && (
              <p className="text-xs text-amber-600 mt-2">
                Bu şablon görsel istiyor — yükleyene kadar yalnız zemin ve metin görünür.
              </p>
            )}

            <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-700">İnce ayar</h3>
                  {(imageScale !== 1 || imageOffset.x !== 0 || imageOffset.y !== 0 || textOffset.x !== 0 || textOffset.y !== 0 || hueShift !== 0 || textScale !== 1 || textColor !== null || textOnTop) && (
                    <button
                      onClick={() => {
                        setImageScale(1);
                        setImageOffset({ x: 0, y: 0 });
                        setTextOffset({ x: 0, y: 0 });
                        setHueShift(0);
                        setTextScale(1);
                        setTextColor(null);
                        setTextOnTop(false);
                      }}
                      className="text-[11px] text-slate-400 hover:text-slate-700"
                    >
                      Sıfırla
                    </button>
                  )}
                </div>
                {needsImage && mediaObj && !isVideo && (
                  <label className="block text-xs text-slate-600">
                    <div className="flex items-center justify-between mb-1">
                      <span>Obje boyutu</span>
                      <span className="text-slate-400 tabular-nums">%{Math.round(imageScale * 100)}</span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={2}
                      step={0.02}
                      value={imageScale}
                      onChange={(e) => setImageScale(Number(e.target.value))}
                      className="w-full"
                    />
                  </label>
                )}
                <label className="block text-xs text-slate-600">
                  <div className="flex items-center justify-between mb-1">
                    <span>Renk tonu</span>
                    <span className="text-slate-400 tabular-nums">{hueShift > 0 ? `+${hueShift}` : hueShift}°</span>
                  </div>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    step={1}
                    value={hueShift}
                    onChange={(e) => setHueShift(Number(e.target.value))}
                    className="w-full accent-purple-600"
                  />
                </label>
                {(texts[locale].headline.trim() || texts[locale].subline.trim()) && (
                  <>
                    <label className="block text-xs text-slate-600">
                      <div className="flex items-center justify-between mb-1">
                        <span>Yazı boyutu</span>
                        <span className="text-slate-400 tabular-nums">%{Math.round(textScale * 100)}</span>
                      </div>
                      <input
                        type="range"
                        min={0.5}
                        max={2}
                        step={0.02}
                        value={textScale}
                        onChange={(e) => setTextScale(Number(e.target.value))}
                        className="w-full"
                      />
                    </label>
                    <label className="flex items-center justify-between text-xs text-slate-600">
                      <span>Yazı rengi</span>
                      <span className="flex items-center gap-2">
                        <input
                          type="color"
                          value={textColor ?? template.headlineColor}
                          onChange={(e) => setTextColor(e.target.value)}
                          className="w-7 h-7 rounded border border-slate-300 p-0 cursor-pointer"
                        />
                        {textColor !== null && (
                          <button
                            onClick={() => setTextColor(null)}
                            className="text-[11px] text-slate-400 hover:text-slate-700"
                          >
                            şablona dön
                          </button>
                        )}
                      </span>
                    </label>
                    {template.imageMode === 'contain' && needsImage && mediaObj && !isVideo && (
                      <label className="block text-xs text-slate-600">
                        <span className="block mb-1">Üst üste gelince kim görünsün</span>
                        <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setTextOnTop(false)}
                            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                              !textOnTop ? 'bg-purple-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            Obje üstte
                          </button>
                          <button
                            type="button"
                            onClick={() => setTextOnTop(true)}
                            className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-slate-300 ${
                              textOnTop ? 'bg-purple-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            Yazı üstte
                          </button>
                        </div>
                      </label>
                    )}
                  </>
                )}
                <p className="text-[11px] text-slate-400">
                  Önizlemedeki <strong>Obje</strong>/<strong>Yazı</strong> tutamaçlarını sürükleyerek
                  konumlarını değiştirebilirsin.
                </p>
              </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => download(locale)}
              disabled={downloading}
              className="flex items-center justify-center gap-2 bg-slate-900 text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-slate-800 disabled:opacity-50"
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isVideo || animated ? 'Video indir' : 'PNG indir'} ({LOCALE_LABEL[locale]})
            </button>
            <button
              onClick={() => saveToLibrary(locale)}
              disabled={saving}
              title="Beiwe Studio'nun ortak galerisine kaydeder — Studio'yu açtığında sekans/cutaway/overlay seçicilerinde belirir."
              className="flex items-center justify-center gap-2 border border-blue-300 text-blue-700 bg-blue-50 rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-blue-100 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Stüdyo kütüphanesine kaydet
            </button>
            {savedMessage && (
              <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                <Check className="w-3.5 h-3.5" /> {savedMessage}
              </p>
            )}
            {filledLocales.length > 1 && (
              <>
                <button
                  onClick={downloadAll}
                  disabled={downloading}
                  className="flex items-center justify-center gap-2 border border-slate-300 text-slate-700 rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  Dolu {filledLocales.length} dili birden indir
                </button>
                {(isVideo || animated) && (
                  <p className="text-[11px] text-slate-400 -mt-1">Toplu indirme yalnız PNG kare üretir, video/hareketli değil.</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
