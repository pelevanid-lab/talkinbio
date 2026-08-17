import { NextResponse } from 'next/server';
import { createRateLimiter, generateSignal } from '@/utils/kesfetSignal';

// Public, unauthenticated demo on /kesfet/[slug] pages: visitor types a search query, we read
// back the customer intent behind it using the SIGNAL framework. Mirrors the pattern already
// used by /api/homepage/sophia — deterministic fast-path first, LLM fallback second, safe
// static fallback if neither provider is configured or both fail.

const isRateLimited = createRateLimiter(12);

export async function POST(request: Request) {
  const clientIp = request.headers.get('x-forwarded-for') || 'anonymous';
  if (isRateLimited(clientIp)) {
    return NextResponse.json({ error: 'Çok fazla istek gönderildi. Biraz sonra tekrar dene.' }, { status: 429 });
  }

  const { query } = await request.json().catch(() => ({ query: '' }));
  const normalizedQuery = typeof query === 'string' ? query.trim() : '';

  if (!normalizedQuery) {
    return NextResponse.json({ error: 'Bir arama yazmalısın.' }, { status: 400 });
  }
  if (normalizedQuery.length > 140) {
    return NextResponse.json({ error: 'Arama çok uzun.' }, { status: 400 });
  }

  const result = await generateSignal(normalizedQuery);
  return NextResponse.json({ signal: result.signal, provider: result.provider, fallback: result.provider === 'fallback' });
}
