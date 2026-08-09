import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { normalizeString, checkExplicitContact } from '@/utils/semantic/intentClassifier';
import { CloudflareEmbeddingProvider, FakeEmbeddingProvider } from '@/utils/semantic/embeddingProvider';
import { loadSemanticIndex } from '@/utils/semantic/indexer';
import { findSemanticMatch } from '@/utils/semantic/matcher';

const queryEmbeddingCache = new Map<string, number[]>();
const ipRateLimiter = new Map<string, { count: number; resetAt: number }>();

function makeDeterministicEmbeddingProvider() {
  if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN) {
    return new CloudflareEmbeddingProvider();
  }
  return new FakeEmbeddingProvider();
}

function pickLocale<T>(locale: 'tr' | 'en' | 'ru', tr: T, en: T, ru: T): T {
  return locale === 'tr' ? tr : locale === 'ru' ? ru : en;
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const limit = ipRateLimiter.get(ip);
  if (!limit || now > limit.resetAt) {
    ipRateLimiter.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  limit.count += 1;
  return limit.count > 60;
}

function deterministicSuggestions(locale: 'tr' | 'en' | 'ru', blockId?: string | null): string[] {
  switch (blockId) {
    case 'pricing':
      return pickLocale(
        locale,
        ['Hangi paket uygun?', 'Ek hizmet var mi?'],
        ['Which plan fits?', 'Any extra services?'],
        ['Kakoy tarif podkhodit?', 'Est dop uslugi?']
      );
    case 'services':
    case 'custom':
    case 'extra_services':
      return pickLocale(
        locale,
        ['Nasil ilerliyor?', 'Fiyat bilgisi var mi?'],
        ['How does it work?', 'Any pricing info?'],
        ['Kak eto prokhodit?', 'Est li tseny?']
      );
    case 'appointments':
      return pickLocale(
        locale,
        ['Hangi gunler uygun?', 'Nasil rezervasyon yaparim?'],
        ['What days are open?', 'How do I book?'],
        ['Kakie dni dostupny?', 'Kak zapisatsya?']
      );
    case 'gallery':
      return pickLocale(
        locale,
        ['Daha fazla ornek?', 'Nasil iletisime gecerim?'],
        ['More examples?', 'How do I contact you?'],
        ['Bolshe primerov?', 'Kak svyazatsya?']
      );
    case '__contact__':
    case 'contact':
      return pickLocale(
        locale,
        ['Telefon var mi?', 'WhatsApp acik mi?'],
        ['Do you have phone?', 'Is WhatsApp open?'],
        ['Est telefon?', 'Est WhatsApp?']
      );
    default:
      return pickLocale(
        locale,
        ['Baska ne sorabilirim?', 'Nasil iletisime gecerim?'],
        ['What else can I ask?', 'How do I contact you?'],
        ['Chto eshche mozhno sprosit?', 'Kak svyazatsya?']
      );
  }
}

function deterministicText(locale: 'tr' | 'en' | 'ru', candidate: any): string {
  const blockId = candidate?.action?.blockId;
  const title = candidate?.title || candidate?.searchText?.split('.')[0] || '';
  const answer = (candidate?.answer || '').trim();
  const sourceType = candidate?.sourceType;

  if (answer && (sourceType === 'faq' || sourceType === 'knowledge')) {
    return answer;
  }

  if (blockId === 'pricing') {
    return pickLocale(
      locale,
      'Fiyatla ilgili en dogru bolumu buldum. Paket ve ucret detaylarini aciyorum.',
      'I found the most relevant pricing section. Opening the package and pricing details now.',
      'Ya nashel samyy relevantnyy razdel s tsenami. Otkryvayu ego seychas.'
    );
  }

  if (blockId === 'appointments') {
    return pickLocale(
      locale,
      'En uygun randevu alanini buldum. Buradan uygun zamani secebilirsiniz.',
      'I found the right booking section. You can choose the right time from there.',
      'Ya nashel nuzhnyy razdel zapisi. Otsyuda mozhno vybrat podkhodyashchee vremya.'
    );
  }

  if (blockId === '__contact__' || blockId === 'contact') {
    return pickLocale(
      locale,
      'Iletisim icin en dogru alani buldum. Buradan dogrudan devam edebilirsiniz.',
      'I found the best contact section. You can continue from there directly.',
      'Ya nashel luchshiy razdel dlya svyazi. Otsyuda mozhno prodolzhit napryamuyu.'
    );
  }

  if (blockId === 'services' || blockId === 'custom' || blockId === 'extra_services') {
    return pickLocale(
      locale,
      `${title || 'En ilgili hizmeti'} buldum. Detaylari burada aciyorum.`,
      `I found the most relevant service${title ? `: ${title}` : ''}. Opening the details here.`,
      `${title || 'Ya nashel naibolee podkhodyashchuyu uslugu'}. Otkryvayu detali zdes.`
    );
  }

  if (blockId === 'gallery') {
    return pickLocale(
      locale,
      'Sorunuza en yakin ornekleri buldum. Ilgili calismalari aciyorum.',
      'I found the most relevant examples. Opening the related work now.',
      'Ya nashel samye podkhodyashchie primery. Otkryvayu svyazannye raboty.'
    );
  }

  if (answer) {
    return answer;
  }

  return pickLocale(
    locale,
    `${title || 'En ilgili bolumu'} buldum. Buradan devam edebilirsiniz.`,
    `I found the most relevant section${title ? `: ${title}` : ''}. You can continue from there.`,
    `${title || 'Ya nashel samyy relevantnyy razdel'}. Otsyuda mozhno prodolzhit.`
  );
}

function unknownInfoText(
  locale: 'tr' | 'en' | 'ru',
  preferredChannel?: string | null,
  preferredValue?: string | null
): string {
  if (preferredChannel && preferredValue) {
    return pickLocale(
      locale,
      `Bu soruya sayfadaki bilgilerle guvenilir sekilde cevap veremiyorum. Ama ${preferredChannel.toUpperCase()} uzerinden ulasabilirsiniz: ${preferredValue}.`,
      `I cannot answer that reliably from the page content, but you can reach out via ${preferredChannel.toUpperCase()}: ${preferredValue}.`,
      `Ya ne mogu nadezhno otvetit na eto po soderzhimomu stranitsy, no vy mozhete svyazatsya cherez ${preferredChannel.toUpperCase()}: ${preferredValue}.`
    );
  }

  return pickLocale(
    locale,
    'Bu soruya sayfadaki bilgilerle guvenilir sekilde cevap veremiyorum. Lutfen daha sonra tekrar deneyin.',
    'I cannot answer that reliably from the page content right now. Please try again later.',
    'Ya ne mogu nadezhno otvetit na eto po soderzhimomu stranitsy pryamo seychas. Pozhaluysta, poprobuyte pozhe.'
  );
}

const queryStopWords = new Set([
  'i',
  'me',
  'my',
  'we',
  'you',
  'your',
  'a',
  'an',
  'the',
  'to',
  'for',
  'of',
  'and',
  'or',
  'in',
  'on',
  'with',
  'need',
  'want',
  'wanna',
  'buy',
  'purchase',
  'order',
  'get',
  'please',
  'can',
  'could',
  'would',
  'about',
  'what',
  'how',
  'is',
  'are',
  'do',
  'does',
  'var',
  'mi',
  'icin',
  'almak',
  'istiyorum',
  'lazim',
  'gerek',
  'нужно',
  'хочу',
  'купить',
]);

function meaningfulTokens(text: string): string[] {
  return routeNormalize(text)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !queryStopWords.has(token));
}

function routeNormalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferRouteIntent(query: string): 'service' | 'training' | 'product' | null {
  const q = routeNormalize(query);

  if (/(egitim|kurs|ogren|ders|training|course|learn|study|academy)/.test(q)) {
    return 'training';
  }

  if (/(yag|oil|urun|product|satin|siparis|purchase|order|buy)/.test(q)) {
    return 'product';
  }

  if (/(masaj|massage|terapi|therapy)/.test(q) && /(yaptir|yaptirmak|almak|randevu|rezervasyon|seans|book|booking|appointment|session|reserve)/.test(q)) {
    return 'service';
  }

  return null;
}

function findLexicalCandidate(query: string, entries: any[], locale: 'tr' | 'en' | 'ru') {
  const tokens = meaningfulTokens(query);
  if (tokens.length === 0) return null;
  const routeIntent = inferRouteIntent(query);

  const ranked = entries
    .filter((entry) => entry.locale === locale)
    .map((entry) => {
      const title = entry.searchText?.split('.')?.[0] || '';
      const normalizedTitle = routeNormalize(title);
      const normalizedSearch = routeNormalize(entry.searchText || '');
      const candidateText = `${normalizedTitle} ${normalizedSearch}`;
      const titleMatches = tokens.filter((token) => normalizedTitle.includes(token)).length;
      const searchMatches = tokens.filter((token) => normalizedSearch.includes(token)).length;
      const titleRatio = titleMatches / tokens.length;
      const searchRatio = searchMatches / tokens.length;
      const phrase = tokens.join(' ');
      const phraseBonus = normalizedTitle.includes(phrase) ? 0.45 : normalizedSearch.includes(phrase) ? 0.25 : 0;
      const actionBonus = entry.action?.type === 'open_block' ? 0.1 : 0;
      const blockBonus = entry.sourceType === 'block' || entry.sourceType === 'block_item' ? 0.08 : 0;
      let intentAdjustment = 0;
      const looksTraining = /(egitim|kurs|training|course|learn|study|academy)/.test(candidateText);
      const looksService = /(session|booking|randevu|rezervasyon|seans|therapy|procedure|masaj seans|massage session|face neck collar zone)/.test(candidateText);
      const looksProduct = /(oil|yag|face harmony|product|volume|ingredients|ingredient)/.test(candidateText);

      if (routeIntent === 'service') {
        if (looksTraining) intentAdjustment -= 2.25;
        if (looksService && !looksTraining) intentAdjustment += 1.25;
        if (normalizedTitle.includes('booking') || normalizedTitle.includes('session') || normalizedTitle.includes('seans')) {
          intentAdjustment += 0.45;
        }
      } else if (routeIntent === 'training') {
        if (looksTraining) intentAdjustment += 1.1;
        if (looksService && !looksTraining) intentAdjustment -= 0.8;
      } else if (routeIntent === 'product') {
        if (looksProduct) intentAdjustment += 1.1;
        if (looksTraining) intentAdjustment -= 0.5;
      }

      return {
        sourceId: entry.sourceId,
        title,
        answer: entry.answer || '',
        description: entry.searchText || '',
        action: entry.action || null,
        searchText: entry.searchText || '',
        sourceType: entry.sourceType,
        finalScore: titleRatio * 1.4 + searchRatio + phraseBonus + actionBonus + blockBonus + intentAdjustment,
      };
    })
    .filter((candidate) => candidate.finalScore >= 0.9)
    .sort((a, b) => b.finalScore - a.finalScore);

  return ranked[0] || null;
}

export async function POST(request: Request) {
  let activeLocale: 'tr' | 'en' | 'ru' = 'tr';

  try {
    const clientIp = request.headers.get('x-forwarded-for') || 'anonymous';
    if (isRateLimited(clientIp)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const { businessId, locale = 'tr', query, preview = false } = await request.json();
    if (!businessId || !query) {
      return NextResponse.json({ error: 'Missing businessId or query' }, { status: 400 });
    }

    activeLocale = (locale as 'tr' | 'en' | 'ru') || 'tr';
    const normQuery = normalizeString(query);
    if (normQuery.length > 250) {
      return NextResponse.json({ error: 'Query is too long.' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('contact_method, contact_value, is_published')
      .eq('id', businessId)
      .single();

    if (businessError || !business) {
      return NextResponse.json({ error: 'Business not found.' }, { status: 404 });
    }

    const cookieStore = await cookies();
    const visitorSessionId = cookieStore.get('visitor_session_id')?.value;
    const isPreview = !!preview;
    const conversationKey = isPreview ? `preview:${businessId}` : (visitorSessionId || `anon_web_${businessId}`);

    let conversationId: string | undefined;

    const { data: previousConversation } = await supabase
      .from('conversations')
      .select('id, last_message_at, created_at')
      .eq('business_id', businessId)
      .eq('visitor_session_id', conversationKey)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (previousConversation) {
      const referenceDate = previousConversation.last_message_at
        ? new Date(previousConversation.last_message_at)
        : new Date(previousConversation.created_at);
      const differenceInDays = (Date.now() - referenceDate.getTime()) / (1000 * 60 * 60 * 24);
      const isActive = differenceInDays <= 7;

      if (isActive) {
        const { count: messageCount } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', previousConversation.id)
          .eq('role', 'user');

        if ((messageCount || 0) < 20) {
          conversationId = previousConversation.id;
        }
      }
    }

    if (!conversationId) {
      const { data: newConversation } = await supabase
        .from('conversations')
        .insert({
          business_id: businessId,
          visitor_session_id: conversationKey,
          is_preview: isPreview,
          channel: 'web',
        })
        .select('id')
        .single();

      conversationId = newConversation?.id;
    }

    if (!conversationId) {
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
    }

    const persistResponse = async (responseText: string) => {
      if (!responseText) return;

      await supabase.from('messages').insert({
        conversation_id: conversationId,
        business_id: businessId,
        role: 'assistant',
        content: responseText,
      });

      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);
    };

    await supabase.from('messages').insert({
      conversation_id: conversationId,
      business_id: businessId,
      role: 'user',
      content: query.trim(),
    });

    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        is_read: false,
      })
      .eq('id', conversationId);

    const contactInfo = checkExplicitContact(query, activeLocale);
    let contactValues: Record<string, string> = {};

    try {
      contactValues = business.contact_value ? JSON.parse(business.contact_value) : {};
    } catch {
      contactValues = {};
    }

    const activeMethods = (business.contact_method || '').split(',').filter(Boolean);
    const preferredChannel = activeMethods[0] || null;
    const preferredValue = preferredChannel ? contactValues[preferredChannel]?.trim() || null : null;

    if (contactInfo.isContactQuery && contactInfo.isExplicitChannel && contactInfo.channel) {
      const channel = contactInfo.channel;
      const channelRegistered = activeMethods.includes(channel) && contactValues[channel]?.trim();

      if (channelRegistered) {
        const value = contactValues[channel].trim();
        const text = pickLocale(
          activeLocale,
          `${channel.toUpperCase()} kanalimiz aktif: ${value}. Sizi dogrudan yonlendiriyorum.`,
          `Our ${channel.toUpperCase()} is active: ${value}. Directing you right now.`,
          `Nash ${channel.toUpperCase()} aktivен: ${value}. Napravlyayu vas tuda.`
        );

        await persistResponse(text);
        return NextResponse.json({
          type: 'match',
          text,
          action: { type: 'open_block', blockId: '__contact__', itemId: channel },
          suggestedQuestions: deterministicSuggestions(activeLocale, '__contact__'),
        });
      }

      const preferred = activeMethods[0];
      const preferredValue = preferred ? contactValues[preferred]?.trim() : null;
      const text = preferredValue
        ? pickLocale(
            activeLocale,
            `${channel.toUpperCase()} aktif degil. Ama bize ${preferred.toUpperCase()} uzerinden ulasabilirsiniz: ${preferredValue}.`,
            `We do not have ${channel.toUpperCase()} active here. You can reach us via ${preferred.toUpperCase()}: ${preferredValue}.`,
            `${channel.toUpperCase()} nedostupen. No vy mozhete svyazatsya s nami cherez ${preferred.toUpperCase()}: ${preferredValue}.`
          )
        : unknownInfoText(activeLocale, preferredChannel, preferredValue);

      await persistResponse(text);
      return NextResponse.json({
        type: preferredValue ? 'match' : 'fallback',
        text,
        action: preferredValue ? { type: 'open_block', blockId: '__contact__', itemId: preferred } : null,
        suggestedQuestions: preferredValue ? deterministicSuggestions(activeLocale, '__contact__') : [],
      });
    }

    const publishVersion = preview ? 'draft' : 'published';
    let entries = await loadSemanticIndex({ supabase, businessId, publishVersion });

    if (entries.length === 0) {
      try {
        const { buildSemanticIndex } = await import('@/utils/semantic/indexer');

        await buildSemanticIndex({
          supabase,
          businessId,
          publishVersion,
          embeddingProvider: makeDeterministicEmbeddingProvider(),
        });

        entries = await loadSemanticIndex({ supabase, businessId, publishVersion });
      } catch (buildError) {
        console.error('Dynamic semantic index building failed:', buildError);
      }
    }

    if (entries.length === 0) {
      const text = unknownInfoText(activeLocale, preferredChannel, preferredValue);
      await persistResponse(text);
      return NextResponse.json({
        type: preferredValue ? 'match' : 'fallback',
        text,
        action: preferredValue ? { type: 'open_block', blockId: '__contact__', itemId: preferredChannel } : null,
        suggestedQuestions: preferredValue ? deterministicSuggestions(activeLocale, '__contact__') : [],
      });
    }

    const lexicalCandidate = findLexicalCandidate(query, entries, activeLocale);
    if (lexicalCandidate) {
      const text = deterministicText(activeLocale, lexicalCandidate);
      const result = {
        type: 'match',
        text,
        action: lexicalCandidate.action,
        suggestedQuestions: deterministicSuggestions(activeLocale, lexicalCandidate.action?.blockId),
        matchedBlock: lexicalCandidate.action?.blockId
          ? {
              title: lexicalCandidate.title,
              description: lexicalCandidate.answer || lexicalCandidate.description,
              blockId: lexicalCandidate.action.blockId,
              itemId: lexicalCandidate.action.itemId || undefined,
            }
          : null,
      };

      await persistResponse(text);
      return NextResponse.json(result);
    }

    const cacheKey = `${businessId}:${activeLocale}:${normQuery}`;
    let queryEmbedding = queryEmbeddingCache.get(cacheKey) || null;

    if (!queryEmbedding) {
      queryEmbedding = await makeDeterministicEmbeddingProvider().embedQuery(normQuery);
      if (queryEmbedding) {
        queryEmbeddingCache.set(cacheKey, queryEmbedding);
      }
    }

    if (!queryEmbedding) {
      throw new Error('Failed to generate query embedding.');
    }

    const matchResult = findSemanticMatch({
      query: normQuery,
      locale: activeLocale,
      entries,
      queryEmbedding,
      isDebugMode: true,
    });

    const seenPerSource = new Map<string, number>();
    const topCandidates = (matchResult.debug?.scores || [])
      .filter((score: any) => !score.isEliminated && score.finalScore >= 0.35)
      .map((score: any) => {
        const fullEntry = entries.find((entry) => entry.id === score.id);
        return {
          ...score,
          sourceId: fullEntry?.sourceId,
          title: fullEntry?.searchText.split('.')[0] || '',
          answer: fullEntry?.answer || fullEntry?.searchText || '',
          action: fullEntry?.action || null,
          searchText: fullEntry?.searchText || '',
          sourceType: fullEntry?.sourceType || score.sourceType,
        };
      })
      .filter((candidate: any) => {
        const key = candidate.sourceId || candidate.id;
        const count = seenPerSource.get(key) || 0;
        if (count >= 2) return false;
        seenPerSource.set(key, count + 1);
        return true;
      })
      .slice(0, 6);

    const topCandidate = topCandidates[0];
    let executedBehavior = 'Deterministic Fallback';

    const finalResult: {
      type: 'match' | 'clarification' | 'fallback';
      text: string;
      action: any;
      suggestedQuestions: string[];
      matchedBlock: any;
      debug?: any;
    } = {
      type: 'fallback',
      text: '',
      action: null,
      suggestedQuestions: [],
      matchedBlock: null,
    };

    if (matchResult.type === 'clarification') {
      executedBehavior = 'Deterministic Clarification';
      finalResult.type = 'clarification';
      finalResult.text = matchResult.text;
      finalResult.action = matchResult.action || null;
    } else if (topCandidates.length === 0) {
      if (contactInfo.isContactQuery && contactInfo.isGenericRequest) {
        executedBehavior = 'Deterministic Generic Contact';
        const preferred = activeMethods[0];
        const preferredValue = preferred ? contactValues[preferred]?.trim() : null;

        if (preferredValue) {
          finalResult.type = 'match';
          finalResult.text = pickLocale(
            activeLocale,
            `Bize ${preferred.toUpperCase()} uzerinden ulasabilirsiniz: ${preferredValue}.`,
            `You can reach us via ${preferred.toUpperCase()}: ${preferredValue}.`,
            `Vy mozhete svyazatsya s nami cherez ${preferred.toUpperCase()}: ${preferredValue}.`
          );
          finalResult.action = { type: 'open_block', blockId: '__contact__', itemId: preferred };
          finalResult.suggestedQuestions = deterministicSuggestions(activeLocale, '__contact__');
          finalResult.matchedBlock = {
            title: pickLocale(activeLocale, 'Iletisim', 'Contact', 'Kontakty'),
            description: finalResult.text,
            blockId: '__contact__',
            itemId: preferred,
          };
        } else {
          finalResult.text = unknownInfoText(activeLocale, preferredChannel, preferredValue);
          finalResult.action = preferredValue ? { type: 'open_block', blockId: '__contact__', itemId: preferredChannel } : null;
          finalResult.suggestedQuestions = preferredValue ? deterministicSuggestions(activeLocale, '__contact__') : [];
        }
      } else {
        finalResult.text = unknownInfoText(activeLocale, preferredChannel, preferredValue);
        finalResult.action = preferredValue ? { type: 'open_block', blockId: '__contact__', itemId: preferredChannel } : null;
        finalResult.suggestedQuestions = preferredValue ? deterministicSuggestions(activeLocale, '__contact__') : [];
      }
    } else {
      executedBehavior = topCandidate?.finalScore >= 0.7
        ? 'Deterministic High Confidence Match'
        : 'Deterministic Semantic Match';

      finalResult.type = 'match';
      finalResult.text = deterministicText(activeLocale, topCandidate);
      finalResult.action = topCandidate?.action || matchResult.action || null;
      finalResult.suggestedQuestions = deterministicSuggestions(activeLocale, finalResult.action?.blockId);

      if (finalResult.action?.blockId) {
        const matchedCandidate = topCandidates.find(
          (candidate: any) =>
            candidate.action?.blockId === finalResult.action?.blockId &&
            (!finalResult.action?.itemId || candidate.action?.itemId === finalResult.action?.itemId)
        ) || entries.find(
          (entry: any) =>
            entry.action?.blockId === finalResult.action?.blockId &&
            (!finalResult.action?.itemId || entry.action?.itemId === finalResult.action?.itemId)
        ) || topCandidate;

        if (matchedCandidate) {
          finalResult.matchedBlock = {
            title: matchedCandidate.title || matchedCandidate.searchText?.split?.('.')[0] || '',
            description: matchedCandidate.answer || '',
            blockId: finalResult.action.blockId,
            itemId: finalResult.action.itemId || undefined,
          };
        }
      }
    }

    if (preview) {
      finalResult.debug = {
        scores: matchResult.debug?.scores,
        margin: matchResult.debug?.margin,
        decisionReason: `Behavior: [${executedBehavior}] | Candidates: ${topCandidates.length}`,
      };
    }

    await persistResponse(finalResult.text);
    return NextResponse.json(finalResult);
  } catch (err) {
    console.error('Semantic query route error:', err);
    return NextResponse.json(
      {
        type: 'fallback',
        text: pickLocale(
          activeLocale,
          'Bir hata olustu, lutfen daha sonra tekrar deneyin.',
          'An error occurred, please try again later.',
          'Proizoshla oshibka, poprobuyte pozzhe.'
        ),
      },
      { status: 500 }
    );
  }
}
