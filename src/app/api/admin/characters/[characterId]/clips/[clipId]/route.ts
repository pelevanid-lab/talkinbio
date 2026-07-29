import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/utils/supabase/admin';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ characterId: string; clipId: string }> },
) {
  const cookieStore = await cookies();
  if (cookieStore.get('admin_session')?.value !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { characterId, clipId } = await params;

  try {
    const { data: clip } = await supabaseAdmin
      .from('character_clips')
      .select('*')
      .eq('id', clipId)
      .eq('character_id', characterId)
      .single();

    if (!clip) {
      return NextResponse.json({ error: 'Klip bulunamadı.' }, { status: 404 });
    }

    const { error: deleteError } = await supabaseAdmin.from('character_clips').delete().eq('id', clipId);
    if (deleteError) throw deleteError;

    // Storage temizliği best-effort — character_motions/[motionId] route'undaki
    // aynı desen: DB'den silmek yeterli, storage temizliği başarısız olursa önemsiz.
    try {
      const videoPath = clip.video_url?.split('/media/')[1];
      if (videoPath) await supabaseAdmin.storage.from('media').remove([videoPath]);
      const audioPath = clip.audio_url?.split('/media/')[1];
      if (audioPath) await supabaseAdmin.storage.from('media').remove([audioPath]);
    } catch (e) {
      console.warn('[clips] storage temizliği başarısız (önemsiz):', e);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[clips/delete] failed', err);
    return NextResponse.json({ error: 'Klip silinirken hata oluştu.' }, { status: 500 });
  }
}
