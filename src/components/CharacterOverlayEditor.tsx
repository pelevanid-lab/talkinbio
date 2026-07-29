'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Loader2, Save, X } from 'lucide-react';
import {
  DEFAULT_OVERLAY,
  OVERLAY_FONTS,
  OVERLAY_LOCALES,
  OVERLAY_POSITIONS,
  type CharacterShot,
  type OverlayConfig,
  type OverlayFont,
  type OverlayLocale,
  type OverlayPosition,
} from '@/config/characters';
import { composeOverlayPng, downloadBlob, resolveFontFamily } from '@/utils/imageOverlay';

const LOCALE_LABEL: Record<OverlayLocale, string> = { tr: 'Türkçe', en: 'English', ru: 'Русский' };
const COLOR_PRESETS = ['#FFFFFF', '#0F172A', '#F8E7C9', '#1E3A5F', '#14607A'];

type Props = {
  shot: CharacterShot;
  onClose: () => void;
  onSaved: (shot: CharacterShot) => void;
};

export default function CharacterOverlayEditor({ shot, onClose, onSaved }: Props) {
  const [overlay, setOverlay] = useState<OverlayConfig>(shot.overlay ?? DEFAULT_OVERLAY);
  const [locale, setLocale] = useState<OverlayLocale>('tr');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Önizlemedeki punto, canvas'takiyle aynı formülü kullanmalı (yüksekliğin yüzdesi),
  // yoksa ekranda gördüğün kadraj indirilen PNG'de kaymış olur.
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewHeight, setPreviewHeight] = useState(0);

  useEffect(() => {
    const node = previewRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setPreviewHeight(entry.contentRect.height));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const fontFamily = useMemo(() => {
    if (typeof window === 'undefined') return 'sans-serif';
    return resolveFontFamily(overlay.font);
  }, [overlay.font]);

  const text = overlay.texts[locale];
  const isStory = shot.aspect_ratio === '9:16';

  const update = <K extends keyof OverlayConfig>(key: K, value: OverlayConfig[K]) =>
    setOverlay((prev) => ({ ...prev, [key]: value }));

  const updateText = (field: 'headline' | 'subline', value: string) =>
    setOverlay((prev) => ({ ...prev, texts: { ...prev.texts, [locale]: { ...prev.texts[locale], [field]: value } } }));

  const save = async () => {
    setBusy('save');
    setError(null);
    try {
      const res = await fetch(`/api/admin/characters/shots/${shot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overlay }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kaydedilemedi.');
      onSaved(data.shot as CharacterShot);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kaydedilemedi.');
    } finally {
      setBusy(null);
    }
  };

  const download = async (locales: OverlayLocale[]) => {
    setBusy('download');
    setError(null);
    try {
      for (const target of locales) {
        const blob = await composeOverlayPng({ imageUrl: shot.image_url, overlay, locale: target });
        downloadBlob(blob, `${shot.character_id}-${shot.id.slice(0, 8)}-${target}.png`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'İndirilemedi.');
    } finally {
      setBusy(null);
    }
  };

  const [vertical, horizontal] = overlay.position.split('-');
  const justify = vertical === 'top' ? 'flex-start' : vertical === 'center' ? 'center' : 'flex-end';
  const items = horizontal === 'left' ? 'flex-start' : horizontal === 'center' ? 'center' : 'flex-end';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 flex items-center justify-center p-4 overflow-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-full overflow-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Metin katmanı</h2>
            <p className="text-xs text-slate-500">
              Metin görsele sonradan bindirilir — tek üretimden üç dilli üç kare çıkar, yeniden üretim gerekmez.
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" aria-label="Kapat">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6 p-6">
          {/* Canlı önizleme */}
          <div>
            <div ref={previewRef} className="relative w-full rounded-xl overflow-hidden bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={shot.image_url} alt="" className="w-full block" />

              {overlay.scrim && (text.headline || text.subline) && (
                <div
                  className="absolute inset-x-0 pointer-events-none"
                  style={{
                    top: vertical === 'top' ? 0 : vertical === 'center' ? '25%' : '45%',
                    height: vertical === 'center' ? '50%' : '55%',
                    background:
                      vertical === 'top'
                        ? 'linear-gradient(to bottom, rgba(0,0,0,.62), rgba(0,0,0,0))'
                        : vertical === 'center'
                          ? 'linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,.5), rgba(0,0,0,0))'
                          : 'linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,.62))',
                  }}
                />
              )}

              <div
                className="absolute inset-0 flex flex-col pointer-events-none"
                style={{
                  padding: '6%',
                  justifyContent: justify,
                  alignItems: items,
                  textAlign: overlay.align,
                  color: overlay.color,
                  fontFamily,
                }}
              >
                {text.headline && (
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: (previewHeight * overlay.headlineSize) / 100,
                      lineHeight: 1.15,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {text.headline}
                  </div>
                )}
                {text.subline && (
                  <div
                    style={{
                      fontWeight: 400,
                      fontSize: (previewHeight * overlay.sublineSize) / 100,
                      lineHeight: 1.15,
                      marginTop: (previewHeight * overlay.sublineSize * 0.45) / 100,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {text.subline}
                  </div>
                )}
              </div>

              {overlay.wordmark && (
                <div
                  className="absolute right-[6%] pointer-events-none text-white/80"
                  style={{
                    [vertical === 'bottom' ? 'top' : 'bottom']: '6%',
                    fontSize: previewHeight * 0.022,
                    fontFamily,
                    textShadow: '0 1px 4px rgba(0,0,0,.45)',
                  }}
                >
                  talkinbio.com
                </div>
              )}

              {/* Story güvenli alanı: Instagram'ın üst/alt arayüzü metni yiyor. */}
              {isStory && (
                <>
                  <div className="absolute inset-x-0 top-[14%] border-t border-dashed border-amber-400/70 pointer-events-none" />
                  <div className="absolute inset-x-0 bottom-[20%] border-t border-dashed border-amber-400/70 pointer-events-none" />
                </>
              )}
            </div>
            {isStory && (
              <p className="text-xs text-amber-700 mt-2">
                Kesikli çizgiler Instagram story güvenli alanı — metni bu ikisinin arasında tut.
              </p>
            )}
          </div>

          {/* Kontroller */}
          <div className="space-y-5">
            <div className="flex gap-1 border-b border-slate-200">
              {OVERLAY_LOCALES.map((code) => (
                <button
                  key={code}
                  onClick={() => setLocale(code)}
                  className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    locale === code
                      ? 'border-blue-600 text-blue-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {LOCALE_LABEL[code]}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Başlık</label>
              <textarea
                value={text.headline}
                onChange={(e) => updateText('headline', e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Bio linkin artık cevap veriyor."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Alt satır</label>
              <textarea
                value={text.subline}
                onChange={(e) => updateText('subline', e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Bio linkin 7/24 cevap veriyor, lead topluyor."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Konum</label>
              <div className="grid grid-cols-3 gap-1 w-28">
                {OVERLAY_POSITIONS.map((position) => (
                  <button
                    key={position}
                    onClick={() => update('position', position as OverlayPosition)}
                    aria-label={position}
                    className={`h-8 rounded border transition-colors ${
                      overlay.position === position
                        ? 'bg-blue-600 border-blue-600'
                        : 'bg-white border-slate-300 hover:border-slate-400'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Hizalama</label>
                <select
                  value={overlay.align}
                  onChange={(e) => update('align', e.target.value as OverlayConfig['align'])}
                  className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
                >
                  <option value="left">Sola</option>
                  <option value="center">Ortaya</option>
                  <option value="right">Sağa</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Font</label>
                <select
                  value={overlay.font}
                  onChange={(e) => update('font', e.target.value as OverlayFont)}
                  className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
                >
                  {OVERLAY_FONTS.map((font) => (
                    <option key={font.value} value={font.value}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {overlay.font === 'bricolage' && locale === 'ru' && (
              <p className="text-xs text-amber-700 -mt-2">
                Bricolage&apos;ın Kiril desteği yok — Rusça kare için Inter&apos;e geç.
              </p>
            )}

            <div className="space-y-3">
              <div>
                <label className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                  <span>Başlık boyutu</span>
                  <span className="text-slate-400">{overlay.headlineSize.toFixed(1)}%</span>
                </label>
                <input
                  type="range"
                  min={3}
                  max={14}
                  step={0.2}
                  value={overlay.headlineSize}
                  onChange={(e) => update('headlineSize', Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                  <span>Alt satır boyutu</span>
                  <span className="text-slate-400">{overlay.sublineSize.toFixed(1)}%</span>
                </label>
                <input
                  type="range"
                  min={1.5}
                  max={8}
                  step={0.1}
                  value={overlay.sublineSize}
                  onChange={(e) => update('sublineSize', Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Renk</label>
              <div className="flex items-center gap-2">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    onClick={() => update('color', color)}
                    style={{ background: color }}
                    aria-label={color}
                    className={`w-7 h-7 rounded-full border-2 ${
                      overlay.color === color ? 'border-blue-600' : 'border-slate-300'
                    }`}
                  />
                ))}
                <input
                  type="color"
                  value={overlay.color}
                  onChange={(e) => update('color', e.target.value)}
                  className="w-9 h-7 rounded border border-slate-300 bg-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={overlay.scrim}
                  onChange={(e) => update('scrim', e.target.checked)}
                  className="rounded border-slate-300"
                />
                Okunabilirlik için karartma
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={overlay.wordmark}
                  onChange={(e) => update('wordmark', e.target.checked)}
                  className="rounded border-slate-300"
                />
                talkinbio.com imzası
              </label>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="space-y-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => download([locale])}
                disabled={busy !== null}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
              >
                {busy === 'download' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {LOCALE_LABEL[locale]} karesini indir
              </button>
              <button
                onClick={() => download([...OVERLAY_LOCALES])}
                disabled={busy !== null}
                className="w-full flex items-center justify-center gap-2 border border-slate-300 text-slate-700 rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Üç dili birden indir
              </button>
              <button
                onClick={save}
                disabled={busy !== null}
                className="w-full flex items-center justify-center gap-2 text-slate-600 rounded-lg px-4 py-2 text-sm hover:bg-slate-100 disabled:opacity-50"
              >
                {busy === 'save' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Ayarları kaydet
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
