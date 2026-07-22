'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

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
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const resolvedLabel = label ?? t('defaultLabel');

  const handleUpload = async (file: File) => {
    try {
      setIsUploading(true);
      setError(null);

      // Valide file type
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        throw new Error(t('errorInvalidType'));
      }

      // Max size: 25MB
      if (file.size > 25 * 1024 * 1024) {
        throw new Error(t('errorFileSize'));
      }

      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
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
          {value.match(/\.(mp4|webm|ogg)$/i) ? (
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
          onClick={() => !isUploading && fileInputRef.current?.click()}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`
            w-full h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors
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
            <div className="flex flex-col items-center text-slate-500">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mb-2">
                <Upload className="w-5 h-5 text-slate-400" />
              </div>
              <span className="text-sm font-medium text-[var(--ink)]">{resolvedLabel}</span>
              <span className="text-xs text-[var(--ink-soft)] mt-1">{t('maxSizeHint')}</span>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500 mt-2 font-medium">{error}</p>
      )}
    </div>
  );
}
