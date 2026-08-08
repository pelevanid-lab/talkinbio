import { NextResponse } from 'next/server';
import { createClient as createServerSupabase } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { parseContentPillars } from '@/config/contentPlan';

/** Planla → sütunları kaydeder (öner/onayla akışının 2. adımı, ya da elle düzenleme).
 *  İstemciye güvenilmiyor: ham JSON `parseContentPillars`'tan geçirilmeden DB'ye
 *  yazılmıyor (`parseStudioTimeline` ile AYNI kural). Kredi yok — düz bir kayıt. */
export async function PATCH(req: Request) {
  const { businessId, pillars: rawPillars } = await req.json();
  if (!businessId) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { data: business } = await supabaseAdmin.from('businesses').select('owner_id').eq('id', businessId).single();
  const supabaseAuth = await createServerSupabase();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!business || !user || user.id !== business.owner_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const pillars = parseContentPillars(rawPillars);

  const { error } = await supabaseAdmin.from('businesses').update({ content_pillars: pillars }).eq('id', businessId);
  if (error) {
    console.error('[planla/pillars] update failed', error);
    return NextResponse.json({ error: 'Kaydedilemedi.' }, { status: 500 });
  }

  return NextResponse.json({ pillars });
}
