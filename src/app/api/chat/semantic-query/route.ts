import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

const googleProvider = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY,
});
import { normalizeString, checkExplicitContact, classifyIntent } from '@/utils/semantic/intentClassifier';
import { CloudflareEmbeddingProvider, GeminiEmbeddingProvider, FakeEmbeddingProvider } from '@/utils/semantic/embeddingProvider';
import { loadSemanticIndex } from '@/utils/semantic/indexer';
import { findSemanticMatch } from '@/utils/semantic/matcher';

// Short-term in-memory cache for query embeddings to avoid duplicate Cloudflare AI calls
const queryEmbeddingCache = new Map<string, number[]>();

// Extremely lightweight in-memory rate limiter
const ipRateLimiter = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const limit = ipRateLimiter.get(ip);
  if (!limit || now > limit.resetAt) {
    ipRateLimiter.set(ip, { count: 1, resetAt: now + 60 * 1000 }); // 60 requests per minute limit
    return false;
  }
  limit.count++;
  return limit.count > 60;
}

export async function POST(request: Request) {
  try {
    // 1. Rate limiting check
    const clientIp = request.headers.get('x-forwarded-for') || 'anonymous';
    if (isRateLimited(clientIp)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const { businessId, locale = 'tr', query, preview = false } = await request.json();

    if (!businessId || !query) {
      return NextResponse.json({ error: 'Missing businessId or query' }, { status: 400 });
    }

    const activeLocale = (locale as 'tr' | 'en' | 'ru') || 'tr';
    const normQuery = normalizeString(query);

    // Limit query length to prevent abuse / large payloads
    if (normQuery.length > 250) {
      return NextResponse.json({ error: 'Query is too long.' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch canonical business profile contact details
    const { data: business, error: bErr } = await supabase
      .from('businesses')
      .select('contact_method, contact_value, is_published')
      .eq('id', businessId)
      .single();

    if (bErr || !business) {
      return NextResponse.json({ error: 'Business not found.' }, { status: 404 });
    }

    // 1.5 Load visitor_session_id cookie and manage database conversation & message persistence
    const cookieStore = await cookies();
    const visitorSessionId = cookieStore.get('visitor_session_id')?.value;
    const isPreview = !!preview;
    const conversationKey = isPreview ? `preview:${businessId}` : (visitorSessionId || `anon_web_${businessId}`);

    let conversationId: string | undefined;
    let willCreateNewConversation = true;

    // Find the most recent conversation for this key; reuse it only if it's still "active"
    const { data: convData } = await supabase
      .from('conversations')
      .select('id, last_message_at, created_at')
      .eq('business_id', businessId)
      .eq('visitor_session_id', conversationKey)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (convData) {
      const referenceDate = convData.last_message_at ? new Date(convData.last_message_at) : new Date(convData.created_at);
      const differenceInDays = (new Date().getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24);
      const isActive = differenceInDays <= 7;

      if (isActive) {
        // Group user questions in packages of up to 20 messages per conversation
        const { count: msgCount } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', convData.id)
          .eq('role', 'user');

        if ((msgCount || 0) < 20) {
          conversationId = convData.id;
          willCreateNewConversation = false;
        }
      }
    }

    if (!isPreview) {
      const { data: businessWithCredits } = await supabase
        .from('businesses')
        .select('credit_balance')
        .eq('id', businessId)
        .single();

      const creditBalance = businessWithCredits?.credit_balance ?? 0;

      if (willCreateNewConversation && creditBalance < 1) {
        return NextResponse.json({
          type: 'fallback',
          text: activeLocale === 'tr' 
            ? 'Bu işletmenin Saule sohbet kredisi tükendi.' 
            : 'This business has exhausted its Saule chat credits.',
          suggestedQuestions: []
        }, { status: 402 });
      }
    }

    if (!conversationId) {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({ business_id: businessId, visitor_session_id: conversationKey, is_preview: isPreview, channel: 'web' })
        .select('id')
        .single();
      conversationId = newConv?.id;
    }

    if (!conversationId) {
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
    }

    let isCreditDeducted = false;
    const persistResponseAndDeduct = async (responseText: string) => {
      if (!conversationId) return;
      if (responseText) {
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          business_id: businessId,
          role: 'assistant',
          content: responseText,
        });
        await supabase.from('conversations').update({
          last_message_at: new Date().toISOString(),
        }).eq('id', conversationId);
      }

      if (!isPreview && willCreateNewConversation && !isCreditDeducted) {
        isCreditDeducted = true;
        const { deductCredits } = await import('@/agents/shared/credits');
        await deductCredits(supabase, businessId, 1);
        
        await supabase.from('usage_events').insert({
          business_id: businessId,
          agent: 'saule',
          channel: 'web',
          model: 'gemini-2.5-flash',
          usage: { inputTokens: 0, outputTokens: 0 },
          credits_charged: 1,
        });
      }
    };

    // Insert user's message
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      business_id: businessId,
      role: 'user',
      content: query.trim(),
    });

    await supabase.from('conversations').update({
      last_message_at: new Date().toISOString(),
      is_read: false,
    }).eq('id', conversationId);

    // 2. LAYER 1: Explicit Contact Channel rules (100% offline & deterministically handled)
    const contactInfo = checkExplicitContact(query, activeLocale);
    
    let contactValues: Record<string, string> = {};
    try {
      contactValues = business.contact_value ? JSON.parse(business.contact_value) : {};
    } catch {
      contactValues = {};
    }
    const activeMethods = (business.contact_method || '').split(',').filter(Boolean);

    // 2. LAYER 1: Explicit Contact Channel rules (100% offline & deterministically handled)
    // We ONLY short-circuit explicit channel requests (e.g. WhatsApp, phone, email) here.
    // Generic contact requests (e.g. 'adres', 'konum', 'iletisim') are deferred to semantic matching first, so they don't hijack custom knowledge base notes!
    if (contactInfo.isContactQuery && contactInfo.isExplicitChannel) {
      if (contactInfo.isExplicitChannel && contactInfo.channel) {
        const channel = contactInfo.channel;
        const channelRegistered = activeMethods.includes(channel) && contactValues[channel]?.trim();

        if (channelRegistered) {
          // Success: Matched registered channel
          const value = contactValues[channel].trim();
          let text = `${channel.toUpperCase()} kanalımız aktif: ${value}. Sizi doğrudan yönlendiriyorum.`;
          if (activeLocale === 'en') {
            text = `Our ${channel.toUpperCase()} is active: ${value}. Directing you right now.`;
          } else if (activeLocale === 'ru') {
            text = `Наш ${channel.toUpperCase()} активен: ${value}. Направляю вас туда.`;
          }

          await persistResponseAndDeduct(text);
          return NextResponse.json({
            type: 'match',
            text,
            action: { type: 'open_block', blockId: '__contact__', itemId: channel }
          });
        } else {
          // Failure: Channel not registered, offer preferred/first active alternative
          const preferred = activeMethods[0];
          const prefValue = preferred ? contactValues[preferred]?.trim() : null;

          let text = `Maalesef ${channel.toUpperCase()} kanalımız bulunmuyor.`;
          if (prefValue) {
            text += ` Ancak bize ${preferred.toUpperCase()} üzerinden ulaşabilirsiniz: ${prefValue}.`;
          } else {
            text += ' İletişim bilgilerimiz henüz girilmemiş.';
          }

          if (activeLocale === 'en') {
            text = `Sorry, we don't have a ${channel.toUpperCase()} channel.`;
            if (prefValue) {
              text += ` However, you can reach us via ${preferred.toUpperCase()}: ${prefValue}.`;
            }
          } else if (activeLocale === 'ru') {
            text = `К сожалению, у нас нет канала ${channel.toUpperCase()}.`;
            if (prefValue) {
              text += ` Однако вы можете связаться с нами через ${preferred.toUpperCase()}: ${prefValue}.`;
            }
          }

          await persistResponseAndDeduct(text);
          return NextResponse.json({
            type: 'match',
            text,
            action: preferred ? { type: 'open_block', blockId: '__contact__', itemId: preferred } : undefined
          });
        }
      }
    }

    // 3. LAYER 2: Load Server-Side semantic index entries
    const publishVersion = preview ? 'draft' : 'published';
    let entries = await loadSemanticIndex({ supabase, businessId, publishVersion });

    if (entries.length === 0) {
      // Dynamic on-the-fly semantic indexing safeguard: if index is missing/empty, compile it instantly so visitors don't face empty index fallbacks
      try {
        const { buildSemanticIndex } = await import('@/utils/semantic/indexer');
        const hasGemini = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY);
        const hasCF = !!(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN);
        const embeddingProvider = hasGemini
          ? new GeminiEmbeddingProvider()
          : hasCF
            ? new CloudflareEmbeddingProvider()
            : new FakeEmbeddingProvider();

        await buildSemanticIndex({
          supabase,
          businessId,
          publishVersion,
          embeddingProvider,
        });

        // Reload the newly compiled index
        entries = await loadSemanticIndex({ supabase, businessId, publishVersion });
      } catch (buildErr) {
        console.error('Dynamic semantic index building failed:', buildErr);
      }
    }

    if (entries.length === 0) {
      // Return safe fallback if no index entries can be compiled at all
      const fallbackText = activeLocale === 'tr' ? 'Şu anda bu soruya cevap veremiyorum.' : 'I cannot answer this question right now.';
      await persistResponseAndDeduct(fallbackText);
      return NextResponse.json({
        type: 'fallback',
        text: fallbackText
      });
    }

    // 4. LAYER 3: Generate Query Embedding (Incremental cache checked first)
    const cacheKey = `${businessId}:${activeLocale}:${normQuery}`;
    let queryEmbedding = queryEmbeddingCache.get(cacheKey) || null;

    if (!queryEmbedding) {
      const hasGemini = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY);
      const hasCF = !!(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN);
      const provider = hasGemini
        ? new GeminiEmbeddingProvider()
        : hasCF
          ? new CloudflareEmbeddingProvider()
          : new FakeEmbeddingProvider();
      
      queryEmbedding = await provider.embedQuery(normQuery);
      if (queryEmbedding) {
        queryEmbeddingCache.set(cacheKey, queryEmbedding);
      }
    }

    if (!queryEmbedding) {
      throw new Error('Failed to generate query embedding.');
    }

    // 5. LAYER 4: Match and Rank semantic entries
    const matchResult = findSemanticMatch({
      query: normQuery,
      locale: activeLocale,
      entries,
      queryEmbedding,
      isDebugMode: true // Keep true so we always have candidates to rank and retrieve for RAG
    });

    // 6. LAYER 5: Gemini 2.5 Flash Retrieval-Augmented Generation (RAG)
    const topCandidates = (matchResult.debug?.scores || [])
      .filter((sc: any) => !sc.isEliminated && sc.finalScore >= 0.35)
      .slice(0, 4)
      .map((sc: any) => {
        const fullEntry = entries.find((e) => e.id === sc.id);
        return {
          ...sc,
          title: fullEntry?.searchText.split('.')[0] || '',
          answer: fullEntry?.answer || fullEntry?.searchText || '',
          action: fullEntry?.action || null
        };
      });

    let finalResult = {
      type: 'match',
      text: '',
      action: null as any,
      suggestedQuestions: [] as string[],
      matchedBlock: null as any,
      debug: undefined as any
    };

    const topCandidate = topCandidates[0];
    let executedBehavior = '';

    // 1. BEHAVIOR 1: If top candidate is extremely high confidence (>= 0.70) AND is a block-opening action, handle completely deterministically (no Gemini)
    if (topCandidate && topCandidate.finalScore >= 0.70 && topCandidate.action?.type === 'open_block') {
      executedBehavior = 'Deterministic Block Match';
      finalResult.type = 'match';
      finalResult.text = topCandidate.answer || (activeLocale === 'tr' ? `${topCandidate.title} bölümünü açıyorum.` : `Opening ${topCandidate.title} section.`);
      finalResult.action = topCandidate.action;
      finalResult.matchedBlock = {
        title: topCandidate.title,
        description: topCandidate.answer,
        blockId: topCandidate.action?.blockId,
        itemId: topCandidate.action?.itemId,
      };
      finalResult.suggestedQuestions = activeLocale === 'tr' 
        ? ['İletişime nasıl geçerim?', 'Hemen randevu alabilir miyim?']
        : ['How can I contact?', 'Can I book an appointment?'];
    } 
    // 2. BEHAVIOR 3: No candidates found above 0.35 similarity -> Fallback (handled on client side based on leadCaptureEnabled/contactValue)
    else if (topCandidates.length === 0) {
      // Check if it's a generic contact/address request (e.g. contains 'adres', 'konum', 'iletisim' but had no custom knowledge note in DB)
      if (contactInfo.isContactQuery && contactInfo.isGenericRequest) {
        executedBehavior = 'Deterministic Generic Contact Fallback';
        const preferred = activeMethods[0];
        const prefValue = preferred ? contactValues[preferred]?.trim() : null;

        if (prefValue) {
          finalResult.type = 'match';
          finalResult.text = `Bize ${preferred.toUpperCase()} üzerinden kolayca ulaşabilirsiniz: ${prefValue}.`;
          if (activeLocale === 'en') {
            finalResult.text = `You can easily reach us via ${preferred.toUpperCase()}: ${prefValue}.`;
          } else if (activeLocale === 'ru') {
            finalResult.text = `Вы можете легко связаться с нами через ${preferred.toUpperCase()}: ${prefValue}.`;
          }
          finalResult.action = { type: 'open_block', blockId: '__contact__', itemId: preferred };
          finalResult.matchedBlock = {
            title: activeLocale === 'tr' ? 'İletişim' : 'Contact',
            description: activeLocale === 'tr' ? 'Bizimle doğrudan iletişime geçin.' : 'Get in touch with us directly.',
            blockId: '__contact__',
            itemId: preferred,
          };
          finalResult.suggestedQuestions = activeLocale === 'tr'
            ? ['Adresiniz nedir?', 'Yüz yüze eğitim var mı?']
            : ['What is your address?', 'Is there face-to-face training?'];
        } else {
          finalResult.type = 'fallback';
          finalResult.text = '';
        }
      } else {
        // BEHAVIOR 4: Hybrid safety net. The fast hybrid ranker (embedding + lexical +
        // intent gate) found nothing confident enough — this can be a genuinely
        // under-indexed question, OR a false negative from the intent gate (e.g. a query
        // classified as "book" hard-rejecting a "learn" entry that was actually the right
        // answer). Instead of silently giving up, make one last, deliberately more
        // expensive attempt with the FULL page context (every compiled entry for this
        // locale, not just the top 4 by score) so Saule stays "aware of the whole site"
        // for the rare cases the cheap path misses. This should fire rarely — most
        // queries are served above without ever reaching here.
        const localeEntries = entries.filter((e) => e.locale === activeLocale);
        if (localeEntries.length === 0) {
          executedBehavior = 'Fallback (no content indexed)';
          finalResult.type = 'fallback';
          finalResult.text = '';
        } else {
          executedBehavior = 'Gemini Full-Context Escalation';
          try {
            const fullContextText = localeEntries
              .map((e, index) => `Item #${index + 1}:
- Source Type: ${e.sourceType}
- Title/Question: ${e.searchText.split('.')[0]}
- Content/Answer: ${(e.answer || e.searchText).replace(/<[^>]*>/g, '').substring(0, 300)}
- Action Block: ${e.action?.blockId || ''}
- Action Item: ${e.action?.itemId || ''}`)
              .join('\n\n');

            const escalationPrompt = `You are Saule, a warm, professional, premium, and friendly virtual assistant for the bio/portfolio page owner.
Your goal is to answer the visitor's query with maximum warmth, clarity, and precision in the requested language: "${activeLocale === 'tr' ? 'Turkish' : activeLocale === 'ru' ? 'Russian' : 'English'}".

A faster keyword/embedding search already ran and found no confident match, so this is a full manual pass with EVERYTHING known about the page owner (every service, product, FAQ, and knowledge base note):
---
${fullContextText}
---

CRITICAL CONSTRAINTS & BEHAVIOR:
1. Answer the user's query: "${query}" using ONLY the context above.
2. Be highly proactive and business-focused: if the exact thing asked for isn't offered but a related alternative is mentioned in the context (e.g. training instead of a direct session, or vice versa), explain warmly and steer to the alternative, and set "action" to open it.
3. Do NOT invent, assume, or extrapolate any details (prices, times, services, addresses) not explicitly mentioned in the context.
4. If truly nothing in the context is relevant to the query, set "found" to false and leave "text" empty — do not apologize or guess.
5. Keep the answer warm, elegant, premium, and concise (under 2-3 sentences).
6. You MUST return your output in JSON format with exactly these four keys:
   - "found": (boolean) true if you answered using real context, false if nothing relevant exists.
   - "text": (string) your warm, natural, helpful conversational response, or "" if found is false.
   - "action": (object or null) {"type": "open_block", "blockId": "...", "itemId": "..."} using the Action Block/Item of the matching (or proactively suggested alternative) item, or null.
   - "suggestedQuestions": (array of strings) 2-3 short, clickable follow-up questions, or [] if found is false.

Return ONLY a valid JSON object. Do not include markdown code block formatting (like \`\`\`json) or any pre/post text.`;

            const { text: geminiOutput } = await generateText({
              model: googleProvider('gemini-2.5-flash'),
              prompt: escalationPrompt,
            });

            let cleanJson = geminiOutput.trim();
            if (cleanJson.startsWith('```')) {
              cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
            }
            const parsed = JSON.parse(cleanJson);

            if (parsed.found && parsed.text) {
              finalResult.type = 'match';
              finalResult.text = parsed.text;
              finalResult.action = parsed.action || null;
              finalResult.suggestedQuestions = parsed.suggestedQuestions || [];

              const actionBlockId = finalResult.action?.blockId;
              const actionItemId = finalResult.action?.itemId;
              if (actionBlockId) {
                const matchedCand = localeEntries.find(
                  (e) => e.action?.blockId === actionBlockId && (!actionItemId || e.action?.itemId === actionItemId)
                );
                if (matchedCand) {
                  finalResult.matchedBlock = {
                    title: matchedCand.searchText.split('.')[0] || '',
                    description: matchedCand.answer || '',
                    blockId: actionBlockId,
                    itemId: actionItemId || undefined,
                  };
                }
              }
            } else {
              finalResult.type = 'fallback';
              finalResult.text = '';
            }
          } catch (escalationErr) {
            console.error('Gemini full-context escalation failed, falling back:', escalationErr);
            finalResult.type = 'fallback';
            finalResult.text = '';
          }
        }
      }
    }
    // 3. BEHAVIOR 2: Conversational FAQ / Knowledge Base synthesis (Gemini 2.5 Flash RAG)
    else {
      executedBehavior = 'Gemini RAG';
      // Run Gemini 2.5 Flash RAG
      try {
        const contextText = topCandidates
          .map((c: any, index: number) => `Candidate #${index + 1}:
- Source Type: ${c.sourceType}
- Title/Question: ${c.title || c.searchText}
- Content/Answer: ${c.answer || c.searchText}
- Action Block: ${c.action?.blockId || ''}
- Action Item: ${c.action?.itemId || ''}`)
          .join('\n\n');

        const systemPrompt = `You are Saule, a warm, professional, premium, and friendly virtual assistant for the bio/portfolio page owner.
Your goal is to answer the visitor's query with maximum warmth, clarity, and precision in the requested language: "${activeLocale === 'tr' ? 'Turkish' : activeLocale === 'ru' ? 'Russian' : 'English'}".

Below is the ONLY factual context you have about the page owner (their services, products, FAQs, and custom Knowledge Base notes):
---
${contextText}
---

CRITICAL CONSTRAINTS & BEHAVIOR:
1. Answer the user's query: "${query}" using ONLY the provided context.
2. Be highly proactive, smart, and business-focused: If a requested service, language, format, or product option is unavailable or restricted (e.g. no online Turkish training), but the context mentions a viable alternative (e.g. face-to-face/yüz yüze training, offline workshops, or physical addresses), explain the situation warmly and immediately steer/suggest the alternative to the visitor. If a relevant block action exists for the alternative in the context, output that action to open it for them!
3. Do NOT invent, assume, or extrapolate any details (prices, times, services, addresses) not explicitly mentioned in the context.
4. If the context does not contain the answer or any relevant alternatives, respond gracefully stating you don't have this information right now, and suggest contacting the owner via their preferred channel.
5. Keep the answer warm, elegant, premium, and concise (under 2-3 sentences).
6. You MUST return your output in JSON format with exactly these three keys:
   - "text": (string) Your warm, natural, and helpful conversational response.
   - "action": (object or null) An action to trigger on the page IF and only if the query is highly relevant to one of the candidates (or the proactively suggested alternative candidate). The object must be of the form: {"type": "open_block", "blockId": "blockType", "itemId": "optionalItemId"}. Use the Action Block and Action Item details from the matching/alternative Candidate. If not highly relevant to a specific block, set to null.
   - "suggestedQuestions": (array of strings) 2 or 3 extremely relevant, short, and highly interesting follow-up questions that the visitor can click next (e.g. ["Eğitim içerikleri neler?", "Kimler katılabilir?"]). Do not make them too long. Keep them short (under 4-5 words if possible) and extremely clickable.

Return ONLY a valid JSON object. Do not include markdown code block formatting (like \`\`\`json) or any pre/post text.`;

        const { text: geminiOutput } = await generateText({
          model: googleProvider('gemini-2.5-flash'),
          prompt: systemPrompt,
        });

        let cleanJson = geminiOutput.trim();
        if (cleanJson.startsWith('```')) {
          cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
        }

        const parsed = JSON.parse(cleanJson);
        finalResult.text = parsed.text;
        finalResult.action = parsed.action || null;
        finalResult.suggestedQuestions = parsed.suggestedQuestions || [];

        // Fail-safe Intelligent Heuristics Layer:
        // Automatically attach the optimal native business block based on key concepts inside query or response text.
        const lowerText = finalResult.text.toLowerCase();
        const lowerQuery = query.toLowerCase();
        
        // Check if query is specifically about massage sessions, seans, or bookings (excluding training keywords)
        const isMassageSessionQuery = (lowerQuery.includes('masaj') || lowerQuery.includes('seans') || lowerQuery.includes('terapi')) &&
                                      !(lowerQuery.includes('egitim') || lowerQuery.includes('kurs') || lowerQuery.includes('okul') || lowerQuery.includes('ders') || lowerQuery.includes('format'));

        // Check if query is about education/training (and not just booking a session)
        const isEduQuery = !isMassageSessionQuery && (lowerQuery.includes('egitim') || lowerQuery.includes('kurs') || lowerQuery.includes('format') || lowerText.includes('egitim') || lowerText.includes('yuz yuze') || lowerText.includes('online'));
        
        if (isMassageSessionQuery) {
          // Force the 'custom' (Masaj) block so that the native Masaj block is correctly rendered
          const customEntry = entries.find((e: any) => e.blockType === 'custom' || e.action?.blockId === 'custom');
          if (customEntry) {
            finalResult.action = { type: 'open_block', blockId: 'custom', itemId: customEntry.action?.itemId || null };
          }
        } else if (isEduQuery) {
          // Force the 'services' (Eğitim Formatı) block so that the authentic education format block is rendered
          const servicesEntry = entries.find((e: any) => e.blockType === 'services' || e.action?.blockId === 'services');
          if (servicesEntry) {
            finalResult.action = { type: 'open_block', blockId: 'services', itemId: servicesEntry.action?.itemId || null };
          }
        } else {
          // Other heuristics only run as fail-safes if Gemini or the matching process returned no action
          if (!finalResult.action) {
            // Case B: Query or text is about location/address (adres, konum, nerede, yol tarifi)
            const isLocationQuery = lowerQuery.includes('adres') || lowerQuery.includes('konum') || lowerQuery.includes('nerede') || lowerText.includes('adres') || lowerText.includes('konum');
            if (isLocationQuery) {
              const contactCand = entries.find((e: any) => e.blockType === 'contact' || e.action?.blockId === '__contact__' || e.action?.blockId === 'contact');
              if (contactCand) {
                finalResult.action = { type: 'open_block', blockId: '__contact__', itemId: contactCand.action?.itemId || null };
              }
            }
            
            // Case C: Query or text is about price/cost (fiyat, ücret, maliyet, ne kadar)
            if (!finalResult.action) {
              const isPriceQuery = lowerQuery.includes('fiyat') || lowerQuery.includes('ucret') || lowerQuery.includes('maliyet') || lowerQuery.includes('kadar') || lowerText.includes('fiyat') || lowerText.includes('ucret') || lowerText.includes('maliyet');
              if (isPriceQuery) {
                const pricingCand = entries.find((e: any) => e.blockType === 'pricing' || e.action?.blockId === 'pricing');
                if (pricingCand) {
                  finalResult.action = { type: 'open_block', blockId: 'pricing', itemId: pricingCand.action?.itemId || null };
                }
              }
            }
          }
        }

        // Resolve matchedBlock card info from action
        const actionBlockId = finalResult.action?.blockId;
        const actionItemId = finalResult.action?.itemId;
        if (actionBlockId) {
          const matchedCand = topCandidates.find(
            (c: any) => c.action?.blockId === actionBlockId && (!actionItemId || c.action?.itemId === actionItemId)
          ) || entries.find(
            (e: any) => e.action?.blockId === actionBlockId && (!actionItemId || e.action?.itemId === actionItemId)
          ) || topCandidate;

          if (matchedCand) {
            finalResult.matchedBlock = {
              title: matchedCand.title || '',
              description: matchedCand.answer || '',
              blockId: actionBlockId,
              itemId: actionItemId || undefined,
            };
          }
        }
      } catch (geminiErr) {
        console.error('Gemini RAG generation failed, falling back to top score candidate:', geminiErr);
        // Fallback to top matched candidate
        finalResult.text = topCandidate?.answer || topCandidate?.searchText || '';
        finalResult.action = topCandidate?.action || null;
        finalResult.suggestedQuestions = activeLocale === 'tr' 
          ? ['İletişime nasıl geçerim?', 'Daha fazla bilgi alabilir miyim?']
          : ['How to contact?', 'Can I get more info?'];
        
        if (topCandidate?.action?.blockId) {
          finalResult.matchedBlock = {
            title: topCandidate.title || '',
            description: topCandidate.answer || '',
            blockId: topCandidate.action.blockId,
            itemId: topCandidate.action.itemId || undefined,
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

    await persistResponseAndDeduct(finalResult.text);

    return NextResponse.json(finalResult);
  } catch (err: any) {
    console.error('Semantic query route error:', err);
    return NextResponse.json({
      type: 'fallback',
      text: 'Bir hata oluştu, lütfen daha sonra tekrar deneyin.'
    }, { status: 500 });
  }
}
