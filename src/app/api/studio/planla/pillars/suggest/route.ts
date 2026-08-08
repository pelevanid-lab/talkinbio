import { NextResponse } from 'next/server';
import { createClient as createServerSupabase } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { generateOnce } from '@/agents/shared/generateOnce';
import { parseJsonResult } from '@/agents/shared/parseJsonResult';
import { buildPillarPrompt } from '@/agents/saule/modes/studio/pillarPrompt';
import { parseContentPillars } from '@/config/contentPlan';

/**
 * Planla → "Sütun öner". `/api/content/generate` ile AYNI auth deseni (business-owner,
 * `authorizeCharacterRequest` DEĞİL — bu karakter değil işletme kapsamlı). Yalnızca
 * ÖNERİR, kaydetmez — istemci onayladıktan sonra `PATCH /api/studio/planla/pillars`
 * ile kaydeder. Kredi almıyor (`/api/content/generate` gibi ucuz/temel bir çağrı).
 */
export async function POST(req: Request) {
  const { businessId } = await req.json();
  if (!businessId) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { data: business } = await supabaseAdmin.from('businesses').select('owner_id, name, category').eq('id', businessId).single();
  const supabaseAuth = await createServerSupabase();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!business || !user || user.id !== business.owner_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { system, prompt } = buildPillarPrompt({ business: { name: business.name, category: business.category } });

  try {
    const { text } = await generateOnce({ task: 'saule', system, prompt });
    const parsed = parseJsonResult<unknown>(text);
    const pillars = parseContentPillars(parsed);
    if (pillars.length === 0) {
      return NextResponse.json({ error: 'Sütun önerilemedi, lütfen tekrar dene.' }, { status: 502 });
    }
    return NextResponse.json({ pillars });
  } catch (err) {
    console.error('[planla/pillars/suggest] failed', err);
    return NextResponse.json({ error: 'Sütun önerilirken bir hata oluştu.' }, { status: 500 });
  }
}
