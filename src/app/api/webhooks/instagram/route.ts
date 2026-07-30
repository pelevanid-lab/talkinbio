import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { runSauleTurn } from '@/agents/saule/run';

// 1. Meta'nın Webhook'u doğrulama (Verification) işlemi
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WEBHOOK_VERIFIED');
    return new NextResponse(challenge, { status: 200 });
  } else {
    return new NextResponse('Forbidden', { status: 403 });
  }
}

// 2. Meta'dan gelen mesajları karşılama
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.object === 'instagram') {
      for (const entry of body.entry) {
        // Hangi sayfa/hesap üzerinden geldi (Page ID)
        const pageId = entry.id;

        for (const event of entry.messaging) {
          // Eğer bu bir mesaj ise
          if (event.message && !event.message.is_echo) {
            const senderId = event.sender.id; // Mesajı atan Instagram kullanıcısının IG Scoped ID'si
            const recipientId = event.recipient.id; // Mesajın geldiği Instagram hesabımızın IG Scoped ID'si
            const messageText = event.message.text;

            if (messageText) {
              console.log(`Received message on IG from ${senderId}: ${messageText}`);

              // Supabase'den bu hesabı bağlayan işletmeyi bulalım
              // supabase-admin kullanılmalı çünkü RLS var ve dışarıdan anonim istek geliyor
              const { createClient: createAdminClient } = await import('@supabase/supabase-js');
              const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
              const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
              const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceKey);

              const { data: connection } = await supabaseAdmin
                .from('instagram_connections')
                .select('business_id, access_token')
                .eq('instagram_user_id', recipientId)
                .single();

              if (connection) {
                const businessId = connection.business_id;
                
                // Mesajı Saule'ye gönder
                // Channel olarak 'instagram' belirliyoruz ki loglarda görebilelim.
                // Not: conversationKey olarak Instagram senderId'yi kullanıyoruz.
                try {
                  const resultStream = await runSauleTurn({
                    supabaseAdmin,
                    businessId,
                    channel: 'instagram' as any,
                    conversationKey: `ig_${senderId}`,
                    userMessage: messageText,
                    locale: 'tr', // TODO: Instagram'dan dil tespit edilemez, varsayılan
                    newConversation: false,
                    isPreview: false
                  });

                  // Saule stream döndürüyor, text promise'ini bekleyip tam cevabı alalım
                  const finalResponse = await resultStream.text;

                  // 3. Saule'nin cevabını Meta Send API ile Instagram kullanıcısına geri gönder
                  const replyRes = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${connection.access_token}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      recipient: { id: senderId },
                      message: { text: finalResponse }
                    })
                  });

                  const replyData = await replyRes.json();
                  if (replyData.error) {
                    console.error('Failed to send IG reply:', replyData.error);
                  } else {
                    console.log('Successfully sent IG reply');
                  }

                } catch (err) {
                  console.error('Error running Saule for IG message:', err);
                }
              } else {
                console.warn('Received IG message for unconnected recipient:', recipientId);
              }
            }
          }
        }
      }
      return new NextResponse('EVENT_RECEIVED', { status: 200 });
    } else {
      return new NextResponse('Not Found', { status: 404 });
    }
  } catch (error) {
    console.error('Instagram Webhook error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
