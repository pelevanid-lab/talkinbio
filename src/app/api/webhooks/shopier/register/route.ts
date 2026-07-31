import { NextResponse } from 'next/server';
import { ShopierClient } from 'shopier-pat-api';

export async function GET(req: Request) {
  try {
    if (!process.env.SHOPIER_PAT) {
      return NextResponse.json({ error: 'SHOPIER_PAT bulunamadi' }, { status: 500 });
    }

    const client = new ShopierClient({ pat: process.env.SHOPIER_PAT });
    const targetUrl = 'https://talkinbio.com/api/webhooks/shopier';

    // Mevcut webhook'lari listele
    const webhooks = await client.listWebhooks();
    const existing = webhooks.find((w: any) => w.url === targetUrl && w.event === 'order.created');

    let token = '';
    if (existing) {
      token = 'Mevcut webhook bulundu ancak token sadece ilk olusturmada gorulebilir. Lutfen Shopier panelinden veya asagidaki endpointten eski webhooku silin ve tekrar deneyin.';
    } else {
      const newWebhook = await client.createWebhook('order.created', targetUrl);
      token = newWebhook.token;
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Lutfen asagidaki token degerini kopyalayip Vercel panelinizde SHOPIER_WEBHOOK_TOKEN olarak ekleyin (ve ardindan Vercel uzerinden Redeploy yapin).',
      SHOPIER_WEBHOOK_TOKEN: token,
      existingWebhooks: webhooks
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    if (!process.env.SHOPIER_PAT) return NextResponse.json({ error: 'No PAT' });
    const client = new ShopierClient({ pat: process.env.SHOPIER_PAT });
    const webhooks = await client.listWebhooks();
    for (const w of webhooks) {
      await client.deleteWebhook(w.id);
    }
    return NextResponse.json({ success: true, message: 'Tum webhooklar silindi. Simdi sayfayi yenileyerek (GET) yeni token alabilirsiniz.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
