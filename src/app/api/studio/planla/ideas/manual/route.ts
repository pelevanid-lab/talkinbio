import { NextResponse } from 'next/server';
import { createClient as createServerSupabase } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';

const MAX_TITLE_LENGTH = 120;

/** Planla → "Elle fikir ekle". `ideas/generate`'in tek-satırlık, `source:'manual'`
 *  karşılığı — kredi YOK (AI hiç çağrılmıyor). İstemci (`PlanlaClient`) kartı önce
 *  iyimser (optimistic) olarak yerel state'e ekliyor, bu route dönünce gerçek DB
 *  kaydıyla değiştiriyor. */
export async function POST(req: Request) {
  const { businessId, title } = await req.json();
  if (!businessId || typeof title !== 'string' || !title.trim()) {
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

  const { data, error } = await supabaseAdmin
    .from('content_plan_items')
    .insert({ business_id: businessId, title: title.trim().slice(0, MAX_TITLE_LENGTH), status: 'idea', source: 'manual' })
    .select()
    .single();

  if (error) {
    console.error('[planla/ideas/manual] insert failed', error);
    return NextResponse.json({ error: 'Eklenemedi.' }, { status: 500 });
  }

  return NextResponse.json({ item: data });
}
