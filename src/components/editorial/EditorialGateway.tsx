import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import { Link } from '@/i18n/routing';
import type { RoutingLocale } from '@/i18n/locales';
import { editorialLandingCopy, editorialLandingPaths } from './editorialLandingData';
import { IMMERSIVE_VIDEO } from '@/config/immersiveMedia';
import styles from './editorialGateway.module.css';

export default function EditorialGateway({ locale }: { locale: RoutingLocale }) {
  const copy = editorialLandingCopy[locale];
  const links = [editorialLandingPaths.holistic[locale], editorialLandingPaths.cases[locale], editorialLandingPaths.library[locale]];

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.logo} aria-label="Talkinbio home">talkinbio</Link>
        <div className={styles.intro}>
          <span>{copy.eyebrow}</span>
          <p>{copy.title}</p>
        </div>
      </header>

      <nav className={styles.panels} aria-label={copy.sectionsLabel}>
        {copy.panels.map((panel, index) => (
          <Link key={panel.number} href={links[index]} className={styles.panel} data-panel={index + 1}>
            {index === 0 ? (
              <video className={styles.media} src={IMMERSIVE_VIDEO.opening} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" />
            ) : index === 1 ? (
              <span className={styles.thumbnailMosaic} aria-hidden="true">
                {Array.from({ length: 10 }, (_, thumbnailIndex) => <i key={thumbnailIndex} data-thumbnail={thumbnailIndex + 1} />)}
              </span>
            ) : (
              <Image
                className={styles.media}
                src="/conversion-nature-backdrop.png"
                alt=""
                fill
                priority
                sizes="(max-width: 760px) 100vw, 34vw"
              />
            )}
            <span className={styles.scrim} aria-hidden="true" />
            <span className={styles.number}>{panel.number}</span>
            <span className={styles.copy}>
              <small>{panel.kicker}</small>
              <strong>{panel.title}</strong>
              <span>{panel.description}</span>
            </span>
            <span className={styles.action}>
              <span>{copy.open}</span>
              <ArrowUpRight aria-hidden="true" size={19} />
            </span>
          </Link>
        ))}
      </nav>
    </main>
  );
}
