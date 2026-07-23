const MAX_IMAGE_DIMENSION = 1920;
const IMAGE_COMPRESS_QUALITY = 0.82;
// Below this, the file is already small enough that re-encoding would only cost quality for
// no real size benefit.
const COMPRESS_THRESHOLD_BYTES = 1.5 * 1024 * 1024;

// iPhones default to shooting HEIC — no mainstream browser can decode it via createImageBitmap
// (no native codec), which used to make the canvas step below throw and silently fall back to
// the original, full-size file. That's the file type actually behind "compression didn't help,
// still hitting the size limit" reports: the size check saw the untouched 100+MB original.
function isHeic(file: File): boolean {
  return file.type === 'image/heic' || file.type === 'image/heif' || /\.(heic|heif)$/i.test(file.name);
}

async function convertHeicToJpeg(file: File): Promise<File> {
  const heic2any = (await import('heic2any')).default;
  const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: IMAGE_COMPRESS_QUALITY });
  const blob = Array.isArray(result) ? result[0] : result;
  return new File([blob], file.name.replace(/\.(heic|heif)$/i, '') + '.jpg', { type: 'image/jpeg' });
}

// Instagram-style client-side downscale/re-encode, run before the file ever leaves the browser.
// Phone photos routinely land at 10-140MB; this typically brings them under 1-2MB with no
// visible quality loss. Doing this in the browser (rather than a server route) sidesteps both
// Vercel's serverless request body size limit (~4.5MB) and Supabase Storage's own server-side
// upload size limit, since the original oversized file never has to travel anywhere — it's
// already small by the time it's uploaded. Shared by every upload path in the app (dashboard
// block editor's MediaUploader, Beiwe chat's attachment button) so none of them can drift out
// of sync and reintroduce the "large photo rejected" problem in only one of them.
export async function compressImageIfNeeded(file: File): Promise<File> {
  if (isHeic(file)) {
    try {
      file = await convertHeicToJpeg(file);
    } catch (err) {
      console.error('HEIC conversion failed, uploading original:', err);
      return file;
    }
  }

  // Canvas re-encoding flattens animated GIFs to a single frame, so leave those (and non-images) alone.
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  if (file.size <= COMPRESS_THRESHOLD_BYTES) return file;

  try {
    // imageOrientation defaults to 'none' in some browsers — without it, a portrait phone photo
    // (stored as landscape pixel data + an EXIF rotation flag) gets redrawn onto the canvas
    // ignoring that flag, and canvas re-encoding strips EXIF entirely, so the flag is gone for
    // good afterward: the photo comes out sideways/upside-down with no way to recover the
    // original orientation. 'from-image' bakes the rotation into the pixels before we ever draw.
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
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
