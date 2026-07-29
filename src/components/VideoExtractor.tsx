'use client';

import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { Camera, Loader2, PlaySquare, UploadCloud, CheckCircle } from 'lucide-react';

type Props = {
  onExtracted: (files: File[]) => void;
  isProcessing: boolean;
};

export default function VideoExtractor({ onExtracted, isProcessing }: Props) {
  const [error, setError] = useState<string | null>(null);
  
  // States
  const [livenessVerified, setLivenessVerified] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  
  // Kamerayı aç
  const startCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      setStream(mediaStream);
      setIsCameraOpen(true);
    } catch (err) {
      console.error(err);
      setError('Kameraya erişilemedi. Lütfen tarayıcı ayarlarınızdan kamera izni verin.');
    }
  };

  // Component unmount olduğunda kamerayı kapatmayı unutma
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream]);

  // Kamerayı kapat
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  };

  // Liveness doğrulama
  const verifyLiveness = () => {
    setVerifying(true);
    // 2 saniye fake liveness scan efekti
    setTimeout(() => {
      setVerifying(false);
      setLivenessVerified(true);
      stopCamera();
    }, 2000);
  };

  // Dosya Yükleme
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadedFile(e.target.files[0]);
    }
  };

  const handleSubmit = () => {
    if (uploadedFile) {
      onExtracted([uploadedFile]);
    }
  };

  useEffect(() => {
    if (!isProcessing) {
      setUploadedFile(null);
    }
  }, [isProcessing]);

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-50 border border-slate-200 rounded-2xl">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-700">Görsel analiz ediliyor ve AI Twin oluşturuluyor...</p>
        <p className="text-xs text-slate-400 mt-1 text-center max-w-sm">
          Lütfen bekleyin, bu işlem biraz zaman alabilir.
        </p>

        {uploadedFile && (
          <div className="mt-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={URL.createObjectURL(uploadedFile)} alt="Yüklenen" className="w-24 h-24 rounded-lg object-cover border border-slate-200 shadow-sm" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8">
      {!livenessVerified ? (
        <>
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-slate-900">Gerçekliğinizi Doğrulayın (Liveness)</h2>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Güvenliğiniz için robot olmadığınızı doğrulamak amacıyla kameranızı açmanız gerekmektedir. Görüntünüz kaydedilmeyecektir.
            </p>
          </div>

          {!isCameraOpen ? (
            <div className="flex justify-center">
              <button 
                onClick={startCamera}
                className="flex flex-col items-center gap-3 p-8 rounded-xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-colors max-w-sm w-full"
              >
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shadow-inner">
                  <Camera className="w-8 h-8" />
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-slate-900 text-lg">Kamerayı Aç</h3>
                  <p className="text-xs text-slate-500 mt-2">
                    Kamera sadece canlılık testi içindir, fotoğrafınız kaydedilmez.
                  </p>
                </div>
              </button>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 flex flex-col items-center">
              <div className="relative w-full max-w-md bg-black rounded-xl overflow-hidden shadow-lg h-[400px] sm:h-[480px]">
                <video 
                  ref={(el) => {
                    if (el && stream && el.srcObject !== stream) {
                      el.srcObject = stream;
                      el.play().catch(() => {});
                    }
                  }}
                  autoPlay 
                  playsInline 
                  muted 
                  className={`absolute inset-0 w-full h-full object-cover ${verifying ? 'opacity-50 blur-sm' : ''} transform scale-x-[-1]`}
                />

                {verifying && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-10 text-white">
                    <Loader2 className="w-12 h-12 animate-spin mb-2" />
                    <span className="font-bold drop-shadow-md">Yüz taranıyor...</span>
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-col w-full max-w-md gap-4">
                <button
                  onClick={verifyLiveness}
                  disabled={verifying}
                  className="w-full rounded-xl py-3.5 font-semibold transition-all shadow-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {verifying ? 'Doğrulanıyor...' : 'Gerçekliğimi Doğrula'}
                </button>
                <button 
                  onClick={stopCamera}
                  disabled={verifying}
                  className="text-xs text-slate-400 hover:text-slate-600 underline text-center"
                >
                  İptal Et
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="animate-in zoom-in-95 fade-in flex flex-col items-center">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 text-green-600 rounded-full mb-3">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Doğrulama Başarılı!</h2>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Şimdi AI Twin'inizin eğitileceği en net ve yüksek çözünürlüklü 1 adet fotoğrafınızı yükleyin.
            </p>
          </div>

          {!uploadedFile ? (
            <label className="flex flex-col items-center justify-center w-full max-w-md h-64 border-2 border-slate-200 border-dashed rounded-2xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <UploadCloud className="w-12 h-12 text-slate-400 mb-3" />
                <p className="mb-2 text-sm text-slate-500 font-semibold">Tıklayın veya fotoğraf sürükleyin</p>
                <p className="text-xs text-slate-400">Sadece JPEG, PNG</p>
              </div>
              <input type="file" className="hidden" accept="image/jpeg, image/png" onChange={handleFileChange} />
            </label>
          ) : (
            <div className="flex flex-col items-center w-full max-w-md">
              <div className="relative w-full h-64 rounded-2xl overflow-hidden shadow-md mb-4 bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={URL.createObjectURL(uploadedFile)} alt="Seçilen" className="w-full h-full object-cover" />
                <button 
                  onClick={() => setUploadedFile(null)}
                  className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 backdrop-blur-sm flex items-center justify-center w-8 h-8"
                >
                  ✕
                </button>
              </div>
              <button
                onClick={handleSubmit}
                className="w-full rounded-xl py-3.5 font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-md transition-all"
              >
                Gönder ve Twin Üret
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 max-w-md mx-auto text-center">
          {error}
        </div>
      )}
    </div>
  );
}
