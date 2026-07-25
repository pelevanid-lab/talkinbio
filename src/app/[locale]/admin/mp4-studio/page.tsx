'use client';

import React, { useState } from 'react';
import { Player } from '@remotion/player';
import { TalkinbioReels } from '../../../../remotion/TalkinbioReels';

export default function Mp4Studio() {
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [inputProps, setInputProps] = useState({
    yearText: '2026',
    eraText: 'AI Çağı',
    eraTextAfter: 'Senin Çağın',
    ctaText: 'Senin\nçağın başlıyor.',
    ctaTextAfter: 'Senin talkinbio\nçağın başlıyor.',
    buttonText: 'talkinbio',
  });

  const handleRender = async () => {
    setLoading(true);
    setVideoUrl(null);
    setError(null);

    try {
      const res = await fetch('/api/render-mp4', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          compositionId: 'TalkinbioReels',
          inputProps,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setVideoUrl(data.url);
      } else {
        setError(data.error || 'Render başarısız.');
      }
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
      <div className="flex-1">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">MP4 Stüdyo 🎬</h1>
        <p className="text-gray-600 mb-8">
          Bu ekrandan Remotion şablonlarını önizleyebilir ve doğrudan yüksek çözünürlüklü .mp4 videoları oluşturabilirsiniz.
        </p>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <h2 className="text-xl font-semibold mb-4">Şablon Verileri</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">1. Sahne Yıl</label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                value={inputProps.yearText}
                onChange={(e) => setInputProps({ ...inputProps, yearText: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">1. Sahne Metin (Önce)</label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                value={inputProps.eraText}
                onChange={(e) => setInputProps({ ...inputProps, eraText: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">1. Sahne Metin (Sonra)</label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                value={inputProps.eraTextAfter}
                onChange={(e) => setInputProps({ ...inputProps, eraTextAfter: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">3. Sahne Metin (Önce)</label>
              <textarea
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                value={inputProps.ctaText}
                onChange={(e) => setInputProps({ ...inputProps, ctaText: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">3. Sahne Metin (Sonra)</label>
              <textarea
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                value={inputProps.ctaTextAfter}
                onChange={(e) => setInputProps({ ...inputProps, ctaTextAfter: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Buton Metni</label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                value={inputProps.buttonText}
                onChange={(e) => setInputProps({ ...inputProps, buttonText: e.target.value })}
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleRender}
          disabled={loading}
          className="w-full bg-[#FF6A5C] hover:bg-[#FF5A4C] text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all disabled:opacity-50"
        >
          {loading ? '🎬 Render Alınıyor (Bu biraz zaman alabilir)...' : '📹 MP4 Olarak Çıktı Al'}
        </button>

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl">
            <strong>Hata:</strong> {error}
          </div>
        )}

        {videoUrl && (
          <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-xl">
            <h3 className="text-lg font-bold text-green-800 mb-4">✅ Render Tamamlandı!</h3>
            <video controls src={videoUrl} className="w-full rounded-lg shadow-sm mb-4" />
            <a
              href={videoUrl}
              download
              className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              📥 MP4'ü İndir
            </a>
          </div>
        )}
      </div>

      {/* PREVIEW PANEL */}
      <div className="lg:w-[400px] flex-shrink-0">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Canlı Önizleme</h2>
        <div className="sticky top-8 rounded-3xl overflow-hidden shadow-2xl bg-black" style={{ width: 400, height: 711 }}>
          <Player
            component={TalkinbioReels}
            inputProps={inputProps}
            durationInFrames={18 * 60}
            fps={60}
            compositionWidth={400}
            compositionHeight={711}
            style={{ width: '100%', height: '100%' }}
            controls
            loop
            autoPlay
          />
        </div>
      </div>
    </div>
  );
}
