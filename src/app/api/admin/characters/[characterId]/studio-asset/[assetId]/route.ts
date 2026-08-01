import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { authorizeCharacterRequest } from '@/utils/creativeStudioScope';

/** Bu asset'in sahibi işletme (varsa) gerçekten istek sahibi mi — admin her zaman geçer. */
async function authorizeAsset(assetId: string) {
  const { data: asset } = await supabaseAdmin
    .from('character_studio_assets')
    .select('character_id')
    .eq('id', assetId)
    .maybeSingle();
  if (!asset) return null;
  return authorizeCharacterRequest(asset.character_id);
}

/** `.../storage/v1/object/public/media/<path>` → `<path>` */
function objectPathFromPublicUrl(publicUrl: string): string | null {
  const marker = '/object/public/media/';
  const index = publicUrl.indexOf(marker);
  return index === -1 ? null : decodeURIComponent(publicUrl.slice(index + marker.length));
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ characterId: string; assetId: string }> },
) {
  const { assetId } = await params;
  if (!(await authorizeAsset(assetId))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: asset } = await supabaseAdmin
    .from('character_studio_assets')
    .select('url')
    .eq('id', assetId)
    .single();

  if (asset?.url) {
    const objectPath = objectPathFromPublicUrl(asset.url);
    // Storage silme hatası satır silmeyi bloke etmesin — yetim dosya, yetim satırdan iyidir.
    if (objectPath) await supabaseAdmin.storage.from('media').remove([objectPath]);
  }

  const { error } = await supabaseAdmin.from('character_studio_assets').delete().eq('id', assetId);
  if (error) {
    console.error('[studio-asset] delete failed', error);
    return NextResponse.json({ error: 'Silinemedi.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
