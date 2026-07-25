import React from 'react';
import { AbsoluteFill } from 'remotion';

export interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  bgColor: string;
  textColor: string;
  fontFamily: string;
}

export const ThemeWrapper: React.FC<{ theme: ThemeConfig; children: React.ReactNode }> = ({ theme, children }) => {
  return (
    <AbsoluteFill
      style={{
        '--primary': theme.primaryColor,
        '--secondary': theme.secondaryColor,
        '--bg': theme.bgColor,
        '--text': theme.textColor,
        fontFamily: theme.fontFamily,
        backgroundColor: 'var(--bg)',
        color: 'var(--text)',
      } as React.CSSProperties}
    >
      {children}
    </AbsoluteFill>
  );
};
