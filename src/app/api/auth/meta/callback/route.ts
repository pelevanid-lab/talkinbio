import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // Kullanıcı iptal ettiyse veya hata olduysa
  if (error || !code) {
    return NextResponse.redirect(`${origin}/dashboard/editor?settings=assistant&meta_error=${error || 'no_code'}`);
  }

  const clientId = process.env.META_CLIENT_ID;
  const clientSecret = process.env.META_CLIENT_SECRET;
  const redirectUri = `${origin}/api/auth/meta/callback`;

  try {
    // 1. Kısa süreli token al
    const shortTokenRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${clientSecret}&code=${code}`);
    const shortTokenData = await shortTokenRes.json();

    if (shortTokenData.error) {
      console.error('Meta OAuth short token error:', shortTokenData.error);
      return NextResponse.redirect(`${origin}/dashboard/editor?settings=assistant&meta_error=token_exchange_failed`);
    }

    const shortToken = shortTokenData.access_token;

    // 2. Uzun süreli token (Long-Lived) al (60 günlük)
    const longTokenRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${shortToken}`);
    const longTokenData = await longTokenRes.json();

    if (longTokenData.error) {
      console.error('Meta OAuth long token error:', longTokenData.error);
      return NextResponse.redirect(`${origin}/dashboard/editor?settings=assistant&meta_error=long_token_failed`);
    }

    const longToken = longTokenData.access_token;

    // 3. Kullanıcının yönettiği sayfaları bul
    const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${longToken}`);
    const pagesData = await pagesRes.json();

    let pageId = null;
    let igAccountId = null;
    let igUsername = null;

    // 4. Sayfalar içinde Instagram Business hesabı bağlı olanı bul
    if (pagesData.data && pagesData.data.length > 0) {
      for (const page of pagesData.data) {
        // Page token ile bağlı IG hesabını sorgula
        const igRes = await fetch(`https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${longToken}`);
        const igData = await igRes.json();

        if (igData.instagram_business_account) {
          pageId = page.id;
          igAccountId = igData.instagram_business_account.id;
          
          // IG kullanıcı adını al
          const igUserRes = await fetch(`https://graph.facebook.com/v19.0/${igAccountId}?fields=username&access_token=${longToken}`);
          const igUserData = await igUserRes.json();
          igUsername = igUserData.username;
          
          break; // İlk bulduğumuz bağlı hesabı alıp çıkıyoruz
        }
      }
    }

    if (!igAccountId) {
      return NextResponse.redirect(`${origin}/dashboard/editor?settings=assistant&meta_error=no_instagram_found`);
    }

    // 5. Supabase'e kaydet
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.redirect(`${origin}/login`);
    }

    // Business ID'yi bul
    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', session.user.id)
      .single();

    if (!business) {
      return NextResponse.redirect(`${origin}/dashboard/editor?settings=assistant&meta_error=no_business`);
    }

    // Daha önce varsa güncelle (upsert mantığı)
    const { error: upsertError } = await supabase
      .from('instagram_connections')
      .upsert({
        business_id: business.id,
        instagram_user_id: igAccountId,
        instagram_username: igUsername,
        page_id: pageId,
        access_token: longToken,
        updated_at: new Date().toISOString()
      }, { onConflict: 'business_id' });

    if (upsertError) {
      console.error('Supabase upsert error:', upsertError);
      return NextResponse.redirect(`${origin}/dashboard/editor?settings=assistant&meta_error=db_save_failed`);
    }

    // Başarıyla bağlandı
    return NextResponse.redirect(`${origin}/dashboard/editor?settings=assistant&meta_success=connected`);

  } catch (err) {
    console.error('Meta auth generic error:', err);
    return NextResponse.redirect(`${origin}/dashboard/editor?settings=assistant&meta_error=server_error`);
  }
}
