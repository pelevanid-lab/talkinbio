import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { isCharacterId } from '@/config/characters';
import { FalError, removeImageBackground } from '@/utils/fal';

export const maxDuration = 90;

// `scene-ref/route.ts` ile AYNI gerekçe: cihazdan yüklenen bir dosyanın fal'ın erişebileceği
// bir https URL'i yok (object URL tarayıcıya özel), o yüzden önce Supabase'e yükleyip gerçek
// bir URL alıyoruz — fal `image_url` alanında herkese açık URL'leri doğrudan indirebiliyor
// (bkz. fal.ts publicImageAsDataUri yorumu). Galeriden seçilen görsellerin zaten gerçek bir
// Supabase URL'i var, o durumda yükleme adımı atlanır.
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Beiwe Post — "Arka planı kaldır". Girdi cihazdan yüklenen bir dosya (multipart `file`) ya
 * da galeriden seçilmiş gerçek bir URL (JSON `{ imageUrl }`) olabilir; ikisi de aynı
 * `removeImageBackground`'a (fal.ts, DOĞRULANMADI — bkz. o dosyadaki yorum) gider.
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

  const contentType = req.headers.get('content-type') || '';
  let sourceUrl: string | null = null;

  try {
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file');
      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'Dosya bulunamadı.' }, { status: 400 });
      }
      if (!file.type.startsWith('image/')) {
        return NextResponse.json({ error: 'Yalnızca görsel yüklenebilir.' }, { status: 400 });
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: 'Görsel 10 MB sınırını aşıyor.' }, { status: 400 });
      }

      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const objectPath = `characters/${characterId}/post-uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const bytes = Buffer.from(await file.arrayBuffer());

      const { error: uploadError } = await supabaseAdmin.storage
        .from('media')
        .upload(objectPath, bytes, { contentType: file.type, cacheControl: '31536000' });

      if (uploadError) {
        console.error('[post/remove-background] upload failed', uploadError);
        return NextResponse.json({ error: 'Görsel yüklenemedi.' }, { status: 500 });
      }

      const { data: { publicUrl } } = supabaseAdmin.storage.from('media').getPublicUrl(objectPath);
      sourceUrl = publicUrl;
    } else {
      const body = (await req.json().catch(() => null)) as { imageUrl?: string } | null;
      if (!body?.imageUrl || !body.imageUrl.startsWith('http')) {
        return NextResponse.json({ error: 'Görsel URL\'i geçersiz.' }, { status: 400 });
      }
      sourceUrl = body.imageUrl;
    }

    const { url } = await removeImageBackground(sourceUrl);
    return NextResponse.json({ url });
  } catch (err) {
    if (err instanceof FalError) {
      console.error('[post/remove-background] fal failed', err.message, `sourceUrl=${sourceUrl}`);
      return NextResponse.json({ error: err.userMessage }, { status: 502 });
    }
    console.error('[post/remove-background] failed', err, `sourceUrl=${sourceUrl}`);
    return NextResponse.json({ error: 'Arka plan kaldırılırken bir hata oluştu.' }, { status: 500 });
  }
}
