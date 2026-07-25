import { ImageResponse } from 'next/og';

export const alt = 'Talkinbio';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const BRAND_BG = '#14231F';
const BRAND_ACCENT = '#FF6A5C';
const BRAND_MUTED = '#8A9490';

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
          backgroundColor: BRAND_BG,
          padding: '80px',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            backgroundColor: BRAND_ACCENT,
            borderRadius: 999,
            padding: '20px 32px',
            alignSelf: 'flex-start',
          }}
        >
          <div style={{ width: 16, height: 16, borderRadius: 999, backgroundColor: BRAND_BG, display: 'flex' }} />
          <div style={{ width: 16, height: 16, borderRadius: 999, backgroundColor: BRAND_BG, display: 'flex' }} />
          <div style={{ width: 16, height: 16, borderRadius: 999, backgroundColor: BRAND_BG, display: 'flex' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 72, fontWeight: 700, color: '#FFFFFF', lineHeight: 1.15, display: 'flex' }}>
            Talkinbio
          </div>
          <div style={{ fontSize: 32, color: BRAND_MUTED, display: 'flex' }}>
            Stop linking. Start talking.
          </div>
        </div>

        <div style={{ display: 'flex', fontSize: 26, color: BRAND_MUTED }}>talkinbio.com</div>
      </div>
    ),
    { ...size }
  );
}
