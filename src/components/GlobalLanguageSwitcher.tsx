'use client';

import { usePathname } from '@/i18n/routing';
import LanguageSwitcher from './LanguageSwitcher';
import styles from './globalLanguageSwitcher.module.css';

const RESERVED_ROOT_PATHS = new Set([
  'ad-reviews', 'admin', 'about', 'auth', 'case-studies', 'dashboard', 'explore', 'first-contact',
  'hakkimda', 'holistic-marketing', 'holistik-pazarlama', 'ilk-temas', 'kesfet',
  'konular', 'legal', 'login', 'onboarding', 'ornek-calismalar', 'pricing', 'reklam-incelemeleri', 'register',
  'request-access', 'stakeholders', 'topics', 'updates', 'yazilar', 'articles',
]);

export default function GlobalLanguageSwitcher() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  const isPublicProfile = segments.length === 1 && !RESERVED_ROOT_PATHS.has(segments[0]);

  if (isPublicProfile) return null;

  return (
    <aside className={styles.control} aria-label="Language selection">
      <LanguageSwitcher compact scope="app" labels="codes" />
    </aside>
  );
}
