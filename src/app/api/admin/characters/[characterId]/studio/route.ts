import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { isKnownCharacterId } from '@/utils/knownCharacter';
import { MAX_PROJECT_NAME_LENGTH, parseStudioTimeline } from '@/config/studio';
import { authorizeCharacterRequest } from '@/utils/creativeStudioScope';

type Body = { name?: string; motionId?: string | null; timeline: unknown };

export async function POST(req: Request, { params }: { params: Promise<{ characterId: string }> }) {
  const { characterId } = await params;
  const auth = await authorizeCharacterRequest(characterId);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await isKnownCharacterId(characterId))) {
    return NextResponse.json({ error: 'Bilinmeyen karakter.' }, { status: 400 });
  }

  const body = (await req.json()) as Body;

  // İstemciye güvenilmiyor (plan kararı): timeline burada sabitlere karşı doğrulanıyor,
  // istemcinin gönderdiği ham JSON doğrudan DB'ye yazılmıyor.
  const timeline = parseStudioTimeline(body.timeline);
  if (!timeline) {
    return NextResponse.json({ error: 'Geçersiz zaman çizelgesi.' }, { status: 400 });
  }

  const name = (body.name || 'Adsız proje').slice(0, MAX_PROJECT_NAME_LENGTH);

  const { data: inserted, error } = await supabaseAdmin
    .from('character_studio_projects')
    .insert({
      character_id: characterId,
      business_id: auth.mode === 'business' ? auth.business.id : null,
      motion_id: body.motionId || null,
      name,
      timeline,
    })
    .select()
    .single();

  if (error) {
    console.error('[studio] create failed', error);
    return NextResponse.json({ error: 'Proje kaydedilemedi — kaynak video mevcut mu kontrol et.' }, { status: 400 });
  }

  return NextResponse.json({ project: inserted });
}

export async function GET(_req: Request, { params }: { params: Promise<{ characterId: string }> }) {
  const { characterId } = await params;
  if (!(await authorizeCharacterRequest(characterId))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('character_studio_projects')
    .select('*')
    .eq('character_id', characterId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[studio] list failed', error);
    return NextResponse.json({ error: 'Yüklenemedi.' }, { status: 500 });
  }

  return NextResponse.json({ projects: data });
}
