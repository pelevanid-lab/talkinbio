import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { anthropic } from '@ai-sdk/anthropic';

// Shared by /api/kesfet/search-signal and /api/kesfet/case-study — both read a search query
// through Talkinbio's SIGNAL framework (Search, Intent, Gap, Next step, Answer, Learn).
// Keys match the framework letters exactly; see homeData's touchpointPages[...].framework.steps,
// the single source of truth the frontend renders these against.

const googleProvider = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY,
});

export type SignalBreakdown = {
  s: string;
  i: string;
  g: string;
  n: string;
  a: string;
  l: string;
};

export function createRateLimiter(maxPerMinute: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return function isRateLimited(ip: string) {
    const now = Date.now();
    const current = hits.get(ip);
    if (!current || now > current.resetAt) {
      hits.set(ip, { count: 1, resetAt: now + 60_000 });
      return false;
    }
    current.count += 1;
    return current.count > maxPerMinute;
  };
}

// The exact example from the page copy gets an exact, guaranteed-quality answer — zero cost,
// zero latency, and it's the input most first-time visitors will actually try.
export function deterministicSignal(query: string): SignalBreakdown | null {
  const q = query.toLowerCase();
  if (q.includes('kaleci') && q.includes('eldiven')) {
    return {
      s: 'Çocuk kalecisi için eldiven arayışı',
      i: 'Ürün araştırması ve karşılaştırma',
      g: 'Güvenlik ve yaşa uygunluk konusunda güven eksikliği',
      n: 'Karşılaştırma sayfalarına veya pazaryerine geçiş',
      a: 'Satmadan önce belirsizliği azaltan karşılaştırma ve uzman önerisi sunmak',
      l: 'Ebeveynler fiyattan önce güvenliğe ve uzman onayına bakıyor',
    };
  }
  return null;
}

export function safeFallbackSignal(): SignalBreakdown {
  return {
    s: 'Genel, tek kelimelik bir arama',
    i: 'Belirsiz / araştırma aşaması',
    g: 'Net ve güvenilir bir ilk cevap eksik',
    n: 'Başka bir kaynağa veya arama sonucuna geçiş',
    a: 'Soruyu satmadan önce doğru anlamak',
    l: 'Tek başına yetersiz sinyal, takip aramaları gerekir',
  };
}

function signalSystemPrompt() {
  return `You analyze a short search-engine query using Talkinbio's SIGNAL framework (Search, Intent, Gap, Next step, Answer, Learn).
Respond with STRICT JSON only, no markdown, no commentary, in TURKISH, exactly this shape:
{"s": "...", "i": "...", "g": "...", "n": "...", "a": "...", "l": "..."}
Field meaning (Talkinbio SIGNAL modeli):
- s (Search): müşteri tam olarak ne arıyor, aramanın kendisini kısaca özetle
- i (Intent): aramanın arkasındaki asıl niyet ne
- g (Gap): müşteride hangi bilgi veya güven eksik
- n (Next step): müşterinin bir sonraki muhtemel davranışı ne olacak
- a (Answer): marka bu ana nasıl cevap vermeli
- l (Learn): bu sinyalden markanın ne öğrenmesi gerekir
Her alanı en fazla 12 kelimede tut. Belirli gerçek bir marka hakkında hiçbir şey uydurma. Sadece geçerli JSON döndür.`;
}

export function shortError(error: unknown) {
  if (typeof error !== 'object' || error === null) return String(error);
  const maybe = error as { statusCode?: number; data?: { error?: { status?: string; message?: string } }; message?: string };
  return `${maybe.statusCode || 'error'} ${maybe.data?.error?.status || ''} ${maybe.data?.error?.message || maybe.message || ''}`.trim();
}

function parseSignal(text: string): SignalBreakdown | null {
  try {
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (
      typeof parsed?.s === 'string' &&
      typeof parsed?.i === 'string' &&
      typeof parsed?.g === 'string' &&
      typeof parsed?.n === 'string' &&
      typeof parsed?.a === 'string' &&
      typeof parsed?.l === 'string'
    ) {
      return parsed as SignalBreakdown;
    }
    return null;
  } catch {
    return null;
  }
}

export async function generateSignal(query: string): Promise<{ signal: SignalBreakdown; provider: string }> {
  const deterministic = deterministicSignal(query);
  if (deterministic) return { signal: deterministic, provider: 'deterministic' };

  const prompt = `Arama sorgusu: "${query}"`;

  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY) {
    try {
      const { text } = await generateText({
        model: googleProvider('gemini-2.5-flash'),
        system: signalSystemPrompt(),
        prompt,
      });
      const parsed = parseSignal(text);
      if (parsed) return { signal: parsed, provider: 'gemini' };
    } catch (error) {
      console.warn('[kesfet/signal] Gemini unavailable:', shortError(error));
    }
  }

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const fallbackModel =
        process.env.KESFET_SIGNAL_ANTHROPIC_MODEL ||
        (process.env.AI_MODEL?.startsWith('claude') ? process.env.AI_MODEL : 'claude-haiku-4-5-20251001');
      const { text } = await generateText({
        model: anthropic(fallbackModel),
        system: signalSystemPrompt(),
        prompt,
      });
      const parsed = parseSignal(text);
      if (parsed) return { signal: parsed, provider: 'anthropic' };
    } catch (error) {
      console.warn('[kesfet/signal] Anthropic fallback unavailable:', shortError(error));
    }
  }

  return { signal: safeFallbackSignal(), provider: 'fallback' };
}

function caseStudySystemPrompt() {
  return `You write a short, ILLUSTRATIVE case-study narrative for a Talkinbio marketing demo, based on a search query and its SIGNAL breakdown (Search, Intent, Gap, Next step, Answer, Learn).
This must read as a generic, composite walkthrough of how this KIND of search typically plays out — never as a factual claim about a specific real company, product, or person.
Hard rules:
- Do NOT name any real brand, company, product, website, or person. Never invent a fake brand name either — describe roles generically ("bir e-ticaret sitesi", "bir yerel işletme", "bir karşılaştırma platformu").
- Do NOT invent specific facts (prices, review counts, quotes) presented as if real.
- Write in TURKISH, 130-190 words, 4-6 short paragraphs or a tight narrative — no markdown formatting, no headers.
- Ground it in the SIGNAL breakdown: touch on what was searched, the likely gap the searcher feels, what a brand should answer with, and what the brand should learn.
Respond with STRICT JSON only, no markdown, exactly this shape:
{"title": "...", "narrative": "..."}
- title: short, punchy, under 10 words, in Turkish (e.g. "Sinyal Analizi: '<query>' araması")
- narrative: the walkthrough described above`;
}

function parseCaseStudy(text: string): { title: string; narrative: string } | null {
  try {
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (typeof parsed?.title === 'string' && typeof parsed?.narrative === 'string') {
      return { title: parsed.title.slice(0, 120), narrative: parsed.narrative.slice(0, 1600) };
    }
    return null;
  } catch {
    return null;
  }
}

export async function generateCaseStudy(
  query: string,
  signal: SignalBreakdown
): Promise<{ title: string; narrative: string; provider: string } | null> {
  const prompt = `Arama sorgusu: "${query}"\nSIGNAL dökümü: ${JSON.stringify(signal)}`;

  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY) {
    try {
      const { text } = await generateText({
        model: googleProvider('gemini-2.5-flash'),
        system: caseStudySystemPrompt(),
        prompt,
      });
      const parsed = parseCaseStudy(text);
      if (parsed) return { ...parsed, provider: 'gemini' };
    } catch (error) {
      console.warn('[kesfet/case-study] Gemini unavailable:', shortError(error));
    }
  }

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const fallbackModel =
        process.env.KESFET_SIGNAL_ANTHROPIC_MODEL ||
        (process.env.AI_MODEL?.startsWith('claude') ? process.env.AI_MODEL : 'claude-haiku-4-5-20251001');
      const { text } = await generateText({
        model: anthropic(fallbackModel),
        system: caseStudySystemPrompt(),
        prompt,
      });
      const parsed = parseCaseStudy(text);
      if (parsed) return { ...parsed, provider: 'anthropic' };
    } catch (error) {
      console.warn('[kesfet/case-study] Anthropic fallback unavailable:', shortError(error));
    }
  }

  return null;
}
