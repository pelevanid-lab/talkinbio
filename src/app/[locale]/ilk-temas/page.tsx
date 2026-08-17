import type { Metadata } from 'next';
import { DesktopConversionHero, MobileConversionHero } from '@/components/home/HomepageSections';
import styles from '@/components/home/home.module.css';

export const metadata: Metadata = {
  title: 'İlk Temas Noktaları | Talkinbio',
  description: 'Müşterinin markayla ilk kez karşılaştığı temas noktalarını keşfet.',
};

export default function FirstContactPage() {
  return (
    <main className={styles.main}>
      <DesktopConversionHero />
      <MobileConversionHero />
    </main>
  );
}
