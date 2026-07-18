// Faz 4.1 kötüye kullanım koruması eşikleri. Sert limitler (oturum açma hızı,
// flood, günlük tavan) gerçek bir ziyaretçinin pratikte hiç çarpmayacağı kadar
// cömert tutulur; asıl amaç kötü niyetli 3. tarafları LLM çağırmadan durdurmak.

export const SAULE_MAX_INPUT_CHARS = 2000;
export const BEIWE_MAX_INPUT_CHARS = 50000;

// Oturum içi mesaj tavanı (soft) — dolunca sert blokaj değil, "yeni sohbet" daveti.
export const SESSION_MESSAGE_CAP = 50;

// Oturum açma hızı sınırı (asıl kalkan) — ziyaretçi başına saatte kaç yeni oturum.
export const SESSION_OPEN_RATE_LIMIT = 4;
export const SESSION_OPEN_RATE_WINDOW_MS = 60 * 60 * 1000;

// Kısa vadeli hız sınırı — script'lenmiş flood'a karşı.
export const SHORT_TERM_FLOOD_LIMIT = 20;
export const SHORT_TERM_FLOOD_WINDOW_MS = 10 * 60 * 1000;

// İşletme başına günlük toplam tavan — sahibin faturasını korur.
// Faz 4.3'te plana göre kalibre edilecek yer tutucu değer.
export const BUSINESS_DAILY_MESSAGE_CAP = 1000;
