import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { MAX_CANON_SHOTS } from '@/config/characters';
import { authorizeCharacterRequest } from '@/utils/creativeStudioScope';

/** `.../storage/v1/object/public/media/<path>` → `<path>` */
function objectPathFromPublicUrl(publicUrl: string): string | null {
  const marker = '/object/public/media/';
  const index = publicUrl.indexOf(marker);
  return index === -1 ? null : decodeURIComponent(publicUrl.slice(index + marker.length));
}

/** Bu shot'un sahibi işletme (varsa) gerçekten istek sahibi mi — admin her zaman geçer. */
async function authorizeShot(shotId: string) {
  const { data: shot } = await supabaseAdmin
    .from('character_shots')
    .select('character_id')
    .eq('id', shotId)
    .maybeSingle();
  if (!shot) return null;
  return authorizeCharacterRequest(shot.character_id);
}

/** Kanon işaretini değiştirir ve/veya metin katmanı ayarlarını kaydeder. */
export async function PATCH(req: Request, { params }: { params: Promise<{ shotId: string }> }) {
  const { shotId } = await params;

  if (!(await authorizeShot(shotId))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json()) as { isCanon?: boolean; overlay?: unknown; similarityScore?: number | null };
  const patch: Record<string, unknown> = {};

  if (typeof body.isCanon === 'boolean') {
    if (body.isCanon) {
      // Referans bütçesi sabit: kanon kare sayısı sınırı aşarsa kimlik sadıkati düşer.
      const { data: shot } = await supabaseAdmin
        .from('character_shots')
        .select('character_id')
        .eq('id', shotId)
        .single();
      if (!shot) return NextResponse.json({ error: 'Kare bulunamadı.' }, { status: 404 });

      const { count } = await supabaseAdmin
        .from('character_shots')
        .select('*', { count: 'exact', head: true })
        .eq('character_id', shot.character_id)
        .eq('is_canon', true);

      if ((count || 0) >= MAX_CANON_SHOTS) {
        return NextResponse.json(
          { error: `En fazla ${MAX_CANON_SHOTS} kanon kare sabitlenebilir. Önce birini kaldır.` },
          { status: 400 },
        );
      }
    }
    patch.is_canon = body.isCanon;
  }

  if (body.overlay !== undefined) {
    patch.overlay = body.overlay;
  }

  if (body.similarityScore !== undefined) {
    if (body.similarityScore !== null && (body.similarityScore < 1 || body.similarityScore > 10 || !Number.isInteger(body.similarityScore))) {
      return NextResponse.json({ error: 'Puan 1-10 arasında tam sayı olmalıdır.' }, { status: 400 });
    }
    patch.similarity_score = body.similarityScore;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Güncellenecek alan yok.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('character_shots')
    .update(patch)
    .eq('id', shotId)
    .select()
    .single();

  if (error) {
    console.error('[characters/shots] patch failed', error);
    return NextResponse.json({ error: 'Güncellenemedi.' }, { status: 500 });
  }

  return NextResponse.json({ shot: data });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ shotId: string }> }) {
  const { shotId } = await params;

  if (!(await authorizeShot(shotId))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: shot } = await supabaseAdmin
    .from('character_shots')
    .select('image_url')
    .eq('id', shotId)
    .single();

  if (shot?.image_url) {
    const objectPath = objectPathFromPublicUrl(shot.image_url);
    // Storage silme hatası satır silmeyi bloke etmesin — yetim dosya, yetim satırdan iyidir.
    if (objectPath) await supabaseAdmin.storage.from('media').remove([objectPath]);
  }

  const { error } = await supabaseAdmin.from('character_shots').delete().eq('id', shotId);
  if (error) {
    console.error('[characters/shots] delete failed', error);
    return NextResponse.json({ error: 'Silinemedi.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
