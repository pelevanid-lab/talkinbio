import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { isCharacterId } from '@/config/characters';

async function requireAdminApi(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get('admin_session')?.value === process.env.ADMIN_PASSWORD;
}

/**
 * PATCH /api/admin/characters/[characterId]/profile
 *
 * character_profiles satırını günceller.
 * Desteklenen alanlar:
 *   - reference_image_url : profil fotoğrafı URL'i (ghost foto fix için)
 *   - identity_prompt     : kimlik prompt'u
 *   - lora_url            : fal LoRA .safetensors URL'i
 *   - lora_trigger_word   : LoRA tetikleyici kelime
 *   - lora_request_id     : fal queue request ID
 *   - lora_status         : 'none'|'queued'|'training'|'ready'|'failed'
 *   - lora_started_at     : eğitim başlangıç zamanı
 *   - lora_completed_at   : eğitim bitiş zamanı
 *   - voice_url           : referans ses kaydının URL'i
 *   - voice_status        : 'none'|'ready' — 'ready' yalnız klon kulakla onaylandığında
 *
 * Profil satırı yoksa upsert ile oluşturulur.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ characterId: string }> },
) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { characterId } = await params;
  if (!isCharacterId(characterId)) {
    return NextResponse.json({ error: 'Geçersiz karakter.' }, { status: 400 });
  }

  const body = await req.json() as Record<string, unknown>;

  const allowed = [
    'reference_image_url',
    'identity_prompt',
    'lora_url',
    'lora_trigger_word',
    'lora_request_id',
    'lora_status',
    'lora_started_at',
    'lora_completed_at',
    'voice_url',
    'voice_status',
  ];

  const patch: Record<string, unknown> = { id: characterId };
  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }

  if (Object.keys(patch).length === 1) {
    // sadece id var, değiştirilecek alan yok
    return NextResponse.json({ error: 'Güncellenecek alan yok.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('character_profiles')
    .upsert(patch, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('[profile] patch failed', error);
    return NextResponse.json({ error: 'Profil güncellenemedi.' }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}

/**
 * GET /api/admin/characters/[characterId]/profile
 * Mevcut profil bilgisini döndürür.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ characterId: string }> },
) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { characterId } = await params;

  const { data, error } = await supabaseAdmin
    .from('character_profiles')
    .select('*')
    .eq('id', characterId)
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: 'Profil alınamadı.' }, { status: 500 });
  }

  return NextResponse.json({ profile: data ?? null });
}
