import { ImageResponse } from 'next/og';

export const alt = 'Readings on Holistic Marketing';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const PAPER = '#F3EADC';
const PAPER_DEEP = '#E6D8C4';
const INK = '#151716';
const INK_SOFT = '#4D5149';
const ORANGE = '#D86F1F';
const OLIVE = '#73785A';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: PAPER,
          backgroundImage: `linear-gradient(135deg, rgba(216, 111, 31, 0.14), transparent 42%), linear-gradient(180deg, ${PAPER} 0%, ${PAPER_DEEP} 100%)`,
          padding: '58px 70px',
          fontFamily: 'sans-serif',
          color: INK,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', fontSize: 34, fontWeight: 900, letterSpacing: -1 }}>
            talkinbio
          </div>
          <div style={{ display: 'flex', color: ORANGE, fontSize: 18, fontWeight: 800, letterSpacing: 3 }}>
            MARKETING READINGS
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 900 }}>
          <div style={{ fontSize: 86, fontWeight: 900, color: INK, lineHeight: 0.96, display: 'flex', letterSpacing: -2 }}>
            Readings on Holistic Marketing
          </div>
          <div style={{ fontSize: 32, color: INK_SOFT, display: 'flex', lineHeight: 1.28, maxWidth: 790 }}>
            A library of articles and ad reviews on market insight, value design, and growth.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', gap: 14, color: OLIVE, fontSize: 24, fontWeight: 800 }}>
            <span>Articles</span>
            <span style={{ color: ORANGE }}>·</span>
            <span>Ad reviews</span>
            <span style={{ color: ORANGE }}>·</span>
            <span>Library</span>
          </div>
          <div style={{ display: 'flex', fontSize: 24, color: INK_SOFT }}>talkinbio.com</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
