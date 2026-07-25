import { ImageResponse } from 'next/og';
import { avatarFromBlocks } from '@/utils/avatarFromBlocks';

export const OG_IMAGE_SIZE = { width: 1200, height: 630 };

const BRAND_BG = '#14231F';
const BRAND_ACCENT = '#FF6A5C';
const BRAND_MUTED = '#8A9490';

// og:image crawlers (Instagram/WhatsApp/Telegram) fetch this route directly and don't send
// cookies or run JS, so the avatar photo must be inlined as a data URI rather than referenced
// by its Supabase Storage URL — satori/resvg does render remote <img src> URLs, but inlining
// avoids depending on that fetch succeeding inside the image-generation sandbox.
async function fetchAvatarDataUri(url: string | undefined): Promise<string | undefined> {
  if (!url || url.toLowerCase().endsWith('.svg')) return undefined;
  try {
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const buf = await res.arrayBuffer();
    return `data:${contentType};base64,${Buffer.from(buf).toString('base64')}`;
  } catch {
    return undefined;
  }
}

export async function renderProfileOgImage(username: string) {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, category, theme')
    .eq('username', username)
    .single();

  const accent = business?.theme?.colors?.primary || BRAND_ACCENT;
  const name = business?.name || 'Talkinbio';
  const category = business?.category || '';

  let avatarDataUri: string | undefined;
  if (business?.id) {
    const { data: blocks } = await supabase
      .from('blocks')
      .select('type, content')
      .eq('business_id', business.id);
    avatarDataUri = await fetchAvatarDataUri(avatarFromBlocks(blocks));
  }

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

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 48 }}>
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
          {avatarDataUri ? (
            <div
              style={{
                display: 'flex',
                width: 220,
                height: 220,
                borderRadius: 999,
                overflow: 'hidden',
                border: `6px solid ${accent}`,
                flexShrink: 0,
              }}
            >
              <img src={avatarDataUri} width={220} height={220} style={{ objectFit: 'cover' }} />
            </div>
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
