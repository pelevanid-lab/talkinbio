import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { isKnownCharacterId } from '@/utils/knownCharacter';
import { generateCharacterVoice, transcribeReferenceAudio } from '@/utils/fal';
import { authorizeCharacterRequest } from '@/utils/creativeStudioScope';

export const maxDuration = 300;

export async function POST(req: Request, { params }: { params: Promise<{ characterId: string }> }) {
  const { characterId } = await params;
  if (!(await authorizeCharacterRequest(characterId))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await isKnownCharacterId(characterId))) {
    return NextResponse.json({ error: 'Bilinmeyen karakter.' }, { status: 400 });
  }

  try {
    const formData = await req.formData();

    // 1. Mod: Hazır referans seçimi (Yardımcı Oyuncular) — dosya yok, doğrudan
    // zaten barındırılan bir preset URL'i referans yapılır (tekrar yüklemeye gerek yok).
    const presetUrl = formData.get('presetUrl') as string | null;
    if (presetUrl) {
      let refText: string | null = null;
      try {
        refText = await transcribeReferenceAudio(presetUrl);
      } catch (err) {
        console.warn('[voice] hazır referans deşifresi çıkarılamadı, üretimde tekrar denenecek:', err);
      }

      const { error: profileError } = await supabaseAdmin
        .from('character_profiles')
        .upsert(
          {
            id: characterId,
            voice_url: presetUrl,
            voice_status: 'none',
            voice_ref_text: refText,
            minimax_voice_id: null,
            minimax_voice_status: 'none',
          },
          { onConflict: 'id' },
        );

      if (profileError) {
        console.error('[voice] profil güncellenemedi (preset)', profileError);
        throw new Error(`Referans kaydedilemedi: ${profileError.message}`);
      }

      return NextResponse.json({ voice_url: presetUrl });
    }

    // 2. Mod: Dosya yükleme (Ses yükle)
    const file = formData.get('file') as File | null;
    if (file) {
      const bytes = Buffer.from(await file.arrayBuffer());
      const ext = file.name.split('.').pop() || 'wav';
      const objectPath = `characters/${characterId}/voice-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from('media')
        .upload(objectPath, bytes, {
          contentType: file.type || 'audio/wav',
          cacheControl: '31536000',
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabaseAdmin.storage.from('media').getPublicUrl(objectPath);

      // Deşifreyi burada, bir kez çıkarıyoruz. Referans defalarca kullanılacak; bunu
      // her üretimde yeniden hesaplamak her "Seslendir" tıklamasına ikinci bir kuyruk
      // işi ekliyordu. Başarısız olursa akışı düşürmüyoruz — üretim tarafı eski
      // davranışa (o anda whisper) düşer.
      let refText: string | null = null;
      try {
        refText = await transcribeReferenceAudio(publicUrl);
      } catch (err) {
        console.warn('[voice] referans deşifresi çıkarılamadı, üretimde tekrar denenecek:', err);
      }

      // Profili güncelle.
      //
      // upsert: profil satırı henüz yoksa (ör. yüz hiç tanıtılmadıysa) `update` sıfır satır
      // etkiler ve yüklenen ses sessizce kaybolurdu.
      //
      // voice_status 'none' kalır — yeni bir referans, önceki klon onayını geçersiz kılar.
      // 'ready' yalnızca klon kulakla doğrulandığında yazılır (bkz. Beiwe Voice, aşama 2).
      const { error: profileError } = await supabaseAdmin
        .from('character_profiles')
        .upsert(
          {
            id: characterId,
            voice_url: publicUrl,
            voice_status: 'none',
            voice_ref_text: refText,
            // Yeni referans, eski MiniMax klonunu geçersiz kılar — Beiwe Voice bu URL'i
            // okuyor, o klon artık bu referansa ait değil (bkz. minimax-voice route'u).
            minimax_voice_id: null,
            minimax_voice_status: 'none',
          },
          { onConflict: 'id' },
        );

      // Sessizce yutmuyoruz: yazma düşerse ses yüklenmiş ama profile bağlanmamış olur ve
      // kullanıcı bunu ancak "referans yok" ekranını tekrar görünce anlar. (Örn. 00052/00053
      // migration'ları uygulanmadıysa ilgili kolonlar yoktur ve tüm upsert reddedilir.)
      if (profileError) {
        console.error('[voice] profil güncellenemedi', profileError);
        throw new Error(
          `Ses yüklendi ama profile kaydedilemedi: ${profileError.message}. ` +
            '00052/00053 migration\'ları uygulandı mı?',
        );
      }

      return NextResponse.json({ voice_url: publicUrl });
    }

    // 3. Mod: Ses üretimi (Klonla / Test et)
    const text = formData.get('text') as string;
    const voiceUrl = formData.get('voice_url') as string;
    
    if (text && voiceUrl) {
      // Saklı deşifre varsa whisper adımı tamamen atlanır.
      const { data: profile } = await supabaseAdmin
        .from('character_profiles')
        .select('voice_url, voice_ref_text')
        .eq('id', characterId)
        .maybeSingle();

      // Deşifre yalnız kaydedildiği referansa aittir — referans değiştiyse kullanma.
      const cachedRefText =
        profile?.voice_url === voiceUrl ? (profile?.voice_ref_text ?? undefined) : undefined;

      const result = await generateCharacterVoice({
        prompt: text,
        referenceAudioUrl: voiceUrl,
        referenceText: cachedRefText,
      });

      // Deşifre bu çağrıda çıktıysa (eski kayıtlar, ya da yüklemede başarısız olduysa)
      // sakla ki bir sonraki üretim ondan faydalansın.
      if (result.transcribedRefText) {
        await supabaseAdmin
          .from('character_profiles')
          .upsert(
            { id: characterId, voice_url: voiceUrl, voice_ref_text: result.transcribedRefText },
            { onConflict: 'id' },
          );
      }

      return NextResponse.json(result);
    }
    
    return NextResponse.json({ error: 'Dosya veya metin/ses linki gerekli.' }, { status: 400 });
  } catch (err) {
    console.error('[voice] Hata:', err);
    const message = err instanceof Error ? err.message : 'Ses işlenemedi.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
