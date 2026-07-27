'use client';

import { useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
  ChevronDown,
  Download,
  Loader2,
  Lock,
  Pin,
  PinOff,
  Sparkles,
  Trash2,
  Type,
  Upload,
  X,
} from 'lucide-react';
import {
  ASPECT_RATIOS,
  ESTIMATED_COST_PER_IMAGE_USD,
  MAX_CANON_SHOTS,
  MAX_IMAGES_PER_RUN,
  MAX_SCENE_REFS,
  type AspectRatio,
  type CharacterDefinition,
  type CharacterShot,
  type CharacterMotion,
  type Resolution,
  type ScenePreset,
} from '@/config/characters';
import CharacterOverlayEditor from '@/components/CharacterOverlayEditor';
import MotionSection from '@/components/MotionSection';
import StudioSection from '@/components/StudioSection';

const PRESET_GROUPS: ScenePreset['group'][] = ['Kadraj', 'Ortam', 'Aksiyon'];

type Props = {
  character: CharacterDefinition;
  initialShots: CharacterShot[];
  initialMotions: CharacterMotion[];
};

export default function CharacterRoomClient({ character, initialShots, initialMotions }: Props) {
  const [shots, setShots] = useState<CharacterShot[]>(initialShots);
  const [motions, setMotions] = useState<CharacterMotion[]>(initialMotions);
  const [presetIds, setPresetIds] = useState<string[]>([]);
  const [intent, setIntent] = useState('');
  const [rawPrompt, setRawPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio | ''>('');
  const [resolution, setResolution] = useState<Resolution>('1K');
  const [numImages, setNumImages] = useState(1);
  const [seed, setSeed] = useState('');
  const [allowSceneText, setAllowSceneText] = useState(false);
  const [sceneRefUrls, setSceneRefUrls] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busyShotId, setBusyShotId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [overlayShot, setOverlayShot] = useState<CharacterShot | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedPresets = useMemo(
    () => presetIds.map((id) => character.scenePresets.find((p) => p.id === id)).filter(Boolean) as ScenePreset[],
    [character.scenePresets, presetIds],
  );
  const canonShots = useMemo(() => shots.filter((s) => s.is_canon), [shots]);
  const effectiveAspect = aspectRatio || selectedPresets.find(p => p.aspectRatio)?.aspectRatio || '4:5';

  const handlePresetToggle = (preset: ScenePreset) => {
    setPresetIds((prev) => {
      const otherGroupPresets = prev.filter(
        (id) => character.scenePresets.find((p) => p.id === id)?.group !== preset.group
      );
      if (prev.includes(preset.id)) return otherGroupPresets;
      return [...otherGroupPresets, preset.id];
    });
  };

  const generate = async () => {
    if (!intent.trim() && !rawPrompt.trim() && selectedPresets.length === 0) {
      setError('En az bir şablon seç ya da sahneyi tarif et.');
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/characters/${character.id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: intent.trim() || undefined,
          rawPrompt: rawPrompt.trim() || undefined,
          presetIds: presetIds.length > 0 ? presetIds : undefined,
          aspectRatio: aspectRatio || undefined,
          resolution,
          numImages,
          seed: seed.trim() ? Number(seed.trim()) : undefined,
          sceneRefUrls,
          allowSceneText,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Üretilemedi.');
      setShots((prev) => [...(data.shots as CharacterShot[]), ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Üretilemedi.');
    } finally {
      setGenerating(false);
    }
  };

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

  const toggleCanon = async (shot: CharacterShot) => {
    setBusyShotId(shot.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/characters/shots/${shot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCanon: !shot.is_canon }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Güncellenemedi.');
      setShots((prev) => prev.map((s) => (s.id === shot.id ? (data.shot as CharacterShot) : s)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Güncellenemedi.');
    } finally {
      setBusyShotId(null);
    }
  };

  const removeShot = async (shot: CharacterShot) => {
    if (!confirm('Bu kare kalıcı olarak silinsin mi?')) return;
    setBusyShotId(shot.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/characters/shots/${shot.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Silinemedi.');
      setShots((prev) => prev.filter((s) => s.id !== shot.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Silinemedi.');
    } finally {
      setBusyShotId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-6 items-start">
        {/* Karakter kartı */}
        <aside className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <Image
            src={`/${character.referenceFile}`}
            alt={character.name}
            width={512}
            height={512}
            className="w-full aspect-square object-cover"
          />
          <div className="p-5 space-y-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{character.name}</h2>
              <p className="text-xs text-slate-500">{character.role}</p>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">{character.summary}</p>

            <div className="flex items-start gap-2 rounded-lg bg-slate-50 border border-slate-200 p-3">
              <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-500 leading-relaxed">
                Kimlik tanımı kodda kilitli (<code className="text-[11px]">src/config/characters.ts</code>) — buradan
                değiştirilemez. Tutarlılığın kaynağı bu.
              </p>
            </div>

            <div className="text-xs text-slate-500">
              Kanon referans:{' '}
              <span className="font-semibold text-slate-700">
                {canonShots.length}/{MAX_CANON_SHOTS}
              </span>{' '}
              — galeriden sabitlediğin kareler sonraki üretimlere referans olur.
            </div>
          </div>
        </aside>

        {/* Üretim paneli */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="space-y-3">
            {PRESET_GROUPS.map((group) => (
              <div key={group}>
                <p className="text-xs font-medium text-slate-500 mb-1.5">{group}</p>
                <div className="flex flex-wrap gap-1.5">
                  {character.scenePresets
                    .filter((p) => p.group === group)
                    .map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handlePresetToggle(p)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          presetIds.includes(p.id)
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Sahneyi tarif et (Türkçe)</label>
            <textarea
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              rows={3}
              placeholder="Kafede laptopta çalışıyor, akşam ışığı, kameraya bakmıyor. Sol taraf metin için boş kalsın."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-400 mt-1">
              Yazdığın metin İngilizce sahne prompt&apos;una çevrilir; karakterin yüzü kilitli katmandan gelir.
            </p>
          </div>

          {/* Sahne referansı */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Sahne referansı <span className="font-normal text-slate-400">(opsiyonel, en fazla {MAX_SCENE_REFS})</span>
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
              Gerçek ekran görüntüsü yükleyip &quot;laptop ekranına yerleştir&quot; diyebilirsin — model kendi
              uydurduğu arayüz metnini okunaklı yazamaz.
            </p>
          </div>

          {/* Gelişmiş */}
          <div className="border-t border-slate-200 pt-4">
            <button
              onClick={() => setShowAdvanced((v) => !v)}
              className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              Gelişmiş
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Ham prompt (İngilizce) — doldurulursa Türkçe tarif yok sayılır
                  </label>
                  <textarea
                    value={rawPrompt}
                    onChange={(e) => setRawPrompt(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">En-boy</label>
                    <select
                      value={aspectRatio}
                      onChange={(e) => setAspectRatio(e.target.value as AspectRatio | '')}
                      className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
                    >
                      <option value="">Şablondan ({effectiveAspect})</option>
                      {ASPECT_RATIOS.map((a) => (
                        <option key={a.value} value={a.value}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Çözünürlük</label>
                    <select
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value as Resolution)}
                      className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
                    >
                      <option value="1K">1K</option>
                      <option value="2K">2K</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Adet</label>
                    <select
                      value={numImages}
                      onChange={(e) => setNumImages(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
                    >
                      {Array.from({ length: MAX_IMAGES_PER_RUN }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Seed</label>
                    <input
                      value={seed}
                      onChange={(e) => setSeed(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="rastgele"
                      className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
                    />
                  </div>
                </div>

                <label className="flex items-start gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={allowSceneText}
                    onChange={(e) => setAllowSceneText(e.target.checked)}
                    className="rounded border-slate-300 mt-0.5"
                  />
                  <span>
                    Sahnede fiziksel yazıya izin ver (tabela, kupa, tişört).
                    <span className="block text-xs text-slate-400">
                      Slogan ve tanıtım cümlesi için bunu değil, üretimden sonraki metin katmanını kullan.
                    </span>
                  </span>
                </label>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={generate}
              disabled={generating}
              className="flex items-center gap-2 bg-blue-600 text-white rounded-lg px-5 py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {generating ? 'Üretiliyor…' : 'Üret'}
            </button>
            <span className="text-xs text-slate-400">
              ~${(ESTIMATED_COST_PER_IMAGE_USD * numImages).toFixed(2)} (tahmin, doğrulanmadı) · üretim 1-2 dk sürebilir
            </span>
          </div>
        </section>
      </div>

      {/* Galeri */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">
          Galeri <span className="text-sm font-normal text-slate-400">({shots.length})</span>
        </h2>

        {shots.length === 0 ? (
          <p className="text-sm text-slate-500">
            Henüz kare yok. Bir şablon seçip &quot;Üret&quot;e bas — beğendiğin kareyi kanon olarak sabitlediğinde
            sonraki üretimler ona da benzemeye başlar.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {shots.map((shot) => (
              <div
                key={shot.id}
                className={`rounded-xl overflow-hidden border ${
                  shot.is_canon ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200'
                }`}
              >
                <div className="relative bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={shot.image_url} alt="" className="w-full block" />
                  {shot.is_canon && (
                    <span className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      KANON
                    </span>
                  )}
                </div>

                <div className="p-3 space-y-2">
                  <p className="text-xs text-slate-500 line-clamp-2" title={shot.user_intent || shot.prompt}>
                    {shot.user_intent || shot.preset_id || '—'}
                  </p>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <span>{shot.aspect_ratio}</span>
                    {shot.seed !== null && <span>· seed {shot.seed}</span>}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setOverlayShot(shot)}
                      className="flex-1 flex items-center justify-center gap-1 bg-slate-900 text-white rounded-lg px-2 py-1.5 text-xs font-medium hover:bg-slate-800"
                    >
                      <Type className="w-3.5 h-3.5" />
                      Metin
                    </button>
                    <a
                      href={shot.image_url}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-50"
                      title="Ham görseli indir"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={() => toggleCanon(shot)}
                      disabled={busyShotId === shot.id}
                      className="p-1.5 rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                      title={shot.is_canon ? 'Kanon işaretini kaldır' : 'Kanon referans yap'}
                    >
                      {busyShotId === shot.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : shot.is_canon ? (
                        <PinOff className="w-3.5 h-3.5" />
                      ) : (
                        <Pin className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => removeShot(shot)}
                      disabled={busyShotId === shot.id}
                      className="p-1.5 rounded-lg border border-slate-300 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      title="Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {shot.user_intent && (
                    <button
                      onClick={() => {
                        setIntent(shot.user_intent || '');
                        setPresetIds(shot.preset_id ? shot.preset_id.split(',') : []);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="w-full text-[11px] text-slate-400 hover:text-slate-700 text-left"
                    >
                      Tarifi tekrar kullan
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {overlayShot && (
        <CharacterOverlayEditor
          shot={overlayShot}
          onClose={() => setOverlayShot(null)}
          onSaved={(saved) => {
            setShots((prev) => prev.map((s) => (s.id === saved.id ? saved : s)));
            setOverlayShot(saved);
          }}
        />
      )}

      {/* Motion (Video Üretimi) */}
      <MotionSection
        characterId={character.id}
        shots={shots}
        motions={motions}
        onMotionCreated={(newMotion: CharacterMotion) => setMotions((prev) => [newMotion, ...prev])}
        onMotionDeleted={(motionId: string) => setMotions((prev) => prev.filter((m) => m.id !== motionId))}
      />

      {/* Post-Prodüksiyon Stüdyosu — 3. katman, Motion videolarını cutaway/overlay/müzikle işler */}
      <StudioSection characterId={character.id} motions={motions} />
    </div>
  );
}
