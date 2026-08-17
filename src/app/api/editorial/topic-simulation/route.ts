import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { getEditorialTopic } from '@/components/editorial/editorialData';
import { normalizeEditorialLocale } from '@/components/editorial/editorialTranslations';
import { getTopicLearningPlan } from '@/components/editorial/topicLearningData';
import { createRateLimiter, shortError } from '@/utils/kesfetSignal';

const isRateLimited = createRateLimiter(8);

type TopicSimulation = {
  scene: string;
  stages: Array<{ title: string; observation: string; tension: string }>;
  pattern: string;
  decision: string;
  test: string;
  turningPoint: string;
  checks: Array<{ criterion: string; finding: string }>;
};

function cleanText(value: string) {
  return value
    .replace(/\(\s*\)/g, '')
    .replace(/[0-9₺$€£%]/g, '')
    .replace(/\s*-?\s*летн\p{L}*/giu, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();
}

function parseSimulation(text: string, expectedTitles: string[], expectedCriteria: string[]): TopicSimulation | null {
  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    if (
      typeof parsed?.scene !== 'string' ||
      !Array.isArray(parsed?.stages) ||
      parsed.stages.length !== 3 ||
      !parsed.stages.every((stage: unknown) => {
        if (!stage || typeof stage !== 'object') return false;
        const candidate = stage as Record<string, unknown>;
        return typeof candidate.title === 'string' && typeof candidate.observation === 'string' && typeof candidate.tension === 'string';
      }) ||
      typeof parsed?.pattern !== 'string' ||
      typeof parsed?.decision !== 'string' ||
      typeof parsed?.test !== 'string' ||
      typeof parsed?.turningPoint !== 'string' ||
      !Array.isArray(parsed?.checks) ||
      parsed.checks.length !== expectedCriteria.length ||
      !parsed.checks.every((check: unknown) => {
        if (!check || typeof check !== 'object') return false;
        const candidate = check as Record<string, unknown>;
        return typeof candidate.finding === 'string';
      })
    ) return null;

    const simulation: TopicSimulation = {
      scene: cleanText(parsed.scene),
      stages: parsed.stages.map((stage: TopicSimulation['stages'][number], index: number) => ({
        title: expectedTitles[index],
        observation: cleanText(stage.observation),
        tension: cleanText(stage.tension),
      })),
      pattern: cleanText(parsed.pattern),
      decision: cleanText(parsed.decision),
      test: cleanText(parsed.test),
      turningPoint: cleanText(parsed.turningPoint),
      checks: parsed.checks.map((check: { finding: string }, index: number) => ({
        criterion: expectedCriteria[index],
        finding: cleanText(check.finding),
      })),
    };

    return simulation.scene && simulation.stages.every((stage) => stage.observation && stage.tension) && simulation.pattern && simulation.decision && simulation.test && simulation.turningPoint && simulation.checks.every((check) => check.finding)
      ? simulation
      : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const fallbackLocale = normalizeEditorialLocale(request.headers.get('accept-language')?.split(',')[0] || 'tr');
  const fallbackErrors = {
    tr: { rate: 'Çok hızlı deneme yaptın. Bir dakika sonra yeniden dene.', invalid: 'Geçersiz istek.', short: 'Vakayı biraz daha ayrıntılı tarif et.', missing: 'Bu konu için simülasyon bulunamadı.', config: 'Claude bağlantısı henüz yapılandırılmamış.', format: 'Vaka beklenen biçimde kurulamadı. Lütfen yeniden dene.', unavailable: 'Claude şu anda yanıt veremiyor. Biraz sonra yeniden dene.' },
    en: { rate: 'Too many attempts. Please try again in a minute.', invalid: 'Invalid request.', short: 'Describe the case in a little more detail.', missing: 'No simulation is available for this topic.', config: 'The Claude connection has not been configured yet.', format: 'The case could not be built in the expected format. Please try again.', unavailable: 'Claude is unavailable right now. Please try again shortly.' },
    ru: { rate: 'Слишком много попыток. Повторите через минуту.', invalid: 'Некорректный запрос.', short: 'Опишите кейс немного подробнее.', missing: 'Для этой темы симуляция недоступна.', config: 'Подключение к Claude пока не настроено.', format: 'Не удалось создать кейс в нужном формате. Попробуйте ещё раз.', unavailable: 'Claude сейчас недоступен. Попробуйте немного позже.' },
  };
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(ip)) return NextResponse.json({ error: fallbackErrors[fallbackLocale].rate }, { status: 429 });

  let body: { idea?: unknown; topicSlug?: unknown; locale?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: fallbackErrors[fallbackLocale].invalid }, { status: 400 });
  }

  const locale = normalizeEditorialLocale(typeof body.locale === 'string' ? body.locale : fallbackLocale);
  const errors = fallbackErrors[locale];
  const idea = typeof body.idea === 'string' ? body.idea.trim().slice(0, 500) : '';
  const topicSlug = typeof body.topicSlug === 'string' ? body.topicSlug : '';
  const topic = getEditorialTopic(topicSlug, locale);
  const plan = getTopicLearningPlan(topicSlug, locale);

  if (idea.length < 10) return NextResponse.json({ error: errors.short }, { status: 400 });
  if (!topic || !plan) return NextResponse.json({ error: errors.missing }, { status: 404 });
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: errors.config }, { status: 503 });

  const elementBrief = plan.elements
    .map((element, index) => `${index + 1}. ${element.title}: ${element.definition} Temel soru: ${element.question}`)
    .join('\n');
  const expectedTitles = plan.elements.map((element) => element.title);
  const expectedCriteria = plan.simulation.criteria || [];
  const outputSchema = JSON.stringify({
    scene: 'iki veya üç cümlelik karar sahnesi',
    stages: expectedTitles.map((title, index) => ({
      title,
      observation: `${index + 1}. unsurun vakadaki görünümü`,
      tension: 'bu unsurun yarattığı karar gerilimi',
    })),
    pattern: 'üç unsur arasındaki sınanabilir bağ',
    decision: 'örüntü doğruysa değişecek tek pazarlama kararı',
    test: 'ucuz, etik ve küçük ilk test',
    turningPoint: 'vakayı tersine çevirebilecek kritik öğrenme',
    checks: expectedCriteria.map((criterion) => ({ criterion, finding: `${criterion} kriteri için doğrulanması gereken bulgu` })),
  });
  const language = locale === 'en' ? 'natural English' : locale === 'ru' ? 'natural Russian' : 'natural Turkish';
  const system = `You facilitate educational marketing cases.
Topic: ${topic.title}
Core thesis: ${topic.thesis}
Three elements to teach:
${elementBrief}

Turn the user's business into a realistic but fictional decision moment. Analyze it separately through exactly these three elements, then build the pattern between them, the marketing decision that should change, and a small test.
${plan.simulation.modeling || ''}
Do not present unverified market information as fact. Unless supplied by the user, do not invent numbers, prices, demographics, market size, or success claims. Keep observations, hypotheses, and decisions distinct. Write every user-facing value in ${language}; keep it concrete and concise.
Return ONLY valid JSON, without markdown. Exact schema:
${outputSchema}`;

  try {
    const model = process.env.CUSTOMER_INSIGHT_ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';
    const first = await generateText({ model: anthropic(model), system, prompt: `İş veya vaka: ${JSON.stringify(idea)}` });
    let simulation = parseSimulation(first.text, expectedTitles, expectedCriteria);
    if (!simulation) {
      const retry = await generateText({
        model: anthropic(model),
        system: `${system}\nIMPORTANT: The previous response did not match the schema or included invented quantities. Return valid JSON with exactly three stages and do not use numbers, counts, rates, prices, durations, or other unsupported quantities. Keep all user-facing values in ${language}.`,
        prompt: `İş veya vaka: ${JSON.stringify(idea)}`,
      });
      simulation = parseSimulation(retry.text, expectedTitles, expectedCriteria);
    }
    if (!simulation) return NextResponse.json({ error: errors.format }, { status: 502 });
    return NextResponse.json({ simulation });
  } catch (error) {
    console.warn('[topic-simulation] Claude unavailable:', shortError(error));
    return NextResponse.json({ error: errors.unavailable }, { status: 502 });
  }
}
