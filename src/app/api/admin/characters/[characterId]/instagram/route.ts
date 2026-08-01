import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { authorizeCharacterRequest } from '@/utils/creativeStudioScope';

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const MIN_PHOTOS_FOR_LORA = 10;
const MAX_PHOTOS_TO_FETCH = 50;

interface ApifyPost {
  displayUrl?: string;
  images?: Array<{ url: string }>;
  timestamp?: string;
  type?: string;
  locationName?: string;
  ownerUsername?: string;
}

interface ApifyProfile {
  biography?: string;
  username?: string;
  postsCount?: number;
  isPrivate?: boolean;
  profilePicUrl?: string;
  latestPosts?: ApifyPost[];
}

/**
 * POST /api/admin/characters/[characterId]/instagram
 *
 * Adım 1 — Profil bilgisi + Bio doğrulama
 * body: { action: 'check-bio', username: string, verificationCode: string }
 * → Bio'da kod var mı? + profil bilgisi + post sayısı döner
 *
 * Adım 2 — Postları çek
 * body: { action: 'fetch-posts', username: string }
 * → Son MAX_PHOTOS_TO_FETCH postun görsellerini döner
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ characterId: string }> },
) {
  const { characterId } = await params;
  const auth = await authorizeCharacterRequest(characterId);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!APIFY_TOKEN) {
    return NextResponse.json(
      { error: 'Sunucuda APIFY_API_TOKEN ayarlı değil.' },
      { status: 500 },
    );
  }

  const body = await req.json() as {
    action: 'check-bio' | 'fetch-posts' | 'save-photos';
    username?: string;
    verificationCode?: string;
    urls?: string[];
  };

  const { action, username, verificationCode, urls } = body;

  if (action === 'save-photos') {
    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json({ error: 'URL listesi gerekli.' }, { status: 400 });
    }

    const savedShots = [];
    for (const url of urls) {
      try {
        const imageRes = await fetch(url);
        if (!imageRes.ok) continue;
        const bytes = Buffer.from(await imageRes.arrayBuffer());

        const objectPath = `characters/${characterId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        const { error: uploadError } = await supabaseAdmin.storage
          .from('media')
          .upload(objectPath, bytes, { contentType: 'image/jpeg', cacheControl: '31536000' });
        
        if (uploadError) {
          console.error('[instagram] upload error', uploadError);
          continue;
        }

        const { data: { publicUrl } } = supabaseAdmin.storage.from('media').getPublicUrl(objectPath);

        const { data: shot } = await supabaseAdmin
          .from('character_shots')
          .insert({
            character_id: characterId,
            business_id: auth.mode === 'business' ? auth.business.id : null,
            image_url: publicUrl,
            is_canon: false, // Default false, they are for LoRA
            similarity_score: 10, // Give them a perfect score so they are used for LoRA
            prompt: 'Instagram import',
            model: 'instagram',
          })
          .select()
          .single();

        if (shot) savedShots.push(shot);
      } catch (e) {
        console.error('[instagram] save error for url', url, e);
      }
    }

    return NextResponse.json({ shots: savedShots });
  }

  if (!username?.trim()) {
    return NextResponse.json({ error: 'Instagram kullanıcı adı gerekli.' }, { status: 400 });
  }

  const cleanUsername = username.trim().replace(/^@/, '').replace(/^https?:\/\/(?:www\.)?instagram\.com\//, '').replace(/\/$/, '');

  // Apify instagram-profile-scraper → profil bilgisi + son postlar
  const apifyRes = await fetch(
    `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=60`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernames: [cleanUsername] }),
    },
  );

  if (!apifyRes.ok) {
    const txt = await apifyRes.text().catch(() => '');
    console.error('[instagram] apify error', apifyRes.status, txt);
    return NextResponse.json(
      { error: `Instagram verisi alınamadı (${apifyRes.status}). Biraz bekleyip tekrar dene.` },
      { status: 502 },
    );
  }

  const profiles = await apifyRes.json() as ApifyProfile[];
  if (!Array.isArray(profiles) || profiles.length === 0) {
    return NextResponse.json(
      { error: 'Instagram profili bulunamadı. Kullanıcı adını kontrol et.' },
      { status: 404 },
    );
  }

  const profile = profiles[0];

  if (profile.isPrivate) {
    return NextResponse.json({
      error: 'Bu profil gizli. Lütfen profili geçici olarak herkese açık yap veya manuel fotoğraf yükleme seçeneğini kullan.',
      isPrivate: true,
    }, { status: 400 });
  }

  // ── Adım 1: Bio doğrulama ──
  if (action === 'check-bio') {
    if (!verificationCode) {
      return NextResponse.json({ error: 'Doğrulama kodu gerekli.' }, { status: 400 });
    }

    const bio = profile.biography ?? '';
    const verified = bio.includes(verificationCode);

    return NextResponse.json({
      verified,
      bio,
      username: profile.username,
      postsCount: profile.postsCount ?? 0,
      profilePicUrl: profile.profilePicUrl,
    });
  }

  // ── Adım 2: Postları çek ──
  if (action === 'fetch-posts') {
    const posts = profile.latestPosts ?? [];

    // Son 18 ayın postlarını filtrele
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 18);

    const filtered = posts
      .filter((p) => {
        if (!p.timestamp) return true; // timestamp yoksa dahil et
        return new Date(p.timestamp) >= cutoff;
      })
      .slice(0, MAX_PHOTOS_TO_FETCH);

    // Her posttan görsel URL'i çıkar
    const photoItems: Array<{
      url: string;
      timestamp: string | null;
      postType: string;
    }> = [];

    for (const post of filtered) {
      // Çoklu görsel içeren postlar
      if (post.images && post.images.length > 0) {
        for (const img of post.images) {
          if (img.url) {
            photoItems.push({
              url: img.url,
              timestamp: post.timestamp ?? null,
              postType: post.type ?? 'image',
            });
          }
        }
      } else if (post.displayUrl) {
        photoItems.push({
          url: post.displayUrl,
          timestamp: post.timestamp ?? null,
          postType: post.type ?? 'image',
        });
      }
    }

    // Supabase'e bu kullanıcı adını kaydet (hangi IG'den çekildiğini takip için)
    await supabaseAdmin
      .from('character_profiles')
      .upsert(
        { id: characterId, instagram_username: cleanUsername } as Record<string, unknown>,
        { onConflict: 'id' },
      )
      .select()
      .maybeSingle();

    return NextResponse.json({
      photos: photoItems,
      totalFound: photoItems.length,
      needsMore: photoItems.length < MIN_PHOTOS_FOR_LORA,
      minRequired: MIN_PHOTOS_FOR_LORA,
    });
  }

  return NextResponse.json({ error: 'Geçersiz action.' }, { status: 400 });
}
