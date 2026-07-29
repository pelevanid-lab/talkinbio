import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { FalError, transcribeAudioWords } from '@/utils/fal';
import { isCharacterId } from '@/config/characters';

export const maxDuration = 300;

/**
 * Karaoke altyazı için kelime bazlı transkripsiyon — istemci (StudioEditor) motion'ın
 * kendi `audio_url`'ini gönderir, biz fal-ai/whisper'ı `chunk_level: 'word'` ile çağırıp
 * ham kelime listesini döneriz. Zaman çizelgesine (trim'e göre) çevirme işini istemci
 * yapıyor — `parseStudioTimeline` zaten sunucu tarafında son doğrulamayı yapacak.
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

  const body = (await req.json().catch(() => null)) as { audioUrl?: string } | null;
  const audioUrl = body?.audioUrl;
  if (typeof audioUrl !== 'string' || !audioUrl.startsWith('http')) {
    return NextResponse.json({ error: 'Ses URL\'i geçersiz.' }, { status: 400 });
  }

  try {
    const { words } = await transcribeAudioWords({ audioUrl });
    return NextResponse.json({ words });
  } catch (err) {
    if (err instanceof FalError) {
      console.error('[studio/transcribe] fal failed', err.message, `audioUrl=${audioUrl}`);
      return NextResponse.json({ error: err.userMessage }, { status: 502 });
    }
    console.error('[studio/transcribe] failed', err, `audioUrl=${audioUrl}`);
    return NextResponse.json({ error: 'Altyazı çıkarılırken bir hata oluştu.' }, { status: 500 });
  }
}
