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

const MAX_IMAGE_DIMENSION = 1920;
const IMAGE_COMPRESS_QUALITY = 0.82;
// Below this, the file is already small enough that re-encoding would only cost quality for
// no real size benefit.
const COMPRESS_THRESHOLD_BYTES = 1.5 * 1024 * 1024;

// Instagram-style client-side downscale/re-encode, run before the file ever leaves the browser.
// Phone photos routinely land at 10-25MB; this typically brings them under 1-2MB with no
// visible quality loss. Doing this in the browser (rather than a server route) sidesteps
// Vercel's serverless request body size limit (~4.5MB) entirely, since the original oversized
// file never has to travel to a server — it's already small by the time it's uploaded.
async function compressImageIfNeeded(file: File): Promise<File> {
  // Canvas re-encoding flattens animated GIFs to a single frame, so leave those (and non-images) alone.
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  if (file.size <= COMPRESS_THRESHOLD_BYTES) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const targetWidth = Math.round(bitmap.width * scale);
    const targetHeight = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
    bitmap.close();

    // PNGs may carry transparency — keep the format for those (still benefits from the resize,
    // just losslessly); everything else re-encodes as JPEG with the quality knob.
    const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, outputType, IMAGE_COMPRESS_QUALITY));
    if (!blob || blob.size >= file.size) return file; // re-encoding didn't actually help — keep original

    const newName = outputType === 'image/jpeg' && !/\.jpe?g$/i.test(file.name)
      ? file.name.replace(/\.[^.]+$/, '') + '.jpg'
      : file.name;
    return new File([blob], newName, { type: outputType });
  } catch (err) {
    console.error('Image compression failed, uploading original:', err);
    return file;
  }
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

      const processedFile = await compressImageIfNeeded(file);

      // Max size: 100MB — mainly a backstop for video (never compressed here) and for images
      // the browser couldn't decode/compress (e.g. HEIC in browsers with no HEIC codec, which
      // makes compressImageIfNeeded throw and fall back to the original file untouched).
      if (processedFile.size > 100 * 1024 * 1024) {
        throw new Error(t('errorFileSize'));
      }

      // Create unique filename
      const fileExt = processedFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, processedFile, {
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
