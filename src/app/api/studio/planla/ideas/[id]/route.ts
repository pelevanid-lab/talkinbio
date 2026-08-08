import { NextResponse } from 'next/server';
import { createClient as createServerSupabase } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { isContentPlanStatus } from '@/config/contentPlan';

const MAX_TITLE_LENGTH = 120;
const MAX_BRIEF_LENGTH = 400;

type Body = { status?: unknown; title?: unknown; brief?: unknown };

/** Planla → elle düzenleme (durum değiştir, başlık/brief düzelt) — kredi YOK, düz bir
 *  kayıt güncellemesi. Sahiplik `content_plan_items.business_id` üzerinden, `studio/
 *  [projectId]`'nin `authorizeProject` deseninin AYNISI (önce satırı bul, sonra sahibi
 *  doğrula) ama karakter değil business-owner auth ile. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: item } = await supabaseAdmin.from('content_plan_items').select('business_id').eq('id', id).maybeSingle();
  if (!item) {
    return NextResponse.json({ error: 'Bulunamadı.' }, { status: 404 });
  }

  const { data: business } = await supabaseAdmin.from('businesses').select('owner_id').eq('id', item.business_id).single();
  const supabaseAuth = await createServerSupabase();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!business || !user || user.id !== business.owner_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Body | null;
  const patch: Record<string, unknown> = {};
  if (isContentPlanStatus(body?.status)) patch.status = body!.status;
  if (typeof body?.title === 'string' && body.title.trim()) patch.title = body.title.trim().slice(0, MAX_TITLE_LENGTH);
  if (typeof body?.brief === 'string') patch.brief = body.brief.trim().slice(0, MAX_BRIEF_LENGTH) || null;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Güncellenecek alan yok.' }, { status: 400 });
  }
  patch.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin.from('content_plan_items').update(patch).eq('id', id).select().single();
  if (error) {
    console.error('[planla/ideas/:id] update failed', error);
    return NextResponse.json({ error: 'Güncellenemedi.' }, { status: 500 });
  }

  return NextResponse.json({ item: data });
}

/** Fikri sil — elle eklenmiş yanlış/istenmeyen bir kartı kaldırmak için. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: item } = await supabaseAdmin.from('content_plan_items').select('business_id').eq('id', id).maybeSingle();
  if (!item) {
    return NextResponse.json({ error: 'Bulunamadı.' }, { status: 404 });
  }

  const { data: business } = await supabaseAdmin.from('businesses').select('owner_id').eq('id', item.business_id).single();
  const supabaseAuth = await createServerSupabase();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!business || !user || user.id !== business.owner_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { error } = await supabaseAdmin.from('content_plan_items').delete().eq('id', id);
  if (error) {
    console.error('[planla/ideas/:id] delete failed', error);
    return NextResponse.json({ error: 'Silinemedi.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
