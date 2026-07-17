import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import type { EmailOtpType } from '@supabase/supabase-js';

// Cihaz/tarayıcıdan bağımsız e-posta doğrulama (şifre sıfırlama, davet, magic link).
// PKCE `code=` akışı, linki AÇAN tarayıcıda linki İSTEYEN tarayıcının sakladığı bir
// "code verifier" çerezini gerektirir — e-posta linki farklı bir tarayıcıda/uygulamada
// (ör. Gmail uygulamasının kendi iç tarayıcısı) açılırsa bu çerez yoktur ve doğrulama
// "geçersiz/süresi dolmuş" hatasıyla başarısız olur. `token_hash` + `verifyOtp` akışı
// tamamen sunucu tarafında çalışır, herhangi bir yerel duruma ihtiyaç duymaz.
// Devreye girmesi için Supabase Dashboard > Authentication > Email Templates'teki
// ilgili şablonların {{ .ConfirmationURL }} yerine bu route'u hedeflemesi gerekir —
// bkz. proje notları.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('redirect_to') ?? searchParams.get('next') ?? '/dashboard/editor?reset_password=true';

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(`${origin}/login?error=Invalid+or+expired+code`);
}
