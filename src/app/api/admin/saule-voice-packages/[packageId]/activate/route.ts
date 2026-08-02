import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/utils/supabase/admin';

async function requireAdminApi(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get('admin_session')?.value === process.env.ADMIN_PASSWORD;
}

export async function POST(_req: Request, { params }: { params: Promise<{ packageId: string }> }) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { packageId } = await params;
  try {
    const { error } = await supabaseAdmin
      .from('saule_voice_packages')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', packageId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[saule-voice-packages] activate failed', err);
    return NextResponse.json({ error: 'Paket aktif edilemedi.' }, { status: 500 });
  }
}
