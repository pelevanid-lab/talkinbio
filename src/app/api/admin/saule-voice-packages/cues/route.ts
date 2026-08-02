import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { isSauleCueKey } from '@/agents/saule/core';

const MAX_BYTES = 12 * 1024 * 1024;
const LOCALES = new Set(['tr', 'en', 'ru']);

async function requireAdminApi(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get('admin_session')?.value === process.env.ADMIN_PASSWORD;
}

export async function POST(req: Request) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file');
  const packageId = (formData.get('packageId') as string | null)?.trim();
  const cueKey = (formData.get('cueKey') as string | null)?.trim();
  const locale = (formData.get('locale') as string | null)?.trim();
  const variantLabel = ((formData.get('variantLabel') as string | null)?.trim() || 'v1').slice(0, 40);

  if (!(file instanceof File)) return NextResponse.json({ error: 'Ses dosyası bulunamadı.' }, { status: 400 });
  if (!packageId) return NextResponse.json({ error: 'Paket seçimi gerekli.' }, { status: 400 });
  if (!cueKey || !isSauleCueKey(cueKey)) return NextResponse.json({ error: 'Geçersiz cueKey.' }, { status: 400 });
  if (!locale || !LOCALES.has(locale)) return NextResponse.json({ error: 'Geçersiz dil.' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Ses dosyası 12 MB sınırını aşıyor.' }, { status: 400 });

  try {
    const { data: voicePackage, error: packageError } = await supabaseAdmin
      .from('saule_voice_packages')
      .select('id, slug, version')
      .eq('id', packageId)
      .single();
    if (packageError || !voicePackage) throw packageError || new Error('Package not found');

    const ext = file.name.split('.').pop()?.toLowerCase() || 'mp3';
    const objectPath = `saule-cues/${voicePackage.slug}/v${voicePackage.version}/${locale}/${cueKey}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage
      .from('media')
      .upload(objectPath, bytes, { contentType: file.type || 'audio/mpeg', cacheControl: '31536000' });
    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from('media').getPublicUrl(objectPath);

    const { data: cue, error: insertError } = await supabaseAdmin
      .from('saule_voice_cues')
      .insert({
        package_id: voicePackage.id,
        cue_key: cueKey,
        locale,
        variant_label: variantLabel,
        audio_url: publicUrl,
        storage_path: objectPath,
      })
      .select()
      .single();
    if (insertError) throw insertError;

    return NextResponse.json({ cue });
  } catch (err) {
    console.error('[saule-voice-cues] upload failed', err);
    return NextResponse.json({ error: 'Cue dosyası yüklenemedi.' }, { status: 500 });
  }
}
