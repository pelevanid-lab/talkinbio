import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { FalError, enhanceAudio } from '@/utils/fal';
import { isCharacterId } from '@/config/characters';

export const maxDuration = 300;

/**
 * Post-prodüksiyonda "sesi iyileştir" — klibin `audio_url`'ini (yoksa `video_url`'ini —
 * fal-ai/elevenlabs/audio-isolation ikisini de kabul ediyor, video verilirse ses parçasını
 * kendi çıkarıyor; ortak klip havuzundaki harici yüklemelerin ayrı bir `audio_url`'i yok)
 * fal-ai/elevenlabs/audio-isolation'dan geçirip temizlenmiş sesi döner. `StudioEditor`
 * bunu `timeline.enhancedAudioUrl`'e yazıp orijinal video sesinin YERİNE bunu çalar/kaydeder
 * (bkz. studioRenderer.ts'teki gain yönlendirmesi).
 */
export async function POST(req: Request, { params }: { params: Promise<{ characterId: string }> }) {
  const cookieStore = await cookies();
  if (cookieStore.get('admin_session')?.value !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { characterId } = await params;
  if (!isCharacterId(characterId)) {
    return NextResponse.json({ error: 'Bilinmeyen karakter.' }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as { audioUrl?: string; videoUrl?: string } | null;
  const audioUrl = typeof body?.audioUrl === 'string' && body.audioUrl.startsWith('http') ? body.audioUrl : undefined;
  const videoUrl = typeof body?.videoUrl === 'string' && body.videoUrl.startsWith('http') ? body.videoUrl : undefined;
  if (!audioUrl && !videoUrl) {
    return NextResponse.json({ error: 'Ses ya da video URL\'i geçersiz.' }, { status: 400 });
  }

  try {
    const { audioUrl: enhancedAudioUrl } = audioUrl
      ? await enhanceAudio({ audioUrl })
      : await enhanceAudio({ videoUrl: videoUrl! });
    return NextResponse.json({ audioUrl: enhancedAudioUrl });
  } catch (err) {
    const context = `audioUrl=${audioUrl} videoUrl=${videoUrl}`;
    if (err instanceof FalError) {
      console.error('[studio/enhance-audio] fal failed', err.message, context);
      return NextResponse.json({ error: err.userMessage }, { status: 502 });
    }
    console.error('[studio/enhance-audio] failed', err, context);
    return NextResponse.json({ error: 'Ses iyileştirilirken bir hata oluştu.' }, { status: 500 });
  }
}
