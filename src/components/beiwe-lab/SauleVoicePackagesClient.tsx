'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CheckCircle2, Circle, Upload, Volume2 } from 'lucide-react';
import { SAULE_CUE_KEYS, type SauleCueKey } from '@/agents/saule/core';
import { getSauleCueText } from '@/agents/saule/cueTexts';

type CueRow = {
  id: string;
  cue_key: SauleCueKey;
  locale: 'tr' | 'en' | 'ru';
  variant_label: string;
  audio_url: string;
  status: 'pending_review' | 'approved' | 'rejected';
};

type VoicePackage = {
  id: string;
  slug: string;
  label: string;
  kind: string;
  version: number;
  status: string;
  saule_voice_cues?: CueRow[];
};

const languages = ['tr', 'en', 'ru'] as const;

export default function SauleVoicePackagesClient({ packages }: { packages: VoicePackage[] }) {
  const router = useRouter();
  const [packageId, setPackageId] = useState(packages[0]?.id || '');
  const [cueKey, setCueKey] = useState<SauleCueKey>('welcome');
  const [locale, setLocale] = useState<'tr' | 'en' | 'ru'>('tr');
  const [variantLabel, setVariantLabel] = useState('v1');
  const [voiceId, setVoiceId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedPackage = packages.find((pkg) => pkg.id === packageId) || packages[0];
  const cues = selectedPackage?.saule_voice_cues || [];

  const cueFor = (key: SauleCueKey, lang: 'tr' | 'en' | 'ru') =>
    cues.find((cue) => cue.cue_key === key && cue.locale === lang && cue.status === 'approved') ||
    cues.find((cue) => cue.cue_key === key && cue.locale === lang && cue.status === 'pending_review');

  const uploadCue = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file || !packageId || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('packageId', packageId);
      formData.append('cueKey', cueKey);
      formData.append('locale', locale);
      formData.append('variantLabel', variantLabel);
      const res = await fetch('/api/admin/saule-voice-packages/cues', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Yukleme basarisiz.');
      setFile(null);
      setMessage('Cue yuklendi. Dinleyip onaylayabilirsin.');
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Yukleme basarisiz.');
    } finally {
      setBusy(false);
    }
  };

  const generateCue = async () => {
    if (!packageId || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/saule-voice-packages/cues/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId,
          cueKey,
          locale,
          variantLabel: variantLabel || 'eleven-v3',
          voiceId: voiceId.trim() || undefined,
          text: getSauleCueText(cueKey, locale),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Uretim basarisiz.');
      setMessage('Eleven v3 cue uretildi. Dinleyip onaylayabilirsin.');
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Uretim basarisiz.');
    } finally {
      setBusy(false);
    }
  };

  const approveCue = async (cueId: string) => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/saule-voice-packages/cues/${cueId}/approve`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Onay basarisiz.');
      setMessage('Cue onaylandi.');
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Onay basarisiz.');
    } finally {
      setBusy(false);
    }
  };

  const activatePackage = async () => {
    if (!selectedPackage || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/saule-voice-packages/${selectedPackage.id}/activate`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Aktivasyon basarisiz.');
      setMessage('Paket aktif edildi. Public sayfalar artik onayli cue manifestini alir.');
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Aktivasyon basarisiz.');
    } finally {
      setBusy(false);
    }
  };

  if (!selectedPackage) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
        Henuz ses paketi yok. 00064 migration'i standard paketi olusturur.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
      <section className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{selectedPackage.label}</h2>
            <p className="text-sm text-slate-500">
              Her cue icin TR/EN/RU varyantlari yuklenir; sadece onayli varyant public manifest'e girer.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
            <Circle className="w-3.5 h-3.5" /> {selectedPackage.status}
          </span>
        </div>
        {selectedPackage.status !== 'active' && (
          <button
            type="button"
            onClick={activatePackage}
            disabled={busy}
            className="mb-5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            Paketi Aktif Et
          </button>
        )}

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left font-semibold px-4 py-3">cueKey</th>
                {languages.map((language) => (
                  <th key={language} className="text-left font-semibold px-4 py-3 uppercase">{language}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {SAULE_CUE_KEYS.map((key) => (
                <tr key={key}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-800">{key}</td>
                  {languages.map((language) => {
                    const cue = cueFor(key, language);
                    return (
                      <td key={language} className="px-4 py-3">
                        {cue ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              {cue.status === 'approved' ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <Circle className="w-4 h-4 text-amber-500" />
                              )}
                              <span className="text-xs text-slate-600">{cue.variant_label}</span>
                            </div>
                            <audio src={cue.audio_url} controls className="h-8 w-44 max-w-full" />
                            {cue.status !== 'approved' && (
                              <button
                                type="button"
                                onClick={() => approveCue(cue.id)}
                                disabled={busy}
                                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                              >
                                Onayla
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Bekliyor</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <aside className="space-y-4">
        <form onSubmit={uploadCue} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">Cue Yukle</h2>
            <p className="text-sm text-slate-500">Eleven v3'ten gelen secili varyanti yukle; sonra dinleyip onayla.</p>
          </div>

          <label className="block text-xs font-semibold text-slate-500 uppercase">
            Paket
            <select value={packageId} onChange={(e) => setPackageId(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm normal-case text-slate-800">
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>{pkg.label}</option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-semibold text-slate-500 uppercase">
            Cue
            <select value={cueKey} onChange={(e) => setCueKey(e.target.value as SauleCueKey)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm normal-case text-slate-800">
              {SAULE_CUE_KEYS.map((key) => (
                <option key={key} value={key}>{key}</option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-semibold text-slate-500 uppercase">
              Dil
              <select value={locale} onChange={(e) => setLocale(e.target.value as 'tr' | 'en' | 'ru')} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm normal-case text-slate-800">
                {languages.map((lang) => <option key={lang} value={lang}>{lang.toUpperCase()}</option>)}
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-500 uppercase">
              Varyant
              <input value={variantLabel} onChange={(e) => setVariantLabel(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm normal-case text-slate-800" />
            </label>
          </div>

          <label className="block text-xs font-semibold text-slate-500 uppercase">
            fal ElevenLabs voice
            <input
              value={voiceId}
              onChange={(e) => setVoiceId(e.target.value)}
              placeholder="Bos birakirsan Rachel/env kullanilir"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm normal-case text-slate-800"
            />
          </label>

          <input
            type="file"
            accept="audio/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700"
          />
          <button type="submit" disabled={!file || busy} className="w-full rounded-xl bg-slate-900 text-white py-3 text-sm font-bold disabled:opacity-50">
            {busy ? 'Isleniyor...' : 'Yukle'}
          </button>
          <button
            type="button"
            onClick={generateCue}
            disabled={busy}
            className="w-full rounded-xl bg-emerald-600 text-white py-3 text-sm font-bold disabled:opacity-50"
          >
            Eleven v3 ile Uret
          </button>
          {message && <p className="text-sm text-slate-500">{message}</p>}
        </form>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
            <Volume2 className="w-5 h-5" />
          </div>
          <h2 className="font-bold text-slate-900 mb-2">Runtime Sozlesmesi</h2>
          <p className="text-sm text-slate-500">
            Saule cueKey dondurur; Talkinbio aktif paketin onayli dosyasini oynatir. Metin TTS'e gonderilmez.
          </p>
        </div>
      </aside>
    </div>
  );
}
