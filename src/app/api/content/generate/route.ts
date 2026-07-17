import { NextResponse } from 'next/server';
import { createClient as createServerSupabase } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { generateOnce } from '@/agents/shared/generateOnce';
import { parseJsonResult } from '@/agents/shared/parseJsonResult';
import { buildContentPrompt, type ContentFormat, type ContentSource } from '@/agents/beiwe/contentPrompt';

const VALID_FORMATS: ContentFormat[] = ['instagram_post', 'instagram_story', 'whatsapp_status'];
const VALID_SOURCE_TYPES = ['service', 'gallery', 'testimonial', 'general'];

type ContentResult = Record<'tr' | 'en' | 'ru', { caption: string; hashtags?: string[] }>;

export async function POST(req: Request) {
  const { businessId, source, format } = await req.json();

  if (!businessId || !source?.title || !VALID_FORMATS.includes(format) || !VALID_SOURCE_TYPES.includes(source?.type)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Yalnızca işletmenin sahibi, kendi işletmesi için içerik üretebilir (chat route'undaki preview-auth deseniyle aynı).
  const { data: business } = await supabaseAdmin.from('businesses').select('owner_id, name, category').eq('id', businessId).single();
  const supabaseAuth = await createServerSupabase();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!business || !user || user.id !== business.owner_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { system, prompt } = buildContentPrompt({
    business: { name: business.name, category: business.category },
    source: source as ContentSource,
    format,
  });

  try {
    const { text } = await generateOnce({ task: 'beiwe', system, prompt });
    const result = parseJsonResult<ContentResult>(text);
    if (!result?.tr?.caption || !result?.en?.caption || !result?.ru?.caption) {
      return NextResponse.json({ error: 'İçerik üretilemedi, lütfen tekrar deneyin.' }, { status: 502 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error('[content/generate] failed', err);
    return NextResponse.json({ error: 'İçerik üretilirken bir hata oluştu.' }, { status: 500 });
  }
}
