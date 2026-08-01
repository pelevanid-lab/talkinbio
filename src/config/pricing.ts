// Kredi ↔ dolar dönüşümü — kurucu onayı: 100 kredi = $5 (bkz. `EXTRA_PACK` içinde
// `src/config/plans.ts`), yani 1 kredi = $0.05.
export const CREDIT_VALUE_USD = 0.05;

/**
 * Bir AI işleminin ham dolar maliyetini, en az %100 kâr marjıyla (fiyat ≥ 2×maliyet)
 * satacağımız kredi miktarına çevirir. Sonuç her zaman yukarı yuvarlanır — küsuratlı
 * kredi göstermemek ve marjın hiçbir zaman 2 katın altına düşmemesini garanti etmek için.
 */
export function creditsForCost(costUsd: number, marginMultiplier = 2.5): number {
  return Math.max(1, Math.ceil((costUsd * marginMultiplier) / CREDIT_VALUE_USD));
}
