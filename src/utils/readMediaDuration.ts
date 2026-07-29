/**
 * Dosyanın süresini tarayıcıda ölçer; okunamazsa null döner (sunucu yine de sınırı uygular).
 *
 * `PodcastRoom.tsx` ve `MotionSection.tsx`'te (eski, dondurulmuş Karakter Odası) aynı
 * fonksiyonun birebir kopyaları var — üçüncü bir kopya eklemek yerine burada paylaşılan
 * bir sürüm var. Eskileri dondurma kuralı gereği değiştirmiyoruz.
 */
export function readMediaDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement('video');
    el.preload = 'metadata';
    const done = (value: number | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    el.onloadedmetadata = () => done(Number.isFinite(el.duration) ? el.duration : null);
    el.onerror = () => done(null);
    el.src = url;
  });
}
