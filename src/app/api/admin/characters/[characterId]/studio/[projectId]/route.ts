import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { MAX_PROJECT_NAME_LENGTH, parseStudioTimeline } from '@/config/studio';
import { authorizeCharacterRequest } from '@/utils/creativeStudioScope';

/** Bu projenin sahibi işletme (varsa) gerçekten istek sahibi mi — admin her zaman geçer. */
async function authorizeProject(projectId: string) {
  const { data: project } = await supabaseAdmin
    .from('character_studio_projects')
    .select('character_id')
    .eq('id', projectId)
    .maybeSingle();
  if (!project) return null;
  return authorizeCharacterRequest(project.character_id);
}

type Body = { name?: string; timeline?: unknown; outputUrl?: string | null; thumbnailUrl?: string | null };

/** Ad, zaman çizelgesi, export çıktı URL'i ve/veya kapak URL'i günceller. `outputUrl`/
 * `thumbnailUrl` AYNI akış: tarayıcıda üretilen blob `studio-asset` route'una yüklenir,
 * dönen URL buraya PATCH edilir — export'un/kapağın kendisi için ayrı bir yükleme uç
 * noktası yok, mevcut asset akışı yeniden kullanılıyor. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ characterId: string; projectId: string }> },
) {
  const { projectId } = await params;
  if (!(await authorizeProject(projectId))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
  if (body.thumbnailUrl !== undefined) {
    patch.thumbnail_url = body.thumbnailUrl;
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
  const { projectId } = await params;
  if (!(await authorizeProject(projectId))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabaseAdmin.from('character_studio_projects').delete().eq('id', projectId);
  if (error) {
    console.error('[studio] delete failed', error);
    return NextResponse.json({ error: 'Silinemedi.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
