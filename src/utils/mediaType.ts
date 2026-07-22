// Used everywhere a stored media URL needs to render as <video> vs <img> (MediaUploader's own
// preview, every media slot in ArchetypeRenderer). Was inlined as `/\.(mp4|webm|ogg)$/i` in ~10
// separate places — missing common formats like .mov (the default on iPhone) meant a video with
// one of those extensions fell through to <img>, which can't play video data and just renders a
// broken-image icon. Centralized so every call site stays in sync going forward.
const VIDEO_EXTENSION_PATTERN = /\.(mp4|webm|ogg|mov|m4v)$/i;

export function isVideoUrl(url: string | undefined | null): boolean {
  return !!url && VIDEO_EXTENSION_PATTERN.test(url);
}
