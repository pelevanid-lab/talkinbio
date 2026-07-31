// Faz 4.3: ödeme sağlayıcı Faz H.1'i bekliyor — bu sabitler roadmap'in kredi
// tablosunu şeffaf göstermek için /pricing ve /dashboard/billing arasında paylaşılır.
export const PLANS = [
  { id: 'free', name: 'Free', price: 0, credits: 50 },
  { id: 'starter', name: 'Starter', price: 20, credits: 400 },
  { id: 'pro', name: 'Pro', price: 90, credits: 2000 },
  { id: 'business', name: 'Business', price: 400, credits: 10000 },
] as const;

export const EXTRA_PACK = { price: 5, credits: 100 };
export const TEST_PACK = { price: 0.1, credits: 10 };
