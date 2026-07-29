import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { isCharacterId } from '@/config/characters';
import { generateCharacterVoice } from '@/utils/fal';

export const maxDuration = 300;

export async function POST(req: Request, { params }: { params: Promise<{ characterId: string }> }) {
  const cookieStore = await cookies();
  if (cookieStore.get('admin_session')?.value !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { characterId } = await params;
  if (!isCharacterId(characterId)) {
    return NextResponse.json({ error: 'Bilinmeyen karakter.' }, { status: 400 });
  }

  try {
    const formData = await req.formData();
    
    // 1. Mod: Dosya yükleme (Ses yükle)
    const file = formData.get('file') as File | null;
    if (file) {
      const bytes = Buffer.from(await file.arrayBuffer());
      const ext = file.name.split('.').pop() || 'wav';
      const objectPath = `characters/${characterId}/voice-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from('media')
        .upload(objectPath, bytes, {
          contentType: file.type || 'audio/wav',
          cacheControl: '31536000',
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabaseAdmin.storage.from('media').getPublicUrl(objectPath);

      // Profili güncelle
      await supabaseAdmin
        .from('character_profiles')
        .update({ voice_url: publicUrl, voice_status: 'ready' })
        .eq('id', characterId);

      return NextResponse.json({ voice_url: publicUrl });
    }

    // 2. Mod: Ses üretimi (Klonla / Test et)
    const text = formData.get('text') as string;
    const voiceUrl = formData.get('voice_url') as string;
    
    if (text && voiceUrl) {
      const result = await generateCharacterVoice({
        prompt: text,
        referenceAudioUrl: voiceUrl
      });
      
      return NextResponse.json(result);
    }
    
    return NextResponse.json({ error: 'Dosya veya metin/ses linki gerekli.' }, { status: 400 });
  } catch (err: any) {
    console.error('[voice] Hata:', err);
    return NextResponse.json({ error: err.message || 'Ses işlenemedi.' }, { status: 500 });
  }
}
