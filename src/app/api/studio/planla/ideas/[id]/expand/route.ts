import { NextResponse } from 'next/server';
import { createClient as createServerSupabase } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { generateOnce } from '@/agents/shared/generateOnce';
import { parseJsonResult } from '@/agents/shared/parseJsonResult';
import { buildContentPrompt, type ContentFormat } from '@/agents/saule/modes/studio/contentPrompt';
import { isContentPlanFormat, type ContentCaptionResult } from '@/config/contentPlan';

/**
 * Planla → "Metne dönüştür". Yeni bir prompt YAZMIYOR — mevcut `buildContentPrompt`'u
 * (content/generate route'unun kullandığı AYNI fonksiyon) sentetik bir `ContentSource`
 * (`type:'general'`, fikrin başlığı+brief'i) ile çağırıyor. Sonuç `generated_caption`'a
 * yazılıp ÖNBELLEKLENİYOR — bir daha "Metne dönüştür"e basınca yeniden üretmiyor,
 * doğrudan kayıtlı sonucu döner (GET benzeri idempotent davranış).
 *
 * `/api/content/generate` gibi kredi ALMIYOR — tutarlılık: o da almıyor.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { force } = await req.json().catch(() => ({ force: false }));

  const { data: item } = await supabaseAdmin
    .from('content_plan_items')
    .select('business_id, title, brief, format, generated_caption')
    .eq('id', id)
    .maybeSingle();
  if (!item) {
    return NextResponse.json({ error: 'Bulunamadı.' }, { status: 404 });
  }

  const { data: business } = await supabaseAdmin.from('businesses').select('owner_id, name, category').eq('id', item.business_id).single();
  const supabaseAuth = await createServerSupabase();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!business || !user || user.id !== business.owner_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  if (item.generated_caption && !force) {
    return NextResponse.json({ captions: item.generated_caption as ContentCaptionResult, cached: true });
  }

  const format: ContentFormat = isContentPlanFormat(item.format) ? item.format : 'instagram_post';
  const { system, prompt } = buildContentPrompt({
    business: { name: business.name, category: business.category },
    source: { type: 'general', title: item.title, description: item.brief || undefined },
    format,
  });

  try {
    const { text } = await generateOnce({ task: 'saule', system, prompt });
    const result = parseJsonResult<ContentCaptionResult>(text);
    if (!result?.tr?.caption || !result?.en?.caption || !result?.ru?.caption) {
      return NextResponse.json({ error: 'İçerik üretilemedi, lütfen tekrar dene.' }, { status: 502 });
    }

    await supabaseAdmin.from('content_plan_items').update({ generated_caption: result, updated_at: new Date().toISOString() }).eq('id', id);

    return NextResponse.json({ captions: result, cached: false });
  } catch (err) {
    console.error('[planla/ideas/:id/expand] failed', err);
    return NextResponse.json({ error: 'İçerik üretilirken bir hata oluştu.' }, { status: 500 });
  }
}
