'use client';

import { useState, useRef } from 'react';
import { Loader2, Sparkles, CheckCircle2, ChevronDown, ChevronUp, X, Upload } from 'lucide-react';
import type { CharacterShot } from '@/config/characters';
import { STAGING_POSES, STAGING_OUTFITS, STAGING_BACKGROUNDS, MAX_SCENE_REFS } from '@/config/characters';

type Props = {
  characterId: string;
  canonShots: CharacterShot[];
  onShotAdded: (shots: CharacterShot[]) => void;
};

export default function StagingSection({ characterId, canonShots, onShotAdded }: Props) {
  const [selectedShot, setSelectedShot] = useState<CharacterShot | null>(null);
  const [poseId, setPoseId] = useState<string>('');
  const [outfitId, setOutfitId] = useState<string>('');
  const [backgroundId, setBackgroundId] = useState<string>('');
  const [customIntent, setCustomIntent] = useState('');
  const [sceneRefUrls, setSceneRefUrls] = useState<string[]>([]);
  
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadSceneRef = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/characters/scene-ref', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Yüklenemedi.');
      setSceneRefUrls((prev) => [...prev, data.url].slice(0, MAX_SCENE_REFS));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yüklenemedi.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleGenerate = async () => {
    if (!poseId && !outfitId && !backgroundId && !customIntent.trim()) {
      setError('Lütfen en az bir poz, kıyafet, arka plan seçin veya özel bir tarif girin.');
      return;
    }

    setGenerating(true);
    setError(null);

    const posePrompt = STAGING_POSES.find(p => p.id === poseId)?.prompt || '';
    const outfitPrompt = STAGING_OUTFITS.find(o => o.id === outfitId)?.prompt || '';
    const bgPrompt = STAGING_BACKGROUNDS.find(b => b.id === backgroundId)?.prompt || '';

    const combinedRawPrompt = [posePrompt, outfitPrompt, bgPrompt].filter(Boolean).join(', ');

    // intent for UI presentation
    const intentParts = [];
    if (poseId) intentParts.push(STAGING_POSES.find(p => p.id === poseId)?.label);
    if (outfitId) intentParts.push(STAGING_OUTFITS.find(o => o.id === outfitId)?.label);
    if (backgroundId) intentParts.push(STAGING_BACKGROUNDS.find(b => b.id === backgroundId)?.label);
    
    let finalIntent = intentParts.join(' • ');
    if (customIntent.trim()) {
      finalIntent = finalIntent ? `${finalIntent} — ${customIntent.trim()}` : customIntent.trim();
    }

    try {
      const res = await fetch(`/api/admin/characters/${characterId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: finalIntent || undefined,
          rawPrompt: combinedRawPrompt || undefined,
          sceneRefUrls,
        }),
      });
      
      let data;
      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("Parse error. Response text:", text);
        throw new Error(`Sunucu Hatası (${res.status}): JSON bekleniyordu ama başka bir yanıt geldi.`);
      }

      if (!res.ok) throw new Error(data.error || 'Üretilemedi.');
      onShotAdded(data.shots);
      
      // Reset form
      setCustomIntent('');
      setSceneRefUrls([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Üretilemedi.');
    } finally {
      setGenerating(false);
    }
  };

  if (!isOpen) {
    return (
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mt-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg font-bold text-slate-900">Sahne Sahneleme (Staging)</h2>
        </div>
        <button onClick={() => setIsOpen(true)} className="p-2 hover:bg-slate-50 rounded-lg">
          <ChevronDown className="w-5 h-5 text-slate-500" />
        </button>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mt-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg font-bold text-slate-900">Sahne Sahneleme (Staging)</h2>
        </div>
        <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-50 rounded-lg">
          <ChevronUp className="w-5 h-5 text-slate-500" />
        </button>
      </div>
      
      <p className="text-sm text-slate-500 mb-6">
        Video üretimine (Motion) geçmeden önce karakterinizi doğru poz, kıyafet ve ortama sokun. 
        Yeni üretilen kare galeriye eklenecektir.
      </p>

      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-semibold text-slate-800 mb-2">1. Yüz Referansı Seç (Kanon Kare)</h4>
          <p className="text-xs text-slate-500 mb-3">
            Sahnenin yüzünüze mükemmel benzemesi için en iyi referans, yüklediğiniz gerçek fotoğraflarınızdır. Arka plan ve kıyafet tamamen silinip yeni sahne çizilecektir.
          </p>
          {canonShots.length === 0 ? (
            <p className="text-sm text-slate-500 bg-slate-50 p-4 rounded-lg border border-slate-200 border-dashed">
              Önce galeriden bir kareyi <strong>Kanon</strong> olarak sabitlemelisiniz.
            </p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
              {canonShots.map((shot) => (
                <button
                  key={shot.id}
                  onClick={() => setSelectedShot(shot)}
                  className={`relative shrink-0 w-24 h-24 rounded-lg overflow-hidden border-2 transition-all ${
                    selectedShot?.id === shot.id ? 'border-purple-500 ring-2 ring-purple-200' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={shot.image_url} alt="" className="w-full h-full object-cover block" />
                  {selectedShot?.id === shot.id && (
                    <div className="absolute top-1 right-1 bg-white rounded-full">
                      <CheckCircle2 className="w-4 h-4 text-purple-600" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Seçenekler */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pozlar */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">2. Poz</h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setPoseId('')}
                className={`px-3 py-2 text-sm text-left rounded-lg border transition-colors ${
                  poseId === '' ? 'bg-purple-50 border-purple-200 text-purple-700' : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                Karışık / Rastgele
              </button>
              {STAGING_POSES.map(p => (
                <button
                  key={p.id}
                  onClick={() => setPoseId(p.id)}
                  className={`px-3 py-2 text-sm text-left rounded-lg border transition-colors ${
                    poseId === p.id ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Kıyafet */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">3. Kıyafet</h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setOutfitId('')}
                className={`px-3 py-2 text-sm text-left rounded-lg border transition-colors ${
                  outfitId === '' ? 'bg-purple-50 border-purple-200 text-purple-700' : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                Karışık / Gardıroptan
              </button>
              {STAGING_OUTFITS.map(o => (
                <button
                  key={o.id}
                  onClick={() => setOutfitId(o.id)}
                  className={`px-3 py-2 text-sm text-left rounded-lg border transition-colors ${
                    outfitId === o.id ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Arka Plan */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">4. Arka Plan</h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setBackgroundId('')}
                className={`px-3 py-2 text-sm text-left rounded-lg border transition-colors ${
                  backgroundId === '' ? 'bg-purple-50 border-purple-200 text-purple-700' : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                Karışık
              </button>
              {STAGING_BACKGROUNDS.map(b => (
                <button
                  key={b.id}
                  onClick={() => setBackgroundId(b.id)}
                  className={`px-3 py-2 text-sm text-left rounded-lg border transition-colors ${
                    backgroundId === b.id ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Serbest Tarif ve Referans */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-2">5. Ekstra Detay (Opsiyonel)</h3>
            <textarea
              value={customIntent}
              onChange={(e) => setCustomIntent(e.target.value)}
              rows={3}
              placeholder="Örn: Elinde kahve bardağı tutuyor..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Sahne Referansı <span className="font-normal text-slate-400">(opsiyonel, en fazla {MAX_SCENE_REFS})</span>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {sceneRefUrls.map((url) => (
                <div key={url} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setSceneRefUrls((prev) => prev.filter((u) => u !== url))}
                    className="absolute top-0.5 right-0.5 bg-slate-900/70 text-white rounded p-0.5"
                    aria-label="Kaldır"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {sceneRefUrls.length < MAX_SCENE_REFS && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-16 h-16 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:border-slate-400 disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadSceneRef(file);
                }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              Gerçek ekran görüntüsü veya poz referansı yükleyebilirsin.
            </p>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

        <button
          onClick={handleGenerate}
          disabled={generating || canonShots.length === 0}
          className="w-full flex justify-center items-center gap-2 bg-purple-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 transition-colors"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {generating ? 'Sahne Üretiliyor...' : 'Sahneyi Üret'}
        </button>
      </div>
    </section>
  );
}
