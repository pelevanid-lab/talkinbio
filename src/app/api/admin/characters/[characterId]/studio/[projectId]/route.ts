import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { MAX_PROJECT_NAME_LENGTH, parseStudioTimeline } from '@/config/studio';

async function requireAdminApi(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get('admin_session')?.value === process.env.ADMIN_PASSWORD;
}

type Body = { name?: string; timeline?: unknown; outputUrl?: string | null };

/** Ad, zaman çizelgesi ve/veya export çıktı URL'i günceller. `outputUrl` akışı: export tarayıcıda
 * bitince blob `studio-asset` route'una yüklenir, dönen URL buraya PATCH edilir — export'un
 * kendisi için ayrı bir yükleme uç noktası yok, mevcut asset akışı yeniden kullanılıyor. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ characterId: string; projectId: string }> },
) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = await params;
  const body = (await req.json()) as Body;
  const patch: Record<string, unknown> = {};

  if (body.timeline !== undefined) {
    const timeline = parseStudioTimeline(body.timeline);
    if (!timeline) return NextResponse.json({ error: 'Geçersiz zaman çizelgesi.' }, { status: 400 });
    patch.timeline = timeline;
  }
  if (typeof body.name === 'string') {
    patch.name = body.name.slice(0, MAX_PROJECT_NAME_LENGTH) || 'Adsız proje';
  }
  if (body.outputUrl !== undefined) {
    patch.output_url = body.outputUrl;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Güncellenecek alan yok.' }, { status: 400 });
  }
  patch.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('character_studio_projects')
    .update(patch)
    .eq('id', projectId)
    .select()
    .single();

  if (error) {
    console.error('[studio] patch failed', error);
    return NextResponse.json({ error: 'Güncellenemedi.' }, { status: 500 });
  }

  return NextResponse.json({ project: data });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ characterId: string; projectId: string }> },
) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = await params;
  const { error } = await supabaseAdmin.from('character_studio_projects').delete().eq('id', projectId);
  if (error) {
    console.error('[studio] delete failed', error);
    return NextResponse.json({ error: 'Silinemedi.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
