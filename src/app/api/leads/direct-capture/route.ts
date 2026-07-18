import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { parseContactInfo } from '@/agents/saule/prompt';
import { insertLeadAndNotify } from '@/agents/saule/tools';

// Faz 4.3: kredi bitince ChatWidget'ın düştüğü "fiili ücretsiz katman" —
// LLM çağırmadan doğrudan bir lead bırakma formu. Kredi/hız limiti kontrolü
// yok (bu rota zaten token harcamıyor).
export async function POST(req: Request) {
  try {
    const { businessId, name, contact, message } = await req.json();

    if (!businessId || !name || !contact) {
      return new Response('Missing required fields', { status: 400 });
    }

    const cookieStore = await cookies();
    const visitorSessionId = cookieStore.get('visitor_session_id')?.value;
    if (!visitorSessionId) {
      return new Response('Missing visitor_session_id', { status: 401 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: business } = await supabaseAdmin.from('businesses').select('contact_value').eq('id', businessId).single();
    if (!business) {
      return new Response('Business not found', { status: 404 });
    }
    const { contactValues, directLinks } = parseContactInfo(business.contact_value);

    const { data: conversation } = await supabaseAdmin
      .from('conversations')
      .insert({ business_id: businessId, visitor_session_id: visitorSessionId, is_preview: false, channel: 'web' })
      .select('id')
      .single();
    if (!conversation) {
      return new Response('Failed to create conversation', { status: 500 });
    }

    if (typeof message === 'string' && message.trim()) {
      await supabaseAdmin.from('messages').insert({
        conversation_id: conversation.id,
        business_id: businessId,
        role: 'user',
        content: message.trim(),
      });
      await supabaseAdmin.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversation.id);
    }

    const result = await insertLeadAndNotify({
      supabaseAdmin,
      businessId,
      conversationId: conversation.id,
      contactValues,
      directLinks,
      isPreview: false,
      name,
      contact,
      summary: typeof message === 'string' && message.trim() ? message.trim() : 'Kredi limiti nedeniyle sohbet yerine doğrudan mesaj bırakıldı.',
    });

    return Response.json(result);
  } catch (error) {
    console.error('Direct lead capture error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
