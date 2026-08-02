import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { isSauleCueKey } from '@/agents/saule/core';
import { getSauleCueText } from '@/agents/saule/cueTexts';

const LOCALES = new Set(['tr', 'en', 'ru']);

async function requireAdminApi(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get('admin_session')?.value === process.env.ADMIN_PASSWORD;
}

export async function POST(req: Request) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const packageId = typeof body?.packageId === 'string' ? body.packageId : '';
  const cueKey = typeof body?.cueKey === 'string' ? body.cueKey : '';
  const locale = typeof body?.locale === 'string' ? body.locale : '';
  const variantLabel = typeof body?.variantLabel === 'string' && body.variantLabel.trim() ? body.variantLabel.trim().slice(0, 40) : 'eleven-v3';
  const voice = typeof body?.voiceId === 'string' && body.voiceId.trim()
    ? body.voiceId.trim()
    : process.env.FAL_ELEVENLABS_SAULE_VOICE || 'Rachel';
  const falKey = process.env.FAL_KEY || '';

  if (!falKey) return NextResponse.json({ error: 'FAL_KEY eksik.' }, { status: 400 });
  if (!packageId) return NextResponse.json({ error: 'Paket seçimi gerekli.' }, { status: 400 });
  if (!isSauleCueKey(cueKey)) return NextResponse.json({ error: 'Geçersiz cueKey.' }, { status: 400 });
  if (!LOCALES.has(locale)) return NextResponse.json({ error: 'Geçersiz dil.' }, { status: 400 });

  try {
    const { data: voicePackage, error: packageError } = await supabaseAdmin
      .from('saule_voice_packages')
      .select('id, slug, version')
      .eq('id', packageId)
      .single();
    if (packageError || !voicePackage) throw packageError || new Error('Package not found');

    const text = typeof body?.text === 'string' && body.text.trim()
      ? body.text.trim().slice(0, 500)
      : getSauleCueText(cueKey, locale as 'tr' | 'en' | 'ru');

    const falRes = await fetch('https://fal.run/fal-ai/elevenlabs/tts/eleven-v3', {
      method: 'POST',
      headers: {
        Authorization: `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voice,
        stability: 0.45,
        similarity_boost: 0.8,
        speed: 1,
        apply_text_normalization: 'auto',
        output_format: 'mp3_44100_128',
      }),
    });

    if (!falRes.ok) {
      const errorText = await falRes.text();
      return NextResponse.json({ error: errorText || 'fal.ai ElevenLabs üretimi başarısız.' }, { status: 502 });
    }

    const falData = await falRes.json();
    const falAudioUrl = falData?.audio?.url;
    if (!falAudioUrl || typeof falAudioUrl !== 'string') {
      return NextResponse.json({ error: 'fal.ai ses URL döndürmedi.' }, { status: 502 });
    }

    const generatedAudioRes = await fetch(falAudioUrl);
    if (!generatedAudioRes.ok) {
      return NextResponse.json({ error: 'fal.ai ses dosyası indirilemedi.' }, { status: 502 });
    }

    const audioBuffer = Buffer.from(await generatedAudioRes.arrayBuffer());
    const objectPath = `saule-cues/${voicePackage.slug}/v${voicePackage.version}/${locale}/${cueKey}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp3`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('media')
      .upload(objectPath, audioBuffer, { contentType: 'audio/mpeg', cacheControl: '31536000' });
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

    return NextResponse.json({ cue, text });
  } catch (err) {
    console.error('[saule-voice-cues] fal elevenlabs generation failed', err);
    return NextResponse.json({ error: 'Cue üretilemedi.' }, { status: 500 });
  }
}
