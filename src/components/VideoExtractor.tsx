'use client';

import { useState, useRef, useEffect } from 'react';
import { Camera, Loader2, PlaySquare } from 'lucide-react';

type Props = {
  onExtracted: (files: File[]) => void;
  isProcessing: boolean;
};

export default function VideoExtractor({ onExtracted, isProcessing }: Props) {
  const [error, setError] = useState<string | null>(null);
  
  // Kamera Durumları
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<File[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Kamerayı aç
  const startCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      setStream(mediaStream);
      setIsCameraOpen(true);
      setCapturedPhotos([]);
    } catch (err) {
      console.error(err);
      setError('Kameraya erişilemedi. Lütfen tarayıcı ayarlarınızdan kamera izni verin.');
    }
  };

  // Video elementi mount olunca stream'i bağla
  useEffect(() => {
    if (isCameraOpen && stream && videoRef.current) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {
          // AbortError'ı yutuyoruz ki Next.js kırmızı ekran fırlatmasın.
        });
      }
    }
  }, [isCameraOpen, stream]);

  // Kamerayı kapat
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  };

  // Component unmount olduğunda kamerayı kapatmayı unutma
  useEffect(() => {
    return () => stopCamera();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream]);

  // Fotoğraf çek
  const takePhoto = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas) return;

    // Canvas'a çiz
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    // Çizimi yap
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    
    if (blob) {
      const file = new File([blob], `snap-${capturedPhotos.length + 1}.jpg`, { type: 'image/jpeg' });
      setCapturedPhotos(prev => [...prev, file]);
    }
  };

  const handleStartAnalysis = () => {
    if (capturedPhotos.length < 3) {
      setError('Lütfen 3 adet fotoğraf çekin.');
      return;
    }
    stopCamera();
    onExtracted(capturedPhotos);
  };

  const removePhoto = (index: number) => {
    setCapturedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const getInstruction = () => {
    if (capturedPhotos.length === 0) return "Tam karşıya bakarak fotoğraf çekin";
    if (capturedPhotos.length === 1) return "Şimdi hafifçe SAĞA dönün";
    if (capturedPhotos.length === 2) return "Şimdi hafifçe SOLA dönün";
    return "Tebrikler! Analizi başlatabilirsiniz.";
  };

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-50 border border-slate-200 rounded-2xl">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-700">Yüz hatları analiz ediliyor, lütfen bekleyin...</p>
        <p className="text-xs text-slate-400 mt-1 text-center max-w-sm">
          Gemini 2.5 Pro yüz hatlarınızı, etnik yapınızı ve yaşınızı tarayıp kimlik profilinizi oluşturuyor.
        </p>

        {capturedPhotos.length > 0 && (
          <div className="flex justify-center gap-3 mt-6">
            {capturedPhotos.map((f, i) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img key={i} src={URL.createObjectURL(f)} alt={`Kare ${i+1}`} className="w-16 h-16 rounded-lg object-cover border border-slate-200 shadow-sm transform scale-x-[-1]" />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-slate-900">Yüzünüzü Tanıtın (Liveness)</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
          Güvenliğiniz için sadece anlık kamera görüntüsü ile profil oluşturulabilir. Galeriden yükleme yapılamaz.
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
                Tarayıcınızın kamera isteğine izin vermeniz gerekmektedir.
              </p>
            </div>
          </button>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 flex flex-col items-center">
          
          <div className="relative w-full max-w-md bg-black rounded-xl overflow-hidden shadow-lg aspect-[3/4] sm:aspect-[4/3] flex items-center justify-center">
            {/* Live Camera Feed */}
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full h-full object-cover ${capturedPhotos.length === 3 ? 'opacity-50 blur-sm' : ''} transform scale-x-[-1]`}
            />

            {/* Instruction Overlay */}
            {capturedPhotos.length < 3 && (
              <div className="absolute top-4 left-0 w-full text-center px-4 z-10">
                <div className="inline-block bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-medium shadow-xl">
                  Poz {capturedPhotos.length + 1}/3: {getInstruction()}
                </div>
              </div>
            )}

            {/* Take Photo Button */}
            {capturedPhotos.length < 3 && (
              <div className="absolute bottom-6 left-0 w-full flex justify-center z-10">
                <button 
                  onClick={takePhoto}
                  className="w-16 h-16 bg-white/20 backdrop-blur-md border-4 border-white rounded-full flex items-center justify-center hover:bg-white/40 active:scale-95 transition-all shadow-xl"
                  title="Fotoğraf Çek"
                >
                  <div className="w-12 h-12 bg-white rounded-full"></div>
                </button>
              </div>
            )}

            {/* Done Overlay */}
            {capturedPhotos.length === 3 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 z-10">
                <div className="bg-white rounded-full p-3 mb-3 shadow-2xl">
                  <PlaySquare className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-white font-bold text-xl drop-shadow-md">Çekim Tamamlandı!</h3>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col w-full max-w-md gap-4">
            {capturedPhotos.length > 0 && (
              <div className="flex gap-3 justify-center">
                {capturedPhotos.map((photo, i) => (
                  <div key={i} className="relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={URL.createObjectURL(photo)} 
                      alt="" 
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border-2 border-slate-200 shadow-sm transform scale-x-[-1]" 
                    />
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                    <div className="absolute -bottom-2 -translate-x-1/2 left-1/2 bg-slate-800 text-white text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap">
                      {i === 0 ? 'Ön' : i === 1 ? 'Sağ' : 'Sol'}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleStartAnalysis}
              disabled={capturedPhotos.length < 3}
              className={`w-full rounded-xl py-3.5 font-semibold transition-all shadow-sm ${
                capturedPhotos.length === 3 
                  ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md' 
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              {capturedPhotos.length === 3 ? 'Analizi Başlat' : `Fotoğraf Çekin (${capturedPhotos.length}/3)`}
            </button>
            
            <button 
              onClick={stopCamera}
              className="text-xs text-slate-400 hover:text-slate-600 underline"
            >
              Kamerayı Kapat ve İptal Et
            </button>
          </div>

        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 max-w-md mx-auto text-center">
          {error}
        </div>
      )}

      {/* Gizli canvas (Görüntü yakalamak için) */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
