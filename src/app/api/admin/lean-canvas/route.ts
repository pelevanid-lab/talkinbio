import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { z } from 'zod';
import { getModel } from '@/utils/ai';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/utils/supabase/admin';

export const maxDuration = 60;

const leanCanvasSchema = z.object({
  problem: z.array(z.string()).describe('Müşterilerin en büyük 3 sorunu'),
  existingAlternatives: z.array(z.string()).describe('Bu sorunların bugün nasıl çözüldüğü'),
  solution: z.array(z.string()).describe('Her sorun için olası çözümler'),
  keyMetrics: z.array(z.string()).describe('İşin bugün nasıl olduğunu ifade eden önemli sayılar'),
  uniqueValueProposition: z.string().describe('Habersiz bir ziyaretçiyi ilgili bir müşteriye dönüştürecek sade, açık ve ikna edici mesaj'),
  highLevelConcept: z.string().describe('X için Y analojileri (örn. Videolar için Youtube = Flickr)'),
  unfairAdvantage: z.string().describe('Kolaylıkla kopyalanamayacak ya da satın alınamayacak bir şey'),
  channels: z.array(z.string()).describe('Müşterilere ulaşma yolları'),
  customerSegments: z.array(z.string()).describe('Hedef müşteriler ve kullanıcılar'),
  earlyAdopters: z.array(z.string()).describe('İdeal müşterinin karakteristik özellikleri'),
  costStructure: z.array(z.string()).describe('Sabit ve değişken maliyetler'),
  revenueStreams: z.array(z.string()).describe('Gelir kaynakları'),
});

const systemPrompt = `
  Sen kıdemli bir iş stratejisti ve ürün yöneticisi yapay zekasın. Görevin, "Talkinbio" projesi için Yalın Kanvas (Lean Canvas) içeriği üretmek.

  Talkinbio hakkında GERÇEK durum (uydurma, buna sadık kal):
  - Talkinbio, işletmelerin sohbet tabanlı yapay zeka asistanıyla profil sayfası kurup yönettiği bir "Link in Bio" platformudur.
  - İki agent var: "Beiwe" işletme sahibiyle röportaj yaparak sayfayı kurar (bloklar, 3 dilde içerik, özgün tema); "Saule" public sayfada ziyaretçilerle konuşur, soruları yalnızca işletmenin doğrulanmış verisinden cevaplar, lead toplar.
  - Randevu bugün "talep" düzeyinde (takvim entegrasyonu v2 planı). Saule'nin WhatsApp/Instagram DM kanallarına taşınması v2 planı.
  - Teknoloji: Next.js, Tailwind, Supabase, Vercel AI SDK (Claude modelleri). Ödeme entegrasyonu HENÜZ YOK; kredi bazlı fiyatlandırma modeli planlandı (iyzico/Stripe kararı açık).
  - Bu kanvas ekibin koduna yol gösteren canlı bir belgedir: henüz kodda olmayan planları yazabilirsin ama parantez içinde işaretle, örn. "(v2)" veya "(Faz 1'de eklenecek)".

  İçerik tamamen Türkçe olmalı ve verilen veri yapısına tam uymalıdır.
`;

async function checkAuth() {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session');
  return session && session.value === process.env.ADMIN_PASSWORD;
}

async function readData() {
  const { data, error } = await supabaseAdmin
    .from('lean_canvas')
    .select('data')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw new Error(`Kanvas okunamadı: ${error.message}`);
  return data?.data || null;
}

async function writeData(data: any) {
  const { error } = await supabaseAdmin
    .from('lean_canvas')
    .upsert({ id: 1, data, updated_at: new Date().toISOString() });
  if (error) throw new Error(`Kanvas kaydedilemedi: ${error.message}`);
}

export async function GET(req: Request) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const data = await readData();
    return NextResponse.json(data || {});
  } catch (error: any) {
    console.error('Lean Canvas GET API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { object } = await generateObject({
      model: getModel('analysis'),
      schema: leanCanvasSchema,
      prompt: systemPrompt,
    });

    const currentData = (await readData()) || {};
    const lockedFields = currentData._locks || [];

    // Preserve locked fields
    for (const field of lockedFields) {
      if (currentData[field] !== undefined) {
        (object as any)[field] = currentData[field];
      }
    }

    (object as any)._locks = lockedFields;

    await writeData(object);
    return NextResponse.json(object);
  } catch (error: any) {
    console.error('Lean Canvas POST API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { field, action, value } = body;
    const currentData = (await readData()) || {};

    if (action === 'toggleLock') {
      currentData._locks = currentData._locks || [];
      if (currentData._locks.includes(field)) {
        currentData._locks = currentData._locks.filter((f: string) => f !== field);
      } else {
        currentData._locks.push(field);
      }
      await writeData(currentData);
      return NextResponse.json(currentData);
    }

    if (action === 'update') {
      currentData[field] = value;
      await writeData(currentData);
      return NextResponse.json(currentData);
    }

    if (action === 'regenerate') {
      // Regenerate a single field based on the schema using AI
      const fieldDescriptions: Record<string, string> = {
        problem: 'Müşterilerin en büyük 3 sorunu (liste olarak)',
        existingAlternatives: 'Bu sorunların bugün nasıl çözüldüğü (liste olarak)',
        solution: 'Her sorun için olası çözümler (liste olarak)',
        keyMetrics: 'İşin bugün nasıl olduğunu ifade eden önemli sayılar (liste olarak)',
        uniqueValueProposition: 'Habersiz bir ziyaretçiyi ilgili bir müşteriye dönüştürecek sade, açık ve ikna edici mesaj (metin)',
        highLevelConcept: 'X için Y analojileri (örn. Videolar için Youtube = Flickr) (metin)',
        unfairAdvantage: 'Kolaylıkla kopyalanamayacak ya da satın alınamayacak bir şey (metin)',
        channels: 'Müşterilere ulaşma yolları (liste olarak)',
        customerSegments: 'Hedef müşteriler ve kullanıcılar (liste olarak)',
        earlyAdopters: 'İdeal müşterinin karakteristik özellikleri (liste olarak)',
        costStructure: 'Sabit ve değişken maliyetler (liste olarak)',
        revenueStreams: 'Gelir kaynakları (liste olarak)',
      };

      const isArrayType = ['problem', 'existingAlternatives', 'solution', 'keyMetrics', 'channels', 'customerSegments', 'earlyAdopters', 'costStructure', 'revenueStreams'].includes(field);

      // Feed the rest of the canvas in so a single regenerated field stays coherent with it.
      const { _locks, ...contextData } = currentData;
      const promptString = systemPrompt
        + `\n\nMevcut kanvasın geri kalanı (tutarlı kal):\n${JSON.stringify(contextData, null, 1)}`
        + `\n\nŞu anda SADECE "${field}" alanını yeniden üret. Bu alanın açıklaması: ${fieldDescriptions[field]}`;

      let generatedValue: any;
      if (isArrayType) {
        const { object } = await generateObject({
          model: getModel('analysis'),
          schema: z.object({ value: z.array(z.string()) }),
          prompt: promptString,
        });
        generatedValue = object.value;
      } else {
        const { object } = await generateObject({
          model: getModel('analysis'),
          schema: z.object({ value: z.string() }),
          prompt: promptString,
        });
        generatedValue = object.value;
      }

      currentData[field] = generatedValue;
      await writeData(currentData);
      return NextResponse.json(currentData);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Lean Canvas PUT API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
