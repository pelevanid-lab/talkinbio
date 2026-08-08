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
  // /dashboard/studio — Planla/Düzenle/Üret hub'ı. `creativeStudio`/`contentStudio`'nun
  // yerini almıyor (onlar hâlâ kapalı/öksüz) — bu, o iki demonun bazı parçalarını
  // (Post, Studio editörü, Voice, Content) yeniden paketleyen AYRI bir yüzey.
  // AÇILDI (2026-08-08) — kurucu kararı: kalan işler (ses klonu geçişi, Planla trend
  // katmanı, Üret'in ek özellikleri, dubbing fiyat teyidi) üstüne EKLENECEK, hub'ın
  // açılmasını bloklamıyor. Kurucu prod'a almadan önce kendi localinde test edecek.
  studioHub: true,
} as const;
