import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { generateOnce } from '@/agents/shared/generateOnce';
import { FalError, generateCharacterImage } from '@/utils/fal';
import { STYLE_PROMPT, buildNegativePrompt, ESTIMATED_COST_PER_IMAGE_USD } from '@/config/characters';
import { getBusinessFromRequest, type Business } from '@/utils/businessAuth';
import { assertSufficientCredits, deductForGeneration, InsufficientCreditsError } from '@/utils/creativeStudioCredits';

// Bu route bir "hangi karaktere erişim" kontrolü değil, YENİ bir karakter YARATIYOR —
// authorizeCharacterRequest'in characterId'ye göre sahiplik kontrolü burada anlamsız
// (henüz bir characterId yok). Admin şifresi VEYA işletme oturumu, ikisi de yeterli.
async function authorizeCastCreation(): Promise<{ mode: 'admin' } | { mode: 'business'; business: Business } | null> {
  const cookieStore = await cookies();
  if (cookieStore.get('admin_session')?.value === process.env.ADMIN_PASSWORD) {
    return { mode: 'admin' };
  }
  const business = await getBusinessFromRequest();
  return business ? { mode: 'business', business } : null;
}

const TR_MAP: Record<string, string> = {
  ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u',
  Ç: 'c', Ğ: 'g', İ: 'i', Ö: 'o', Ş: 's', Ü: 'u',
};

function slugify(name: string): string {
  const ascii = name
    .split('')
    .map((ch) => TR_MAP[ch] ?? ch)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return ascii || 'oyuncu';
}

/**
 * Yardımcı Oyuncular — sanal/kurgusal destek karakteri oluşturur.
 *
 * Saule/Beiwe'nin aksine gerçek bir yüze kilitlenmez: yalnızca admin'in yazdığı Türkçe
 * tarif İngilizce bir kimlik paragrafına çevrilir, o paragraftan referanssız (metinden
 * görsele) bir kanonik avatar üretilir, ve bu avatar sonraki her sahne üretiminde referans
 * olarak kullanılır — bkz. `src/components/CharacterRoomClient.tsx`'teki `mode="cast"`.
 */
export async function POST(req: Request) {
  const auth = await authorizeCastCreation();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json()) as { name?: string; persona?: string };
  const name = body.name?.trim().slice(0, 60);
  const persona = body.persona?.trim().slice(0, 800);

  if (!name || !persona) {
    return NextResponse.json({ error: 'İsim ve tarif gerekli.' }, { status: 400 });
  }

  if (auth.mode === 'business') {
    try {
      await assertSufficientCredits(auth.business.id, ESTIMATED_COST_PER_IMAGE_USD);
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

  const id = `cast-${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`;

  try {
    /* 1 — Türkçe tarifi, kilitlenip her üretimde tekrar kullanılacak İngilizce bir
       kimlik paragrafına çevir. Sahne prompt'undaki gibi SADECE görünüş/fiziksel kimlik —
       ortam/aksiyon her sahnede ayrıca yazılıyor. */
    const system = `Sen bir karakter tasarımcısısın. Görevin, Türkçe yazılmış bir kurgusal karakter tarifini,
görsel üretim modeline verilecek İNGİLİZCE bir kimlik paragrafına çevirmek.

Kurallar:
- Yalnızca fiziksel görünüşü tarif et: yaş aralığı, saç, göz, ten, yüz hatları, genel duruş/enerji.
- Ortamı, sahneyi, aksiyonu veya kıyafeti tarif etme — bunlar ayrı bir katmanda ele alınıyor.
- Somut ve fotoğrafik yaz, soyut sıfat yığını yapma. 2-4 cümle, tek paragraf.
- "The person is ${name}:" ile başla.

SADECE İngilizce kimlik paragrafını döndür. Açıklama, başlık, tırnak veya markdown ekleme.`;

    const { text } = await generateOnce({
      task: 'characterPrompt',
      system,
      prompt: `Türkçe karakter tarifi: ${persona}`,
    });
    const identityPrompt = text.trim();
    if (!identityPrompt) {
      return NextResponse.json({ error: 'Kimlik tarifi üretilemedi, tekrar dener misin?' }, { status: 502 });
    }

    /* 2 — Kanonik avatar: referanssız (metinden görsele) tek kare. */
    const avatarPrompt = [identityPrompt, STYLE_PROMPT, buildNegativePrompt()].join('\n\n');
    const imageResult = await generateCharacterImage({
      model: 'fal-ai/nano-banana-pro',
      prompt: avatarPrompt,
      imageUrls: [],
      aspectRatio: '4:5',
      resolution: '1K',
      numImages: 1,
    });

    const imageUrl = imageResult.images[0]?.url;
    if (!imageUrl) {
      return NextResponse.json({ error: 'Avatar üretilemedi.' }, { status: 502 });
    }

    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) throw new Error('Üretilen avatar indirilemedi.');
    const bytes = Buffer.from(await imageRes.arrayBuffer());

    const objectPath = `characters/${id}/avatar-${Date.now()}.png`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from('media')
      .upload(objectPath, bytes, { contentType: 'image/png', cacheControl: '31536000' });
    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from('media').getPublicUrl(objectPath);

    const { error: insertError } = await supabaseAdmin.from('character_profiles').insert({
      id,
      business_id: auth.mode === 'business' ? auth.business.id : null,
      name,
      role: 'Yardımcı oyuncu — sanal karakter',
      is_cast: true,
      identity_prompt: identityPrompt,
      reference_image_url: publicUrl,
    });
    if (insertError) throw insertError;

    if (auth.mode === 'business') {
      await deductForGeneration(auth.business.id, ESTIMATED_COST_PER_IMAGE_USD);
    }

    return NextResponse.json({ id, name });
  } catch (err) {
    if (err instanceof FalError) {
      console.error('[beiwe-lab/cast] fal failed', err.message);
      return NextResponse.json({ error: err.userMessage }, { status: 502 });
    }
    console.error('[beiwe-lab/cast] failed', err);
    return NextResponse.json({ error: 'Yardımcı oyuncu oluşturulurken bir hata oluştu.' }, { status: 500 });
  }
}
