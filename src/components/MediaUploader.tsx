'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Upload, X, Loader2, Image as ImageIcon, FolderHeart, Play } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { compressImageIfNeeded } from '@/utils/imageCompression';
import { isVideoUrl } from '@/utils/mediaType';
import { useParams } from 'next/navigation';

function GalleryModal({ characterId, onClose, onSelect }: { characterId: string, onClose: () => void, onSelect: (url: string) => void }) {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/characters/${characterId}/studio-asset`)
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setAssets(data.assets.filter((a: any) => a.kind === 'image' || a.kind === 'video'));
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [characterId]);

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800">Stüdyo Koleksiyonu</h3>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1 bg-slate-50 min-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mb-2" />
              <span className="text-sm">İçerikler yükleniyor...</span>
            </div>
          ) : error ? (
            <p className="text-sm text-red-500 text-center py-8">{error}</p>
          ) : assets.length === 0 ? (
            <div className="text-center py-10">
              <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Henüz hiç içerik üretilmemiş.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {assets.map(asset => (
                <button 
                  key={asset.id} 
                  type="button"
                  onClick={() => {
                    onSelect(asset.url);
                    onClose();
                  }}
                  className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 hover:border-blue-500 hover:ring-2 hover:ring-blue-200 transition-all group bg-slate-100"
                >
                  {asset.kind === 'video' ? (
                    <>
                      <video src={asset.url} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                         <Play className="w-6 h-6 text-white drop-shadow-md opacity-75 group-hover:opacity-100" />
                      </div>
                    </>
                  ) : (
                    <img src={asset.url} alt="" className="w-full h-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface MediaUploaderProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  bucket?: string;
}

export default function MediaUploader({ value, onChange, label, bucket = "media" }: MediaUploaderProps) {
  const t = useTranslations('MediaUploader');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const resolvedLabel = label ?? t('defaultLabel');
  const params = useParams();
  const characterId = params?.characterId as string | undefined;

  const handleUpload = async (file: File) => {
    try {
      setIsUploading(true);
      setError(null);

      // Valide file type
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        throw new Error(t('errorInvalidType'));
      }

      const processedFile = await compressImageIfNeeded(file);

      // Max size: 300MB — mainly a backstop for video (never compressed here) and for images
      // the browser couldn't decode/compress (e.g. HEIC in browsers with no HEIC codec, which
      // makes compressImageIfNeeded throw and fall back to the original file untouched).
      if (processedFile.size > 300 * 1024 * 1024) {
        throw new Error(t('errorFileSize'));
      }

      // Create unique filename
      const fileExt = processedFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, processedFile, {
          cacheControl: '31536000',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      onChange(publicUrl);
    } catch (err: any) {
      console.error('Upload Error:', err);
      setError(err.message || t('errorGeneric'));
    } finally {
      setIsUploading(false);
      // Reset input value to allow uploading same file again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const removeMedia = () => {
    onChange('');
  };

  return (
    <div className="w-full">
      {/* Hidden file input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleUpload(e.target.files[0]);
          }
        }} 
        accept="image/*,video/*" 
        className="hidden" 
      />

      {value ? (
        // Preview State
        <div className="relative w-full bg-slate-50 rounded-lg border border-slate-200 overflow-hidden group flex items-center justify-center">
          {isVideoUrl(value) ? (
            <video src={value} className="w-full max-h-64 object-contain" controls />
          ) : (
            <img src={value} alt="Preview" className="w-full max-h-64 object-contain" />
          )}
          <button 
            type="button"
            onClick={removeMedia}
            className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow-sm text-red-500 hover:bg-red-50 hover:text-red-600 transition opacity-0 group-hover:opacity-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        // Upload State
        <div 
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`
            relative w-full h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center transition-colors
            ${isDragging ? 'border-[var(--coral)] bg-[var(--coral-tint)]' : 'border-slate-300 hover:border-[var(--teal)] hover:bg-slate-50 bg-white'}
            ${isUploading ? 'opacity-75 cursor-not-allowed pointer-events-none' : ''}
          `}
        >
          {isUploading ? (
            <div className="flex flex-col items-center text-[var(--coral)]">
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <span className="text-sm font-medium">{t('uploadingLabel')}</span>
            </div>
          ) : (
            <div 
              className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mb-2">
                <Upload className="w-5 h-5 text-slate-400" />
              </div>
              <span className="text-sm font-medium text-[var(--ink)]">{resolvedLabel}</span>
              <span className="text-xs text-[var(--ink-soft)] mt-1">{t('maxSizeHint')}</span>
            </div>
          )}

          {characterId && !isUploading && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsGalleryOpen(true);
              }}
              className="absolute bottom-2 right-2 flex items-center gap-1.5 text-xs font-medium text-[var(--teal)] bg-teal-50 px-2.5 py-1.5 rounded-md hover:bg-teal-100 z-10 shadow-sm border border-teal-100 transition-colors"
            >
              <FolderHeart className="w-3.5 h-3.5" />
              Koleksiyon
            </button>
          )}
        </div>
      )}

      {isGalleryOpen && characterId && (
        <GalleryModal 
          characterId={characterId} 
          onClose={() => setIsGalleryOpen(false)} 
          onSelect={onChange} 
        />
      )}

      {error && (
        <p className="text-xs text-red-500 mt-2 font-medium">{error}</p>
      )}
    </div>
  );
}
