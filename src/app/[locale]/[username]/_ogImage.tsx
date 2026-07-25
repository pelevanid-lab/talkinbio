import { ImageResponse } from 'next/og';

export const OG_IMAGE_SIZE = { width: 1200, height: 630 };

const BRAND_BG = '#14231F';
const BRAND_ACCENT = '#FF6A5C';
const BRAND_MUTED = '#8A9490';

export async function renderProfileOgImage(username: string) {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: business } = await supabase
    .from('businesses')
    .select('name, category, theme')
    .eq('username', username)
    .single();

  const accent = business?.theme?.colors?.primary || BRAND_ACCENT;
  const name = business?.name || 'Talkinbio';
  const category = business?.category || '';

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
            backgroundColor: accent,
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
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: '#FFFFFF',
              lineHeight: 1.15,
              display: 'flex',
            }}
          >
            {name}
          </div>
          {category ? (
            <div style={{ fontSize: 30, color: BRAND_MUTED, display: 'flex' }}>{category}</div>
          ) : null}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 28, color: accent, fontWeight: 700, display: 'flex' }}>Talkinbio</div>
          <div style={{ fontSize: 26, color: BRAND_MUTED, display: 'flex' }}>Stop linking. Start talking.</div>
        </div>
      </div>
    ),
    { ...OG_IMAGE_SIZE }
  );
}
