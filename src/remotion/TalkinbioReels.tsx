import React from 'react';
import { AbsoluteFill, staticFile } from 'remotion';
import styles from './TalkinbioReels.module.css';

export interface TalkinbioReelsProps {
  yearText: string;
  eraText: string;
  eraTextAfter: string;
  ctaText: string;
  ctaTextAfter: string;
  buttonText: string;
}

export const TalkinbioReels: React.FC<TalkinbioReelsProps> = ({
  yearText,
  eraText,
  eraTextAfter,
  ctaText,
  ctaTextAfter,
  buttonText,
}) => {
  return (
    <AbsoluteFill className={styles.container}>
      {/* SCENE 1: Kinetic Typo */}
      <div className={`${styles.scene} ${styles.scene1}`}>
        <div className={styles.s1Content}>
          <div className={styles.s1TextBefore}>
            <span className={styles.s1Line1}>{yearText}</span>
            <span className={styles.s1Line2}>{eraText}</span>
          </div>
          <div className={styles.s1TextAfter}>
            <span className={styles.s1Line1After}>{yearText}</span>
            <span className={styles.s1Line2After}>{eraTextAfter}</span>
          </div>
        </div>
      </div>

      {/* SCENE 2: Story Images */}
      <div className={`${styles.scene} ${styles.scene2}`}>
        <img src={staticFile('story1.png')} className={`${styles.storyImg} ${styles.story1}`} alt="Story 1" />
        <img src={staticFile('story2.png')} className={`${styles.storyImg} ${styles.story2}`} alt="Story 2" />
        <img src={staticFile('story3.png')} className={`${styles.storyImg} ${styles.story3}`} alt="Story 3" />
      </div>

      {/* SCENE 3: Brand Reveal */}
      <div className={`${styles.scene} ${styles.scene3}`}>
        <div className={styles.s3Content}>
          <div className={styles.headlineWrapper}>
            <div className={styles.textBefore}>{ctaText}</div>
            <div className={styles.textAfter}>{ctaTextAfter}</div>
          </div>
          <div className={styles.ctaPill}>{buttonText}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
