import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { isKnownCharacterId } from '@/utils/knownCharacter';
import { isClipRoom } from '@/config/clips';

async function requireAdminApi(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get('admin_session')?.value === process.env.ADMIN_PASSWORD;
}

export async function GET(_req: Request, { params }: { params: Promise<{ characterId: string }> }) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { characterId } = await params;
  if (!(await isKnownCharacterId(characterId))) {
    return NextResponse.json({ error: 'Bilinmeyen karakter.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('character_clips')
    .select('*')
    .eq('character_id', characterId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[clips] list failed', error);
    return NextResponse.json({ error: 'Yüklenemedi.' }, { status: 500 });
  }

  return NextResponse.json({ clips: data });
}

/**
 * Ortak klip havuzuna DIŞARIDAN video yükleme — Podcast/Action Room'un ürettiği
 * klipler dışında, admin'in elinde zaten hazır olan bir videoyu doğrudan havuza (ve
 * dolayısıyla Post-Prodüksiyon Stüdyosu'na) katmak için.
 */
export async function POST(req: Request, { params }: { params: Promise<{ characterId: string }> }) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { characterId } = await params;
  if (!(await isKnownCharacterId(characterId))) {
    return NextResponse.json({ error: 'Bilinmeyen karakter.' }, { status: 400 });
  }

  const formData = await req.formData();
  const file = formData.get('file');
  const roomRaw = formData.get('room');
  const label = formData.get('label');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Video dosyası bulunamadı.' }, { status: 400 });
  }
  if (!file.type.startsWith('video/')) {
    return NextResponse.json({ error: 'Bu dosya bir video değil.' }, { status: 400 });
  }
  const room = isClipRoom(roomRaw) ? roomRaw : 'external';

  const MAX_BYTES = 200 * 1024 * 1024;
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Video 200MB sınırını aşıyor.' }, { status: 400 });
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4';
  const objectPath = `characters/${characterId}/clips/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabaseAdmin.storage
    .from('media')
    .upload(objectPath, bytes, { contentType: file.type, cacheControl: '31536000' });

  if (uploadError) {
    console.error('[clips] upload failed', uploadError);
    return NextResponse.json({ error: 'Yüklenemedi.' }, { status: 500 });
  }

  const { data: { publicUrl } } = supabaseAdmin.storage.from('media').getPublicUrl(objectPath);

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('character_clips')
    .insert({
      character_id: characterId,
      room,
      source: 'uploaded',
      model: null,
      video_url: publicUrl,
      audio_url: null,
      source_image_url: null,
      label: typeof label === 'string' && label.trim() ? label.trim().slice(0, 80) : file.name,
    })
    .select()
    .single();

  if (insertError) {
    console.error('[clips] insert failed', insertError);
    return NextResponse.json({ error: 'Kaydedilemedi.' }, { status: 500 });
  }

  return NextResponse.json({ clip: inserted });
}
