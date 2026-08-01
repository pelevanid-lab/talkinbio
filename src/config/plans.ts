// Shopier abonelik desteklemedigi icin Talkinbio ekonomisi "suresi bitmeyen kredi bakiyesi"
// uzerine kurulu. Ana paketlerin kredi basina fiyatini korurken ek kredi paketi premium
// top-up olarak fiyatlanir; ucretli paketlerde kredi basi fiyat creditsForCost() marj
// hesabinin altina dusmez.
export const PLANS = [
  { id: 'free', name: 'Deneme', price: 0, credits: 20, trialGrant: true },
  { id: 'starter', name: 'Starter', price: 15, credits: 200 },
  { id: 'pro', name: 'Pro', price: 40, credits: 600 },
  { id: 'business', name: 'Business', price: 90, credits: 1500 },
] as const;

export const EXTRA_PACK = { id: 'extra', name: 'Ek Kredi', price: 8, credits: 100 } as const;
