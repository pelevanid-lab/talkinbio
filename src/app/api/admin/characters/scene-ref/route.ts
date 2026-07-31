import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { authorizeCharacterRequest } from '@/utils/creativeStudioScope';

// Sahne referansı yüklemesi (ör. gerçek ekran görüntüsü) neden ayrı bir route:
// `media` bucket'ının INSERT politikası `auth.role() = 'authenticated'` istiyor, ama admin
// paneli Supabase auth değil `admin_session` çerezi + ADMIN_PASSWORD ile korunuyor. Yani
// MediaUploader'ın tarayıcıdan anon anahtarla yüklemesi burada RLS'e takılır; servis
// rolüyle sunucudan yüklüyoruz.

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request) {
  if (!(await authorizeCharacterRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
  const objectPath = `characters/_scene-refs/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error } = await supabaseAdmin.storage
    .from('media')
    .upload(objectPath, bytes, { contentType: file.type, cacheControl: '31536000' });

  if (error) {
    console.error('[characters/scene-ref] upload failed', error);
    return NextResponse.json({ error: 'Görsel yüklenemedi.' }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from('media').getPublicUrl(objectPath);

  return NextResponse.json({ url: publicUrl });
}
