import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { isKnownCharacterId } from '@/utils/knownCharacter';
import { STUDIO_ASSET_LIMITS, isStudioAssetKind } from '@/config/studio';
import { authorizeCharacterRequest } from '@/utils/creativeStudioScope';

// scene-ref/route.ts ile aynı gerekçe: `media` bucket'ının INSERT politikası
// `authenticated` istiyor, admin paneli Supabase auth değil `admin_session` çerezi
// kullanıyor — tarayıcıdan doğrudan yükleme RLS'e takılır, bu yüzden servis rolüyle
// sunucudan yükleniyor.

export async function POST(req: Request, { params }: { params: Promise<{ characterId: string }> }) {
  const { characterId } = await params;
  const auth = await authorizeCharacterRequest(characterId);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await isKnownCharacterId(characterId))) {
    return NextResponse.json({ error: 'Bilinmeyen karakter.' }, { status: 400 });
  }

  const formData = await req.formData();
  const file = formData.get('file');
  const kind = formData.get('kind');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Dosya bulunamadı.' }, { status: 400 });
  }
  if (!isStudioAssetKind(kind)) {
    return NextResponse.json({ error: 'Geçersiz medya türü.' }, { status: 400 });
  }

  const limit = STUDIO_ASSET_LIMITS[kind];
  if (!file.type.startsWith(limit.mimePrefix)) {
    return NextResponse.json({ error: `Bu dosya bir ${kind} değil.` }, { status: 400 });
  }
  if (file.size > limit.maxBytes) {
    return NextResponse.json(
      { error: `Dosya ${Math.round(limit.maxBytes / 1024 / 1024)}MB sınırını aşıyor.` },
      { status: 400 },
    );
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || kind;
  const objectPath = `characters/${characterId}/studio-assets/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabaseAdmin.storage
    .from('media')
    .upload(objectPath, bytes, { contentType: file.type, cacheControl: '31536000' });

  if (uploadError) {
    console.error('[studio-asset] upload failed', uploadError);
    return NextResponse.json({ error: 'Yüklenemedi.' }, { status: 500 });
  }

  const { data: { publicUrl } } = supabaseAdmin.storage.from('media').getPublicUrl(objectPath);

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('character_studio_assets')
    .insert({
      character_id: characterId,
      business_id: auth.mode === 'business' ? auth.business.id : null,
      kind,
      url: publicUrl,
      file_name: file.name,
    })
    .select()
    .single();

  if (insertError) {
    console.error('[studio-asset] insert failed', insertError);
    return NextResponse.json({ error: 'Kaydedilemedi.' }, { status: 500 });
  }

  return NextResponse.json({ asset: inserted });
}

export async function GET(_req: Request, { params }: { params: Promise<{ characterId: string }> }) {
  const { characterId } = await params;
  if (!(await authorizeCharacterRequest(characterId))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('character_studio_assets')
    .select('*')
    .eq('character_id', characterId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[studio-asset] list failed', error);
    return NextResponse.json({ error: 'Yüklenemedi.' }, { status: 500 });
  }

  return NextResponse.json({ assets: data });
}
