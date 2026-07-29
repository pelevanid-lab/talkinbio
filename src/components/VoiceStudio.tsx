'use client';

import { useState, useRef } from 'react';
import { Mic, UploadCloud, Play, Loader2, CheckCircle, Volume2 } from 'lucide-react';

type Props = {
  characterId: string;
  initialVoiceUrl?: string;
};

export default function VoiceStudio({ characterId, initialVoiceUrl }: Props) {
  const [voiceUrl, setVoiceUrl] = useState<string | undefined>(initialVoiceUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testText, setTestText] = useState('Merhaba, bu senin ses klonun. Lütfen arkana yaslan, gözlerini kapat ve sana ne kadar benzediğini dinle.');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch(`/api/admin/characters/${characterId}/voice`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Ses yüklenemedi.');
      
      setVoiceUrl(data.voice_url);
      
      // Kullanıcı deneyimini "wow" faktörüne çıkarmak için ses yüklenir yüklenmez
      // otomatik olarak varsayılan metni seslendiriyoruz.
      await generateTestVoice(data.voice_url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const generateTestVoice = async (overrideVoiceUrl?: string) => {
    const urlToUse = overrideVoiceUrl || voiceUrl;
    if (!testText.trim() || !urlToUse) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('text', testText);
      formData.append('voice_url', urlToUse);
      
      const res = await fetch(`/api/admin/characters/${characterId}/voice`, {
        method: 'POST',
        body: formData
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Ses üretilemedi.');
      
      setGeneratedAudioUrl(data.audioUrl);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Kısım 1: Ses Yükleme */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-left">
        <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Mic className="w-4 h-4 text-blue-500" />
          Referans Ses
        </h3>
        
        {voiceUrl ? (
          <div className="flex flex-col sm:flex-row items-center justify-between bg-white border border-slate-200 rounded-lg p-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">Referans Ses Hazır</p>
                <p className="text-xs text-slate-500">MiniMax ses klonlama için bu ses kullanılacak.</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <audio src={voiceUrl} controls className="h-8 w-full sm:w-48" />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                Değiştir
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center bg-white border-2 border-dashed border-slate-200 rounded-lg p-6">
            <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">Temiz bir konuşma kaydı yükleyin</p>
            <p className="text-xs text-slate-500 mt-1 mb-4">Gürültüsüz, arka plan müziği olmayan 10-30 saniyelik bir kayıt idealdir (mp3, wav, m4a).</p>
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
              {isUploading ? 'Yükleniyor...' : 'Ses Dosyası Seç'}
            </button>
          </div>
        )}
        
        <input 
          ref={fileInputRef}
          type="file"
          accept="audio/mp3, audio/wav, audio/mpeg, audio/mp4, audio/x-m4a"
          className="hidden"
          onChange={handleFileUpload}
        />
        
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      </div>

      {/* Kısım 2: Klon Testi */}
      {voiceUrl && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-left">
          <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-purple-500" />
            Klonu Test Et
          </h3>
          <p className="text-xs text-slate-500 mb-3">
            Aşağıya bir metin yazın ve klonlanmış sesinizle nasıl okunduğunu dinleyin.
          </p>
          
          <textarea
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 mb-3"
          />
          
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => generateTestVoice()}
              disabled={isGenerating || !testText.trim()}
              className="bg-purple-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {isGenerating ? 'Ses Üretiliyor...' : 'Seslendir'}
            </button>
            {testText.trim().length > 0 && (
              <p className="text-xs text-slate-500">
                ~${((testText.length / 1000) * 0.05).toFixed(4)} (tahmini maliyet) · {testText.length} karakter
              </p>
            )}
          </div>
          
          {generatedAudioUrl && (
            <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-sm font-medium text-purple-900">Klonlanmış Ses:</span>
              <audio src={generatedAudioUrl} controls className="h-10 w-full sm:w-64" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
