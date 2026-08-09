import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';

// Paylaşılan (henüz yayınlanmamış) bir demo linkini ("?claim=username") açan
// ziyaretçi kalıcı hesap oluşturduğunda buraya düşer — business.owner_id'yi
// anonim demo sahibinden bu yeni kalıcı kullanıcıya taşır.
//
// RLS "Owners can update their business" (auth.uid() = owner_id) kuralı yüzünden
// bu devir client'tan yapılamaz — sahibi olmadığın bir satırı güncelleyemezsin.
// Bu yüzden service-role (supabaseAdmin) kullanılıyor, ama güvenlik kilidi burada:
// yalnızca mevcut sahibi GERÇEKTEN anonim (is_anonymous:true) olan ve henüz
// setup_completed=false olan business'lar devralınabilir — gerçek bir müşterinin
// sayfasını kimse bu yoldan çalamaz.
export async function POST(request: Request) {
  const { username } = await request.json().catch(() => ({ username: null }));
  if (!username || typeof username !== 'string') {
    return NextResponse.json({ error: 'username gerekli' }, { status: 400 });
  }

  const supabase = await createServerClient();
  const { data: userData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !userData?.user) {
    return NextResponse.json({ error: 'Oturum bulunamadı' }, { status: 401 });
  }
  const claimer = userData.user;
  if (claimer.is_anonymous) {
    return NextResponse.json({ error: 'Devralmak için kalıcı bir hesap gerekli' }, { status: 403 });
  }

  const { data: business, error: bizErr } = await supabaseAdmin
    .from('businesses')
    .select('id, owner_id, setup_completed, credit_balance')
    .eq('username', username)
    .single();
  if (bizErr || !business) {
    return NextResponse.json({ error: 'Sayfa bulunamadı' }, { status: 404 });
  }

  // Zaten bu kullanıcıya aitse — idempotent, başarı say.
  if (business.owner_id === claimer.id) {
    return NextResponse.json({ success: true, businessId: business.id });
  }

  if (business.setup_completed) {
    return NextResponse.json({ error: 'Bu sayfa zaten bir hesaba ait' }, { status: 409 });
  }

  const { data: ownerData, error: ownerErr } = await supabaseAdmin.auth.admin.getUserById(business.owner_id);
  if (ownerErr || !ownerData?.user?.is_anonymous) {
    return NextResponse.json({ error: 'Bu sayfa zaten bir hesaba ait' }, { status: 409 });
  }

  const updates: Record<string, unknown> = {
    owner_id: claimer.id,
    setup_completed: true,
  };
  // Anonim aşamada verilen düşük başlangıç kredisini (bkz. onboarding handleSave)
  // kalıcı hesap bakiyesine tamamla — finishWizardOrGate'teki mantığın aynısı.
  if ((business.credit_balance ?? 0) < 200) updates.credit_balance = 200;

  // owner_id koşulu iyimser kilit: aynı anda iki kişi aynı linki devralmaya
  // çalışırsa, sadece ilki başarılı olur (satır artık eski owner_id ile eşleşmez).
  const { data: updated, error: updErr } = await supabaseAdmin
    .from('businesses')
    .update(updates)
    .eq('id', business.id)
    .eq('owner_id', business.owner_id)
    .select('id')
    .maybeSingle();

  if (updErr || !updated) {
    return NextResponse.json({ error: 'Devralma başarısız, tekrar deneyin' }, { status: 409 });
  }

  return NextResponse.json({ success: true, businessId: business.id });
}
