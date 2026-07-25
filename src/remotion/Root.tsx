import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { TalkinbioReels } from './TalkinbioReels';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="TalkinbioReels"
        component={TalkinbioReels}
        durationInFrames={18 * 60} // 18 seconds @ 60fps
        fps={60}
        width={400}
        height={711}
        defaultProps={{
          yearText: '2026',
          eraText: 'AI Çağı',
          eraTextAfter: 'Senin Çağın',
          ctaText: 'Senin\nçağın başlıyor.',
          ctaTextAfter: 'Senin talkinbio\nçağın başlıyor.',
          buttonText: 'talkinbio',
        }}
      />
    </>
  );
};

registerRoot(RemotionRoot);
