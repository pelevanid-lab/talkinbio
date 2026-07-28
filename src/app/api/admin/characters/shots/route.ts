import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/utils/supabase/admin';

export async function POST(req: Request) {
  const cookieStore = await cookies();
  if (cookieStore.get('admin_session')?.value !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { characterId, imageUrl, isCanon = true, similarityScore = 10 } = await req.json();

    if (!characterId || !imageUrl) {
      return NextResponse.json({ error: 'Karakter ID ve resim URL zorunludur.' }, { status: 400 });
    }

    const { data: shot, error } = await supabaseAdmin
      .from('character_shots')
      .insert({
        character_id: characterId,
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
