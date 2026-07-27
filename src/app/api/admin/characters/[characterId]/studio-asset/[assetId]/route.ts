import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/utils/supabase/admin';

async function requireAdminApi(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get('admin_session')?.value === process.env.ADMIN_PASSWORD;
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
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { assetId } = await params;

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
