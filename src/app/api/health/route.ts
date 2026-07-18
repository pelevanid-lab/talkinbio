import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';

// Faz 4.4: basit sağlık ucu — harici bir izleyici (ör. UptimeRobot) buraya
// düzenli GET atıp uptime'ı ölçer. Supabase'e ulaşılamıyorsa 503 döner.
export async function GET() {
  try {
    const { error } = await supabaseAdmin.from('businesses').select('id').limit(1);
    if (error) throw error;
    return NextResponse.json({ status: 'ok' });
  } catch (err) {
    console.error('[health] database check failed', err);
    return NextResponse.json({ status: 'error' }, { status: 503 });
  }
}
