import { tool, generateText } from 'ai';
import { z } from 'zod';
import { getModel } from '@/utils/ai';

export function scrapeUrlTool() {
  return tool({
    description: 'Kullanıcının verdiği web sitesini (veya Instagram profilini) okur ve içindeki bilgileri sentezleyerek kısa bir işletme özetine dönüştürür. URL verildiğinde bunu çağır.',
    inputSchema: z.object({
      url: z.string().url().describe('Okunacak web sitesi adresi (http/https ile)'),
    }),
    execute: async ({ url }) => {
      try {
        const response = await fetch(`https://r.jina.ai/${url}`);
        if (!response.ok) {
          return `Error: URL okunamadı (HTTP ${response.status}). Kullanıcıdan bilgileri manuel olarak iste.`;
        }
        
        const rawText = await response.text();
        
        if (!rawText || rawText.trim().length === 0) {
           return `Error: URL okundu ancak içerik bulunamadı. Kullanıcıdan bilgileri manuel olarak iste.`;
        }

        // Metni sentezle - çok uzun metinleri (100k+ karakter) korumak için kırpıyoruz
        const { text: summary } = await generateText({
          model: getModel('analysis'), // analysis = hızlı model
          system: 'Sen veri sentezleyici bir asistansın. Sana verilen karmaşık web sayfası veya döküman metnini okuyup, işletme için gereken en temel bilgileri özetlemelisin.',
          prompt: `Lütfen şu metni incele ve işletmenin ne yaptığını, hangi hizmetleri/ürünleri sunduğunu, fiyatlarını (varsa), çalışma saatlerini ve iletişim bilgilerini net, yapılandırılmış bir formatta özetle. Bilgi yoksa 'Belirtilmemiş' yaz.\n\nKAYNAK METİN:\n${rawText.slice(0, 100000)}` 
        });

        return `İşte URL'den çıkarılan işletme özeti:\n${summary}`;
      } catch (err: any) {
         return `Error: URL okunurken teknik bir hata oluştu: ${err.message}. Kullanıcıya durumu bildir ve bilgileri manuel iste.`;
      }
    }
  });
}
