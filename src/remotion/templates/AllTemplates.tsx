import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Img } from 'remotion';
import { ThemeWrapper } from '../components/ThemeWrapper';
import { BaseTemplateProps } from '../components/BaseTemplateProps';

// --- TEMPLATE 1: Kinetik (Minimal) ---
export const Template1: React.FC<BaseTemplateProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const y = spring({ frame, fps, config: { damping: 12 } });
  const opacity = interpolate(frame, [0, 15], [0, 1]);

  return (
    <ThemeWrapper theme={props.theme}>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <h1 style={{ fontSize: 60, opacity, transform: `translateY(${50 - y * 50}px)`, fontWeight: 'bold' }}>{props.title}</h1>
        <h2 style={{ fontSize: 40, opacity, color: 'var(--primary)', marginTop: 20 }}>{props.subtitle}</h2>
      </AbsoluteFill>
    </ThemeWrapper>
  );
};

// --- TEMPLATE 2: Resim & Kutu ---
export const Template2: React.FC<BaseTemplateProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame, fps, config: { damping: 14 } });

  return (
    <ThemeWrapper theme={props.theme}>
      <AbsoluteFill style={{ padding: 40, justifyContent: 'space-between' }}>
        {props.imageUrl && <Img src={props.imageUrl} style={{ width: '100%', height: '50%', objectFit: 'cover', borderRadius: 20, transform: `scale(${scale})` }} />}
        <div style={{ background: 'var(--primary)', padding: 30, borderRadius: 20, color: 'var(--bg)', marginTop: 20, transform: `scale(${scale})` }}>
          <h1 style={{ fontSize: 50, margin: 0 }}>{props.title}</h1>
          <p style={{ fontSize: 30, marginTop: 10 }}>{props.subtitle}</p>
        </div>
      </AbsoluteFill>
    </ThemeWrapper>
  );
};

// --- TEMPLATE 3: Dikey Bölünmüş (Split) ---
export const Template3: React.FC<BaseTemplateProps> = (props) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, 20], [0, 50], { extrapolateRight: 'clamp' });

  return (
    <ThemeWrapper theme={props.theme}>
      <AbsoluteFill style={{ flexDirection: 'row' }}>
        <div style={{ width: `${progress}%`, height: '100%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <h1 style={{ fontSize: 60, color: 'var(--bg)', whiteSpace: 'nowrap', transform: 'rotate(-90deg)' }}>{props.ctaText}</h1>
        </div>
        <div style={{ flex: 1, padding: 40, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h1 style={{ fontSize: 50 }}>{props.title}</h1>
          <h2 style={{ fontSize: 30, color: 'var(--secondary)' }}>{props.subtitle}</h2>
        </div>
      </AbsoluteFill>
    </ThemeWrapper>
  );
};

// --- TEMPLATE 4: Glitch Vibe ---
export const Template4: React.FC<BaseTemplateProps> = (props) => {
  const frame = useCurrentFrame();
  const skew = frame % 10 < 2 ? 10 : 0;
  
  return (
    <ThemeWrapper theme={props.theme}>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', transform: `skewX(${skew}deg)` }}>
        <h1 style={{ fontSize: 80, color: 'var(--primary)', textShadow: '4px 4px 0 var(--secondary)' }}>{props.title}</h1>
        <h2 style={{ fontSize: 40 }}>{props.subtitle}</h2>
      </AbsoluteFill>
    </ThemeWrapper>
  );
};

// --- TEMPLATE 5: Elegant Fade ---
export const Template5: React.FC<BaseTemplateProps> = (props) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30], [0, 1]);
  const blur = interpolate(frame, [0, 30], [10, 0]);

  return (
    <ThemeWrapper theme={props.theme}>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', filter: `blur(${blur}px)`, opacity }}>
        <h1 style={{ fontSize: 50, fontWeight: 'normal', letterSpacing: 5 }}>{props.title}</h1>
        <div style={{ width: 100, height: 2, background: 'var(--primary)', margin: '30px 0' }} />
        <p style={{ fontSize: 30, color: 'var(--secondary)' }}>{props.subtitle}</p>
      </AbsoluteFill>
    </ThemeWrapper>
  );
};

// --- TEMPLATE 6: Bildirim (Notification) ---
export const Template6: React.FC<BaseTemplateProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const y = spring({ frame, fps, config: { damping: 10 } });

  return (
    <ThemeWrapper theme={props.theme}>
      <AbsoluteFill style={{ paddingTop: 100, alignItems: 'center' }}>
        <div style={{ background: 'var(--primary)', color: 'var(--bg)', padding: '20px 40px', borderRadius: 40, transform: `translateY(${50 - y * 50}px)`, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
          <h2 style={{ margin: 0, fontSize: 30 }}>🔔 {props.title}</h2>
          <p style={{ margin: 0, fontSize: 24, marginTop: 10 }}>{props.subtitle}</p>
        </div>
      </AbsoluteFill>
    </ThemeWrapper>
  );
};

// --- TEMPLATE 7: Büyük Tipografi (Stomp) ---
export const Template7: React.FC<BaseTemplateProps> = (props) => {
  const frame = useCurrentFrame();
  const scale = frame % 30 < 15 ? 1 : 1.1;

  return (
    <ThemeWrapper theme={props.theme}>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', background: 'var(--primary)' }}>
        <h1 style={{ fontSize: 100, color: 'var(--bg)', transform: `scale(${scale})`, margin: 0, textAlign: 'center', lineHeight: 1 }}>
          {props.title.toUpperCase()}<br/>{props.subtitle.toUpperCase()}
        </h1>
      </AbsoluteFill>
    </ThemeWrapper>
  );
};

// --- TEMPLATE 8: Profil & Alıntı ---
export const Template8: React.FC<BaseTemplateProps> = (props) => {
  return (
    <ThemeWrapper theme={props.theme}>
      <AbsoluteFill style={{ padding: 40, justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {props.imageUrl && <Img src={props.imageUrl} style={{ width: 120, height: 120, borderRadius: 60 }} />}
          <h2 style={{ fontSize: 40 }}>{props.title}</h2>
        </div>
        <h1 style={{ fontSize: 50, color: 'var(--primary)', marginTop: 40 }}>"{props.subtitle}"</h1>
      </AbsoluteFill>
    </ThemeWrapper>
  );
};

// --- TEMPLATE 9: Ürün Sergileme (Product) ---
export const Template9: React.FC<BaseTemplateProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slide = spring({ frame, fps, from: 1000, to: 0 });

  return (
    <ThemeWrapper theme={props.theme}>
      <AbsoluteFill style={{ justifyContent: 'flex-end' }}>
        <div style={{ height: '50%', background: 'var(--primary)' }} />
        <AbsoluteFill style={{ padding: 40, justifyContent: 'center', alignItems: 'center' }}>
          {props.imageUrl && <Img src={props.imageUrl} style={{ height: 400, borderRadius: 20, transform: `translateY(${slide}px)`, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }} />}
          <div style={{ background: 'var(--bg)', padding: '20px 40px', borderRadius: 30, marginTop: 30, transform: `translateY(${slide}px)` }}>
            <h1 style={{ fontSize: 40, margin: 0 }}>{props.title}</h1>
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
    </ThemeWrapper>
  );
};

// --- TEMPLATE 10: Neon Cyberpunk ---
export const Template10: React.FC<BaseTemplateProps> = (props) => {
  const frame = useCurrentFrame();
  const opacity = Math.sin(frame / 5) * 0.5 + 0.5;

  return (
    <ThemeWrapper theme={props.theme}>
      <AbsoluteFill style={{ background: '#0a0a0a', justifyContent: 'center', alignItems: 'center' }}>
        <h1 style={{ fontSize: 70, color: '#fff', textShadow: `0 0 20px var(--primary), 0 0 40px var(--primary)`, opacity }}>
          {props.title}
        </h1>
        <p style={{ fontSize: 30, color: 'var(--secondary)', marginTop: 20 }}>{props.subtitle}</p>
      </AbsoluteFill>
    </ThemeWrapper>
  );
};
