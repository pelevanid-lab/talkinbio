import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { isAuthorizedCronRequest } from '@/utils/cronAuth';
import { generateOnce } from '@/agents/shared/generateOnce';
import { recordUsageEvent } from '@/agents/shared/usage';
import { notifyAdmin } from '@/agents/shared/notifyAdmin';
import {
  buildAnalysisPrompt,
  buildInsightTriggerMessage,
  buildTranscriptExcerpt,
  parseAnalysisResult,
} from '@/agents/shared/analyzeConversations';

// Vercel Cron: Pazartesi 06:00 UTC (vercel.json). Son 7 günün Saule konuşmalarını
// tarayıp beiwe_insights'a yazar — bkz. ROADMAP.md Faz 3.1.
export const maxDuration = 300;

const MIN_USER_MESSAGES = 3;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const since = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();

    const { data: businesses, error: businessesError } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('is_published', true);

    if (businessesError) {
      await notifyAdmin('[analyze-conversations] cron başarısız oldu', `İşletme listesi çekilemedi: ${businessesError.message}`);
      return NextResponse.json({ error: businessesError.message }, { status: 500 });
    }

    let businessesProcessed = 0;
    let insightsCreated = 0;
    let businessesFailed = 0;

    for (const business of businesses || []) {
      try {
        const { data: conversations } = await supabaseAdmin
          .from('conversations')
          .select('id')
          .eq('business_id', business.id)
          .eq('is_preview', false);

        const conversationIds = (conversations || []).map((c) => c.id);
        if (conversationIds.length === 0) continue;

        const { data: messages } = await supabaseAdmin
          .from('messages')
          .select('content')
          .in('conversation_id', conversationIds)
          .eq('role', 'user')
          .gte('created_at', since);

        const userMessages = (messages || []).map((m) => m.content as string);
        if (userMessages.length < MIN_USER_MESSAGES) continue;

        businessesProcessed++;

        const { system, prompt } = buildAnalysisPrompt(buildTranscriptExcerpt(userMessages));
        const { text, usage, model } = await generateOnce({ task: 'analysis', system, prompt });
        await recordUsageEvent(supabaseAdmin, { businessId: business.id, agent: 'analysis', channel: 'cron', model, usage });
        const result = parseAnalysisResult(text);

        if (!result || result.topics.length === 0) continue;

        const rows = result.topics.map((topic) => ({
          business_id: business.id,
          type: 'faq-suggestion',
          payload: {
            topic: topic.question,
            count: topic.count,
            summary: result.summary,
            suggestedTriggerMessage: buildInsightTriggerMessage(topic.question),
          },
          status: 'new',
        }));

        const { error: insertError } = await supabaseAdmin.from('beiwe_insights').insert(rows);
        if (insertError) {
          console.error('[analyze-conversations] insert failed', { businessId: business.id, error: insertError });
          businessesFailed++;
          continue;
        }
        insightsCreated += rows.length;
      } catch (err) {
        console.error('[analyze-conversations] failed for business', { businessId: business.id, err });
        businessesFailed++;
      }
    }

    if (businessesFailed > 0) {
      await notifyAdmin(
        '[analyze-conversations] cron kısmi hatayla tamamlandı',
        `${businessesFailed} işletme işlenirken hata oluştu (toplam ${businessesProcessed} işlendi). Detaylar için Vercel loglarına bakın.`
      );
    }

    return NextResponse.json({ businessesProcessed, insightsCreated, businessesFailed });
  } catch (err) {
    console.error('[analyze-conversations] cron failed', err);
    await notifyAdmin('[analyze-conversations] cron başarısız oldu', `Beklenmeyen hata: ${err instanceof Error ? err.message : String(err)}`);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
