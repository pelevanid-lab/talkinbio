// Tek kaynak: hangi özellik prod'da aktif. Yeni/deneysel özellikler burada
// false olarak eklenir — kod dursun, arayüzden (nav + doğrudan URL) erişilemesin.
// Çekirdek özellikler (AI editör/Saule Studio, ziyaretçi interaktif sayfası) bu
// dosyaya girmiyor — zaten her zaman açık, gereksiz kill-switch kod karmaşası
// yaratmasın diye.
export const FEATURES = {
  // Karakter foto/video/ses üretim stüdyosu (cast/motion/podcast/post/studio/twin/voice).
  // Daha önce DashboardShell'de bir isLocalhost hack'iyle yarı-donuk bırakılmıştı.
  creativeStudio: false,
  // /dashboard/content — navdan zaten bağlı değil, öksüz sayfa.
  contentStudio: false,
  // front-desk'te "yakında" etiketli, OAuth bağlantısı prod'da kapalı tutulur.
  instagramIntegration: false,
} as const;
