import { NextResponse } from 'next/server';
import { generateObject, generateText } from 'ai';
import { z } from 'zod';
import { getModel } from '@/utils/ai';
import { cookies } from 'next/headers';
import fs from 'fs/promises';
import path from 'path';

export const maxDuration = 60;

const DATA_FILE = path.join(process.cwd(), 'lean-canvas-data.json');

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
  Sen kıdemli bir iş stratejisti ve ürün yöneticisi yapay zekasın. Görevin, mevcut "Talkinbio" projesi için bir Yalın Kanvas (Lean Canvas) modeli oluşturmaktır.
  Talkinbio Hakkında Bilgi:
  - Talkinbio, işletmelerin karmaşık formlar yerine sohbet tabanlı bir yapay zeka asistanı aracılığıyla profillerini oluşturup yönetebildikleri bir "Link in Bio" ve mikro web sitesi platformudur.
  - İşletmeler sisteme üye olur ve "Saule" adlı bir yapay zeka asistanı onlarla röportaj yaparak işletmelerine özel bir sayfa oluşturur.
  - Müşterilerin ziyaretçileri bu sayfayı ziyaret ettiğinde yine Saule ile sohbet edebilir, randevu alabilir, lead formları bırakabilir ve işletme hakkında bilgi alabilirler.
  - Teknoloji: Next.js, Tailwind, Supabase, Stripe abonelikleri, Vercel AI SDK.
  Lütfen bu proje için çok gerçekçi, hedefe odaklı ve mantıklı bir Yalın Kanvas tablosu doldur. İçerik tamamen Türkçe olmalı ve verilen veri yapısına tam olarak uymalıdır.
`;

async function checkAuth() {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session');
  return session && session.value === process.env.ADMIN_PASSWORD;
}

async function readData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

async function writeData(data: any) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export async function GET(req: Request) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const data = await readData();
  return NextResponse.json(data || {});
}

export async function POST(req: Request) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { object } = await generateObject({
      model: getModel('analysis'),
      schema: leanCanvasSchema,
      prompt: systemPrompt,
    });
    
    const currentData = await readData() || {};
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
    let currentData = await readData() || {};

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

      const promptString = systemPrompt + `\n\nŞu anda sadece Yalın Kanvas içindeki "${field}" alanını oluşturmanı istiyorum. Bu alanın açıklaması şudur: ` + fieldDescriptions[field];

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
