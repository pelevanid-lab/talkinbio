import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { TalkinbioReels } from './TalkinbioReels';
import * as T from './templates/AllTemplates';

export const RemotionRoot: React.FC = () => {
  const defaultProps = {
    theme: {
      primaryColor: '#FF6A5C',
      secondaryColor: '#2B6F5C',
      bgColor: '#F4F2ED',
      textColor: '#14231F',
      fontFamily: 'Bricolage Grotesque, sans-serif',
    },
    title: 'TALKIN.BIO',
    subtitle: 'Senin çağın başlıyor',
    ctaText: 'Hemen Başla',
    imageUrl: '/story1.png',
  };

  return (
    <>
      <Composition id="TalkinbioReels" component={TalkinbioReels as React.FC<any>} durationInFrames={18 * 60} fps={60} width={400} height={711} defaultProps={{ yearText: '2026', eraText: 'AI Çağı', eraTextAfter: 'Senin Çağın', ctaText: 'Senin\nçağın başlıyor.', ctaTextAfter: 'Senin talkinbio\nçağın başlıyor.', buttonText: 'talkinbio' }} />
      <Composition id="Template1" component={T.Template1 as React.FC<any>} durationInFrames={10 * 60} fps={60} width={400} height={711} defaultProps={defaultProps} />
      <Composition id="Template2" component={T.Template2 as React.FC<any>} durationInFrames={10 * 60} fps={60} width={400} height={711} defaultProps={defaultProps} />
      <Composition id="Template3" component={T.Template3 as React.FC<any>} durationInFrames={10 * 60} fps={60} width={400} height={711} defaultProps={defaultProps} />
      <Composition id="Template4" component={T.Template4 as React.FC<any>} durationInFrames={10 * 60} fps={60} width={400} height={711} defaultProps={defaultProps} />
      <Composition id="Template5" component={T.Template5 as React.FC<any>} durationInFrames={10 * 60} fps={60} width={400} height={711} defaultProps={defaultProps} />
      <Composition id="Template6" component={T.Template6 as React.FC<any>} durationInFrames={10 * 60} fps={60} width={400} height={711} defaultProps={defaultProps} />
      <Composition id="Template7" component={T.Template7 as React.FC<any>} durationInFrames={10 * 60} fps={60} width={400} height={711} defaultProps={defaultProps} />
      <Composition id="Template8" component={T.Template8 as React.FC<any>} durationInFrames={10 * 60} fps={60} width={400} height={711} defaultProps={defaultProps} />
      <Composition id="Template9" component={T.Template9 as React.FC<any>} durationInFrames={10 * 60} fps={60} width={400} height={711} defaultProps={defaultProps} />
      <Composition id="Template10" component={T.Template10 as React.FC<any>} durationInFrames={10 * 60} fps={60} width={400} height={711} defaultProps={defaultProps} />
    </>
  );
};

registerRoot(RemotionRoot);
