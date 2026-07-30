import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/utils/supabase/admin';

async function requireAdminApi(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get('admin_session')?.value === process.env.ADMIN_PASSWORD;
}

const MAX_BYTES = 15 * 1024 * 1024;

/**
 * Hazır referans ses kütüphanesi (bkz. `voice_presets`) — Yardımcı Oyuncular'ın
 * (gerçek kişisi olmayan sanal karakterlerin) referans ses ihtiyacını karşılar.
 * Bir kere yüklenir, her sanal karakter için tekrar tekrar seçilebilir.
 */
export async function POST(req: Request) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file');
  const label = (formData.get('label') as string | null)?.trim().slice(0, 60);

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Ses dosyası bulunamadı.' }, { status: 400 });
  }
  if (!label) {
    return NextResponse.json({ error: 'Etiket gerekli (ör. "Sıcak kadın").' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Ses dosyası 15 MB sınırını aşıyor.' }, { status: 400 });
  }

  try {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'mp3';
    const objectPath = `voice-presets/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage
      .from('media')
      .upload(objectPath, bytes, { contentType: file.type || 'audio/mpeg', cacheControl: '31536000' });
    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from('media').getPublicUrl(objectPath);

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('voice_presets')
      .insert({ label, audio_url: publicUrl })
      .select()
      .single();
    if (insertError) throw insertError;

    return NextResponse.json({ preset: inserted });
  } catch (err) {
    console.error('[voice-presets] upload failed', err);
    return NextResponse.json({ error: 'Hazır ses yüklenemedi.' }, { status: 500 });
  }
}
