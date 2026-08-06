import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { isAuthorizedCronRequest } from '@/utils/cronAuth';

// Faz: hesapsız sihirbaz (bkz. /onboarding — signInAnonymously). Bir ziyaretçi
// sihirbazı yarıda bırakıp hiç hesap açmazsa, anonim auth.users satırı + ona
// bağlı business/blocks veritabanında kalır. Bu cron, 7 günden eski ve hâlâ
// setup_completed=false olan business'ların sahibinin GERÇEKTEN anonim olduğunu
// (is_anonymous=true) doğrulayıp o kullanıcıyı siler — cascade (bkz.
// supabase/migrations/00001_initial_schema.sql: owner_id ... on delete cascade)
// business/blocks/media/vb. her şeyi otomatik temizler.
// Gerçek hesaplara (is_anonymous=false) ASLA dokunmaz.
export const maxDuration = 60;

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();

  const { data: staleBusinesses, error } = await supabaseAdmin
    .from('businesses')
    .select('id, owner_id, created_at')
    .eq('setup_completed', false)
    .lt('created_at', cutoff);

  if (error) {
    console.error('cleanup-anonymous-demos: businesses fetch failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let deleted = 0;
  let skipped = 0;

  for (const biz of staleBusinesses || []) {
    if (!biz.owner_id) { skipped++; continue; }

    try {
      const { data: userData, error: userErr } = await supabaseAdmin.auth.admin.getUserById(biz.owner_id);
      if (userErr || !userData?.user) { skipped++; continue; }

      // Güvenlik kilidi: sadece is_anonymous:true kullanıcılar silinir.
      if (!userData.user.is_anonymous) { skipped++; continue; }

      const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(biz.owner_id);
      if (delErr) {
        console.error('cleanup-anonymous-demos: deleteUser failed', biz.owner_id, delErr);
        skipped++;
        continue;
      }
      deleted++;
    } catch (err) {
      console.error('cleanup-anonymous-demos: exception', biz.id, err);
      skipped++;
    }
  }

  return NextResponse.json({ success: true, deleted, skipped, checked: staleBusinesses?.length || 0 });
}
