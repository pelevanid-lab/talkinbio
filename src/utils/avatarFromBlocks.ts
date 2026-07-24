import { isVideoUrl } from './mediaType';

// ProfileHeader'ın avatarı ayrı bir foto yükleme alanı değil — işletmenin "Hakkında" (about)
// bloğunda zaten kullandığı fotoğraftan otomatik türetilir. İlk about bloğunun content.mediaUrl'ü
// kullanılır; video ise (avatar için uygun değil) atlanır. Foto bulunamazsa undefined döner ve
// ProfileHeader baş harf placeholder'ına düşer.
export function avatarFromBlocks(blocks: any[] | null | undefined): string | undefined {
  if (!blocks) return undefined;
  const about = blocks.find((b) => b?.type === 'about' && b?.content?.mediaUrl);
  const url = about?.content?.mediaUrl;
  if (!url || isVideoUrl(url)) return undefined;
  return url;
}
