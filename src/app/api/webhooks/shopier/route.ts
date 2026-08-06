import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { ShopierWebhook, ShopierClient } from 'shopier-pat-api';
import { PLANS, EXTRA_PACK } from '@/config/plans';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const headers = Object.fromEntries(req.headers.entries());

    if (!process.env.SHOPIER_WEBHOOK_TOKEN || !process.env.SHOPIER_PAT) {
      console.error('SHOPIER_WEBHOOK_TOKEN or SHOPIER_PAT is missing');
      return NextResponse.json({ error: 'Config missing' }, { status: 500 });
    }

    const webhook = new ShopierWebhook(process.env.SHOPIER_WEBHOOK_TOKEN);
    const client = new ShopierClient({ pat: process.env.SHOPIER_PAT });
    
    let payload;
    try {
      payload = webhook.parse(rawBody, headers);
    } catch (e: any) {
      console.error('Webhook signature verification failed:', e.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    if (payload.event === 'order.created') {
      const order = payload.body as any;
      const productId = order.lineItems?.[0]?.productId || order.id;

      if (!productId) {
        console.error('No productId found in order items');
        return NextResponse.json({ success: true });
      }

      // Fetch the invoice
      const { data: invoice } = await supabaseAdmin
        .from('business_invoices')
        .select('*')
        .eq('shopier_product_id', productId)
        .single();

      if (!invoice) {
        console.error('Invoice not found for productId:', productId);
        return NextResponse.json({ success: true });
      }

      // Find the plan to add credits
      const plan = invoice.plan_id === 'extra' ? EXTRA_PACK : PLANS.find(p => p.id === invoice.plan_id);
      if (!plan) {
         console.error('Invalid plan in invoice:', invoice.plan_id);
         return NextResponse.json({ success: true });
      }

      // Atomik + idempotent: fulfill_invoice() tek transaction içinde invoice'ı
      // 'success' işaretler ve krediyi ekler. Invoice zaten 'success' ise (aynı
      // webhook'un tekrar teslimi) false döner ve hiçbir şey değişmez — elle
      // select-then-update yapmak iki eşzamanlı teslimat arasında race condition'a
      // (çift kredi) açık olurdu.
      const { data: fulfilled, error: fulfillError } = await supabaseAdmin.rpc('fulfill_invoice', {
        p_invoice_id: invoice.id,
        p_business_id: invoice.business_id,
        p_credits: plan.credits,
        p_shopier_order_id: String(order.id),
      });

      if (fulfillError) {
        console.error('fulfill_invoice RPC failed:', fulfillError);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
      }

      if (!fulfilled) {
        // Already processed by an earlier delivery of this webhook.
        return NextResponse.json({ success: true });
      }

      // Try to fulfill order in Shopier
      try {
        await client.fulfillOrder(order.id, {
          fulfillments: {
            productType: 'digital',
            note: 'Talkinbio hesabınıza krediler başarıyla yüklendi. Teşekkür ederiz!',
          },
        });
      } catch (e) {
        console.error('Failed to fulfill order in Shopier:', e);
      }

      // Try to delete the temporary product created for this checkout
      try {
        await client.deleteProduct(productId);
      } catch (e) {
        console.error('Failed to delete temporary product:', e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Shopier webhook error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
