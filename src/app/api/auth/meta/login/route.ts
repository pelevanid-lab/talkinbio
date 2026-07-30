import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const supabase = await createClient();
  
  // Sadece giriş yapmış kullanıcılar IG bağlayabilir
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const clientId = process.env.META_CLIENT_ID;
  const redirectUri = `${origin}/api/auth/meta/callback`;
  
  // İhtiyacımız olan izinler (scopes)
  const scope = 'instagram_basic,instagram_manage_messages,pages_show_list,pages_manage_metadata,pages_messaging';

  // State param'ını güvenliği sağlamak veya business id'yi taşımak için kullanabiliriz.
  // Burada kullanıcının kendi session'ı ile backend'de business_id bulacağız, state'e gerek yok ama
  // CSRF için rastgele bir string eklemek iyi olur. Şimdilik "talkinbio_auth" gönderelim.
  const state = 'talkinbio_auth';

  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}&response_type=code`;

  return NextResponse.redirect(authUrl);
}
