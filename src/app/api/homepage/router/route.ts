import { NextResponse } from 'next/server';
import { CloudflareEmbeddingProvider, FakeEmbeddingProvider, type EmbeddingProvider } from '@/utils/semantic/embeddingProvider';
import { cosineSimilarity } from '@/utils/semantic/matcher';
import type { HomepageSectionId } from '@/components/home/homeData';

type HomepageRouteResult = {
  answer: string;
  mode: 'section' | 'link' | 'answer' | 'contact';
  targetSection: HomepageSectionId | null;
  linkHref: string | null;
  linkLabel: string | null;
  provider: string;
};

type SemanticEntry = {
  id: string;
  searchText: string;
  targetSection: HomepageSectionId | null;
  mode: HomepageRouteResult['mode'];
  linkHref: string | null;
  linkLabel: string | null;
  answer: string;
  embedding?: number[];
};

const entryEmbeddingCache = new Map<string, number[][]>();
const rateLimiter = new Map<string, { count: number; resetAt: number }>();

const homepageEntries: SemanticEntry[] = [
  {
    id: 'pricing',
    searchText:
      'pricing free build publish keep only pay when talkinbio does more plans cost charge rate packages offer billing',
    targetSection: null,
    mode: 'link',
    linkHref: '/pricing',
    linkLabel: 'See pricing',
    answer: 'You can create your page for free and start with 200 visitor credits. Each real visitor uses 1 credit. I can send you straight to the pricing page.',
  },
  {
    id: 'setup',
    searchText:
      'create publish start build onboarding make a page launch setup wizard run your page talk in minutes',
    targetSection: 'setup',
    mode: 'section',
    linkHref: null,
    linkLabel: null,
    answer: 'If the question is how to start, I bring the setup block forward so the next step is already in front of you.',
  },
  {
    id: 'examples',
    searchText:
      'examples showcase portfolio work sample creators musician designer coach photographer pages something to say',
    targetSection: 'examples',
    mode: 'section',
    linkHref: null,
    linkLabel: null,
    answer: 'If someone wants proof, I move example pages closer so they can see how different identities talk back.',
  },
  {
    id: 'transformation',
    searchText:
      'how does it work link in bio stop linking start talking page conversation interface changing move to right place',
    targetSection: 'transformation',
    mode: 'section',
    linkHref: null,
    linkLabel: null,
    answer: 'Talkinbio turns a static page into a conversation layer that answers first, then guides the visitor to the right place.',
  },
  {
    id: 'capabilities',
    searchText:
      'answer guide show connect learn what can a page do features capabilities visitors questions actions tools',
    targetSection: 'capabilities',
    mode: 'section',
    linkHref: null,
    linkLabel: null,
    answer: 'When someone asks what the page can do, I bring the capability block forward and show the system in plain terms.',
  },
  {
    id: 'ask',
    searchText:
      'ask availability booking book a call custom question open question visitor asks answer inside page no search',
    targetSection: 'ask',
    mode: 'section',
    linkHref: null,
    linkLabel: null,
    answer: 'The visitor should be able to ask directly. The page answers inside the experience instead of sending them away.',
  },
];

function isRateLimited(ip: string) {
  const now = Date.now();
  const current = rateLimiter.get(ip);
  if (!current || now > current.resetAt) {
    rateLimiter.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  current.count += 1;
  return current.count > 20;
}

function cleanAnswer(text: string) {
  return text.replace(/^["'\s]+|["'\s]+$/g, '').replace(/\s+/g, ' ').trim().slice(0, 360);
}

function contactFallback(provider: string): HomepageRouteResult {
  return {
    answer: 'I do not have enough page context to answer that reliably yet. Please email info@talkinbio.com.',
    mode: 'contact',
    targetSection: null,
    linkHref: 'mailto:info@talkinbio.com',
    linkLabel: 'Email info@talkinbio.com',
    provider,
  };
}

function deterministicRouter(question: string): HomepageRouteResult | null {
  const q = question.toLowerCase();

  if (/(price|pricing|cost|charge|plan|billing|package|packages|free|pay)/.test(q)) {
    return {
      answer: 'You can create your page for free and start with 200 visitor credits. Each real visitor uses 1 credit. For pricing details, I can send you to the pricing page.',
      mode: 'link',
      targetSection: null,
      linkHref: '/pricing',
      linkLabel: 'See pricing',
      provider: 'deterministic',
    };
  }

  if (/(start|create|build|setup|publish|onboard|run)/.test(q)) {
    return {
      answer: 'If the next question is how to start, I move the setup block closer so the build flow is already waiting below.',
      mode: 'section',
      targetSection: 'setup',
      linkHref: null,
      linkLabel: null,
      provider: 'deterministic',
    };
  }

  if (/(example|examples|portfolio|show me|work sample|case study|creator)/.test(q)) {
    return {
      answer: 'If proof matters first, I bring example pages right under this block so the visitor can compare real page behavior.',
      mode: 'section',
      targetSection: 'examples',
      linkHref: null,
      linkLabel: null,
      provider: 'deterministic',
    };
  }

  if (/(how does it work|how it works|link in bio|link-in-bio|conversation|search|why)/.test(q)) {
    return {
      answer: 'Talkinbio answers the question, then moves the interface toward the next useful block instead of making the visitor browse.',
      mode: 'section',
      targetSection: 'transformation',
      linkHref: null,
      linkLabel: null,
      provider: 'deterministic',
    };
  }

  if (/(what can|features|capabilities|guide|connect|learn)/.test(q)) {
    return {
      answer: 'If someone wants the system overview, I pull the capability block forward so they can see what the page can actually do.',
      mode: 'section',
      targetSection: 'capabilities',
      linkHref: null,
      linkLabel: null,
      provider: 'deterministic',
    };
  }

  return null;
}

function providerKey() {
  if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN) return 'cloudflare';
  return 'fake';
}

function makeEmbeddingProvider(): EmbeddingProvider {
  if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN) return new CloudflareEmbeddingProvider();
  return new FakeEmbeddingProvider();
}

async function embedEntries(provider: EmbeddingProvider) {
  const key = providerKey();
  const cached = entryEmbeddingCache.get(key);
  if (cached) return cached;
  const embeddings = await provider.embedDocuments(homepageEntries.map((entry) => entry.searchText));
  entryEmbeddingCache.set(key, embeddings);
  return embeddings;
}

async function embeddingRouter(question: string): Promise<HomepageRouteResult | null> {
  try {
    const provider = makeEmbeddingProvider();
    const [queryEmbedding, entryEmbeddings] = await Promise.all([provider.embedQuery(question), embedEntries(provider)]);
    const ranked = homepageEntries
      .map((entry, index) => ({
        entry,
        score: cosineSimilarity(queryEmbedding, entryEmbeddings[index]),
      }))
      .sort((a, b) => b.score - a.score);

    const top = ranked[0];
    if (!top || top.score < 0.64) return null;

    return {
      answer: top.entry.answer,
      mode: top.entry.mode,
      targetSection: top.entry.targetSection,
      linkHref: top.entry.linkHref,
      linkLabel: top.entry.linkLabel,
      provider: 'embedding',
    };
  } catch (error) {
    console.warn('[homepage/router] Embedding lookup unavailable:', String(error));
    return null;
  }
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

  const deterministic = deterministicRouter(normalizedQuestion);
  if (deterministic) return NextResponse.json(deterministic);

  const embedded = await embeddingRouter(normalizedQuestion);
  if (embedded) return NextResponse.json(embedded);

  return NextResponse.json(contactFallback('deterministic-fallback'));
}
