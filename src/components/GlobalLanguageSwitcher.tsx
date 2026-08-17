'use client';

import LanguageSwitcher from './LanguageSwitcher';
import styles from './globalLanguageSwitcher.module.css';

export default function GlobalLanguageSwitcher() {
  return (
    <aside className={styles.control} aria-label="Language selection">
      <LanguageSwitcher compact scope="app" labels="codes" />
    </aside>
  );
}
