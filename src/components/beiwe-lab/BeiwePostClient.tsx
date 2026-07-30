'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, Download, ImageIcon, Loader2, Save, Upload, X } from 'lucide-react';
import type { CharacterShot } from '@/config/characters';
import type { OverlayLocale } from '@/config/characters';
import { OVERLAY_LOCALES } from '@/config/characters';
import {
  POST_FORMATS,
  POST_TEMPLATES,
  type PostFormat,
  type PostTemplate,
  type PostTemplateId,
} from '@/config/post';
import { ANIMATED_POST_DURATION_MS, canvasToPng, renderPost, type PostTexts } from '@/utils/postRenderer';
import { downloadBlob, loadMedia, type LoadedMedia } from '@/utils/imageOverlay';

// Bu sayfa bilerek LabStage (aşama akordiyonu) kullanmıyor: Twin/Voice/Podcast sıralı
// birer üretim hattı, burası ise canlı önizlemeli bir EDİTÖR — kontrolü değiştirip
// sonucu anında görmek gerekiyor, katlanan bölümler bunu bozardı. Görsel dil (kart,
// renk, tipografi) aynı kalıyor.

const LOCALE_LABEL: Record<OverlayLocale, string> = { tr: 'Türkçe', en: 'English', ru: 'Русский' };

const EMPTY_TEXTS: Record<OverlayLocale, PostTexts> = {
  tr: { headline: '', subline: '' },
  en: { headline: '', subline: '' },
  ru: { headline: '', subline: '' },
};

type Props = {
  shots: CharacterShot[];
  /** Kaydedilen gönderilerin yükleneceği karakter kapsamı — Beiwe Studio'nun asset
   *  kütüphanesiyle (character_studio_assets) AYNI kapsam, bkz. saveToLibrary yorumu. */
  characterId: string;
};

export default function BeiwePostClient({ shots, characterId }: Props) {
  const [templateId, setTemplateId] = useState<PostTemplateId>('ekran');
  const [formatId, setFormatId] = useState(POST_FORMATS[0].id);
  const [locale, setLocale] = useState<OverlayLocale>('tr');
  const [texts, setTexts] = useState<Record<OverlayLocale, PostTexts>>(EMPTY_TEXTS);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [uploadedName, setUploadedName] = useState<string | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mediaObj, setMediaObj] = useState<LoadedMedia | null>(null);
  // Hareketli: başlık/alt satır kayarak beliriyor, görsel yavaşça yakınlaşıyor (Ken Burns),
  // zeminde hafif bir ışık huzmesi geziyor — bkz. `postRenderer.ts`. Video/görsel/görselsiz
  // her şablonda çalışır, süre kilitli (ANIMATED_POST_DURATION_MS).
  const [animated, setAnimated] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Yerel dosyalar için oluşturulan object URL'i serbest bırakmak gerekiyor.
  const objectUrlRef = useRef<string | null>(null);
  // "Hareketli" önizleme döngüsünün başlangıç zamanı — indirme sırasında bu döngü
  // duraklatılır (capturingRef), aksi halde ikinci bir paint() kaynağı yarış durumu yaratır.
  const animationStartRef = useRef<number>(0);
  const capturingRef = useRef(false);

  const template = POST_TEMPLATES.find((t) => t.id === templateId) as PostTemplate;
  const format = POST_FORMATS.find((f) => f.id === formatId) as PostFormat;
  const needsImage = template.imageMode !== 'none';

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
      });
    },
    [template, format, texts, mediaObj, needsImage],
  );

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
    setImageUrl(url);
    setIsVideo(file.type.startsWith('video/'));
    setUploadedName(file.name);
  };

  const pickGalleryShot = (shot: CharacterShot) => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setImageUrl(shot.image_url);
    setIsVideo(false);
    setUploadedName(null);
    setShowGallery(false);
  };

  const clearImage = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setImageUrl(null);
    setIsVideo(false);
    setUploadedName(null);
  };

  const setText = (field: keyof PostTexts, value: string) => {
    setTexts((prev) => ({ ...prev, [locale]: { ...prev[locale], [field]: value } }));
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
                  disabled={shots.length === 0}
                  className="flex items-center gap-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg px-4 py-2 disabled:opacity-40"
                >
                  <ImageIcon className="w-4 h-4" />
                  Galeriden seç ({shots.length})
                </button>
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

              {uploadedName && <p className="text-xs text-slate-500 mt-2">{uploadedName}</p>}

              {showGallery && shots.length > 0 && (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-3 max-h-56 overflow-y-auto pr-1">
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
          </section>
        </div>

        {/* ─── Önizleme ─────────────────────────────── */}
        <div className="lg:sticky lg:top-4 space-y-3">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-900">Önizleme</h2>
              {downloading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
              <canvas ref={canvasRef} className="w-full h-auto block" />
            </div>
            {needsImage && !imageUrl && (
              <p className="text-xs text-amber-600 mt-2">
                Bu şablon görsel istiyor — yükleyene kadar yalnız zemin ve metin görünür.
              </p>
            )}
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
