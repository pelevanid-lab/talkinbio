'use client';

import { useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Fingerprint,
  Loader2,
  Mic,
  Play,
  Plus,
  RefreshCw,
  Sparkles,
  Upload,
} from 'lucide-react';
import LabStage, { type StageState } from '@/components/beiwe-lab/LabStage';
import {
  ESTIMATED_VOICE_COST_PER_1K_CHARS_USD,
  MINIMAX_CLONE_COST_USD,
  MINIMAX_VOICE_EXPIRY_DAYS,
  STUDIO_TRANSCRIBE_COST_USD,
  VOICE_MODEL_NOTE,
  VOICE_TEST_SCRIPTS,
} from '@/config/beiweLab';
import { creditsForCost } from '@/config/pricing';
import { analyzeReferenceAudio, type AudioHealth } from '@/utils/audioHealthCheck';

type Take = {
  id: string;
  /** Hangi kartın ürettiği — sonuç, onu doğuran düğmenin altında gösterilsin diye. */
  scriptId: string;
  label: string;
  text: string;
  audioUrl: string;
};

/** `character_profiles.minimax_voice_status` ile birebir. */
type MinimaxStatus = 'none' | 'active' | 'expired' | 'failed';

export type VoicePreset = { id: string; label: string; audioUrl: string };

type Props = {
  characterId: string;
  characterName: string;
  initialVoiceUrl: string | null;
  initialVoiceStatus: string;
  initialMinimaxVoiceId: string | null;
  initialMinimaxVoiceStatus: MinimaxStatus;
  /** Twin doğrulanmadan ses klonlamak sıralamayı bozar; bilgi notu için kullanılır. */
  twinVerified: boolean;
  /**
   * `undefined` — bu karakterin gerçek bir kişisi var (Twin), kendi kaydını yükler.
   * Dizi (boş olsa da) — Yardımcı Oyuncular: gerçek kişisi yok, hazır referans
   * kütüphanesinden seçer; galeri boşsa önce en az bir tane eklemesi gerekir.
   */
  voicePresets?: VoicePreset[];
  /** Müşteri modunda ham $ maliyetini gizle — yalnızca kredi karşılığı görünsün
   * (bkz. src/config/pricing.ts creditsForCost). Admin varsayılanı (false) değişmez. */
  hideCost?: boolean;
};

export default function BeiweVoiceClient({
  characterId,
  characterName,
  initialVoiceUrl,
  initialVoiceStatus,
  initialMinimaxVoiceId,
  initialMinimaxVoiceStatus,
  twinVerified,
  voicePresets: initialVoicePresets,
  hideCost = false,
}: Props) {
  const [voicePresets, setVoicePresets] = useState<VoicePreset[]>(initialVoicePresets ?? []);
  const [presetLabel, setPresetLabel] = useState('');
  const [uploadingPreset, setUploadingPreset] = useState(false);
  const [selectingPresetId, setSelectingPresetId] = useState<string | null>(null);
  const presetFileInputRef = useRef<HTMLInputElement>(null);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(initialVoiceUrl);
  const [minimaxVoiceId, setMinimaxVoiceId] = useState<string | null>(initialMinimaxVoiceId);
  const [minimaxStatus, setMinimaxStatus] = useState<MinimaxStatus>(initialMinimaxVoiceStatus);
  const [approved, setApproved] = useState(initialVoiceStatus === 'ready');
  const [takes, setTakes] = useState<Take[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);

  const [customText, setCustomText] = useState('');
  const [audioHealth, setAudioHealth] = useState<AudioHealth | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** Admin: "$X (≈N kredi)". Müşteri (hideCost): sadece "≈N kredi" — ham maliyeti göstermiyoruz. */
  const costLabel = (usd: number) =>
    hideCost ? `≈${creditsForCost(usd)} kredi` : `$${usd.toFixed(2)} (≈${creditsForCost(usd)} kredi)`;

  /* ---------------- aşama 1: referans ses ---------------- */
  // Kırpma bilinçli olarak YOK: F5-TTS'te referansı 15sn'ye kırpmak gerekiyordu
  // (metin-ses hizalaması için), ama MiniMax'ta bunun tam tersi doğru çıktı —
  // 2026-07-29 karşılaştırmasında en iyi benzerlik UZUN ve HAM (kırpılmamış,
  // temizlenmemiş) referanstan geldi. Bu yüzden dosya işlenmeden olduğu gibi yükleniyor.
  const uploadReference = async (file: File) => {
    setUploading(true);
    setError(null);
    setAudioHealth(null);
    try {
      // Bedava, tarayıcı-içi ön kontrol — MiniMax'ta bunun karşılığı bir "ücretsiz
      // önizleme" yok, klonlama ücreti klonun kendisini yaratmanın maliyeti. Burada
      // yalnızca bariz kötü adayları (çok kısa/sessiz) para harcamadan önce yakalıyoruz.
      const health = await analyzeReferenceAudio(file);
      setAudioHealth(health);

      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/admin/characters/${characterId}/voice`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ses yüklenemedi.');
      setVoiceUrl(data.voice_url);
      // Yeni referans, eski klonu ve onayı geçersiz kılar (sunucu tarafında da sıfırlanıyor).
      setMinimaxVoiceId(null);
      setMinimaxStatus('none');
      setApproved(false);
      setTakes([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ses yüklenemedi.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  /* ---------------- aşama 1b: hazır referans seç (Yardımcı Oyuncular) ---------------- */
  const selectVoicePreset = async (preset: VoicePreset) => {
    setSelectingPresetId(preset.id);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('presetUrl', preset.audioUrl);
      const res = await fetch(`/api/admin/characters/${characterId}/voice`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Referans seçilemedi.');
      setVoiceUrl(data.voice_url);
      setAudioHealth(null);
      setMinimaxVoiceId(null);
      setMinimaxStatus('none');
      setApproved(false);
      setTakes([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Referans seçilemedi.');
    } finally {
      setSelectingPresetId(null);
    }
  };

  const uploadNewPreset = async (file: File) => {
    if (!presetLabel.trim()) {
      setError('Hazır ses için önce bir etiket yaz (ör. "Sıcak kadın").');
      return;
    }
    setUploadingPreset(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('label', presetLabel.trim());
      const res = await fetch('/api/admin/beiwe-lab/voice-presets', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hazır ses eklenemedi.');
      setVoicePresets((prev) => [...prev, { id: data.preset.id, label: data.preset.label, audioUrl: data.preset.audio_url }]);
      setPresetLabel('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hazır ses eklenemedi.');
    } finally {
      setUploadingPreset(false);
      if (presetFileInputRef.current) presetFileInputRef.current.value = '';
    }
  };

  /* ---------------- aşama 2: klonla (kalıcı kimlik) ---------------- */
  const cloneVoice = async () => {
    // Gerçek para: bu düğme fal'a $1.50'lık bir istek gönderiyor, geri alınamaz.
    // Kaydın sağlık kontrolünde uyarı varsa bunu onaya taşı ki kullanıcı bilerek harcasın.
    const healthWarning =
      audioHealth && audioHealth.warnings.length > 0
        ? `\n\nUyarı: ${audioHealth.warnings.join(' ')}`
        : '';
    if (!confirm(`Bu işlem ~${costLabel(MINIMAX_CLONE_COST_USD)} tutuyor ve geri alınamaz. Devam edilsin mi?${healthWarning}`)) {
      return;
    }

    setCloning(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/characters/${characterId}/minimax-voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clone' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Klonlama başarısız oldu.');
      setMinimaxVoiceId(data.voiceId);
      setMinimaxStatus('active');
      setApproved(false);
      setTakes([]);
    } catch (err) {
      setMinimaxStatus('failed');
      setError(err instanceof Error ? err.message : 'Klonlama başarısız oldu.');
    } finally {
      setCloning(false);
    }
  };

  /* ---------------- aşama 3: klonu doğrula ---------------- */
  const speak = async (id: string, label: string, text: string) => {
    if (!text.trim()) return;
    setGeneratingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/characters/${characterId}/minimax-voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'speak', text: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ses üretilemedi.');
      // Başarılı bir üretim, klonu 7 günlük silinme riskinden çıkarır — durumu tazele.
      setMinimaxStatus('active');
      setTakes((prev) => [
        { id: `${id}-${Date.now()}`, scriptId: id, label, text: text.trim(), audioUrl: data.audioUrl },
        ...prev,
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ses üretilemedi.';
      // Sunucu "voice" geçen bir doğrulama hatası görürse minimax_voice_status'u
      // 'expired' yapıyor — burada da eşleştirip aşama 2'nin "yeniden klonla" uyarısını tetikle.
      if (/voice/i.test(message)) setMinimaxStatus('expired');
      setError(message);
    } finally {
      setGeneratingId(null);
    }
  };

  const toggleApproval = async () => {
    setApproving(true);
    setError(null);
    const next = !approved;
    try {
      const res = await fetch(`/api/admin/characters/${characterId}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice_status: next ? 'ready' : 'none' }),
      });
      if (!res.ok) throw new Error('Onay kaydedilemedi.');
      setApproved(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onay kaydedilemedi.');
    } finally {
      setApproving(false);
    }
  };

  /* ---------------- render ---------------- */
  const stage1State: StageState = voiceUrl ? 'done' : 'open';
  const stage2State: StageState = !voiceUrl ? 'locked' : minimaxStatus === 'active' ? 'done' : 'open';
  const stage3State: StageState = minimaxVoiceId ? (approved ? 'done' : 'open') : 'locked';

  const cost = (text: string) =>
    ((text.length / 1000) * ESTIMATED_VOICE_COST_PER_1K_CHARS_USD).toFixed(4);
  const costCredits = (text: string) =>
    creditsForCost((text.length / 1000) * ESTIMATED_VOICE_COST_PER_1K_CHARS_USD);

  // takes yeniden-eskiye sıralı; ilk eşleşen o kartın en son denemesi.
  const latestTake = (scriptId: string) => takes.find((t) => t.scriptId === scriptId);

  const minimaxStatusLabel: Record<MinimaxStatus, string> = {
    none: 'Klonlanmadı',
    active: 'Aktif',
    expired: 'Süresi doldu',
    failed: 'Başarısız',
  };

  return (
    <div className="space-y-5">
      {/* Özet şerit */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-4 flex flex-wrap items-center gap-x-8 gap-y-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-full flex items-center justify-center ${
              approved ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
            }`}
          >
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{characterName}</p>
            <p className="text-xs text-slate-500">Ses üretim hattı</p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs">
          <div>
            <p className="text-slate-400">Referans</p>
            <p className={`font-semibold ${voiceUrl ? 'text-emerald-600' : 'text-slate-400'}`}>
              {voiceUrl ? 'Yüklendi' : 'Bekliyor'}
            </p>
          </div>
          <div>
            <p className="text-slate-400">Klon</p>
            <p
              className={`font-semibold ${
                minimaxStatus === 'active'
                  ? 'text-emerald-600'
                  : minimaxStatus === 'expired' || minimaxStatus === 'failed'
                    ? 'text-red-600'
                    : 'text-slate-400'
              }`}
            >
              {minimaxStatusLabel[minimaxStatus]}
            </p>
          </div>
          <div>
            <p className="text-slate-400">Doğrulama</p>
            <p className={`font-semibold ${approved ? 'text-emerald-600' : 'text-slate-400'}`}>
              {approved ? 'Onaylandı' : `${takes.length} deneme`}
            </p>
          </div>
          <div>
            <p className="text-slate-400">Model</p>
            <p className="font-semibold text-slate-800">{VOICE_MODEL_NOTE}</p>
          </div>
        </div>
      </div>

      {!twinVerified && (
        <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-400" />
          <span>
            Bu karakterin görsel twin&apos;i henüz doğrulanmadı. Ses katmanı bağımsız
            çalışır, ama konuşan video üretmek için ikisi de gerekli — sırayı bozmamak
            için önce Beiwe Twin&apos;i bitirmek daha sağlıklı.
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-700 text-xs">
            kapat
          </button>
        </div>
      )}

      {/* ─── Aşama 1: Referans Ses ─────────────────────────── */}
      <LabStage
        index={1}
        title="Referans Ses"
        question="Bu klon kimin sesinden doğuyor?"
        state={stage1State}
      >
        {initialVoicePresets !== undefined ? (
          <p className="text-sm text-slate-600">
            {characterName} sanal bir karakter — kendi sesi yok. Aşağıdaki hazır ses
            kütüphanesinden beğendiğin bir kaydı seç, o bu karakterin referansı olsun.
          </p>
        ) : (
          <p className="text-sm text-slate-600">
            Tek kişinin konuştuğu bir kayıt yükle. 2026-07-29 karşılaştırmasında uzun ve
            <strong> işlenmemiş</strong> (kırpılmamış, gürültü temizliği kapalı) referans en
            iyi benzerliği verdi — kaydı kısaltmaya ya da temizlemeye çalışma, olduğu gibi yükle.
          </p>
        )}

        {initialVoicePresets !== undefined && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <p className="text-xs font-semibold text-slate-500">Hazır Referans Sesler</p>

            {voicePresets.length === 0 ? (
              <p className="text-xs text-slate-400">
                Henüz hiç hazır ses eklenmedi. Aşağıdan ilkini ekle — bu kütüphane tüm
                yardımcı oyuncular arasında paylaşılır.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {voicePresets.map((preset) => {
                  const isCurrent = voiceUrl === preset.audioUrl;
                  const busy = selectingPresetId === preset.id;
                  return (
                    <div
                      key={preset.id}
                      className={`rounded-lg border p-3 space-y-2 ${isCurrent ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200 bg-white'}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-slate-800">{preset.label}</span>
                        {isCurrent && <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                      </div>
                      <audio src={preset.audioUrl} controls className="h-8 w-full" />
                      <button
                        onClick={() => selectVoicePreset(preset)}
                        disabled={busy || isCurrent}
                        className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 text-white py-1.5 text-xs font-semibold hover:bg-slate-800 disabled:opacity-50"
                      >
                        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                        {busy ? 'Seçiliyor…' : isCurrent ? 'Referans bu' : 'Bu sesi kullan'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="border-t border-slate-200 pt-3 flex flex-wrap items-center gap-2">
              <input
                value={presetLabel}
                onChange={(e) => setPresetLabel(e.target.value)}
                placeholder="Etiket (ör. Sıcak kadın)"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs flex-1 min-w-[140px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => presetFileInputRef.current?.click()}
                disabled={uploadingPreset}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                {uploadingPreset ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                {uploadingPreset ? 'Ekleniyor…' : 'Kütüphaneye ses ekle'}
              </button>
              <input
                ref={presetFileInputRef}
                type="file"
                accept="audio/mpeg,audio/mp3,audio/wav,audio/mp4,audio/x-m4a"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadNewPreset(file);
                }}
              />
            </div>
          </div>
        )}

        {voiceUrl && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
              <Check className="w-4 h-4 text-emerald-600" />
              Mevcut referans
            </div>
            <audio src={voiceUrl} controls className="h-9 flex-1 min-w-0" />
          </div>
        )}

        {/* Bedava ön kontrol — klonlamadan (paralı) önce bariz kötü adayları yakalar. */}
        {audioHealth && (
          <div
            className={`rounded-xl border px-4 py-3 text-xs ${
              audioHealth.warnings.length > 0
                ? 'border-amber-200 bg-amber-50 text-amber-800'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
          >
            <p className="font-semibold mb-1">
              Kayıt sağlık kontrolü (bedava — {audioHealth.durationSeconds.toFixed(0)} sn,
              ortalama {audioHealth.avgVolumeDb.toFixed(0)} dB)
            </p>
            {audioHealth.warnings.length > 0 ? (
              <ul className="list-disc list-inside space-y-0.5">
                {audioHealth.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            ) : (
              <p>Süre ve ses seviyesi makul görünüyor. Bu, klonun sana benzeyeceğini garanti etmez.</p>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs text-blue-800">
          <Fingerprint className="w-4 h-4 shrink-0" />
          <span>
            Ses dosyası yüklemek (otomatik deşifre çıkarma) {hideCost ? `≈${creditsForCost(STUDIO_TRANSCRIBE_COST_USD)} kredi` : `~$${STUDIO_TRANSCRIBE_COST_USD.toFixed(2)} · ≈${creditsForCost(STUDIO_TRANSCRIBE_COST_USD)} kredi`} tutar.
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 ${
              initialVoicePresets !== undefined
                ? 'border border-slate-300 text-slate-600 hover:bg-slate-50'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading
              ? 'Yükleniyor…'
              : initialVoicePresets !== undefined
                ? 'Ya da kendi ses dosyanı yükle'
                : voiceUrl
                  ? 'Referansı değiştir'
                  : 'Ses dosyası yükle'}
          </button>
          {voiceUrl && (
            <span className="text-xs text-amber-600">
              Referansı değiştirmek mevcut klonu geçersiz kılar — aşama 2&apos;yi yeniden çalıştırman gerekir.
            </span>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/mpeg,audio/mp3,audio/wav,audio/mp4,audio/x-m4a"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadReference(file);
            }}
          />
        </div>
      </LabStage>

      {/* ─── Aşama 2: Sesi Klonla ───────────────────────────── */}
      <LabStage
        index={2}
        title="Sesi Klonla"
        question="Bu ses kalıcı bir kimliğe dönüşsün mü?"
        state={stage2State}
        lockedMsg="Önce referans ses yükle"
      >
        <p className="text-sm text-slate-600">
          Bu, Twin&apos;deki LoRA&apos;nın ses karşılığı: referans bir kez işlenip kalıcı bir
          klon kimliği (<code className="font-mono text-xs">custom_voice_id</code>) çıkıyor.
          Sonraki her üretim ses dosyasını değil bu kimliği kullanıyor.
        </p>

        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            Klonlama ücreti istek başına yaklaşık {costLabel(MINIMAX_CLONE_COST_USD)} — bu,
            klonun KENDİSİNİ yaratmanın maliyeti; MiniMax&apos;ta ücretsiz bir önizleme
            katmanı yok (doğrulandı), yani bu adımı atlayarak önden dinlemenin bir yolu yok.
            Yeni bir kimlik {MINIMAX_VOICE_EXPIRY_DAYS} gün içinde gerçek bir seslendirmede
            kullanılmazsa otomatik siliniyor; aşama 3&apos;teki ilk &ldquo;Seslendir&rdquo;
            bu şartı zaten karşılıyor.
          </span>
        </div>

        {minimaxVoiceId && (
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs">
            <Fingerprint className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="font-mono text-slate-600 truncate">{minimaxVoiceId}</span>
            <span
              className={`ml-auto flex-shrink-0 font-semibold ${
                minimaxStatus === 'active'
                  ? 'text-emerald-600'
                  : minimaxStatus === 'expired'
                    ? 'text-red-600'
                    : 'text-slate-400'
              }`}
            >
              {minimaxStatusLabel[minimaxStatus]}
            </span>
          </div>
        )}

        {minimaxStatus === 'expired' && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              Bu kimlik artık geçersiz görünüyor (muhtemelen {MINIMAX_VOICE_EXPIRY_DAYS} gün
              kullanılmadığı için silindi). Yeniden klonla.
            </span>
          </div>
        )}

        <button
          onClick={cloneVoice}
          disabled={cloning}
          className="flex items-center gap-2 bg-purple-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-purple-700 disabled:opacity-50"
        >
          {cloning ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : minimaxVoiceId ? (
            <RefreshCw className="w-4 h-4" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {cloning
            ? 'Klonlanıyor…'
            : minimaxVoiceId
              ? `Yeniden klonla (~${costLabel(MINIMAX_CLONE_COST_USD)})`
              : `Klonla (~${costLabel(MINIMAX_CLONE_COST_USD)})`}
        </button>
      </LabStage>

      {/* ─── Aşama 3: Klonu Doğrula ─────────────────────────── */}
      <LabStage
        index={3}
        title="Klonu Doğrula"
        question="Bu ses gerçekten sana benziyor mu?"
        state={stage3State}
        lockedMsg="Önce sesi klonla"
      >
        <p className="text-sm text-slate-600">
          Aşağıdaki cümleler ürünün gerçekten üreteceği cümleler — klonun işe yarayıp
          yaramadığı ancak kendi işini yaparken anlaşılır. Üret, referansla yan yana dinle,
          sonra onayla.
        </p>

        <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3 leading-relaxed">
          <strong className="text-slate-700">2026-07-29 değerlendirmesi:</strong> Türkçe okunuş
          kusursuz, ama benzerlik (kaç kişinin sesine ne kadar yakın olduğu) henüz
          &ldquo;klonlamaya değecek&rdquo; kalitede bulunmadı. Bu bilinen bir sınır — daha
          temiz/uzun bir kaynak kayıtla yeniden denenebilir. Onay, bu belirli klonu
          kulakla kabul ettiğini işaretler; kusursuz olması gerekmez.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {VOICE_TEST_SCRIPTS.map((script) => {
            const take = latestTake(script.id);
            const busy = generatingId === script.id;
            return (
              <div
                key={script.id}
                className={`rounded-xl border p-4 flex flex-col gap-2 transition-colors ${
                  take ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900">{script.label}</span>
                  <span className="text-[10px] text-slate-400">{hideCost ? `≈${costCredits(script.text)} kredi` : `~$${cost(script.text)} · ≈${costCredits(script.text)} kredi`}</span>
                </div>
                <p className="text-xs text-slate-500 leading-snug">{script.hint}</p>
                <p className="text-xs text-slate-600 bg-slate-50 rounded-lg p-2 leading-relaxed line-clamp-3">
                  {script.text}
                </p>

                <button
                  onClick={() => speak(script.id, script.label, script.text)}
                  disabled={generatingId !== null}
                  className="mt-auto flex items-center justify-center gap-2 rounded-lg bg-slate-900 text-white py-2 text-xs font-semibold hover:bg-slate-800 disabled:opacity-50"
                >
                  {busy ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  {busy ? 'Üretiliyor…' : take ? 'Yeniden üret' : 'Seslendir'}
                </button>

                {take && !busy && <audio src={take.audioUrl} controls className="h-9 w-full" />}
              </div>
            );
          })}
        </div>

        {/* Serbest metin */}
        <div className="border-t border-slate-100 pt-4">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Kendi cümleni dene
          </label>
          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            rows={2}
            placeholder="Klonun zorlanmasını beklediğin bir cümle yaz."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => speak('custom', 'Serbest metin', customText)}
              disabled={generatingId !== null || !customText.trim()}
              className="flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {generatingId === 'custom' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Seslendir
            </button>
            {customText.trim() && (
              <span className="text-xs text-slate-400">
                {customText.length} karakter · {hideCost ? `≈${costCredits(customText)} kredi` : `~$${cost(customText)} · ≈${costCredits(customText)} kredi`}
              </span>
            )}
          </div>
          {latestTake('custom') && generatingId !== 'custom' && (
            <audio src={latestTake('custom')!.audioUrl} controls className="h-9 w-full mt-2" />
          )}
        </div>

        {/* Karşılaştırma — üretilenler kendi kartlarında, referans burada tek yerde. */}
        {takes.length > 0 && voiceUrl && (
          <div className="border-t border-slate-100 pt-4 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-500 sm:w-56">Referans (karşılaştır)</p>
              <audio src={voiceUrl} controls className="h-9 flex-1 min-w-0" />
            </div>
            <p className="text-[10px] text-slate-400">
              Toplam {takes.length} deneme üretildi. Denemeler kaydedilmiyor — sayfayı
              yenileyince silinir.
            </p>
          </div>
        )}

        {/* Onay */}
        <div className="border-t border-slate-100 pt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={toggleApproval}
            disabled={approving || takes.length === 0}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 ${
              approved
                ? 'border border-slate-300 text-slate-600 hover:bg-slate-50'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {approved ? 'Onayı geri al' : 'Bu klonu onayla'}
          </button>
          <span className="text-xs text-slate-400">
            {takes.length === 0
              ? 'Onaylamadan önce en az bir deneme dinle.'
              : approved
                ? 'Klon onaylandı — Beiwe Motion bu sesi kullanacak.'
                : 'Onay, profile voice_status = ready olarak yazılır.'}
          </span>
        </div>
      </LabStage>
    </div>
  );
}
