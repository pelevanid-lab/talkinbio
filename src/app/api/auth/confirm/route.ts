import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import type { EmailOtpType } from '@supabase/supabase-js';

// Cihaz/tarayıcıdan bağımsız e-posta doğrulama (şifre sıfırlama, davet, magic link).
// PKCE `code=` akışı, linki AÇAN tarayıcıda linki İSTEYEN tarayıcının sakladığı bir
// "code verifier" çerezini gerektirir — e-posta linki farklı bir tarayıcıda/uygulamada
// açılırsa bu çerez yoktur ve doğrulama "geçersiz/süresi dolmuş" hatasıyla başarısız olur.
// `token_hash` + `verifyOtp` akışı tamamen sunucu tarafında çalışır, herhangi bir yerel
// duruma ihtiyaç duymaz.
//
// GET burada doğrulamayı DOĞRUDAN yapmaz — Outlook/Microsoft 365 "Safe Links" gibi
// e-posta güvenlik tarayıcıları, mail kutuna düşer düşmez linkleri otomatik ziyaret
// ediyor ve tek kullanımlık token'ı kullanıcıdan önce tüketiyor (gözlemlendi: 2026-07-17,
// enespehlivan@live.com hesabında recovery_sent_at ile last_sign_in_at arası 15 saniye).
// Bu yüzden GET sadece bir onay sayfası gösterir; gerçek doğrulama (POST) yalnızca
// kullanıcı butona TIKLADIĞINDA tetiklenir — botlar formu submit etmez.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('redirect_to') ?? searchParams.get('next') ?? '/dashboard/editor?reset_password=true';

  if (!token_hash || !type) {
    return NextResponse.redirect(`${new URL(request.url).origin}/login?error=Invalid+or+expired+code`);
  }

  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

  const html = `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>Talkinbio — Onayla</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #F4F2ED; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #fff; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); padding: 32px; max-width: 400px; width: 90%; text-align: center; }
    h1 { font-size: 18px; margin: 0 0 8px; color: #14231F; }
    p { color: #4B5A55; font-size: 14px; margin: 0 0 20px; }
    button { background: #FF6A5C; color: #fff; border: none; border-radius: 100px; padding: 12px 28px; font-size: 15px; font-weight: 600; cursor: pointer; }
    button:hover { background: #e55a4d; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Devam etmek için onayla</h1>
    <p>Güvenliğin için, bu bağlantıyı sadece sen tıkladığında işleme alıyoruz.</p>
    <form method="POST">
      <input type="hidden" name="token_hash" value="${escape(token_hash)}" />
      <input type="hidden" name="type" value="${escape(type)}" />
      <input type="hidden" name="next" value="${escape(next)}" />
      <button type="submit">Onayla ve devam et</button>
    </form>
  </div>
</body>
</html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export async function POST(request: NextRequest) {
  const { origin } = new URL(request.url);
  const formData = await request.formData();
  const token_hash = formData.get('token_hash');
  const type = formData.get('type') as EmailOtpType | null;
  const next = (formData.get('next') as string) || '/dashboard/editor?reset_password=true';

  if (typeof token_hash === 'string' && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(`${origin}/login?error=Invalid+or+expired+code`);
}
