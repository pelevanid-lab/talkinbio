import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { notifyAdmin } from '@/agents/shared/notifyAdmin';

// Faz 4.3: /pricing sayfasındaki "bize ulaşın" formu — gerçek checkout değil,
// ödeme sağlayıcı (Faz H.1) ve sözleşmeler (H.3) hazır olana kadar geçici çözüm.
// Admin manuel arayıp admin/subscriptions'tan planı/kredisi elle atar.
export async function POST(req: Request) {
  try {
    const { email, phone, planInterest, message } = await req.json();

    if (!email || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('pricing_inquiries').insert({
      email,
      phone,
      plan_interest: planInterest || null,
      message: message || null,
    });

    if (error) {
      console.error('Pricing inquiry insert error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Best-effort: admin'e anlık bildirim. Yoksa admin/subscriptions sayfasından görür.
    await notifyAdmin(
      `Yeni fiyat talebi: ${email}`,
      `E-posta: ${email}<br/>Telefon: ${phone}${planInterest ? `<br/>İlgilendiği plan: ${planInterest}` : ''}${message ? `<br/>Not: ${message}` : ''}`
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Pricing inquiry error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
