'use client';

import { useRef, useState, useEffect } from 'react';
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
  voiceUrl?: string | null;
  onMotionCreated: (motion: CharacterMotion) => void;
  onMotionDeleted: (motionId: string) => void;
};

export default function MotionSection({ characterId, shots, motions, voiceUrl, onMotionCreated, onMotionDeleted }: Props) {
  const [tab, setTab] = useState<'text' | 'audio'>('text');
  const [motionText, setMotionText] = useState('İçerik üretmek, mesajları yanıtlamak, satış yapmak... Tek başınıza hepsine yetişmek imkânsız. Bu yüzden talkinbio\'yu kurdum.');
  const [selectedShot, setSelectedShot] = useState<CharacterShot | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [cleanAudioUrl, setCleanAudioUrl] = useState<string | null>(null);
  const [isEnhancingAudio, setIsEnhancingAudio] = useState(false);
  const [audioSeconds, setAudioSeconds] = useState<number | null>(null);
  const [modelId, setModelId] = useState(DEFAULT_MOTION_MODEL_ID);
  const [resolution, setResolution] = useState<MotionResolution>('1080p');
  const [prompt, setPrompt] = useState('');
  const [turboMode, setTurboMode] = useState(false);
  const [generatingStep, setGeneratingStep] = useState<'idle' | 'voice' | 'motion' | 'enhancing'>('idle');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedAudioFileName, setSavedAudioFileName] = useState<string | null>(null);

  // Sayfa yüklendiğinde (veya karakter değiştiğinde) draft'ı yükle
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`motion_draft_${characterId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.tab) setTab(parsed.tab);
        if (parsed.motionText) setMotionText(parsed.motionText);
        if (parsed.cleanAudioUrl) {
          setCleanAudioUrl(parsed.cleanAudioUrl);
          setAudioPreviewUrl(parsed.cleanAudioUrl);
        }
        if (parsed.audioSeconds) setAudioSeconds(parsed.audioSeconds);
        if (parsed.prompt) setPrompt(parsed.prompt);
        if (parsed.resolution) setResolution(parsed.resolution);
        if (parsed.turboMode !== undefined) setTurboMode(parsed.turboMode);
        if (parsed.modelId) setModelId(parsed.modelId);
        if (parsed.savedAudioFileName) setSavedAudioFileName(parsed.savedAudioFileName);
      }
    } catch (e) {
      // localStorage error ignore
    }
  }, [characterId]);

  // Değişiklik olduğunda draft'ı kaydet
  useEffect(() => {
    try {
      const draft = {
        tab,
        motionText,
        cleanAudioUrl,
        audioSeconds,
        prompt,
        resolution,
        turboMode,
        modelId,
        savedAudioFileName: audioFile ? audioFile.name : savedAudioFileName,
      };
      localStorage.setItem(`motion_draft_${characterId}`, JSON.stringify(draft));
    } catch (e) {
      // localStorage error ignore
    }
  }, [tab, motionText, cleanAudioUrl, audioSeconds, prompt, resolution, turboMode, modelId, audioFile, characterId, savedAudioFileName]);

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
    setCleanAudioUrl(null);
    setSavedAudioFileName(file ? file.name : null);

    if (audioPreviewUrl && audioPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(audioPreviewUrl);
    }
    setAudioPreviewUrl(null);
    
    if (file) {
      setAudioSeconds(await readMediaDuration(file));
      
      setIsEnhancingAudio(true);
      try {
        const formData = new FormData();
        formData.append('audio', file);
        const res = await fetch(`/api/admin/characters/${characterId}/voice/enhance`, {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Ses temizlenemedi.');
        
        setCleanAudioUrl(data.audioUrl);
        setAudioPreviewUrl(data.audioUrl);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Sesi temizlerken hata oluştu.');
        // Hata olursa yine de ham sesi dinletebilmek için fallback:
        setAudioPreviewUrl(URL.createObjectURL(file));
      } finally {
        setIsEnhancingAudio(false);
      }
    }
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
    
    if (tab === 'text' && !motionText.trim()) {
      setError('Lütfen seslendirilecek metni girin.');
      return;
    }

    if (tab === 'audio') {
      if (!audioFile && !cleanAudioUrl) {
        setError('Lütfen bir ses dosyası yükleyin.');
        return;
      }
      if (audioRejected && audioFile) {
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
    }

    setError(null);
    let finalAudioUrlForMotion = '';

    try {
      if (tab === 'text') {
        if (!voiceUrl) {
          throw new Error('Metin kullanabilmek için önce Ses Stüdyosu adımında kendi sesinizi klonlamanız (referans ses yüklemeniz) gerekmektedir.');
        }
        setGeneratingStep('voice');
        const voiceFormData = new FormData();
        voiceFormData.append('text', motionText);
        voiceFormData.append('voice_url', voiceUrl);
        
        const voiceRes = await fetch(`/api/admin/characters/${characterId}/voice`, {
          method: 'POST',
          body: voiceFormData
        });
        const voiceData = await voiceRes.json();
        if (!voiceRes.ok) throw new Error(voiceData.error || 'Metinden ses üretilemedi.');
        finalAudioUrlForMotion = voiceData.audioUrl;
      }

      if (tab === 'audio' && !cleanAudioUrl) {
        setGeneratingStep('enhancing');
      } else {
        setGeneratingStep('motion');
      }
      
      const formData = new FormData();
      if (tab === 'audio') {
        if (cleanAudioUrl) {
          formData.append('audioUrl', cleanAudioUrl);
          formData.append('enhanceAudio', 'false'); // Zaten temizlendi
        } else {
          formData.append('audio', audioFile!);
          formData.append('enhanceAudio', 'true');
        }
        if (audioSeconds !== null) formData.append('audioSeconds', String(audioSeconds));
      } else {
        formData.append('audioUrl', finalAudioUrlForMotion);
        formData.append('enhanceAudio', 'false');
      }

      formData.append('sourceImageUrl', selectedShot.image_url);
      formData.append('model', model.id);
      formData.append('resolution', activeResolution);
      formData.append('turboMode', String(turboMode));
      if (prompt.trim()) formData.append('prompt', prompt.trim());

      setGeneratingStep('motion');
      const res = await fetch(`/api/admin/characters/${characterId}/motion`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Video üretilemedi.');

      onMotionCreated(data.motion);
      // Başarılı olunca taslağı temizleyebiliriz ama kullanıcı tekrar kullanmak isteyebilir diye bırakmak da iyi bir seçenektir.
      // Yine de dosya referansını ve preview'ı siliyoruz (opsiyonel)
      // setAudioFile(null);
      // setAudioSeconds(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Üretilemedi.');
    } finally {
      setGeneratingStep('idle');
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
            {(() => {
              const eligibleShots = shots.filter(shot => shot.similarity_score === null || shot.similarity_score >= 7);
              
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

          {/* Ses veya Metin Yükleme (Sekmeler) */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center justify-between">
              <span>3. Sesi Belirle</span>
            </h3>
            
            <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
              <button
                onClick={() => setTab('text')}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${tab === 'text' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Metin Yaz
              </button>
              <button
                onClick={() => setTab('audio')}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${tab === 'audio' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Ses Yükle
              </button>
            </div>

            {tab === 'text' ? (
              <div className="space-y-2">
                <textarea
                  value={motionText}
                  onChange={(e) => setMotionText(e.target.value)}
                  placeholder="Karakterinizin videoda ne söylemesini istiyorsunuz?"
                  rows={4}
                  className="w-full text-sm p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                {!voiceUrl && (
                  <p className="text-xs text-amber-600 font-medium">Metinden video üretebilmek için önce Ses Stüdyosu adımında klonlama işlemini yapmalısınız.</p>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="text-xs text-slate-500 mb-1 flex items-center justify-between">
                  <span>
                    ({model.minAudioSeconds > 0 ? `${model.minAudioSeconds}-${maxSeconds}s` : `maks ${maxSeconds}s`}, ≤{model.maxAudioMb}MB)
                  </span>
                  <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Otomatik pürüzsüzleştirme devrede
                  </span>
                </div>
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
                    {audioFile ? audioFile.name : savedAudioFileName ? savedAudioFileName : 'Ses dosyası seçin (veya sürükleyin)'}
                  </span>
                </label>
                {(audioFile || cleanAudioUrl) && (
                  <div className="flex flex-col gap-3 mt-2">
                    {isEnhancingAudio ? (
                      <div className="flex items-center gap-2 text-sm text-blue-600 font-medium py-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sesteki pürüzler ve gürültüler temizleniyor...</span>
                      </div>
                    ) : (audioPreviewUrl || cleanAudioUrl) ? (
                      <div className="space-y-1">
                        <div className="flex justify-between items-center px-1">
                          <span className="text-xs font-medium text-emerald-600">Temizlenmiş Ses (Stüdyo Kalitesi)</span>
                        </div>
                        <audio controls src={audioPreviewUrl || cleanAudioUrl!} className="w-full h-10" />
                      </div>
                    ) : null}
                    <div
                      className={`flex items-center gap-2 text-xs ${
                        (audioRejected && audioFile) ? 'text-red-600 font-medium' : 'text-slate-500'
                      }`}
                    >
                      {audioFile && <span>{(audioFile.size / 1024 / 1024).toFixed(2)} MB</span>}
                      {audioSeconds !== null && <span>· {audioSeconds.toFixed(1)} sn</span>}
                      {badFormat && audioFile && <span>· desteklenen: {AUDIO_LABEL}</span>}
                      {tooBig && audioFile && <span>· sınır {model.maxAudioMb}MB</span>}
                      {tooLong && <span>· sınır {maxSeconds} sn</span>}
                      {tooShort && <span>· en az {model.minAudioSeconds} sn</span>}
                    </div>
                  </div>
                )}
              </div>
            )}
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
            disabled={generatingStep !== 'idle' || !selectedShot || (tab === 'audio' && (!audioFile && !cleanAudioUrl)) || (tab === 'audio' && audioFile && audioRejected) || (tab === 'text' && (!motionText.trim() || !voiceUrl))}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {generatingStep !== 'idle' ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {generatingStep === 'voice' && 'Metinden Ses Üretiliyor...'}
                {generatingStep === 'enhancing' && 'Ses Berraklaştırılıyor...'}
                {generatingStep === 'motion' && 'Video Üretiliyor... (Uzun Sürebilir)'}
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                Video Üret
              </>
            )}
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
