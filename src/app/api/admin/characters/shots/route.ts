import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { authorizeCharacterRequest } from '@/utils/creativeStudioScope';

export async function POST(req: Request) {
  try {
    const { characterId, imageUrl, isCanon = true, similarityScore = 10 } = await req.json();

    if (!characterId || !imageUrl) {
      return NextResponse.json({ error: 'Karakter ID ve resim URL zorunludur.' }, { status: 400 });
    }

    const auth = await authorizeCharacterRequest(characterId);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: shot, error } = await supabaseAdmin
      .from('character_shots')
      .insert({
        character_id: characterId,
        business_id: auth.mode === 'business' ? auth.business.id : null,
        image_url: imageUrl,
        is_canon: isCanon,
        similarity_score: similarityScore,
        prompt: 'Onboarding face reference upload', // Placeholder
        model: 'user-upload',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ shot });
  } catch (err: any) {
    console.error('Kare kaydedilirken hata:', err);
    return NextResponse.json({ error: err.message || 'Hata oluştu.' }, { status: 500 });
  }
}
