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
  
  // Facebook Login for Business için Configuration ID kullanıyoruz (Scope yerine)
  const configId = process.env.META_CONFIG_ID || '1499782398499385';

  // State param'ını güvenliği sağlamak veya business id'yi taşımak için kullanabiliriz.
  const state = 'talkinbio_auth';

  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&config_id=${configId}&state=${state}&response_type=code`;

  return NextResponse.redirect(authUrl);
}
