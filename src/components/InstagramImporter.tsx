'use client';

import { useState, useRef } from 'react';
import { Camera, Loader2, CheckCircle, UploadCloud, X, RefreshCw } from 'lucide-react';
import type { CharacterShot } from '@/config/characters';

type Props = {
  characterId: string;
  onImportComplete: (newShots: CharacterShot[]) => void;
  onCancel: () => void;
};

type Step = 'input' | 'verify' | 'fetching' | 'select' | 'saving';

export default function InstagramImporter({ characterId, onImportComplete, onCancel }: Props) {
  const [step, setStep] = useState<Step>('input');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Verification
  const [verificationCode] = useState(() => Math.random().toString(36).substring(2, 8).toUpperCase());
  const [bioSnippet, setBioSnippet] = useState('');
  
  // Photos
  const [fetchedPhotos, setFetchedPhotos] = useState<string[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadedPreviewUrls, setUploadedPreviewUrls] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const checkBio = async () => {
    if (!username.trim()) {
      setError('Kullanıcı adı giriniz.');
      return;
    }
    setError(null);
    setStep('verify');
  };

  const verifyCode = async () => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/characters/${characterId}/instagram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check-bio', username, verificationCode })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Doğrulama başarısız.');
      
      if (data.verified) {
        fetchPosts();
      } else {
        setBioSnippet(data.bio || 'Bio boş.');
        setError(`Bio kodunuzla eşleşmedi. Güncel Bio: "${data.bio}"`);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchPosts = async () => {
    setStep('fetching');
    setError(null);
    try {
      const res = await fetch(`/api/admin/characters/${characterId}/instagram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fetch-posts', username })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Gönderiler çekilemedi.');
      
      const urls = data.photos.map((p: any) => p.url);
      setFetchedPhotos(urls);
      setSelectedUrls(urls);
      setStep('select');
    } catch (err: any) {
      setError(err.message);
      setStep('verify');
    }
  };

  const toggleSelection = (url: string) => {
    setSelectedUrls(prev => 
      prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setUploadedFiles(prev => [...prev, ...files]);
      
      files.forEach(file => {
        const preview = URL.createObjectURL(file);
        setUploadedPreviewUrls(prev => [...prev, preview]);
      });
    }
  };

  const removeUploadedFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setUploadedPreviewUrls(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const saveAll = async () => {
    const totalCount = selectedUrls.length + uploadedFiles.length;
    if (totalCount < 10) {
      setError(`LoRA eğitimi için en az 10 fotoğraf gereklidir. Şu an ${totalCount} adet seçili.`);
      return;
    }
    
    setStep('saving');
    setError(null);
    try {
      const allNewShots: CharacterShot[] = [];
      
      // 1. Instagram fotoğraflarını kaydet
      if (selectedUrls.length > 0) {
        const igRes = await fetch(`/api/admin/characters/${characterId}/instagram`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'save-photos', username, urls: selectedUrls })
        });
        const igData = await igRes.json();
        if (igRes.ok && igData.shots) {
          allNewShots.push(...igData.shots);
        }
      }
      
      // 2. Yüklenen dosyaları kaydet
      for (const file of uploadedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        const refRes = await fetch('/api/admin/characters/scene-ref', { method: 'POST', body: formData });
        const refData = await refRes.json();
        
        if (refRes.ok && refData.url) {
          const shotRes = await fetch('/api/admin/characters/shots', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              characterId, 
              imageUrl: refData.url, 
              isCanon: false, 
              similarityScore: 10 
            })
          });
          const shotData = await shotRes.json();
          if (shotRes.ok && shotData.shot) {
            allNewShots.push(shotData.shot);
          }
        }
      }
      
      onImportComplete(allNewShots);
    } catch (err: any) {
      setError(err.message || 'Kaydetme sırasında bir hata oluştu.');
      setStep('select');
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-slate-800">
          <Camera className="w-5 h-5 text-pink-500" />
          <h2 className="text-lg font-bold">Instagram'dan Hızlı Aktarım</h2>
        </div>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      {step === 'input' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Instagram hesabınızı bağlayarak LoRA eğitimi için gereken fotoğrafları hızlıca çekebilirsiniz. Son 18 aydaki gönderileriniz taranacaktır.
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Kullanıcı Adı</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value.trim())}
                placeholder="@kullanici_adi" 
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button 
                onClick={checkBio}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700"
              >
                İleri
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'verify' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Hesabın size ait olduğunu doğrulamak için lütfen aşağıdaki kodu Instagram biyografinize geçici olarak ekleyin.
          </p>
          <div className="bg-slate-100 p-4 rounded-xl text-center">
            <span className="text-2xl font-mono font-bold tracking-widest text-slate-800">{verificationCode}</span>
          </div>
          {bioSnippet && (
            <p className="text-xs text-slate-500 mt-2">Okunan Bio: {bioSnippet}</p>
          )}
          <div className="flex gap-3">
            <button 
              onClick={() => setStep('input')}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Geri
            </button>
            <button 
              onClick={verifyCode}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Doğrula & Fotoğrafları Çek
            </button>
          </div>
        </div>
      )}

      {step === 'fetching' && (
        <div className="flex flex-col items-center justify-center py-10 space-y-4">
          <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
          <p className="text-sm font-medium text-slate-700">Instagram fotoğraflarınız taranıyor...</p>
          <p className="text-xs text-slate-400">Bu işlem yaklaşık 15-30 saniye sürebilir.</p>
        </div>
      )}

      {step === 'select' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">
              <strong className="text-blue-600">{fetchedPhotos.length}</strong> fotoğraf bulundu. (Seçili: {selectedUrls.length})
            </p>
            <p className="text-xs text-slate-500">LoRA için hedef: En az 10 fotoğraf</p>
          </div>
          
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-64 overflow-y-auto p-1 border border-slate-100 rounded-lg">
            {fetchedPhotos.map(url => {
              const isSelected = selectedUrls.includes(url);
              return (
                <div 
                  key={url} 
                  onClick={() => toggleSelection(url)}
                  className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${isSelected ? 'border-blue-500' : 'border-transparent'}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  {isSelected && (
                    <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-white drop-shadow-md" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-100">
            <p className="text-sm font-medium text-slate-700 mb-2">Manuel Fotoğraf Ekle ({uploadedFiles.length})</p>
            <p className="text-xs text-slate-500 mb-3">Instagram'dan yeterli fotoğraf çıkmadıysa veya kalitesizse ekleme yapabilirsiniz.</p>
            
            <div className="flex flex-wrap gap-2">
              {uploadedPreviewUrls.map((url, i) => (
                <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => removeUploadedFile(i)} className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-400 bg-slate-50"
              >
                <UploadCloud className="w-5 h-5" />
                <span className="text-[10px] mt-1 font-medium">Seç</span>
              </button>
              <input 
                ref={fileInputRef} 
                type="file" 
                multiple 
                accept="image/jpeg, image/png" 
                className="hidden" 
                onChange={handleFileChange} 
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button 
              onClick={onCancel}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              İptal
            </button>
            <button 
              onClick={saveAll}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700"
            >
              Kütüphaneye Ekle ({selectedUrls.length + uploadedFiles.length})
            </button>
          </div>
        </div>
      )}

      {step === 'saving' && (
        <div className="flex flex-col items-center justify-center py-10 space-y-4">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-sm font-medium text-slate-700">Fotoğraflar kütüphaneye kaydediliyor...</p>
        </div>
      )}
    </div>
  );
}
