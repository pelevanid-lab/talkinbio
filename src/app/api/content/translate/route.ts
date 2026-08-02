import { NextResponse } from 'next/server';
import { createClient as createServerSupabase } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { generateOnce } from '@/agents/shared/generateOnce';
import { parseJsonResult } from '@/agents/shared/parseJsonResult';
import {
  buildTranslatePrompt,
  extractLocaleText,
  mergeLocaleTranslations,
  isSyncableType,
  type BlockLocaleText,
} from '@/agents/saule/modes/studio/localeSync';
import { LOCALE_KEYS, type LocaleKey } from '@/config/localeTitles';
import { recordUsageEvent } from '@/agents/shared/usage';
import { deductCredits, SAULE_STUDIO_UPDATE_CREDIT_COST } from '@/agents/shared/credits';

// A translation of several list items into 2 languages can run past the default budget; give it room.
export const maxDuration = 60;

function isLocaleKey(v: unknown): v is LocaleKey {
  return typeof v === 'string' && (LOCALE_KEYS as string[]).includes(v);
}

/**
 * Editor-side "sync other languages" (Feature 2): the owner edited one locale of a block in the
 * editor and confirmed the auto-translate prompt. Translates the source locale into the given
 * targets and returns the MERGED content (source + non-text fields preserved) for the client to
 * save. Owner-auth + credit-metered, mirroring /api/content/generate.
 */
export async function POST(req: Request) {
  const { businessId, type, content, sourceLocale, targetLocales } = await req.json();

  if (!businessId || !isSyncableType(type) || !content || !isLocaleKey(sourceLocale) || !Array.isArray(targetLocales)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const targets = (targetLocales as unknown[]).filter(
    (l): l is LocaleKey => isLocaleKey(l) && l !== sourceLocale,
  );
  if (targets.length === 0) {
    return NextResponse.json({ content }); // nothing to translate into
  }

  // Only the business owner may translate their own business's content (same guard as content/generate).
  const { data: business } = await supabaseAdmin.from('businesses').select('owner_id, name, category, credit_balance').eq('id', businessId).single();
  const supabaseAuth = await createServerSupabase();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!business || !user || user.id !== business.owner_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  if (business.credit_balance <= 0) {
    return NextResponse.json({ error: 'credits_exhausted' }, { status: 402 });
  }

  const source = extractLocaleText(type, content, sourceLocale);
  const { system, prompt } = buildTranslatePrompt({ type, sourceLocale, targetLocales: targets, source });

  try {
    const { text, usage, model } = await generateOnce({ task: 'saule', system, prompt });
    const parsed = parseJsonResult<Record<string, BlockLocaleText>>(text);

    const byLocale: Partial<Record<LocaleKey, BlockLocaleText>> = {};
    for (const loc of targets) {
      if (parsed?.[loc]) byLocale[loc] = parsed[loc];
    }
    if (Object.keys(byLocale).length === 0) {
      return NextResponse.json({ error: 'translate_failed' }, { status: 502 });
    }

    const merged = mergeLocaleTranslations(type, content, byLocale);

    await recordUsageEvent(supabaseAdmin, { businessId, agent: 'saule', channel: 'web', model, usage, creditsCharged: SAULE_STUDIO_UPDATE_CREDIT_COST });
    await deductCredits(supabaseAdmin, businessId, SAULE_STUDIO_UPDATE_CREDIT_COST);

    return NextResponse.json({ content: merged, syncedLocales: Object.keys(byLocale) });
  } catch (err) {
    console.error('[content/translate] failed', err);
    return NextResponse.json({ error: 'translate_failed' }, { status: 500 });
  }
}
