// Shopier abonelik desteklemedigi icin Talkinbio ekonomisi "suresi bitmeyen kredi bakiyesi"
// uzerine kurulu. 100 kredi = $5 (CREDIT_VALUE_USD = $0.05) kabulunu koruyoruz; ucretli
// paketlerde kredi basi fiyat bu degerin altina dusmez ki creditsForCost() marj hesabi bozulmasin.
export const PLANS = [
  { id: 'free', name: 'Deneme', price: 0, credits: 20, trialGrant: true },
  { id: 'starter', name: 'Starter', price: 15, credits: 200 },
  { id: 'pro', name: 'Pro', price: 40, credits: 600 },
  { id: 'business', name: 'Business', price: 90, credits: 1500 },
] as const;

export const EXTRA_PACK = { id: 'extra', name: 'Ek Kredi', price: 5, credits: 100 } as const;
