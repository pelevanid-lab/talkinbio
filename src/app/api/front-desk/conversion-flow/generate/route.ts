import { NextResponse } from 'next/server';
import { createClient as createServerSupabase } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { parseJsonResult } from '@/agents/shared/parseJsonResult';
import { resolveInteractiveEntryTargets } from '@/utils/interactiveEntry';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { assertSufficientCredits, deductForGeneration, InsufficientCreditsError } from '@/utils/creativeStudioCredits';
import { recordUsageEvent } from '@/agents/shared/usage';

type LocaleCode = 'tr' | 'en' | 'ru';
const CONVERSION_FLOW_GENERATE_COST_USD = 0.05;
type GeneratedQuestion = {
  id: string;
  label: string;
  answer: string;
  next?: GeneratedQuestion[];
};
type GeneratedFlow = {
  nodes: Record<string, {
    locales: Record<LocaleCode, { questions: GeneratedQuestion[] }>;
  }>;
};

function blockTitle(block: any, locale: LocaleCode) {
  return block.content?.[locale]?.title || block.content?.tr?.title || block.title || block.type;
}

function compactBlock(block: any) {
  return {
    id: block.id,
    type: block.type,
    title: {
      tr: blockTitle(block, 'tr'),
      en: blockTitle(block, 'en'),
      ru: blockTitle(block, 'ru'),
    },
    content: block.content,
  };
}

function compactText(value: unknown, maxLength = 420): string {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function blockSummary(block: any, locale: LocaleCode): string {
  const localized = block.content?.[locale] || block.content?.tr || block.content || {};
  const items = Array.isArray(block.content?.items) ? block.content.items : [];
  const firstItem = items[0]?.[locale] || items[0]?.tr || items[0] || {};
  return compactText(
    firstItem.description ||
    firstItem.answer ||
    firstItem.caption ||
    localized.text ||
    localized.description ||
    localized.intro ||
    block.content?.intro ||
    blockTitle(block, locale)
  );
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 48) || 'question';
}

function fallbackQuestions(block: any, locale: LocaleCode): GeneratedQuestion[] {
  const title = blockTitle(block, locale);
  const summary = blockSummary(block, locale);
  const cleanTitle = compactText(title, 80);

  if (locale === 'en') {
    return [
      {
        id: `${slug(cleanTitle)}-scope`,
        label: `What does ${cleanTitle} include?`,
        answer: summary || `This section explains the main details of ${cleanTitle}. If you want to confirm details, use the contact step.`,
        next: [{
          id: `${slug(cleanTitle)}-process`,
          label: 'How does the process work?',
          answer: summary || 'You can review the details on this page and use contact if you need clarification.',
        }],
      },
      {
        id: `${slug(cleanTitle)}-contact`,
        label: 'How can I get details?',
        answer: 'You can continue with the contact option and write which detail you want to clarify.',
        next: [{
          id: `${slug(cleanTitle)}-direct-question`,
          label: 'Can I ask a direct question?',
          answer: 'Yes. Use the contact option to ask your question directly.',
        }],
      },
    ];
  }

  if (locale === 'ru') {
    return [
      {
        id: `${slug(cleanTitle)}-scope`,
        label: `Что включает ${cleanTitle}?`,
        answer: summary || `Этот раздел объясняет основные детали ${cleanTitle}. Чтобы уточнить конкретный вопрос, используйте контакт.`,
        next: [{
          id: `${slug(cleanTitle)}-process`,
          label: 'Как проходит процесс?',
          answer: summary || 'Вы можете посмотреть детали на странице и написать через контакт, если нужен ответ на конкретный вопрос.',
        }],
      },
      {
        id: `${slug(cleanTitle)}-contact`,
        label: 'Как уточнить детали?',
        answer: 'Вы можете перейти к контакту и написать, какой момент хотите уточнить.',
        next: [{
          id: `${slug(cleanTitle)}-direct-question`,
          label: 'Можно задать вопрос напрямую?',
          answer: 'Да. Используйте контакт, чтобы задать вопрос напрямую.',
        }],
      },
    ];
  }

  return [
    {
      id: `${slug(cleanTitle)}-kapsam`,
      label: `${cleanTitle} neleri içeriyor?`,
      answer: summary || `Bu bölüm ${cleanTitle} hakkında temel bilgileri açıklar. Netleştirmek istediğiniz bir detay varsa iletişim adımını kullanabilirsiniz.`,
      next: [{
        id: `${slug(cleanTitle)}-surec`,
        label: 'Süreç nasıl ilerliyor?',
        answer: summary || 'Detayları bu sayfadan inceleyebilir, net olmayan bir nokta varsa iletişim üzerinden sorabilirsiniz.',
      }],
    },
    {
      id: `${slug(cleanTitle)}-iletisim`,
      label: 'Detayları nasıl öğrenebilirim?',
      answer: 'İletişim seçeneğine geçip hangi detayı netleştirmek istediğinizi yazabilirsiniz.',
      next: [{
        id: `${slug(cleanTitle)}-dogrudan-soru`,
        label: 'Direkt soru sorabilir miyim?',
        answer: 'Evet. İletişim seçeneğiyle sorunuzu doğrudan iletebilirsiniz.',
      }],
    },
  ];
}

function normalizeQuestions(questions: any[]): GeneratedQuestion[] {
  return (Array.isArray(questions) ? questions : [])
    .filter((question) => question?.label && question?.answer)
    .slice(0, 2)
    .map((question, index) => ({
      id: String(question.id || `q-${index + 1}`).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 48),
      label: String(question.label).slice(0, 120),
      answer: String(question.answer).slice(0, 700),
      next: (Array.isArray(question.next) ? question.next : [])
        .filter((next: any) => next?.label && next?.answer)
        .slice(0, 1)
        .map((next: any, nextIndex: number) => ({
          id: String(next.id || `q-${index + 1}-${nextIndex + 1}`).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 48),
          label: String(next.label).slice(0, 120),
          answer: String(next.answer).slice(0, 700),
        })),
    }));
}

function normalizeFlow(raw: any, targetBlocks: any[]): GeneratedFlow {
  const nodes: GeneratedFlow['nodes'] = {};
  for (const block of targetBlocks) {
    const blockId = block.id;
    const rawNode = raw?.nodes?.[blockId];
    const locales = {} as Record<LocaleCode, { questions: GeneratedQuestion[] }>;
    for (const locale of ['tr', 'en', 'ru'] as const) {
      const questions = normalizeQuestions(rawNode?.locales?.[locale]?.questions);
      locales[locale] = { questions: questions.length > 0 ? questions : fallbackQuestions(block, locale) };
    }
    nodes[blockId] = { locales };
  }
  return { nodes };
}

export async function POST(req: Request) {
  const { businessId } = await req.json();
  if (!businessId) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const supabaseAuth = await createServerSupabase();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  const { data: business } = await supabaseAdmin
    .from('businesses')
    .select('id, owner_id, name, username, category, category_id, contact_method, contact_value, saule_settings')
    .eq('id', businessId)
    .single();

  if (!business || !user || user.id !== business.owner_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { data: blocks } = await supabaseAdmin
    .from('blocks')
    .select('id, type, title, content, order, is_visible')
    .eq('business_id', business.id)
    .eq('is_visible', true)
    .order('order', { ascending: true });

  const { data: knowledge } = await supabaseAdmin
    .from('saule_knowledge')
    .select('title, content, locale, tags')
    .eq('business_id', business.id)
    .order('created_at', { ascending: false })
    .limit(40);

  const targetBlockIds = resolveInteractiveEntryTargets(blocks || [], business.saule_settings?.interactiveEntry).discoverBlockIds.slice(0, 3);
  if (targetBlockIds.length === 0) {
    return NextResponse.json({ error: 'No conversion targets' }, { status: 400 });
  }

  const rawTargetBlocks = (blocks || []).filter((block) => targetBlockIds.includes(block.id));
  const targetBlocks = rawTargetBlocks.map(compactBlock);
  const context = {
    business: {
      name: business.name,
      username: business.username,
      category: business.category,
      categoryId: business.category_id,
      contactMethod: business.contact_method,
      contactValue: business.contact_value,
      settings: business.saule_settings,
    },
    targetBlockIds,
    targetBlocks,
    otherBlockTitles: (blocks || [])
      .filter((block) => !targetBlockIds.includes(block.id))
      .map((block) => ({ id: block.id, type: block.type, title: blockTitle(block, 'tr') }))
      .slice(0, 30),
    knowledge: (knowledge || []).map((item: any) => ({
      title: item.title,
      locale: item.locale,
      tags: item.tags,
      content: compactText(item.content, 900),
    })),
  };

  const system = [
    'You design deterministic Conversion UI question trees for Talkinbio profiles.',
    'Use only the supplied business page content, settings, contact info, and knowledge base.',
    'Do not invent prices, availability, credentials, policies, phone numbers, or guarantees.',
    'The public UI is a single scroll flow: first show 2 suggested questions, then after an answer show 1 next question and contact.',
    'Generate concise natural questions, not menu labels. Answers should be useful but short.',
    'This is not a qualification quiz or product chooser. The visitor already chose a block; help them understand that exact block.',
    'Do not compare this block with another service, do not introduce alternatives such as online vs in-person, and do not ask "is it right for me" unless those exact alternatives or eligibility rules are explicitly present in the supplied content.',
    'Return only valid JSON. No markdown.',
  ].join(' ');

  const prompt = [
    'Create a conversionFlow JSON for exactly the targetBlockIds.',
    'For each target block and each locale tr/en/ru, create exactly 2 first-level questions.',
    'Each first-level question must have exactly 1 next question. Do not create a third deterministic suggested question; after the connected follow-up, the UI opens an AI-supported free question field.',
    'Shape:',
    '{"nodes":{"BLOCK_ID":{"locales":{"tr":{"questions":[{"id":"...","label":"...","answer":"...","next":[{"id":"...","label":"...","answer":"..."}]}]},"en":{"questions":[]},"ru":{"questions":[]}}}}}',
    'Rules:',
    '- ids must be stable lowercase slug-like strings.',
    '- labels are user questions.',
    '- labels should ask about the current block: scope, contents, process, duration, price, booking, requirements, or contact details when those facts exist.',
    '- never create choose-between-options questions unless the source content explicitly presents those options.',
    '- avoid generic fit questions like "bana uygun mu?", "is this right for me?", or equivalents.',
    '- answers are deterministic and grounded in provided content.',
    '- if uncertain, answer by recommending contact instead of inventing.',
    '- Turkish text must be natural Turkish; English natural English; Russian natural Russian.',
    '',
    'Context JSON:',
    JSON.stringify(context).slice(0, 36000),
  ].join('\n');

  try {
    await assertSufficientCredits(businessId, CONVERSION_FLOW_GENERATE_COST_USD);
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json(
        { error: 'Yetersiz kredi.', requiredCredits: error.requiredCredits, balance: error.balance },
        { status: 402 }
      );
    }
    throw error;
  }

  try {
    const modelName = process.env.AI_MODEL_CONVERSION_FLOW || 'claude-haiku-4-5-20251001';
    const { text, usage } = await generateText({
      model: anthropic(modelName),
      system,
      prompt,
      temperature: 0.2,
      maxOutputTokens: 8000,
    });
    const parsed = parseJsonResult<GeneratedFlow>(text);
    if (!parsed) {
      console.warn('[conversion-flow/generate] model returned non-json; using fallback', text.slice(0, 500));
    }
    const flow = normalizeFlow(parsed, rawTargetBlocks);
    const { creditsCharged } = await deductForGeneration(businessId, CONVERSION_FLOW_GENERATE_COST_USD);
    await recordUsageEvent(supabaseAdmin, {
      businessId,
      agent: 'beiwe',
      channel: 'web',
      model: modelName,
      usage: (usage as { inputTokens?: number; outputTokens?: number }) || {},
      creditsCharged,
    });
    return NextResponse.json({ conversionFlow: flow });
  } catch (error) {
    console.error('[conversion-flow/generate] failed', error);
    return NextResponse.json({ error: 'Flow generation failed.' }, { status: 500 });
  }
}
