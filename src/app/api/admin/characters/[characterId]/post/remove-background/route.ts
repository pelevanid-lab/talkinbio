import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { isKnownCharacterId } from '@/utils/knownCharacter';
import { FalError, removeImageBackground } from '@/utils/fal';
import { recordUsageEvent } from '@/agents/shared/usage';
import { ESTIMATED_BG_REMOVAL_COST_USD } from '@/config/post';
import { authorizeCharacterRequest } from '@/utils/creativeStudioScope';
import { assertSufficientCredits, deductForGeneration, InsufficientCreditsError } from '@/utils/creativeStudioCredits';

export const maxDuration = 90;

// `scene-ref/route.ts` ile AYNI gerekçe: cihazdan yüklenen bir dosyanın fal'ın erişebileceği
// bir https URL'i yok (object URL tarayıcıya özel), o yüzden önce Supabase'e yükleyip gerçek
// bir URL alıyoruz — fal `image_url` alanında herkese açık URL'leri doğrudan indirebiliyor
// (bkz. fal.ts publicImageAsDataUri yorumu). Galeriden seçilen görsellerin zaten gerçek bir
// Supabase URL'i var, o durumda yükleme adımı atlanır.
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Beiwe Post — "Arka planı kaldır". Girdi cihazdan yüklenen bir dosya (multipart `file`) ya
 * da galeriden seçilmiş gerçek bir URL (JSON `{ imageUrl }`) olabilir; ikisi de aynı
 * `removeImageBackground`'a (fal.ts, DOĞRULANDI 2026-07-31 — $0,0045/görsel) gider.
 *
 * fal'ın döndürdüğü URL'i OLDUĞU GİBİ döndürmüyoruz — iki sebep: (1) fal'ın barındırdığı
 * sonuçlar kalıcı değil, bir süre sonra 404 verebilir; (2) daha önemlisi, sonucun Post'un
 * kendi galerisinde ("Galeriden seç") ve Studio'nun asset seçicilerinde YENİDEN
 * kullanılabilmesi için `character_studio_assets`'e KAYDEDİLMESİ gerekiyor — kaydedilmezse
 * kullanıcı ürettiği görseli bir daha bulamıyordu (bkz. proje geçmişi, bu route'un ilk
 * sürümündeki eksik). Bu yüzden fal'ın sonucu burada indirilip Supabase'e re-host ediliyor,
 * `studio-asset` route'unun yaptığı KAYDIN AYNISI (character_studio_assets insert) burada da
 * yapılıyor.
 */
export async function POST(req: Request, { params }: { params: Promise<{ characterId: string }> }) {
  const { characterId } = await params;
  const auth = await authorizeCharacterRequest(characterId);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await isKnownCharacterId(characterId))) {
    return NextResponse.json({ error: 'Bilinmeyen karakter.' }, { status: 400 });
  }

  if (auth.mode === 'business') {
    try {
      await assertSufficientCredits(auth.business.id, ESTIMATED_BG_REMOVAL_COST_USD);
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

  const contentType = req.headers.get('content-type') || '';
  let sourceUrl: string | null = null;

  try {
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file');
      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'Dosya bulunamadı.' }, { status: 400 });
      }
      if (!file.type.startsWith('image/')) {
        return NextResponse.json({ error: 'Yalnızca görsel yüklenebilir.' }, { status: 400 });
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: 'Görsel 10 MB sınırını aşıyor.' }, { status: 400 });
      }

      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const objectPath = `characters/${characterId}/post-uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const bytes = Buffer.from(await file.arrayBuffer());

      const { error: uploadError } = await supabaseAdmin.storage
        .from('media')
        .upload(objectPath, bytes, { contentType: file.type, cacheControl: '31536000' });

      if (uploadError) {
        console.error('[post/remove-background] upload failed', uploadError);
        return NextResponse.json({ error: 'Görsel yüklenemedi.' }, { status: 500 });
      }

      const { data: { publicUrl } } = supabaseAdmin.storage.from('media').getPublicUrl(objectPath);
      sourceUrl = publicUrl;
    } else {
      const body = (await req.json().catch(() => null)) as { imageUrl?: string } | null;
      if (!body?.imageUrl || !body.imageUrl.startsWith('http')) {
        return NextResponse.json({ error: 'Görsel URL\'i geçersiz.' }, { status: 400 });
      }
      sourceUrl = body.imageUrl;
    }

    const { url: falUrl } = await removeImageBackground(sourceUrl);

    // fal'ın sonucunu indirip Supabase'e re-host ediyoruz — `studio-asset` route'undaki
    // yükleme deseninin AYNISI, tek fark kaynağın bir dosya değil fal'ın URL'i olması.
    const falImageRes = await fetch(falUrl);
    if (!falImageRes.ok) {
      throw new Error(`fal görseli indirilemedi (HTTP ${falImageRes.status}).`);
    }
    const contentTypeHeader = falImageRes.headers.get('content-type') || 'image/png';
    const bytes = Buffer.from(await falImageRes.arrayBuffer());
    const objectPath = `characters/${characterId}/bg-removed/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('media')
      .upload(objectPath, bytes, { contentType: contentTypeHeader, cacheControl: '31536000' });
    if (uploadError) {
      console.error('[post/remove-background] re-host upload failed', uploadError);
      // Re-host başarısız olsa bile fal'ın (geçici) URL'i işe yarar — kullanıcı en azından
      // o anki önizlemede kullanabilir, sadece kalıcı galeriye düşmez.
      return NextResponse.json({ url: falUrl, saved: false });
    }

    const { data: { publicUrl } } = supabaseAdmin.storage.from('media').getPublicUrl(objectPath);

    const { data: asset, error: insertError } = await supabaseAdmin
      .from('character_studio_assets')
      .insert({
        character_id: characterId,
        business_id: auth.mode === 'business' ? auth.business.id : null,
        kind: 'image',
        url: publicUrl,
        file_name: 'arka-plan-kaldirildi.png',
      })
      .select()
      .single();
    if (insertError) {
      console.error('[post/remove-background] asset insert failed', insertError);
      return NextResponse.json({ url: publicUrl, saved: false });
    }

    if (auth.mode === 'business') {
      const { creditsCharged } = await deductForGeneration(auth.business.id, ESTIMATED_BG_REMOVAL_COST_USD);
      await recordUsageEvent(supabaseAdmin, {
        businessId: auth.business.id,
        agent: 'beiwe',
        channel: 'web',
        model: 'fal-ai/imageutils/rembg',
        usage: {},
        creditsCharged,
      });
    }

    return NextResponse.json({ url: publicUrl, saved: true, asset });
  } catch (err) {
    if (err instanceof FalError) {
      console.error('[post/remove-background] fal failed', err.message, `sourceUrl=${sourceUrl}`);
      return NextResponse.json({ error: err.userMessage }, { status: 502 });
    }
    console.error('[post/remove-background] failed', err, `sourceUrl=${sourceUrl}`);
    return NextResponse.json({ error: 'Arka plan kaldırılırken bir hata oluştu.' }, { status: 500 });
  }
}
