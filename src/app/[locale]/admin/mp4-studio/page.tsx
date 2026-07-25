'use client';

import React, { useState } from 'react';
import { Player } from '@remotion/player';
import { TalkinbioReels } from '../../../../remotion/TalkinbioReels';
import * as T from '../../../../remotion/templates/AllTemplates';

const TEMPLATES = [
  { id: 'TalkinbioReels', name: 'Orijinal Kurgu (v1)', component: TalkinbioReels as any, isBase: false },
  { id: 'Template1', name: 'Kinetik Tipografi', component: T.Template1 as any, isBase: true },
  { id: 'Template2', name: 'Resim & Kutu', component: T.Template2 as any, isBase: true },
  { id: 'Template3', name: 'Dikey Bölünmüş', component: T.Template3 as any, isBase: true },
  { id: 'Template4', name: 'Glitch Vibe', component: T.Template4 as any, isBase: true },
  { id: 'Template5', name: 'Elegant Fade', component: T.Template5 as any, isBase: true },
  { id: 'Template6', name: 'Bildirim', component: T.Template6 as any, isBase: true },
  { id: 'Template7', name: 'Büyük Tipografi', component: T.Template7 as any, isBase: true },
  { id: 'Template8', name: 'Profil & Alıntı', component: T.Template8 as any, isBase: true },
  { id: 'Template9', name: 'Ürün Sergileme', component: T.Template9 as any, isBase: true },
  { id: 'Template10', name: 'Neon Cyberpunk', component: T.Template10 as any, isBase: true },
];

export default function Mp4Studio() {
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTemplateId, setActiveTemplateId] = useState('TalkinbioReels');

  // V1 Props
  const [v1Props, setV1Props] = useState({
    yearText: '2026',
    eraText: 'AI Çağı',
    eraTextAfter: 'Senin Çağın',
    ctaText: 'Senin\nçağın başlıyor.',
    ctaTextAfter: 'Senin talkinbio\nçağın başlıyor.',
    buttonText: 'talkinbio',
  });

  // Dynamic Template Props
  const [baseProps, setBaseProps] = useState({
    theme: {
      primaryColor: '#FF6A5C',
      secondaryColor: '#2B6F5C',
      bgColor: '#F4F2ED',
      textColor: '#14231F',
      fontFamily: 'Inter, sans-serif',
    },
    title: 'TALKIN.BIO',
    subtitle: 'Senin çağın başlıyor',
    ctaText: 'Hemen Başla',
    imageUrl: '/story1.png',
  });

  const activeTemplate = TEMPLATES.find(t => t.id === activeTemplateId)!;
  const currentProps = activeTemplate.isBase ? baseProps : v1Props;

  const handleRender = async () => {
    setLoading(true);
    setVideoUrl(null);
    setError(null);

    try {
      const res = await fetch('/api/render-mp4', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          compositionId: activeTemplate.id,
          inputProps: currentProps,
        }),
      });

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        throw new Error(`Sunucu bir hata sayfası döndürdü (Vercel kısıtlaması veya 500 hatası olabilir). Durum kodu: ${res.status}`);
      }

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

  const updateTheme = (key: keyof typeof baseProps.theme, value: string) => {
    setBaseProps({ ...baseProps, theme: { ...baseProps.theme, [key]: value } });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
      <div className="flex-1">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">MP4 Stüdyo 🎬 (Pro)</h1>
        <p className="text-gray-600 mb-8">
          Farklı şablonlar, renkler ve metinlerle yüzlerce farklı Reels üretebilirsiniz.
        </p>

        {/* TEMPLATE SELECTOR */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <h2 className="text-xl font-semibold mb-4">1. Şablon Seçimi</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTemplateId(t.id)}
                className={`p-3 text-sm font-medium rounded-lg border transition-all ${
                  activeTemplateId === t.id 
                    ? 'border-[#FF6A5C] bg-[#FFEDE9] text-[#FF6A5C]' 
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* PROPS EDITOR */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <h2 className="text-xl font-semibold mb-4">2. İçerik ve Tema</h2>
          
          {activeTemplate.isBase ? (
            <div className="space-y-6">
              {/* Theme Settings */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase">Ana Renk</label>
                  <div className="flex gap-2 mt-1">
                    <input type="color" value={baseProps.theme.primaryColor} onChange={(e) => updateTheme('primaryColor', e.target.value)} className="w-10 h-10 p-1 border rounded" />
                    <input type="text" value={baseProps.theme.primaryColor} onChange={(e) => updateTheme('primaryColor', e.target.value)} className="flex-1 border rounded px-2" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase">İkincil Renk</label>
                  <div className="flex gap-2 mt-1">
                    <input type="color" value={baseProps.theme.secondaryColor} onChange={(e) => updateTheme('secondaryColor', e.target.value)} className="w-10 h-10 p-1 border rounded" />
                    <input type="text" value={baseProps.theme.secondaryColor} onChange={(e) => updateTheme('secondaryColor', e.target.value)} className="flex-1 border rounded px-2" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase">Arka Plan</label>
                  <div className="flex gap-2 mt-1">
                    <input type="color" value={baseProps.theme.bgColor} onChange={(e) => updateTheme('bgColor', e.target.value)} className="w-10 h-10 p-1 border rounded" />
                    <input type="text" value={baseProps.theme.bgColor} onChange={(e) => updateTheme('bgColor', e.target.value)} className="flex-1 border rounded px-2" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase">Yazı Rengi</label>
                  <div className="flex gap-2 mt-1">
                    <input type="color" value={baseProps.theme.textColor} onChange={(e) => updateTheme('textColor', e.target.value)} className="w-10 h-10 p-1 border rounded" />
                    <input type="text" value={baseProps.theme.textColor} onChange={(e) => updateTheme('textColor', e.target.value)} className="flex-1 border rounded px-2" />
                  </div>
                </div>
              </div>

              {/* Text Settings */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Başlık (Title)</label>
                  <input type="text" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#FF6A5C] focus:ring-[#FF6A5C] p-2 border" value={baseProps.title} onChange={(e) => setBaseProps({ ...baseProps, title: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Alt Başlık (Subtitle)</label>
                  <input type="text" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#FF6A5C] focus:ring-[#FF6A5C] p-2 border" value={baseProps.subtitle} onChange={(e) => setBaseProps({ ...baseProps, subtitle: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Aksiyon Metni (CTA)</label>
                  <input type="text" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#FF6A5C] focus:ring-[#FF6A5C] p-2 border" value={baseProps.ctaText} onChange={(e) => setBaseProps({ ...baseProps, ctaText: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Görsel URL</label>
                  <input type="text" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#FF6A5C] focus:ring-[#FF6A5C] p-2 border" value={baseProps.imageUrl} onChange={(e) => setBaseProps({ ...baseProps, imageUrl: e.target.value })} />
                  <p className="text-xs text-gray-500 mt-1">public klasöründeki veya harici bir resim bağlantısı (örn: /story1.png)</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
               <div>
                  <label className="block text-sm font-medium text-gray-700">1. Sahne Yıl</label>
                  <input type="text" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" value={v1Props.yearText} onChange={(e) => setV1Props({ ...v1Props, yearText: e.target.value })} />
                </div>
                {/* Diğer eski form alanları */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">1. Sahne Metin (Önce/Sonra)</label>
                  <div className="flex gap-2">
                    <input type="text" className="flex-1 rounded-md border p-2" value={v1Props.eraText} onChange={(e) => setV1Props({ ...v1Props, eraText: e.target.value })} />
                    <input type="text" className="flex-1 rounded-md border p-2" value={v1Props.eraTextAfter} onChange={(e) => setV1Props({ ...v1Props, eraTextAfter: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">3. Sahne Metin (Önce/Sonra)</label>
                  <div className="flex gap-2">
                    <textarea className="flex-1 rounded-md border p-2" value={v1Props.ctaText} onChange={(e) => setV1Props({ ...v1Props, ctaText: e.target.value })} />
                    <textarea className="flex-1 rounded-md border p-2" value={v1Props.ctaTextAfter} onChange={(e) => setV1Props({ ...v1Props, ctaTextAfter: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Buton Metni</label>
                  <input type="text" className="mt-1 block w-full rounded-md border p-2" value={v1Props.buttonText} onChange={(e) => setV1Props({ ...v1Props, buttonText: e.target.value })} />
                </div>
            </div>
          )}
        </div>

        <button
          onClick={handleRender}
          disabled={loading}
          className="w-full bg-[#FF6A5C] hover:bg-[#FF5A4C] text-white font-bold py-4 px-4 rounded-xl shadow-lg transition-all disabled:opacity-50 text-lg"
        >
          {loading ? '🎬 Render Alınıyor (Bu biraz zaman alabilir)...' : '📹 MP4 Olarak Çıktı Al'}
        </button>

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200">
            <strong>Hata:</strong> {error}
          </div>
        )}

        {videoUrl && (
          <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-xl">
            <h3 className="text-lg font-bold text-green-800 mb-4">✅ Render Tamamlandı!</h3>
            <video controls src={videoUrl} className="w-full rounded-lg shadow-sm mb-4 bg-black" />
            <a
              href={videoUrl}
              download
              className="inline-flex items-center justify-center w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors text-lg"
            >
              📥 MP4 Dosyasını İndir
            </a>
          </div>
        )}
      </div>

      {/* PREVIEW PANEL */}
      <div className="lg:w-[400px] flex-shrink-0">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Canlı Önizleme</h2>
        <div className="sticky top-8 rounded-[2rem] overflow-hidden shadow-2xl bg-black border-[8px] border-gray-900" style={{ width: 400, height: 711 }}>
          <Player
            key={activeTemplate.id}
            component={activeTemplate.component}
            inputProps={currentProps}
            durationInFrames={activeTemplate.isBase ? (10 * 60) : (18 * 60)}
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
