import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

const VALID_EVENT_TYPES = new Set(['contact_click', 'order_click']);

// Sıfır sürtünmeli niyet sinyali kaydı — WhatsApp/telefon/e-posta/Instagram/Sipariş Ver
// tıklamaları. UI'da hiçbir şey değişmez; sadece bugüne kadar hiç yakalanmayan "Saule
// başarıyla cevap verdi ama ziyaretçi form doldurmadı" durumunu görünür kılar (bkz.
// migration 00070_engagement_events.sql). visitor_session_id httpOnly olduğu için
// client-side kod okuyamıyor — bu route sadece cookie'yi server tarafında okuyup satırı
// yazmak için var, kendi başına bir "sayfa" değil.
export async function POST(request: Request) {
  try {
    const { businessId, eventType, channel } = await request.json();

    if (!businessId || !eventType || !VALID_EVENT_TYPES.has(eventType)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const visitorSessionId = cookieStore.get('visitor_session_id')?.value;
    if (!visitorSessionId) {
      // Ziyaretçi çerezi yoksa (nadir — proxy her istekte set ediyor) sessizce geç, analytics
      // kritik bir işlev değil, sayfa deneyimini bloklamamalı.
      return NextResponse.json({ ok: true });
    }

    const supabase = await createClient();
    const { error } = await supabase.from('engagement_events').insert({
      business_id: businessId,
      visitor_session_id: visitorSessionId,
      event_type: eventType,
      channel: typeof channel === 'string' ? channel : null,
    });
    // Supabase insert hataları throw ETMEZ, {error} olarak döner — burada loglamazsak
    // (ör. migration henüz uygulanmamışsa) sessizce hiçbir şey yazılmadığı fark edilmez.
    if (error) console.error('Engagement event insert failed:', error.message);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Engagement tracking failed:', err);
    // Analytics yazımı başarısız olsa bile ziyaretçi deneyimini etkilememeli.
    return NextResponse.json({ ok: true });
  }
}
