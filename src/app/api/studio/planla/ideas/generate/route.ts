import { NextResponse } from 'next/server';
import { createClient as createServerSupabase } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { generateOnce } from '@/agents/shared/generateOnce';
import { generateGroundedIdeas } from '@/agents/saule/trendSearch';
import { parseJsonResult } from '@/agents/shared/parseJsonResult';
import { buildIdeaPrompt } from '@/agents/saule/modes/studio/ideaPrompt';
import { recordUsageEvent } from '@/agents/shared/usage';
import {
  parseContentPillars,
  isContentPlanFormat,
  PLANLA_IDEA_GENERATE_COST_USD,
  PLANLA_IDEA_GENERATE_GROUNDED_COST_USD,
  type ContentPlanItem,
} from '@/config/contentPlan';
import { assertSufficientCredits, deductForGeneration, InsufficientCreditsError } from '@/utils/creativeStudioCredits';

export const maxDuration = 60;

const MIN_COUNT = 1;
const MAX_COUNT = 6;
const MAX_TITLE_LENGTH = 120;
const MAX_BRIEF_LENGTH = 400;
const MAX_TREND_NOTE_LENGTH = 200;

type RawIdea = { pillarLabel?: unknown; title?: unknown; brief?: unknown; format?: unknown; trendNote?: unknown };

/**
 * Planla → flagship eylem: "Bu hafta için fikir üret". `grounded` false ise mevcut
 * `generateOnce` (tool yok, ucuz), true ise `generateGroundedIdeas` (Anthropic web
 * search, pahalı) çağrılır — aynı `buildIdeaPrompt` her ikisinde de kullanılıyor,
 * yalnızca sistem talimatındaki arama emri değişiyor (bkz. ideaPrompt.ts).
 *
 * Kredi deseni `creativeStudioCredits.ts`'ten ($ bazlı `assertSufficientCredits`/
 * `deductForGeneration`) — `/api/content/*`'in düz `deductCredits` deseninden FARKLI,
 * bilerek: bu eylemin gerçek bir $ maliyeti var (LLM + olası web search), sabit bir
 * kredi sayısı değil.
 */
export async function POST(req: Request) {
  const { businessId, count: rawCount, grounded } = await req.json();
  if (!businessId) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const count = Math.min(MAX_COUNT, Math.max(MIN_COUNT, Number.isFinite(rawCount) ? Math.round(rawCount) : 3));
  const isGrounded = grounded === true;

  const { data: business } = await supabaseAdmin
    .from('businesses')
    .select('owner_id, name, category, content_pillars')
    .eq('id', businessId)
    .single();
  const supabaseAuth = await createServerSupabase();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!business || !user || user.id !== business.owner_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const costUsd = isGrounded ? PLANLA_IDEA_GENERATE_GROUNDED_COST_USD : PLANLA_IDEA_GENERATE_COST_USD;
  try {
    await assertSufficientCredits(businessId, costUsd);
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json({ error: 'Yetersiz kredi.', requiredCredits: err.requiredCredits, balance: err.balance }, { status: 402 });
    }
    throw err;
  }

  const pillars = parseContentPillars(business.content_pillars);
  const { system, prompt } = buildIdeaPrompt({
    business: { name: business.name, category: business.category },
    pillars,
    count,
    grounded: isGrounded,
  });

  try {
    const { text, model, usage } = isGrounded
      ? await generateGroundedIdeas({ system, prompt })
      : await generateOnce({ task: 'saule', system, prompt });

    const parsed = parseJsonResult<RawIdea[]>(text);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return NextResponse.json({ error: 'Fikir üretilemedi, lütfen tekrar dene.' }, { status: 502 });
    }

    const pillarByLabel = new Map(pillars.map((p) => [p.label.trim().toLowerCase(), p.id]));

    const rows = parsed
      .filter((idea): idea is RawIdea & { title: string } => typeof idea?.title === 'string' && idea.title.trim().length > 0)
      .slice(0, count)
      .map((idea) => ({
        business_id: businessId,
        pillar_id: typeof idea.pillarLabel === 'string' ? pillarByLabel.get(idea.pillarLabel.trim().toLowerCase()) ?? null : null,
        status: 'idea' as const,
        title: idea.title.trim().slice(0, MAX_TITLE_LENGTH),
        brief: typeof idea.brief === 'string' ? idea.brief.trim().slice(0, MAX_BRIEF_LENGTH) : null,
        format: isContentPlanFormat(idea.format) ? idea.format : 'instagram_post',
        source: 'ai' as const,
        trend_note: isGrounded && typeof idea.trendNote === 'string' ? idea.trendNote.trim().slice(0, MAX_TREND_NOTE_LENGTH) || null : null,
      }));

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Fikir üretilemedi, lütfen tekrar dene.' }, { status: 502 });
    }

    const { data: inserted, error } = await supabaseAdmin.from('content_plan_items').insert(rows).select();
    if (error) {
      console.error('[planla/ideas/generate] insert failed', error);
      return NextResponse.json({ error: 'Fikirler kaydedilemedi.' }, { status: 500 });
    }

    const { creditsCharged } = await deductForGeneration(businessId, costUsd);
    await recordUsageEvent(supabaseAdmin, {
      businessId,
      agent: 'beiwe',
      channel: 'web',
      model,
      usage: (usage as { inputTokens?: number; outputTokens?: number }) || {},
      creditsCharged,
    });

    return NextResponse.json({ items: inserted as ContentPlanItem[] });
  } catch (err) {
    console.error('[planla/ideas/generate] failed', err, `grounded=${isGrounded}`);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Fikir üretilirken bir hata oluştu.' }, { status: 500 });
  }
}
