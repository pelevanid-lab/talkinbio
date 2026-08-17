import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { normalizeEditorialLocale } from '@/components/editorial/editorialTranslations';
import { createRateLimiter, shortError } from '@/utils/kesfetSignal';

const isRateLimited = createRateLimiter(8);

type Simulation = {
  scene: string;
  customer: { visible: string; underlying: string; tension: string };
  market: { signals: string[]; alternative: string; change: string };
  insight: { pattern: string; decision: string; test: string };
  turningPoint: string;
};

function cleanModelText(value: string): string {
  return value
    .replace(/\(\s*\)/g, '')
    .replace(/[0-9₺$€£%]/g, '')
    .replace(/\s*-?\s*летн\p{L}*/giu, '')
    .replace(/\s*-\s*(?=(kişiye|katılımcıya|müşteriye|çalışana|denek|kişilik)\b)/gi, ' birkaç ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();
}

function cleanSimulation(parsed: Simulation): Simulation {
  return {
    scene: cleanModelText(parsed.scene),
    customer: {
      visible: cleanModelText(parsed.customer.visible),
      underlying: cleanModelText(parsed.customer.underlying),
      tension: cleanModelText(parsed.customer.tension),
    },
    market: {
      signals: parsed.market.signals.map(cleanModelText).filter(Boolean),
      alternative: cleanModelText(parsed.market.alternative),
      change: cleanModelText(parsed.market.change),
    },
    insight: {
      pattern: cleanModelText(parsed.insight.pattern),
      decision: cleanModelText(parsed.insight.decision),
      test: cleanModelText(parsed.insight.test),
    },
    turningPoint: cleanModelText(parsed.turningPoint),
  };
}

function parseSimulation(text: string): Simulation | null {
  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    if (
      typeof parsed?.scene === 'string' &&
      typeof parsed?.customer?.visible === 'string' &&
      typeof parsed?.customer?.underlying === 'string' &&
      typeof parsed?.customer?.tension === 'string' &&
      Array.isArray(parsed?.market?.signals) &&
      parsed.market.signals.length >= 2 &&
      parsed.market.signals.every((signal: unknown) => typeof signal === 'string') &&
      typeof parsed?.market?.alternative === 'string' &&
      typeof parsed?.market?.change === 'string' &&
      typeof parsed?.insight?.pattern === 'string' &&
      typeof parsed?.insight?.decision === 'string' &&
      typeof parsed?.insight?.test === 'string' &&
      typeof parsed?.turningPoint === 'string'
    ) {
      const simulation = cleanSimulation(parsed as Simulation);
      if (
        simulation.scene &&
        simulation.customer.visible &&
        simulation.customer.underlying &&
        simulation.customer.tension &&
        simulation.market.signals.length >= 2 &&
        simulation.market.alternative &&
        simulation.market.change &&
        simulation.insight.pattern &&
        simulation.insight.decision &&
        simulation.insight.test &&
        simulation.turningPoint
      ) return simulation;
    }
  } catch { /* Invalid model output is handled below. */ }
  return null;
}

function buildSystem(locale: 'tr' | 'en' | 'ru') {
  const language = locale === 'en' ? 'natural English' : locale === 'ru' ? 'natural Russian' : 'natural Turkish';
  return `You design educational cases using Kotler and Keller's approach to marketing information systems, customer needs, market intelligence, marketing research, and demand.
Turn the user's business idea into a fictional but realistic customer decision moment. Do not pretend to know real market data. Unless supplied by the user, do not invent numbers, ages, quantities, distance, time, prices, rates, market size, demographics, behavioral frequency, demand, or success claims. Frame every market statement as an observation or hypothesis to investigate, not a verified finding. Do not invent a success threshold for the test; state what should be observed. Keep observation and insight distinct. Write every user-facing value in ${language}, with concrete, concise, curiosity-provoking language.
Return ONLY valid JSON, without markdown. Exact schema:
{"scene":"iki ya da üç cümlelik müşteri sahnesi","customer":{"visible":"Görünen istek, kısa ifade","underlying":"Derindeki ihtiyaç, kısa ifade","tension":"Kararı zorlaştıran gerilim, kısa ifade"},"market":{"signals":["gözlenebilecek sinyal","gözlenebilecek sinyal","gözlenebilecek sinyal"],"alternative":"Müşterinin bugünkü alternatifi","change":"İzlenmesi gereken çevresel değişim"},"insight":{"pattern":"Sınanabilir örüntü cümlesi","decision":"Bu örüntü doğruysa değişecek pazarlama kararı","test":"Ucuz, etik ve küçük ilk araştırma testi"},"turningPoint":"Vakayı tersine çevirebilecek kritik öğrenme"}`;
}

export async function POST(request: NextRequest) {
  const fallbackLocale = normalizeEditorialLocale(request.headers.get('accept-language')?.split(',')[0] || 'tr');
  const messages = {
    tr: { rate: 'Çok hızlı deneme yaptın. Bir dakika sonra yeniden dene.', invalid: 'Geçersiz istek.', short: 'Fikrini biraz daha ayrıntılı tarif et.', config: 'Claude bağlantısı henüz yapılandırılmamış.', format: 'Vaka beklenen biçimde kurulamadı. Lütfen yeniden dene.', unavailable: 'Claude şu anda yanıt veremiyor. Biraz sonra yeniden dene.' },
    en: { rate: 'Too many attempts. Please try again in a minute.', invalid: 'Invalid request.', short: 'Describe your idea in a little more detail.', config: 'The Claude connection has not been configured yet.', format: 'The case could not be built in the expected format. Please try again.', unavailable: 'Claude is unavailable right now. Please try again shortly.' },
    ru: { rate: 'Слишком много попыток. Повторите через минуту.', invalid: 'Некорректный запрос.', short: 'Опишите идею немного подробнее.', config: 'Подключение к Claude пока не настроено.', format: 'Не удалось создать кейс в нужном формате. Попробуйте ещё раз.', unavailable: 'Claude сейчас недоступен. Попробуйте немного позже.' },
  };
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(ip)) return NextResponse.json({ error: messages[fallbackLocale].rate }, { status: 429 });

  let body: { idea?: unknown; locale?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: messages[fallbackLocale].invalid }, { status: 400 }); }
  const locale = normalizeEditorialLocale(typeof body.locale === 'string' ? body.locale : fallbackLocale);
  const copy = messages[locale];
  const idea = typeof body.idea === 'string' ? body.idea.trim().slice(0, 500) : '';
  if (idea.length < 10) return NextResponse.json({ error: copy.short }, { status: 400 });
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: copy.config }, { status: 503 });

  try {
    const model = process.env.CUSTOMER_INSIGHT_ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';
    const system = buildSystem(locale);
    const first = await generateText({ model: anthropic(model), system, prompt: `Business idea: ${JSON.stringify(idea)}` });
    let simulation = parseSimulation(first.text);
    if (!simulation) {
      const retry = await generateText({
        model: anthropic(model),
        system: `${system}\nIMPORTANT: The previous response used an invalid format or unsupported quantities. Return valid JSON without numbers, money, rates, or claims of exact market data, and keep every user-facing value in ${locale === 'en' ? 'natural English' : locale === 'ru' ? 'natural Russian' : 'natural Turkish'}.`,
        prompt: `Business idea: ${JSON.stringify(idea)}`,
      });
      simulation = parseSimulation(retry.text);
    }
    if (!simulation) return NextResponse.json({ error: copy.format }, { status: 502 });
    return NextResponse.json({ simulation });
  } catch (error) {
    console.warn('[customer-insight-simulation] Claude unavailable:', shortError(error));
    return NextResponse.json({ error: copy.unavailable }, { status: 502 });
  }
}
