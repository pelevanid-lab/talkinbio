// Shopier abonelik desteklemedigi icin Talkinbio ekonomisi "suresi bitmeyen kredi bakiyesi"
// uzerine kurulu. Ana paketlerin kredi basina fiyatini korurken ek kredi paketi premium
// top-up olarak fiyatlanir; ucretli paketlerde kredi basi fiyat creditsForCost() marj
// hesabinin altina dusmez.
export const PLANS = [
  { id: 'free', name: 'Sign up free', price: 0, credits: 200, trialGrant: true },
  { id: 'starter', name: 'Starter', price: 15, credits: 2000 },
  { id: 'pro', name: 'Pro', price: 40, credits: 6000 },
  { id: 'business', name: 'Business', price: 90, credits: 15000 },
] as const;

export const EXTRA_PACK = { id: 'extra', name: 'Ek Kredi', price: 8, credits: 1000 } as const;
