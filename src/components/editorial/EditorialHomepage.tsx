import { HolisticDesktopHero, HolisticMobileHero } from '@/components/home/HomepageSections';
import styles from '@/components/home/home.module.css';

export default function EditorialHomepage() {
  return (
    <main className={styles.main}>
      <HolisticDesktopHero />
      <HolisticMobileHero />
    </main>
  );
}
