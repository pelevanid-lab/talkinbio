import { Coins } from 'lucide-react';

// Faz 4.3 ROADMAP taahhüdü: "kredi tüketimi dashboard'da şeffaf gösterilir" —
// bu bileşen sahibin panelinde bakiyeyi görünür kılar, /pricing'e yükseltme
// çağrısı yapar. İstisna hesaplar (1 milyar kredi) de dahil gerçek sayı
// gösterilir (2026-07-19, Enes notu) — düşümün gerçekten çalıştığını test
// edebilmek için "Sınırsız" yerine görünür bir sayı gerekiyor.
export default function CreditBadge({ balance }: { balance: number }) {
  return (
    <a
      href="/pricing"
      className="text-sm text-[#14231F] font-medium bg-[#F4F2ED] px-4 py-2 rounded-full hover:bg-[rgba(20,35,31,0.08)] transition whitespace-nowrap flex items-center gap-1.5"
      title="Kredi bakiyeniz — plan ve paketler için tıklayın"
    >
      <Coins className="w-4 h-4" />
      {balance.toLocaleString('tr-TR')} kredi
    </a>
  );
}
