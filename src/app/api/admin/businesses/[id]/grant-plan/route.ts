import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/utils/supabase/admin';

// Faz 4.3: ödeme sağlayıcı yok — admin manuel tahsilat sonrası planı ve
// karşılık gelen krediyi elle atar (subscriptions tablosu, Faz 4.2'de
// eklenen businesses.credit_balance).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    if (cookieStore.get('admin_session')?.value !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: businessId } = await params;
    const { plan, credits } = await req.json();

    if (!plan || typeof credits !== 'number' || credits <= 0) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin.from('subscriptions').select('id').eq('business_id', businessId).maybeSingle();
    if (existing) {
      await supabaseAdmin.from('subscriptions').update({ plan, status: 'active' }).eq('id', existing.id);
    } else {
      await supabaseAdmin.from('subscriptions').insert({ business_id: businessId, plan, status: 'active' });
    }

    const { error: creditError } = await supabaseAdmin.rpc('add_credits', { p_business_id: businessId, p_amount: credits });
    if (creditError) throw creditError;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Grant plan error:', err);
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
