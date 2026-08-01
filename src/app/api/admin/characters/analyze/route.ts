import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { authorizeCharacterRequest } from '@/utils/creativeStudioScope';
import { assertSufficientCredits, deductForGeneration, InsufficientCreditsError } from '@/utils/creativeStudioCredits';
import { IDENTITY_ANALYSIS_COST_USD } from '@/config/beiweLab';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export const maxDuration = 60; // Vision modelleri 60sn sürebilir

export async function POST(req: Request) {
  try {
    const { characterId, imageUrls } = await req.json();

    if (!characterId || !imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json({ error: 'Karakter ID ve resim URLleri zorunludur.' }, { status: 400 });
    }

    const auth = await authorizeCharacterRequest(characterId);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (auth.mode === 'business') {
      try {
        await assertSufficientCredits(auth.business.id, IDENTITY_ANALYSIS_COST_USD);
      } catch (err) {
        if (err instanceof InsufficientCreditsError) {
          return NextResponse.json(
            { error: 'Yetersiz kredi.', requiredCredits: err.requiredCredits, balance: err.balance },
            { status: 402 },
          );
        }
        throw err;
      }
    }

    // Resimleri Vercel AI SDK formatına uygun (URL veya Base64) hazırlıyoruz.
    // image type için URL kullanabiliriz.
    const messages: any[] = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analyze the face in these images and create a single highly detailed English prompt describing the person's identity for an AI image generator (like Flux or Midjourney). 
Important instructions:
- Start with "The person is [Name]: a [man/woman] in [his/her] [age bracket] of [ethnicity] heritage." (You can use the name ${characterId})
- Describe the face shape, skin tone, eye color/shape, nose, lips, hair color/style/length, and facial hair (if any).
- Describe their typical expression (e.g. warm, confident, calm).
- Keep it entirely focused on physical facial/head attributes. Do not describe the background or clothing.
- Format as a single paragraph. No markdown formatting.`,
          },
          ...imageUrls.map((url) => ({
            type: 'image',
            image: new URL(url),
          })),
        ],
      },
    ];

    const { text: identityPrompt } = await generateText({
      model: google('gemini-2.5-pro'),
      messages,
    });

    if (!identityPrompt) {
      throw new Error('Vision AI identity prompt üretemedi.');
    }

    // Profilin veri tabanında olup olmadığını kontrol et (Upsert yapacağız)
    const { error: dbError } = await supabaseAdmin
      .from('character_profiles')
      .upsert({
        id: characterId,
        identity_prompt: identityPrompt,
        reference_image_url: imageUrls[0], // İlk kareyi ana referans yapıyoruz
      }, { onConflict: 'id' });

    if (dbError) throw dbError;

    if (auth.mode === 'business') {
      await deductForGeneration(auth.business.id, IDENTITY_ANALYSIS_COST_USD);
    }

    return NextResponse.json({ identityPrompt });
  } catch (err: any) {
    console.error('Vision AI error:', err);
    return NextResponse.json({ error: err.message || 'Analiz sırasında hata oluştu.' }, { status: 500 });
  }
}
