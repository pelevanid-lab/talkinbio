import { Link } from '@/i18n/routing';
import styles from './editorial.module.css';

export default function EditorialNav() {
  return (
    <header className={styles.editorialNav}>
      <div className={styles.navInner}>
        <Link href="/" className={styles.wordmark}>talkinbio</Link>
        <nav aria-label="Blog navigasyonu">
          <Link href="/#ilk-temas">İlk Temas</Link>
          <Link href="/#konular">Konular</Link>
          <Link href="/#modeller">Modeller</Link>
          <Link href="/explore/search-and-discovery">Vaka Analizleri</Link>
          <Link href="/#talkinbio">Talkinbio</Link>
        </nav>
      </div>
    </header>
  );
}
