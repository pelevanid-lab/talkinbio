// Supabase Storage'ın public object URL'lerini, aynı storage'ın gömülü resim
// dönüştürme (image transform) endpoint'ine çeviren yardımcı — küçük bir
// thumbnail için tam çözünürlüklü orijinali indirmek yerine (bkz. Ana sayfa
// menü listesindeki 46x46px ikonlar 6MB'a kadar orijinal indiriyordu),
// sunucu tarafında küçültülmüş bir versiyon ister.
//
// Sadece `.../storage/v1/object/public/...` deseniyle eşleşen URL'leri
// dönüştürür; eşleşmezse (harici URL, zaten transform edilmiş, ya da
// tanınmayan bir host) dokunmadan aynen döner — hatalı bir dönüşüm kırık
// resimden çok daha kötü olur.
export function supabaseThumbnailUrl(
  url: string | null | undefined,
  opts: { width: number; height?: number; quality?: number } = { width: 96 }
): string | null {
  if (!url) return url ?? null;
  const marker = '/storage/v1/object/public/';
  const idx = url.indexOf(marker);
  if (idx === -1) return url;

  const { width, height = width, quality = 70 } = opts;
  const rendered = url.slice(0, idx) + '/storage/v1/render/image/public/' + url.slice(idx + marker.length);
  const separator = rendered.includes('?') ? '&' : '?';
  return `${rendered}${separator}width=${width}&height=${height}&resize=cover&quality=${quality}`;
}
