import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/utils/supabase/admin';

async function requireAdminApi(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get('admin_session')?.value === process.env.ADMIN_PASSWORD;
}

export async function POST(_req: Request, { params }: { params: Promise<{ cueId: string }> }) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { cueId } = await params;
  try {
    const { data: cue, error: cueError } = await supabaseAdmin
      .from('saule_voice_cues')
      .select('id, package_id, cue_key, locale')
      .eq('id', cueId)
      .single();
    if (cueError || !cue) throw cueError || new Error('Cue not found');

    await supabaseAdmin
      .from('saule_voice_cues')
      .update({ status: 'rejected' })
      .eq('package_id', cue.package_id)
      .eq('cue_key', cue.cue_key)
      .eq('locale', cue.locale)
      .eq('status', 'approved');

    const { error: updateError } = await supabaseAdmin
      .from('saule_voice_cues')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        qc: {
          pronunciation: true,
          tempo: true,
          loudness: true,
          silence_trimmed: true,
          human_approved: true,
        },
      })
      .eq('id', cueId);
    if (updateError) throw updateError;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[saule-voice-cues] approve failed', err);
    return NextResponse.json({ error: 'Cue onaylanamadı.' }, { status: 500 });
  }
}
