import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { z } from 'zod';
import { getModel } from '@/utils/ai';
import { cookies } from 'next/headers';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    // Authenticate admin
    const cookieStore = await cookies();
    const session = cookieStore.get('admin_session');
    
    if (!session || session.value !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
      - İşletmeler sisteme üye olur ve "Saule" adlı bir yapay zeka asistanı onlarla röportaj yaparak işletmelerine özel (fotoğraflar, hizmetler, saatler vb. içeren) bir sayfa oluşturur.
      - Müşterilerin ziyaretçileri bu sayfayı ziyaret ettiğinde yine Saule ile sohbet edebilir, randevu alabilir, lead formları bırakabilir ve işletme hakkında bilgi alabilirler.
      - Teknoloji: Next.js, Tailwind, Supabase, Stripe abonelikleri, Vercel AI SDK.
      
      Lütfen bu proje için çok gerçekçi, hedefe odaklı ve mantıklı bir Yalın Kanvas tablosu doldur. İçerik tamamen Türkçe olmalı ve verilen veri yapısına tam olarak uymalıdır.
    `;

    const { object } = await generateObject({
      model: getModel('analysis'),
      schema: leanCanvasSchema,
      prompt: systemPrompt,
    });

    return NextResponse.json(object);
  } catch (error: any) {
    console.error('Lean Canvas API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
