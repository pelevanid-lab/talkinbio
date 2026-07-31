// Faz 4.3: ödeme sağlayıcı Faz H.1'i bekliyor — bu sabitler roadmap'in kredi
// tablosunu şeffaf göstermek için /pricing ve /dashboard/billing arasında paylaşılır.
export const PLANS = [
  { id: 'starter', name: 'Starter', price: 9, credits: 200 },
  { id: 'pro', name: 'Pro', price: 29, credits: 700 },
  { id: 'business', name: 'Business', price: 79, credits: 1800 },
] as const;

export const EXTRA_PACK = { price: 5, credits: 100 };
export const TEST_PACK = { price: 0.1, credits: 10 };
