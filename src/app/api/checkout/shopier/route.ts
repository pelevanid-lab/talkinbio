import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { createClient as createServerSupabase } from '@/utils/supabase/server';
import { PLANS, EXTRA_PACK } from '@/config/plans';
import { ShopierClient, ShopierPaymentFlow, ShopierWebhook } from 'shopier-pat-api';

export async function POST(req: Request) {
  try {
    const { planId, businessId } = await req.json();

    if (!planId || !businessId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify auth and ownership
    const supabaseAuth = await createServerSupabase();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('owner_id, name')
      .eq('id', businessId)
      .single();

    if (!business || user.id !== business.owner_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const plan = planId === 'extra' ? EXTRA_PACK : PLANS.find((p) => p.id === planId);
    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const isTurkey = req.headers.get('x-vercel-ip-country') === 'TR';
    
    let currency: 'USD' | 'TRY' = 'USD';
    let finalPrice = plan.price;

    // Currency conversion for Turkey
    if (isTurkey) {
      currency = 'TRY';
      try {
        const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
            next: { revalidate: 3600 } // cache for 1 hour
        });
        const data = await res.json();
        const rate = data.rates.TRY;
        if (rate) {
           finalPrice = parseFloat((plan.price * rate).toFixed(2));
        } else {
           finalPrice = plan.price * 33; // Fallback rate
        }
      } catch (e) {
        console.error('Exchange rate fetch error:', e);
        finalPrice = plan.price * 33; // Fallback rate
      }
    }

    if (!process.env.SHOPIER_PAT) {
       console.error("SHOPIER_PAT is missing");
       return NextResponse.json({ error: 'Payment gateway not configured' }, { status: 500 });
    }

    const client = new ShopierClient({ pat: process.env.SHOPIER_PAT });
    const webhook = new ShopierWebhook(process.env.SHOPIER_WEBHOOK_TOKEN || 'dummy');
    const flow = new ShopierPaymentFlow(client, webhook);

    const title = planId === 'extra' ? 'Ek Kredi Paketi' : `${(plan as any).name || 'Talkinbio'} Plan`;

    // Create Shopier payment
    const payment = await flow.create({
      title: title,
      price: finalPrice,
      currency: currency,
      imageUrl: 'https://talkinbio.com/talkinbio-instagram.png',
      fastPay: true
    });

    // Save to database
    const { error } = await supabaseAdmin.from('business_invoices').insert({
      business_id: businessId,
      plan_id: planId,
      amount: finalPrice,
      currency: currency,
      shopier_product_id: payment.productId,
      status: 'pending'
    });

    if (error) {
      console.error('Invoice insert error:', error);
      // Try to delete the created product since we failed to save the invoice
      try { await client.deleteProduct(payment.productId); } catch (e) {}
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ url: payment.paymentUrl, fastPayHtml: payment.fastPayHtml });
  } catch (err: any) {
    console.error('Shopier checkout error:', err);
    // Return the actual error message to the frontend for debugging
    const errorMessage = err?.message || 'Bilinmeyen bir hata oluştu';
    return NextResponse.json({ error: `Hata: ${errorMessage}` }, { status: 500 });
  }
}
