import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { generateOnce } from '@/agents/shared/generateOnce';
import { buildScenePrompt } from '@/agents/shared/characterScenePrompt';
import { FalError, generateCharacterImage, publicImageAsDataUri } from '@/utils/fal';
import {
  ASPECT_RATIOS,
  CHARACTERS,
  DEFAULT_CAST_WARDROBE_PROMPT,
  DEFAULT_IMAGE_MODEL,
  MAX_CANON_SHOTS,
  MAX_IMAGES_PER_RUN,
  MAX_SCENE_REFS,
  SHARED_SCENE_PRESETS,
  STYLE_PROMPT,
  buildNegativePrompt,
  isCharacterId,
  referenceRoleInstruction,
  textSpaceInstruction,
  type AspectRatio,
  type CharacterDefinition,
  type Resolution,
  type TextSpace,
} from '@/config/characters';

// Görsel üretimi kuyruk üzerinden yürüyor ve dakikalar sürebiliyor — repoda zaten
// kullanılan uzun iş deseni (bkz. api/setup-agent/route.ts).
export const maxDuration = 300;

const VALID_ASPECT_RATIOS = ASPECT_RATIOS.map((a) => a.value);

type Body = {
  intent?: string;
  rawPrompt?: string;
  presetId?: string;
  presetIds?: string[];
  aspectRatio?: AspectRatio;
  resolution?: Resolution;
  numImages?: number;
  seed?: number;
  sceneRefUrls?: string[];
  allowSceneText?: boolean;
  textSpace?: TextSpace;
};

export async function POST(req: Request, { params }: { params: Promise<{ characterId: string }> }) {
  const cookieStore = await cookies();
  if (cookieStore.get('admin_session')?.value !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { characterId } = await params;

  const { data: profile } = await supabaseAdmin
    .from('character_profiles')
    .select('*')
    .eq('id', characterId)
    .single();

  // Statik karakterler (`CHARACTERS`) VEYA Yardımcı Oyuncular'da admin panelinden
  // eklenmiş sanal karakterler (`character_profiles.is_cast`) — bkz. api/admin/beiwe-lab/cast.
  let character: CharacterDefinition;
  if (isCharacterId(characterId)) {
    character = { ...CHARACTERS[characterId] };
    if (profile) {
      if (profile.identity_prompt) character.identityPrompt = profile.identity_prompt;
      if (profile.reference_image_url) character.referenceFile = profile.reference_image_url;
    }
  } else if (profile?.is_cast) {
    character = {
      id: characterId as CharacterDefinition['id'],
      name: profile.name || characterId,
      role: profile.role || 'Yardımcı oyuncu',
      summary: '',
      accentColor: '#334155',
      identityPrompt: profile.identity_prompt || undefined,
      referenceFile: profile.reference_image_url || undefined,
      wardrobePrompt: DEFAULT_CAST_WARDROBE_PROMPT,
      scenePresets: SHARED_SCENE_PRESETS,
    };
  } else {
    return NextResponse.json({ error: 'Bilinmeyen karakter.' }, { status: 400 });
  }

  if (!character.identityPrompt) {
    return NextResponse.json({ error: 'Karakter kimliği (identity_prompt) bulunamadı. Lütfen önce yüzünüzü tanıtın.' }, { status: 400 });
  }

  const body = (await req.json()) as Body;
  const presetIds = body.presetIds || (body.presetId ? [body.presetId] : []);
  const presets = presetIds.map(id => character.scenePresets.find((p) => p.id === id)).filter(Boolean) as typeof character.scenePresets;
  const presetPrompt = presets.map(p => p.prompt).join(' ') || undefined;

  const aspectRatio: AspectRatio = VALID_ASPECT_RATIOS.includes(body.aspectRatio as AspectRatio)
    ? (body.aspectRatio as AspectRatio)
    : presets.find((p) => p.aspectRatio)?.aspectRatio || '4:5';
  const resolution: Resolution = body.resolution === '2K' ? '2K' : '1K';
  const numImages = Math.min(Math.max(Number(body.numImages) || 1, 1), MAX_IMAGES_PER_RUN);
  const sceneRefUrls = (body.sceneRefUrls || []).filter((u) => typeof u === 'string' && u).slice(0, MAX_SCENE_REFS);
  const textSpace = body.textSpace ?? presets.find((p) => p.textSpace)?.textSpace ?? 'none';

  const intent = body.intent?.trim();
  const rawPrompt = body.rawPrompt?.trim();

  if (!rawPrompt && !intent && presets.length === 0) {
    return NextResponse.json({ error: 'Sahne tarifi, şablon veya ham prompt gerekli.' }, { status: 400 });
  }

  try {
    /* 1 — Sahne tarifi.
       Ham prompt varsa aynen kullanılır (gelişmiş mod). Türkçe niyet varsa modele
       çevirtilir. Sadece şablon seçildiyse şablonun kendi İngilizce tarifi yeterli. */
    let scene: string;
    if (rawPrompt) {
      scene = rawPrompt;
    } else if (intent) {
      const { system, prompt } = buildScenePrompt({
        character,
        intent,
        presetPrompt: presetPrompt,
        hasSceneReference: sceneRefUrls.length > 0,
      });
      const { text } = await generateOnce({ task: 'characterPrompt', system, prompt });
      scene = text.trim();
      if (!scene) {
        return NextResponse.json({ error: 'Sahne tarifi üretilemedi, tekrar dener misin?' }, { status: 502 });
      }
    } else {
      scene = presetPrompt!;
    }

    const useLora = profile?.lora_status === 'ready' && !!profile?.lora_url;
    const loraUrl = useLora ? profile.lora_url : undefined;
    const loraTrigger = (useLora && profile.lora_trigger_word) ? profile.lora_trigger_word + ' ' : '';

    const identityRefs: string[] = [];
    
    if (!useLora) {
      if (character.referenceFile) {
        identityRefs.push(await publicImageAsDataUri(character.referenceFile));
      }

      const { data: canonShots } = await supabaseAdmin
        .from('character_shots')
        .select('image_url')
        .eq('character_id', characterId)
        .eq('is_canon', true)
        .order('similarity_score', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(MAX_CANON_SHOTS);

      for (const shot of canonShots || []) {
        if (shot.image_url) {
          try {
            const check = await fetch(shot.image_url, { method: 'HEAD' });
            if (check.ok) {
              identityRefs.push(shot.image_url);
            } else {
              console.warn(`[generate] Atlanan bozuk kanon görseli (${check.status}): ${shot.image_url}`);
            }
          } catch (e) {
            console.warn(`[generate] Kanon görseli erişilemez durumda: ${shot.image_url}`);
          }
        }
      }

      if (identityRefs.length === 0) {
        return NextResponse.json(
          { error: 'Karakter kimliği için geçerli bir kanon fotoğraf bulunamadı. Galerideki bozuk fotoğrafları (çarpı işareti olanları) silip yeniden yükleyin.' },
          { status: 400 }
        );
      }
    }

    const imageUrls = [...identityRefs, ...sceneRefUrls];

    /* 3 — Nihai prompt: kilitli kimlik + sahne + gardırop + stil + boşluk + roller + negatifler. */
    const finalPrompt = [
      loraTrigger + character.identityPrompt,
      scene,
      character.wardrobePrompt,
      STYLE_PROMPT,
      textSpaceInstruction(textSpace),
      useLora ? null : referenceRoleInstruction(identityRefs.length, sceneRefUrls.length),
      buildNegativePrompt(body.allowSceneText === true),
    ]
      .filter(Boolean)
      .join('\n\n');

    const model = useLora 
      ? 'fal-ai/flux-lora' 
      : (process.env.CHARACTER_IMAGE_MODEL || DEFAULT_IMAGE_MODEL);

    // fal-ai modelleri (ör. PuLID) image_urls alanındaki tüm resimlerde yüz arar.
    // Eğer sahne referansı (yüz içermeyen bir laptop ekranı vb.) gönderirsek 
    // model "Could not generate images" hatası vererek çöker.
    // Bu yüzden sadece identityRefs'leri image_urls olarak gönderiyoruz.
    // LoRA aktifse identityRefs boştur.
    const result = await generateCharacterImage({
      model,
      prompt: finalPrompt,
      imageUrls,
      aspectRatio,
      resolution,
      numImages,
      seed: typeof body.seed === 'number' ? body.seed : undefined,
      loraUrl,
    });

    /* 4 — fal'ın geçici URL'lerini kendi storage'ımıza taşı; galeri kalıcı olmalı. */
    const rows = [];
    for (const image of result.images) {
      const imageRes = await fetch(image.url);
      if (!imageRes.ok) continue;
      const bytes = Buffer.from(await imageRes.arrayBuffer());

      const objectPath = `characters/${characterId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from('media')
        .upload(objectPath, bytes, { contentType: 'image/png', cacheControl: '31536000' });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabaseAdmin.storage.from('media').getPublicUrl(objectPath);

      rows.push({
        character_id: characterId,
        image_url: publicUrl,
        prompt: finalPrompt,
        user_intent: intent || null,
        preset_id: presetIds.length > 0 ? presetIds.join(',') : null,
        model,
        seed: result.seed ?? null,
        reference_urls: imageUrls.map((u) => (u.startsWith('data:') ? `public/${character.referenceFile}` : u)),
        aspect_ratio: aspectRatio,
      });
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Üretilen görsel indirilemedi.' }, { status: 502 });
    }

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('character_shots')
      .insert(rows)
      .select();
    if (insertError) throw insertError;

    return NextResponse.json({ shots: inserted });
  } catch (err) {
    if (err instanceof FalError) {
      console.error('[characters/generate] fal failed', err.message);
      return NextResponse.json({ error: err.userMessage }, { status: 502 });
    }
    console.error('[characters/generate] failed', err);
    return NextResponse.json({ error: 'Görsel üretilirken bir hata oluştu.' }, { status: 500 });
  }
}
