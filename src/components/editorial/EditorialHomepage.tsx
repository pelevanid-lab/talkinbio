import { HolisticDesktopHero, HolisticMobileHero } from '@/components/home/HomepageSections';
import { ArrowLeft } from 'lucide-react';
import { Link } from '@/i18n/routing';
import styles from '@/components/home/home.module.css';

export default function EditorialHomepage() {
  return (
    <main className={styles.main}>
      <Link href="/" className={styles.editorialHomeLink} aria-label="Back to Talkinbio home">
        <ArrowLeft aria-hidden="true" size={14} />
        <span>talkinbio</span>
      </Link>
      <HolisticDesktopHero />
      <HolisticMobileHero />
    </main>
  );
}
