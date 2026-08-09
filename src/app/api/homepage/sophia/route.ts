import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { anthropic } from '@ai-sdk/anthropic';

const googleProvider = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY,
});

const ipRateLimiter = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string) {
  const now = Date.now();
  const current = ipRateLimiter.get(ip);
  if (!current || now > current.resetAt) {
    ipRateLimiter.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  current.count += 1;
  return current.count > 20;
}

function cleanAnswer(text: string) {
  return text
    .replace(/^["'\s]+|["'\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 360);
}

function sophiaSystemPrompt() {
  return `You are Sophia Lee inside a Talkinbio interactive page demo.
Sophia is a sound designer and producer based in Berlin.
Her page can answer visitor questions, guide people to work samples, booking, pricing, and collaboration fit.
Answer only in English.
Keep the voice calm, intelligent, slightly cyber/editorial, and human.
Never claim real availability, exact prices, private contact details, or external facts.
Keep the answer under 28 words.
Return only the answer sentence, no markdown.`;
}

function deterministicSophiaAnswer(question: string) {
  const q = question.toLowerCase();

  if (/(service|do you do|offer|kind of work|what kind)/.test(q)) {
    return {
      matched: true,
      answer: 'I design sound identities, launch-film soundtracks, sonic details for products, and clean audio systems for digital experiences.',
      actions: ['See services', 'Hear examples'] as [string, string],
    };
  }

  if (/(soundtrack|film|video|reel|music|audio)/.test(q)) {
    return {
      matched: true,
      answer: 'Yes. I can shape a launch film with original sound design, music direction, and a tighter emotional rhythm.',
      actions: ['Hear examples', 'Send brief'] as [string, string],
    };
  }

  if (/(price|cost|charge|budget|pay)/.test(q)) {
    return {
      matched: true,
      answer: 'Pricing depends on scope. A page like this can explain ranges, then guide the visitor to the right next step.',
      actions: ['See pricing', 'Ask scope'] as [string, string],
    };
  }

  if (/(book|call|available|availability|meeting)/.test(q)) {
    return {
      matched: true,
      answer: 'The page can answer availability questions and move the visitor directly into a booking flow.',
      actions: ['Book a call', 'Check fit'] as [string, string],
    };
  }

  if (/(see your work|show.*work|portfolio|example|case|sample)/.test(q)) {
    return {
      matched: true,
      answer: 'I would show the most relevant work first, instead of making you search through every link.',
      actions: ['See my work', 'Play reel'] as [string, string],
    };
  }

  return {
    matched: false,
    answer: '',
    actions: ['Open answer', 'Continue'] as [string, string],
  };
}

function safeSophiaFallback() {
  return {
    answer: 'I can answer from the page context, then guide you to the right work, booking path, or next question.',
    actions: ['Open answer', 'Continue'] as [string, string],
  };
}

function shortError(error: unknown) {
  if (typeof error !== 'object' || error === null) return String(error);
  const maybe = error as { statusCode?: number; data?: { error?: { status?: string; message?: string } }; message?: string };
  return `${maybe.statusCode || 'error'} ${maybe.data?.error?.status || ''} ${maybe.data?.error?.message || maybe.message || ''}`.trim();
}

async function generateSophiaAnswer(question: string) {
  const prompt = `Visitor question: ${question}`;

  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY) {
    try {
      const { text } = await generateText({
        model: googleProvider('gemini-2.5-flash'),
        system: sophiaSystemPrompt(),
        prompt,
      });
      return { answer: cleanAnswer(text), provider: 'gemini' };
    } catch (error) {
      console.warn('[homepage/sophia] Gemini unavailable:', shortError(error));
    }
  }

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const fallbackModel =
        process.env.HOMEPAGE_SOPHIA_ANTHROPIC_MODEL ||
        (process.env.AI_MODEL?.startsWith('claude') ? process.env.AI_MODEL : 'claude-haiku-4-5-20251001');
      const { text } = await generateText({
        model: anthropic(fallbackModel),
        system: sophiaSystemPrompt(),
        prompt,
      });
      return { answer: cleanAnswer(text), provider: 'anthropic' };
    } catch (error) {
      console.warn('[homepage/sophia] Anthropic fallback unavailable:', shortError(error));
    }
  }

  const fallback = safeSophiaFallback();
  return { answer: fallback.answer, actions: fallback.actions, provider: 'fallback' };
}

export async function POST(request: Request) {
  const clientIp = request.headers.get('x-forwarded-for') || 'anonymous';
  if (isRateLimited(clientIp)) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }

  const { question } = await request.json().catch(() => ({ question: '' }));
  const normalizedQuestion = typeof question === 'string' ? question.trim() : '';

  if (!normalizedQuestion) {
    return NextResponse.json({ error: 'Missing question.' }, { status: 400 });
  }

  if (normalizedQuestion.length > 180) {
    return NextResponse.json({ error: 'Question is too long.' }, { status: 400 });
  }

  const deterministic = deterministicSophiaAnswer(normalizedQuestion);
  if (deterministic.matched) {
    return NextResponse.json({
      answer: deterministic.answer,
      actions: deterministic.actions,
      fallback: false,
      provider: 'deterministic',
    });
  }

  const result = await generateSophiaAnswer(normalizedQuestion);
  const fallback = safeSophiaFallback();

  return NextResponse.json({
    answer: result.answer || fallback.answer,
    actions: result.actions || fallback.actions,
    fallback: result.provider === 'fallback',
    provider: result.provider,
  });
}
