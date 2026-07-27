import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/utils/supabase/admin';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ characterId: string; motionId: string }> }
) {
  const cookieStore = await cookies();
  if (cookieStore.get('admin_session')?.value !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { characterId, motionId } = await params;

  try {
    // Önce kaydı bulalım ki storage'dan silebilelim
    const { data: motion } = await supabaseAdmin
      .from('character_motions')
      .select('*')
      .eq('id', motionId)
      .eq('character_id', characterId)
      .single();

    if (!motion) {
      return NextResponse.json({ error: 'Video bulunamadı.' }, { status: 404 });
    }

    // DB'den sil
    const { error: deleteError } = await supabaseAdmin
      .from('character_motions')
      .delete()
      .eq('id', motionId);

    if (deleteError) throw deleteError;

    // Storage'dan video ve ses dosyalarını silmeyi deneyebiliriz. 
    // Ancak dosyalar Supabase URL'i içerdiği için URL'den path'i parse etmemiz gerekir.
    // Şimdilik DB'den silmek yeterli, storage temizliği cron ile veya manuel yapılabilir.
    // Yine de basit bir parse yapıp silmeye çalışalım:
    try {
      const videoPath = motion.video_url.split('/media/')[1];
      if (videoPath) await supabaseAdmin.storage.from('media').remove([videoPath]);
      const audioPath = motion.audio_url.split('/media/')[1];
      if (audioPath) await supabaseAdmin.storage.from('media').remove([audioPath]);
    } catch (e) {
      console.warn('Storage temizliği başarısız (önemsiz):', e);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[characters/motion/delete] failed', err);
    return NextResponse.json({ error: 'Video silinirken hata oluştu.' }, { status: 500 });
  }
}
